"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { withRetry } from "@/lib/ai-retry";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function validateActionPlan(
  intent: string,
  steps: any[],
  conversationHistory: any[]
) {
  const start = Date.now();
  try {
    const toolsContext = ALL_ATOMS.map((t) => ({
      name: t.function.name,
      parameters: t.function.parameters,
    }));

    const systemPrompt = `
ROLE:
You are the Action Preparer (Safety Net) for a CRM agent. Your job: validate and heal the plan, and detect user-facing ambiguity.

TASK:
1. NORMALIZE: Fix camelCase to snake_case. Map aliases (id → contact_id, etc.).
2. HEAL: If a required ID is missing but exists in history, inject it.
3. DETECT AMBIGUITY: If the previous step results contain MULTIPLE items (e.g. 2 notes, 3 contacts) and the NEXT STEPS require picking one specific item (e.g. db_update_note, db_delete_contact), the user must choose. Set valid=false and write a short, direct question in Slovak listing the options.
4. VALIDATE: Only block if a required arg is truly missing and cannot be healed.

RULES:
1. Search steps (db_fetch_notes, db_search_contacts) are ALWAYS valid — never block them.
2. HEALING IS BETTER THAN ASKING: Fix if possible. Ask only as last resort.
3. AMBIGUITY CHECK: Look at the PREVIOUS RESULTS in history. If they show 2+ items and the plan needs one specific item, set valid=false and ask which one.
   Example question: "Našiel som 2 poznámky: (1) Názov A, (2) Názov B. Ktorú chceš upraviť?"
4. BREVITY: questions must be 1-2 sentences max in Slovak, no technical jargon.

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], // Max 1 question if valid=false
  "validated_steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    const prompt = `
      TOOLS DEFINITIONS:
      ${JSON.stringify(toolsContext, null, 2)}
      
      INTENT:
      ${intent}
      
      PROPOSED STEPS:
      ${JSON.stringify(steps, null, 2)}
      
      PREVIOUS ITERATION RESULTS (check for multiple items that require user choice):
      ${JSON.stringify(conversationHistory.slice(-3), null, 2)}
    `;

    const response = await withRetry(() => generateText({
      model: google("gemini-2.0-flash"), // Efficient model for argument validation
      system: systemPrompt,
      prompt: prompt,
    }));

    trackAICall(
        "orchestrator", // Using orchestrator as phase for now
        "gemini",
        "gemini-2.0-flash",
        systemPrompt + prompt,
        response.text,
        Date.now() - start,
        (response.usage as any).promptTokens || (response.usage as any).inputTokens,
        (response.usage as any).completionTokens || (response.usage as any).outputTokens
    );

    try {
        let clean = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const startIdx = clean.indexOf('{');
        const endIdx = clean.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
            clean = clean.substring(startIdx, endIdx + 1);
        }

        // Targeted Escape: Only escape control characters that are INSIDE double quotes.
        clean = clean.replace(/"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
            return '"' + p1.replace(/\n/g, "\\n")
                           .replace(/\r/g, "\\r")
                           .replace(/\t/g, "\\t")
                           .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") + '"';
        });

        const parsed = JSON.parse(clean);
        
        let validatedSteps = parsed.validated_steps || steps;
        
        // Ensure normalization of keys for the executor
        if (Array.isArray(validatedSteps)) {
            validatedSteps = validatedSteps.map((s: any) => ({
                tool: s.tool || s.tool_name || s.name,
                args: s.args || s.arguments || s.params || {}
            }));
        }

        return {
            valid: parsed.valid ?? false,
            questions: parsed.questions ?? [],
            validated_steps: validatedSteps
        };
    } catch (e) {
        console.error("Preparer JSON Parse Error", response.text);
        // Fallback: If AI fails to produce JSON, assume invalid and ask generic question
        return {
            valid: false,
            questions: ["Prepáč, nerozumel som presne zadaniu. Môžeš to upresniť?"],
            validated_steps: steps
        };
    }

  } catch (error: any) {
    console.error("Preparer Error:", error);
    return {
      valid: false,
      questions: ["Nastala chyba pri validácii požiadavky."],
      validated_steps: steps,
      error: error.message,
    };
  }
}
