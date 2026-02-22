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
    // ONLY include documentation for tools that are actually in the proposed steps
    const proposedToolNames = new Set(steps.map(s => s.tool));
    const toolsContext = ALL_ATOMS
      .filter(t => proposedToolNames.has(t.function.name))
      .map((t) => {
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
You are the Action Preparer (Safety Net) for a CRM agent. Your job: validate and heal the plan.

TASK:
1. HEAL: If a required ID is missing in PROPOSED STEPS, find it in MISSION HISTORY and INJECT it.
2. DETECT AMBIGUITY: If multiple items exist and you can't decide, set valid:false and ask the user.
3. TRUST SEARCH: Never block search tools if they have a query.

SCHEMA FOR CURRENT STEPS:
${toolsContext}

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], 
  "validated_steps": [ { "tool": "tool_name", "args": { "key": "value" } } ]
}
`;

    // Aggressive mission history compression for Preparer
    const compressedHistory = missionHistory.slice(-3).map(h => {
        return h.steps.map((s: any) => {
            let res = s.result as any;
            if (res && res.success && res.data) {
                const data = Array.isArray(res.data) ? res.data : [res.data];
                res = { success: true, data: data.slice(0, 5).map((item: any) => {
                    const { date_created, date_updated, deleted_at, user_email, google_id, labels, comments, ...essential } = item;
                    // Truncate long strings
                    Object.keys(essential).forEach(key => {
                        if (typeof essential[key] === 'string' && essential[key].length > 150) {
                            essential[key] = essential[key].substring(0, 150) + "...";
                        }
                    });
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
