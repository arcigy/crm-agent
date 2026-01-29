"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { getGmailClient } from "@/lib/google";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { createStreamableValue } from "@ai-sdk/rsc";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import client from "openai";
import { any, string } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================
// 1. MOLECULAR TOOL REGISTRY (ATOMIC)
// ==========================================

const INBOX_ATOMS: any[] = [
  {
    type: "function",
    function: {
      name: "gmail_fetch_list",
      description: "Získa zoznam ID a snippetov správ z Gmailu.",
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description: "Vyhľadávací dopyt (napr. 'from:petra', 'is:unread')",
          },
          maxResults: { type: "number", default: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_get_details",
      description:
        "Získa kompletný obsah e-mailu (body, subject, sender) podľa ID.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string" },
        },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_reply",
      description: "Odošle odpoveď do existujúceho vlákna.",
      parameters: {
        type: "object",
        properties: {
          threadId: { type: "string" },
          body: {
            type: "string",
            description: "Text odpovede v HTML alebo čistý text",
          },
        },
        required: ["threadId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_trash_message",
      description: "Presunie e-mail do koša.",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_archive_message",
      description: "Archivuje e-mail (odstráni z inboxu).",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ai_deep_analyze_lead",
      description:
        "Hĺbková AI analýza textu e-mailu (extrakcia entít, úmyslu a prioritizácia).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          subject: { type: "string" },
          sender: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_save_analysis",
      description: "Uloží výsledok AI analýzy leada do CRM databázy.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          intent: { type: "string" },
          summary: { type: "string" },
          next_step: { type: "string" },
          sentiment: { type: "string" },
        },
        required: ["message_id", "intent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_info",
      description: "Aktualizuje dáta o analýze leada v CRM.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          priority: { type: "string", enum: ["vysoka", "stredna", "nizka"] },
          next_step: { type: "string" },
        },
        required: ["message_id"],
      },
    },
  },
];

const SYSTEM_ATOMS: any[] = [
  {
    type: "function",
    function: {
      name: "sys_list_files",
      description: "Zobrazí štruktúru súborov v projekte (tree view).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relatívna cesta (predvolene koreň .)",
          },
          depth: { type: "number", default: 2 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sys_read_file",
      description: "Prečíta obsah konkrétneho súboru v projekte.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sys_run_diagnostics",
      description:
        "Spustí diagnostický príkaz v termináli (napr. 'npm run build', 'git status'). Len na sledovanie stavu.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
        required: ["command"],
      },
    },
  },
];

const ALL_ATOMS = [...INBOX_ATOMS, ...SYSTEM_ATOMS];

// ==========================================
// 2. TOKEN HELPER (Clerk integration)
// ==========================================

async function getGmail(userId: string) {
  const client = await clerkClient();
  const response = await client.users.getUserOauthAccessToken(
    userId,
    "oauth_google",
  );
  const token = response.data[0]?.token;
  if (!token) throw new Error("Google account not connected");
  return getGmailClient(token);
}

// ==========================================
// 3. ATOMIC EXECUTORS (The Workers)
// ==========================================

