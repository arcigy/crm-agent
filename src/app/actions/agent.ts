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
import { any, string } from "zod";
import {
  startCostSession,
  trackAICall,
  endCostSession,
  formatCost,
  type SessionCost,
} from "@/lib/ai-cost-tracker";

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
// 4. MOLECULAR ORCHESTRATOR (Multi-Provider AI)
// ==========================================
// Konfigurácia:
// - Gatekeeper: GPT-4o-mini (OpenAI) - lacný, rýchly
// - Orchestrator: Claude 3.7 Sonnet (Anthropic) - najlepší tool-use
// - Verifier: Gemini 2.0 Flash (Google) - rýchly, lacný
// - Final Report: Gemini 2.0 Flash (Google) - kvalitný text
// ==========================================

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function chatWithAgent(messages: any[]) {
  const superState = createStreamableValue({
    toolResults: [] as any[],
    content: "",
    status: "thinking",
    attempt: 1,
    thoughts: {
      intent: "",
      plan: [] as string[],
      extractedData: null as any,
    },
    providers: {
      gatekeeper: "OpenAI GPT-4o-mini",
      orchestrator: "Anthropic Claude 3.7 Sonnet",
      verifier: "Google Gemini 2.0 Flash",
      reporter: "Google Gemini 2.0 Flash",
    },
    costTracking: null as SessionCost | null,
  });

  (async () => {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        superState.error("Unauthorized");
        return;
      }
      const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
      const context = await getIsolatedAIContext(userEmail, "GLOBAL");

      // === START COST TRACKING ===
      startCostSession(userEmail);

      // ==========================================
      // 1. GATEKEEPER (OpenAI GPT-4o-mini)
      // ==========================================
      const classifierPrompt = `
Si **Gatekeeper & Data Analyst**. Tvojou úlohou je:
1. Určiť intent: INFO_ONLY (len otázka) alebo ACTION (niečo vykonať).
2. EXTRAKCIA DÁT: Z textu vytiahni všetky entity (mená, emaily, telefóny, firmy).

ODPOVEDAJ LEN JSON: { 
  "intent": "INFO_ONLY" | "ACTION", 
  "reason": "prečo",
  "extracted_data": { "name": "...", "email": "...", "phone": "...", "context": "..." }
}
`;
      const gatekeeperStart = Date.now();
      const classifierRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: classifierPrompt }, ...messages],
        response_format: { type: "json_object" },
      });
      const gatekeeperOutput = classifierRes.choices[0].message.content || "{}";

      // Track Gatekeeper cost
      trackAICall(
        "gatekeeper",
        "openai",
        "gpt-4o-mini",
        classifierPrompt + messages.map((m: any) => m.content).join(""),
        gatekeeperOutput,
        Date.now() - gatekeeperStart,
        classifierRes.usage?.prompt_tokens,
        classifierRes.usage?.completion_tokens,
      );

      const verdict = JSON.parse(gatekeeperOutput);

      superState.update({
        thoughts: {
          intent:
            verdict.intent === "INFO_ONLY"
              ? "Iba informačná otázka"
              : "Požiadavka na akciu v systéme",
          extractedData: verdict.extracted_data,
          plan: [],
        },
        status: "thinking",
      } as any);

      // INFO_ONLY - použijeme Gemini pre rýchlu odpoveď
      if (verdict.intent === "INFO_ONLY") {
        const geminiModel = gemini.getGenerativeModel({
          model: "gemini-2.0-flash",
        });
        const userMessages = messages
          .filter((m: any) => m.role === "user")
          .map((m: any) => m.content)
          .join("\n");

        const convPrompt = `Si ArciGy Agent. Odpovedaj stručne a priateľsky v slovenčine. Identita používateľa: ${context.user_nickname}.\n\nOtázka: ${userMessages}`;
        const convStart = Date.now();
        const result = await geminiModel.generateContent(convPrompt);
        const convOutput = result.response.text();

        // Track Conversational cost
        trackAICall(
          "conversational",
          "gemini",
          "gemini-2.0-flash",
          convPrompt,
          convOutput,
          Date.now() - convStart,
        );

        const costSession = endCostSession();

        superState.done({
          toolResults: [],
          content: convOutput,
          status: "done",
          thoughts: {
            intent: "Informačná odpoveď",
            extractedData: verdict.extracted_data,
            plan: ["Odpovedám na tvoju otázku..."],
          },
          costTracking: costSession,
        } as any);
        return;
      }

      // ==========================================
      // 2. ORCHESTRATOR (Claude 3.7 Sonnet)
      // ==========================================
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

        const architectPrompt = `
Si **Mission Orchestrator**. Navrhni PLÁN KROKOV v SLOVENČINE pre vyriešenie požiadavky.
Dostupné nástroje: ${JSON.stringify(ALL_ATOMS.map((t) => t.function.name))}.

Dôležité: Do poľa "readable_plan" daj zoznam krokov v ľudskej reči (napr. "Vyhľadám kontakt v databáze", "Zapíšem nový lead").
VÝSTUP LEN JSON: { 
  "plan": [{ "tool": "name", "args": {...} }], 
  "readable_plan": ["krok 1", "krok 2"] 
}
`;
        currentAttemptLog.plannerPrompt = architectPrompt;

        // Claude 3.7 Sonnet pre orchestráciu
        const userMessage = messages
          .filter((m: any) => m.role === "user")
          .map((m: any) => m.content)
          .join("\n");
        const orchestratorInput = `${architectPrompt}\n\nPoužívateľova požiadavka: ${userMessage}`;
        const orchestratorStart = Date.now();
        const claudeResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: orchestratorInput,
            },
          ],
        });

        const claudeText = claudeResponse.content.find(
          (c) => c.type === "text",
        );
        const plannerRaw = claudeText?.type === "text" ? claudeText.text : "{}";
        currentAttemptLog.plannerRawOutput = plannerRaw;

        // Track Orchestrator cost
        trackAICall(
          "orchestrator",
          "anthropic",
          "claude-sonnet-4-20250514",
          orchestratorInput,
          plannerRaw,
          Date.now() - orchestratorStart,
          claudeResponse.usage?.input_tokens,
          claudeResponse.usage?.output_tokens,
        );

        // Parse JSON from Claude response
        const jsonMatch = plannerRaw.match(/\{[\s\S]*\}/);
        const plannerOutput = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : { plan: [], readable_plan: [] };

        superState.update({
          thoughts: {
            intent: "Vykonávam akciu (Claude Orchestrator)",
            extractedData: verdict.extracted_data,
            plan: plannerOutput.readable_plan || [],
          },
          status: "thinking",
          attempt: attempts,
        } as any);

        const currentStepResults = [];
        for (const step of plannerOutput.plan || []) {
          superState.update({
            toolResults: [
              ...finalExecutionResults,
              ...currentStepResults,
              { tool: step.tool, status: "running" },
            ],
          } as any);

          const result = await executeAtomicTool(
            step.tool,
            step.args,
            clerkUser,
          );
          currentStepResults.push({ tool: step.tool, args: step.args, result });

          superState.update({
            toolResults: [...finalExecutionResults, ...currentStepResults],
          } as any);
        }

        finalExecutionResults = [
          ...finalExecutionResults,
          ...currentStepResults,
        ];
        currentAttemptLog.steps = currentStepResults;

        // ==========================================
        // 3. VERIFIER (Gemini 2.0 Flash)
        // ==========================================
        const geminiVerifier = gemini.getGenerativeModel({
          model: "gemini-2.0-flash",
        });
        const verificationPrompt = `Si Mission Verifier. Analyzuj tieto výsledky a urči, či bola misia úspešná.

Výsledky nástrojov:
${JSON.stringify(currentStepResults, null, 2)}

Odpovedaj LEN v JSON formáte:
{ "success": true/false, "analysis": "krátka analýza" }`;

        const verifierStart = Date.now();
        const verificationResult =
          await geminiVerifier.generateContent(verificationPrompt);
        const vText = verificationResult.response.text();

        // Track Verifier cost
        trackAICall(
          "verifier",
          "gemini",
          "gemini-2.0-flash",
          verificationPrompt,
          vText,
          Date.now() - verifierStart,
        );

        const vJsonMatch = vText.match(/\{[\s\S]*\}/);
        const vVerdict = vJsonMatch
          ? JSON.parse(vJsonMatch[0])
          : { success: false, analysis: "Nemožno analyzovať" };

        currentAttemptLog.verification = vVerdict;
        missionHistory.push(currentAttemptLog);

        if (vVerdict.success) missionAccomplished = true;
      }

      // ==========================================
      // 4. FINAL REPORT (Gemini 2.0 Flash)
      // ==========================================
      const geminiReporter = gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      const userMessages = messages
        .filter((m: any) => m.role === "user")
        .map((m: any) => m.content)
        .join("\n");

      const reportPrompt = `Zhrň výsledok misie priamo a stručne v jednej-dvoch vetách pre používateľa v slovenčine.

Pôvodná požiadavka používateľa:
${userMessages}

Výsledky vykonaných akcií:
${JSON.stringify(finalExecutionResults, null, 2)}

Odpovedaj priamo, bez JSON formátu. Buď priateľský a profesionálny.`;

      const reporterStart = Date.now();
      const reportResult = await geminiReporter.generateContent(reportPrompt);
      const finalReport = reportResult.response.text();

      // Track Final Report cost
      trackAICall(
        "reporter",
        "gemini",
        "gemini-2.0-flash",
        reportPrompt,
        finalReport,
        Date.now() - reporterStart,
      );

      // End cost session and get summary
      const costSession = endCostSession();

      superState.done({
        toolResults: finalExecutionResults,
        content: finalReport,
        status: "done",
        thoughts: {
          intent: "Misia dokončená",
          extractedData: verdict.extracted_data,
          plan: ["Úloha bola úspešne spracovaná."],
        },
        diagnostics: missionHistory,
        costTracking: costSession,
      } as any);
    } catch (error: any) {
      console.error("Agent Error:", error);
      endCostSession(); // End session even on error
      superState.error(error.message);
    }
  })();

  return { stream: superState.value };
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
