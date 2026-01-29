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
      name: "sys_run_command",
      description:
        "Spustí terminálový príkaz (napr. npm run build, git status).",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
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

      case "sys_run_command":
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

      // A. PLANNER STEP
      const architectPrompt = `
Si **Antigravity-style Architect**. Tvojou úlohou je vykonať požiadavku bez zbytočných rečí.
Máš prístup k nástrojom: ${JSON.stringify(ALL_ATOMS.map((t) => t.function.name))}.

Pravidlá hry:
1. **SPRAV TO ZA MŇA**: Nepýtaj sa na povolenie. Vykonaj všetky potrebné kroky (Gmail, DB, System).
2. **Molekulárny plán**: Rozbi problém na exekvovateľné diely.
3. **Proaktivita**: Ak vidíš chybu, skús ju opraviť cez 'sys_read_file' a 'sys_run_command'.
4. Výstup: LEN JSON: { "plan": [{ "tool": "name", "args": {...} }] }

Identita: ${context.user_nickname}.
`;

      const plannerRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: architectPrompt }, ...messages],
        response_format: { type: "json_object" },
      });

      const missionPlan = JSON.parse(
        plannerRes.choices[0].message.content || '{"plan":[]}',
      );
      const executionResults: any[] = [];

      // B. EXECUTION LOOP
      for (const step of missionPlan.plan) {
        let result = await executeAtomicTool(step.tool, step.args, clerkUser);

        if (!result.success) {
          const solver = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  'Nástroj zlyhal. Navrhni ALTERNATÍVU (tool + args) pre vyriešenie problému. JSON: { "new_step": { "tool": "...", "args": {...} } }.',
              },
              {
                role: "user",
                content: `Step: ${JSON.stringify(step)}, Error: ${result.error}`,
              },
            ],
            response_format: { type: "json_object" },
          });
          const workaround = JSON.parse(
            solver.choices[0].message.content || "{}",
          ).new_step;
          if (workaround) {
            result = await executeAtomicTool(
              workaround.tool,
              workaround.args,
              clerkUser,
            );
          }
        }

        executionResults.push({ tool: step.tool, result });
        superState.update({
          toolResults: [...executionResults],
          content: "",
          status: "thinking",
        });
      }

      // C. FINAL RESPONSE
      const verifierPrompt = `
Si **ArciGy Agent** (Persona: Ultra-efektívny parťák). 
VÝSLEDKY: ${JSON.stringify(executionResults)}

Komunikuj:
1. **Extrémne stručne**: Žiadna omáčka. "Hotovo." + 1 veta zhrnutia.
2. **Bez otázok**: Ak si niečo spravil, povedz to. Nepýtaj sa, či je to OK.
3. **Tón**: Priateľský, k veci.
`;

      const finalRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: verifierPrompt }, ...messages],
      });

      const content = finalRes.choices[0].message.content || "";
      superState.done({
        toolResults: executionResults,
        content,
        status: "done",
      });
    } catch (error: any) {
      superState.error(error.message);
    }
  })();

  return {
    stream: superState.value,
  };
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
