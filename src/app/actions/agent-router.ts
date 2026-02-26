"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { AI_MODELS } from "@/lib/ai-providers";

// ─────────────────────────────────────────────────────────
// INTENT ROUTER
// First gate in the pipeline. Classifies user message as
// TASK or CONVERSATION, extracts entities, builds orchestrator brief.
//
// CRITICAL: Always reads last 3 messages for follow-up context.
// A message like "a pošli mu aj email" is TASK only because the
// previous message established a contact.
//
// Default: TASK (safer — never silently drop actionable requests)
// ─────────────────────────────────────────────────────────

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function routeIntent(
  lastUserMessage: string,
  history: any[],
  userName: string = "Používateľ"
) {
  const start = Date.now();
  const tag = "[ROUTER]";

  // Read last 3 messages for context (critical for follow-up detection)
  const recentContext = (history ?? [])
    .slice(-3)
    .map((m: any) => `${(m.role || "user").toUpperCase()}: ${String(m.content || "").substring(0, 500)}`)
    .join("\n");

  console.log(`${tag} Classifying message: "${lastUserMessage.substring(0, 200)}"`);
  console.log(`${tag} Recent context (last 3): ${recentContext.substring(0, 400)}`);

  try {
    const systemPrompt = `
ROLE:
You are the Strategic Intent Router for ArciGy CRM used by ${userName}.
Your job: classify messages and extract entities. Be decisive, never over-classify.

Aktuálny reálny dátum a čas je: **${new Date().toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}**. 
Zohľadni to pri "dnes", "včera", "tento týždeň".

CLASSIFICATION RULES:

TASK — Use when the message:
- Requests any CRM action (find, create, update, delete, send, analyze, show, list)
- Asks about CRM data ("koľko mám dealov", "čo má Peter za projekty", "aké mám úlohy")
- Is a follow-up to a previous TASK ("a čo má za úlohy?", "pošli mu email", "ktorý je najhodnotnejší?")
- Contains implicit CRM intent ("čo mám dnes v pláne?" → fetch tasks for today)

CONVERSATION — Use ONLY when:
- Pure greeting or small talk with zero actionable intent ("ahoj", "ako sa máš", "super ďakujem")
- Expression of emotion without any implied action ("som nahnevaný" — no specific client mentioned)
- General knowledge question unrelated to CRM or current events

DEFAULT: When in doubt → TASK.

IMPLICIT INTENT MAPPING (always resolve these to TASK):
- "čo mám dnes v pláne?" → fetch tasks due today + calendar
- "čo mám zajtra?" → fetch tasks due tomorrow
- "aké mám úlohy?" → fetch all open tasks
- "ako idú dealy?" → fetch pipeline stats
- "kto sú moji klienti?" → fetch contacts

CONTEXT AWARENESS:
When the message is a short follow-up ("a čo má za úlohy?", "pošli mu reminder", "ktorý je najhodnotnejší?"),
look at the last 3 conversation turns to identify the active entity (contact, deal, project).
Carry that entity forward into orchestrator_brief — never lose context between turns.

ENTITY EXTRACTION:
Extract all mentioned: contacts, companies, projects, emails, deals.
For follow-up messages: re-extract entities from conversation history if not present in current message.

OUTPUT FORMAT (strict JSON):
{
  "type": "TASK" | "CONVERSATION",
  "confidence": 0.0-1.0,
  "reason": "one sentence",
  "orchestrator_brief": {
    "goal": "clear objective in Slovak",
    "entities": { "contacts": [], "companies": [], "projects": [], "emails": [] },
    "constraints": [],
    "negative_constraints": [],
    "ambiguities": []
  }
}
`;

    const prompt = `RECENT CONVERSATION (last 3 messages):
${recentContext}

NEW MESSAGE: "${lastUserMessage.substring(0, 2000)}"

Classify the NEW MESSAGE. Consider context from recent conversation for follow-up detection.`;

    console.log(`${tag} Calling AI model: ${AI_MODELS.ROUTER}`);
    const aiStart = Date.now();

    const response = await generateText({
      model: google(AI_MODELS.ROUTER),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0,
    });

    console.log(`${tag} AI call finished in ${Date.now() - aiStart}ms`);

    trackAICall(
      "conversational",
      "gemini",
      AI_MODELS.ROUTER,
      systemPrompt + recentContext + lastUserMessage,
      response.text,
      Date.now() - start,
      (response.usage as any).promptTokens ?? (response.usage as any).inputTokens ?? 0,
      (response.usage as any).completionTokens ?? (response.usage as any).outputTokens ?? 0
    );

    const rawText = response.text || "";
    console.log(`${tag} Raw output (first 500): ${rawText.substring(0, 500)}`);

    const startIdx = rawText.indexOf("{");
    const endIdx = rawText.lastIndexOf("}");

    if (startIdx === -1) {
      console.error(`${tag} No JSON found in response. Defaulting to TASK.`);
      throw new Error("No JSON found");
    }

    const clean = rawText.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(clean);

    console.log(`${tag} Classification: ${parsed.type} (confidence=${parsed.confidence}, reason=${parsed.reason})`);
    console.log(`${tag} Entities: ${JSON.stringify(parsed.orchestrator_brief?.entities ?? {})}`);

    // Backward compatibility: also expose flat orchestrator_brief string for old callers
    const briefObj = parsed.orchestrator_brief ?? {};
    const flatBrief = typeof briefObj === "string"
      ? briefObj
      : `${briefObj.goal || lastUserMessage} | entities: ${JSON.stringify(briefObj.entities || {})}`;

    return {
      type: parsed.type ?? "TASK",
      confidence: parsed.confidence ?? 0.9,
      reason: parsed.reason ?? "",
      orchestrator_brief: flatBrief,
      orchestrator_brief_structured: briefObj,
      negative_constraints: parsed.negative_constraints ?? [],
    };
  } catch (error: any) {
    console.error(`${tag} Error: ${error.message}. Defaulting to TASK.`);
    // Default to TASK — safer than silently losing actionable requests
    return {
      type: "TASK",
      confidence: 0.5,
      reason: `Fallback: ${error.message}`,
      orchestrator_brief: lastUserMessage,
      orchestrator_brief_structured: { goal: lastUserMessage, entities: {} },
      negative_constraints: [],
    };
  }
}
