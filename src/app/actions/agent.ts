"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { getGmailClient } from "@/lib/google";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";

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
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { error: "Unauthorized" };
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // A. PLANNER STEP (Architect decomposes task)
    const context = await getIsolatedAIContext(email, "GLOBAL");

    const architectPrompt = `
Si **Architect Planner (The Brain)**. Tvojou úlohou je rozbiť komplexnú požiadavku na sekvenciu atómických krokov.
Máš prístup k nástrojom: ${JSON.stringify(INBOX_ATOMS.map((t) => t.function.name))}.

PROTOKOL "NO-FAIL":
1. Ak nástroj zlyhá, nehovor "to nejde". Navrhni iný atómický krok (workaround).
2. Ak nevieš identifikovať e-mail, skús širšie vyhľadávanie (napr. len meno alebo doménu).
3. Do výstupu daj LEN JSON: { "plan": [{ "tool": "name", "args": {...} }] }

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
    const executionResults = [];

    // B. EXECUTION LOOP (The Workers)
    for (const step of missionPlan.plan) {
      let result = await executeAtomicTool(step.tool, step.args, clerkUser);

      // Automatic Solution Seeking on failure
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
              content: `Pôvodný krok: ${JSON.stringify(step)}, Error: ${result.error}`,
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
    }

    // C. FINAL VERIFICATION & ANALYSIS
    const verifierPrompt = `
Si **Final Verifier**. Skontroluj výsledky operácií pre používateľa ${context.user_nickname}.
ZHRNUTIE VÝSLEDKOV: ${JSON.stringify(executionResults)}

Tvojou úlohou:
1. Povedz, čo si reálne spravil.
2. Ak si narazil na chybu, povedz ako si ju obišiel.
3. BUĎ ÚPRIMNÝ – ak si niečo nestihol, navrhni ďalší krok.
4. Tón: ${context.communication_tone}.
`;

    const finalRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: verifierPrompt }, ...messages],
    });

    return {
      role: "assistant",
      content: finalRes.choices[0].message.content,
      toolResults: executionResults,
    };
  } catch (error: any) {
    console.error("Agent System Error:", error);
    return { error: error.message };
  }
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