async function executeAtomicTool(name: string, args: any, user: any) {
  try {
    const gmail = name.startsWith("gmail_") ? await getGmail(user.id) : null;

    switch (name) {
      case "gmail_fetch_list":
        const list = await gmail!.users.messages.list({
          userId: "me",
          q: args.q,
          maxResults: args.maxResults,
        });
        return { success: true, data: list.data.messages || [] };

      case "gmail_get_details":
        const msg = await gmail!.users.messages.get({
          userId: "me",
          id: args.messageId,
          format: "full",
        });
        const headers = msg.data.payload?.headers;
        return {
          success: true,
          data: {
            id: msg.data.id,
            threadId: msg.data.threadId,
            subject: headers?.find((h) => h.name === "Subject")?.value,
            from: headers?.find((h) => h.name === "From")?.value,
            body: msg.data.snippet,
          },
        };

      case "gmail_trash_message":
        await gmail!.users.messages.trash({ userId: "me", id: args.messageId });
        return { success: true };

      case "gmail_archive_message":
        await gmail!.users.messages.modify({
          userId: "me",
          id: args.messageId,
          requestBody: { removeLabelIds: ["INBOX"] },
        });
        return { success: true };

      case "gmail_reply":
        const rawContent = `To: \r\nSubject: Re:\r\n\r\n${args.body}`;
        await gmail!.users.messages.send({
          userId: "me",
          requestBody: {
            threadId: args.threadId,
            raw: Buffer.from(rawContent)
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, ""),
          },
        });
        return { success: true };

      case "ai_deep_analyze_lead":
        const { classifyEmail } = await import("./ai");
        const analysis = await classifyEmail(
          args.content,
          user.emailAddresses[0].emailAddress,
          args.sender,
          args.subject,
        );
        return { success: true, data: analysis };

      case "db_save_analysis":
        // @ts-ignore
        await directus.request(
          createItem("email_analysis", {
            ...args,
            date_created: new Date().toISOString(),
          }),
        );
        return { success: true };

      case "db_update_lead_info":
        // @ts-ignore
        const existing = await directus.request(
          readItems("email_analysis", {
            filter: { message_id: { _eq: args.message_id } },
          }),
        );
        if (existing.length > 0) {
          // @ts-ignore
          await directus.request(
            updateItem("email_analysis", existing[0].id, args),
          );
        }
        return { success: true };

      // --- SYSTEM TOOLS ---
      case "sys_list_files":
        const targetPath = path.resolve(process.cwd(), args.path || ".");
        if (!targetPath.startsWith(process.cwd()))
          return { success: false, error: "Access denied" };
        const files = fs.readdirSync(targetPath, { withFileTypes: true });
        const tree = files.map(
          (f) => `${f.isDirectory() ? "[DIR]" : "[FILE]"} ${f.name}`,
        );
        return { success: true, data: tree };

      case "sys_read_file":
        const filePath = path.resolve(process.cwd(), args.path);
        if (!filePath.startsWith(process.cwd()))
          return { success: false, error: "Access denied" };
        if (!fs.existsSync(filePath))
          return { success: false, error: "File not found" };
        const content = fs.readFileSync(filePath, "utf-8");
        return { success: true, data: content.slice(0, 10000) }; // Limit to 10k chars

      case "sys_run_diagnostics":
        try {
          const output = execSync(args.command, {
            encoding: "utf-8",
            timeout: 30000,
          });
          return { success: true, data: output };
        } catch (e: any) {
          return { success: false, error: e.stdout || e.message };
        }

      default:
        return { success: false, error: "Tool not found" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 4. MOLECULAR ORCHESTRATOR (The Architect)
// ==========================================

export async function chatWithAgent(messages: any[]) {
  const superState = createStreamableValue({
    toolResults: [] as any[],
    content: "",
    status: "thinking",
    attempt: 1,
  });

  (async () => {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        superState.error("Unauthorized");
        return;
      }
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const context = await getIsolatedAIContext(email, "GLOBAL");

      let missionAccomplished = false;
      let attempts = 0;
      const maxAttempts = 3;
      const missionHistory: any[] = [];
      let finalExecutionResults: any[] = [];

      while (!missionAccomplished && attempts < maxAttempts) {
        attempts++;
        const currentAttemptLog: any = {
          attempt: attempts,
          steps: [],
          verification: null,
          plannerPrompt: "",
        };

        superState.update({
          toolResults: finalExecutionResults,
          content: `Plánujem pokus č. ${attempts}...`,
          status: "thinking",
          attempt: attempts,
        } as any);

        // 1. ORCHESTRATION LAYER (Planner)
        const architectPrompt = `
Si **Mission Orchestrator**. Tvojou úlohou je vyriešiť požiadavku používateľa pomocou dostupných nástrojov.
Máš prístup k nástrojom: ${JSON.stringify(ALL_ATOMS.map((t) => t.function.name))}.

TVOJE MOŽNOSTI:
- Čítanie kódu a štruktúry: Použi sys_list_files a sys_read_file na pochopenie CRM. 
- Email: gmail_ nástroje.
- Databáza: db_ nástroje.

HISTÓRIA POKUSOV: ${JSON.stringify(missionHistory)}

VÝSTUP LEN JSON: { "plan": [{ "tool": "name", "args": {...} }] }
`;
        currentAttemptLog.plannerPrompt = architectPrompt;

        const plannerRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: architectPrompt }, ...messages],
          response_format: { type: "json_object" },
        });

        const plannerRaw = plannerRes.choices[0].message.content;
        currentAttemptLog.plannerRawOutput = plannerRaw;

        const currentPlan = JSON.parse(plannerRaw || '{"plan":[]}');
        const currentStepResults = [];

        // 2. EXECUTIVE LAYER (Workers)
        for (const step of currentPlan.plan) {
          superState.update({
            toolResults: [
              ...finalExecutionResults,
              ...currentStepResults,
              { tool: step.tool, status: "running" },
            ],
            content: "",
            status: "thinking",
            attempt: attempts,
          } as any);

          const result = await executeAtomicTool(
            step.tool,
            step.args,
            clerkUser,
          );
          currentStepResults.push({ tool: step.tool, args: step.args, result });

          superState.update({
            toolResults: [...finalExecutionResults, ...currentStepResults],
            content: "",
            status: "thinking",
            attempt: attempts,
          } as any);
        }

        currentAttemptLog.steps = currentStepResults;
        finalExecutionResults = [
          ...finalExecutionResults,
          ...currentStepResults,
        ];

        // 3. VERIFICATION LAYER (Analysis)
        const verificationPrompt = `
Si **Mission Verifier**. Skontroluj, či výsledky pokusu č. ${attempts} úspešne splnili požiadavku používateľa.
PÔVODNÁ POŽIADAVKA: ${messages[messages.length - 1].content}
VÝSLEDKY POKUSU: ${JSON.stringify(currentStepResults)}

ODPOVEDAJ LEN JSON: { "success": true/false, "analysis": "krátke zdôvodnenie", "missing_info": "čo ešte treba spraviť" }
`;
        const verificationRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: verificationPrompt }],
          response_format: { type: "json_object" },
        });

        const verdictRaw = verificationRes.choices[0].message.content;
        const verdict = JSON.parse(verdictRaw || '{"success":false}');
        currentAttemptLog.verification = verdict;

        missionHistory.push(currentAttemptLog);

        if (verdict.success) {
          missionAccomplished = true;
        }
      }

      // 4. FINAL REPORT (The Voice)
      const verifierPrompt = `
Si **ArciGy Agent**. Stručne a ľudsky zhrň výsledok misie.
MISIA: ${missionAccomplished ? "ÚSPEŠNÁ" : "ČIASTOČNÁ/ZLYHALA"}
VÝSLEDKY: ${JSON.stringify(finalExecutionResults)}

PRAVIDLO: Max 1-2 vety. Buď priamy.
`;

      const finalRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: verifierPrompt }, ...messages],
      });

      superState.done({
        toolResults: finalExecutionResults,
        content: finalRes.choices[0].message.content || "",
        status: "done",
        attempt: attempts,
        diagnostics: missionHistory, // SEND DEEP LOGS TO UI
      } as any);
    } catch (error: any) {
      superState.error(error.message);
    }
  })();

  return {
    stream: superState.value,
  };
}

