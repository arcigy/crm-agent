"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";

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
You are the Supreme Action Preparer and Normalizer for a High-Stakes Business CRM. Your mission is to be the "Safety Net" that heals minor discrepancies between the AI Orchestrator's plan and the literal technical requirements of the tools.

TASK:
1. ANALYZE the PROPOSED STEPS from the Orchestrator.
2. NORMALIZE the naming conventions: 
   - Mapping 'tool' or 'toolName' to 'tool_name'.
   - Mapping 'args' to 'arguments'.
   - Correcting argument keys (e.g., 'contactId' -> 'contact_id', 'id' -> 'contact_id', etc.).
3. VALIDATE: Ensure all REQUIRED parameters for **EACH TOOL PRESENT IN THE STEPS** are provided.
4. HEAL: If a required ID for a tool *in the steps* is missing but exists in history, inject it.
5. VERDICT: Decide if the plan is safe to execute.

RULES:
1. PROACTIVE EXPLORATION: If the steps focus on SEARCHING (e.g., db_search_contacts), the plan is VALID even if the final action (e.g., db_create_note) is not present yet. Do NOT block search steps just because the final action's IDs are missing.
2. NOMENCLATURE ALIGNMENT: Tools follow 'snake_case'. If the AI uses 'camelCase', convert it.
3. COMPLETENESS: Only set 'valid' to false if a tool **ALREADY IN THE STEPS** is missing a strictly required argument that you cannot heal.
4. HEALING IS BETTER THAN ASKING: If you can make a step work by fixing a key or finding an ID in history, do it. Only ask questions as a last resort.

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], // Only if valid=false and you cannot heal the steps.
  "validated_steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}

SPECIFICS:
Accuracy is key, but flexibility is your superpower. Your goal is to make the system 'Antifragile'.
`;

    const prompt = `
      TOOLS DEFINITIONS:
      ${JSON.stringify(toolsContext, null, 2)}
      
      INTENT:
      ${intent}
      
      PROPOSED STEPS:
      ${JSON.stringify(steps, null, 2)}
      
      CONVERSATION HISTORY (Last 5 messages):
      ${JSON.stringify(conversationHistory.slice(-5), null, 2)}
    `;

    const response = await generateText({
      model: google("gemini-2.0-flash"), // Efficient model for argument validation
      system: systemPrompt,
      prompt: prompt,
    });

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
        const cleanText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        
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
