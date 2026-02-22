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
  history: any[]
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
Si Router (Triedič) v CRM systéme. Tvojou úlohou je rozhodnúť, či správa vyžaduje akciu (TASK), alebo je to bežná konverzácia (CONVERSATION).

## KLASIFIKAČNÉ PRAVIDLÁ (STRICT):

| Signál | → Typ |
|--------|-------|
| Slovesá: vytvor, pridaj, uprav, vymaž, pošli, nájdi, zisti, zavolaj, odpovedaj | TASK |
| Otázky o faktoch, ktoré agent môže zistiť (kontakt, projekt, email...) | TASK |
| Nejasná správa, ale spomína entitu z kontextu (kontakt, firma, projekt) | TASK |
| Bežný pozdrav, poďakovanie, filozofická otázka bez akcie | CONVERSATION |
| "Ako sa máš?", "Ďakujem", "Super" | CONVERSATION |

POZOR:
- Ak je správa follow-up na predošlú konverzáciu (napr. "a pošli mu aj email") → TASK (kontakt je v kontexte)
- Pri pochybnosti → vždy TASK (bezpečnejší default)

## OUTPUT FORMAT (STRICT JSON):
{
  "type": "TASK" | "CONVERSATION",
  "confidence": 0.0-1.0,
  "reason": "Detailed reasoning in English (max 1 sentence)",
  "orchestrator_brief": {
    "goal": "Clean English restatement of what needs to happen",
    "entities": {
      "contacts": ["meno1", "meno2"],
      "companies": ["firma1"],
      "projects": ["projekt1"],
      "emails": ["email@example.com"]
    },
    "constraints": ["Do not send email", ...],
    "ambiguities": ["Unclear which Martin?", ...]
  },
  "negative_constraints": ["English constraint 1", ...]
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
