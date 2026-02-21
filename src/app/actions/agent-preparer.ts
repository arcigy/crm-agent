"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { withRetry } from "@/lib/ai-retry";
import { AI_MODELS } from "@/lib/ai-providers";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function validateActionPlan(
  intent: string,
  steps: any[],
  conversationHistory: any[],
  missionHistory: any[] = []
) {
  const start = Date.now();
  try {
    // Compact tool documentation to save prompt space
    const toolsContext = ALL_ATOMS.map((t) => {
      const p = t.function.parameters?.properties || {};
      const required = t.function.parameters?.required || [];
      const paramsSummary = Object.keys(p).map(k => {
        const isReq = required.includes(k) ? "*" : "";
        return `${isReq}${k}`;
      }).join(",");
      return `${t.function.name}(${paramsSummary})`;
    }).join(" | ");

    const systemPrompt = `
ROLE:
You are the Action Preparer (Safety Net) for a CRM agent. Your job: validate and heal the plan, and detect user-facing ambiguity.

TASK:
1. HEAL: If a required ID (e.g., contact_id) is missing in PROPOSED STEPS, but you see it in the PREVIOUS ITERATION RESULTS (mission history), INJECT IT into the arguments.
2. DETECT AMBIGUITY: If the mission history contains MULTIPLE items and the NEXT STEPS require picking one, set valid: false and ask the user to choose.
3. VALIDATE: Only block (valid:false) if a required argument is truly missing and cannot be found in the history.
4. TRUST THE SEARCH: Never block search tools (web_search_google, db_search_contacts, etc.) if they have a query.

RULES:
- Be concise. One witty Slovak sentence if valid:false.
- If the agent just fetched a list to perform an action on them, the IDs are valid. DO NOT ask the user "which ones" if the agent is already targeting them by ID.

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], 
  "validated_steps": [ { "tool": "tool_name", "args": { "key": "value" } } ]
}
`;

    // Compress mission history for the prompt
    const compressedHistory = missionHistory.slice(-3).map(h => {
        return h.steps.map((s: any) => {
            let res = s.result as any;
            if (res && res.success && Array.isArray(res.data)) {
                res = { success: true, data: res.data.slice(0, 5).map((item: any) => {
                    const { date_created, date_updated, deleted_at, user_email, ...essential } = item;
                    return essential;
                })};
            }
            return { tool: s.tool, status: s.status, result: res };
        });
    });

    const prompt = `
      INTENT: ${intent}
      PROPOSED STEPS: ${JSON.stringify(steps)}
      CHAT HISTORY: ${JSON.stringify(conversationHistory.slice(-3))}
      MISSION HISTORY (Last results): ${JSON.stringify(compressedHistory)}
    `;

    console.log(`[PREPARER] Prompt length: ${systemPrompt.length + prompt.length} chars`);

    const response = await withRetry(() => generateText({
      model: google(AI_MODELS.PREPARER), 
      system: systemPrompt,
      prompt: prompt,
    }));

    trackAICall(
        "orchestrator", // Using orchestrator as phase for now
        "gemini",
        AI_MODELS.PREPARER,
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