// ==========================================
// 5. PERSISTENCE LAYER (Directus)
// ==========================================

export async function getAgentChats() {
  const clerkUser = await currentUser();
  if (!clerkUser) return [];
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  // @ts-ignore
  const chats = await directus.request(
    readItems("agent_chats", {
      filter: { user_email: { _eq: email } },
      sort: ["-date_created"],
    }),
  );
  return chats;
}

export async function getAgentChatById(id: string) {
  // @ts-ignore
  return await directus
    .request(readItems("agent_chats", { filter: { id: { _eq: id } } }))
    .then((res) => res[0]);
}

export async function saveAgentChat(
  id: string,
  title: string,
  messages: any[],
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return;
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  // @ts-ignore
  const existing = await directus.request(
    readItems("agent_chats", { filter: { id: { _eq: id } } }),
  );

  if (existing.length > 0) {
    // @ts-ignore
    await directus.request(updateItem("agent_chats", id, { title, messages }));
  } else {
    // @ts-ignore
    await directus.request(
      createItem("agent_chats", {
        id,
        title,
        messages,
        user_email: email,
        date_created: new Date().toISOString(),
      }),
    );
  }
  revalidatePath("/dashboard/agent");
}

export async function deleteAgentChat(id: string) {
  // @ts-ignore
  await directus.request(updateItem("agent_chats", id, { status: "archived" }));
  revalidatePath("/dashboard/agent");
}

// Compatibility Shims
export async function agentCreateContact(d: any) {
  return { success: true };
}
export async function agentCreateDeal(d: any) {
  return { success: true };
}
export async function agentCheckAvailability(d: any) {
  return { success: true };
}
export async function agentScheduleEvent(d: any) {
  return { success: true };
}
export async function agentSendEmail(d: any) {
  return { success: true };
}
