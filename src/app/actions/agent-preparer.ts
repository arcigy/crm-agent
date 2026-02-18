"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function validateActionPlan(
  intent: string,
  steps: any[],
  conversationHistory: any[]
) {
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
3. VALIDATE: Ensure all REQUIRED parameters for each tool are present.
4. HEAL: If a required ID is missing but exists in the CONVERSATION HISTORY, inject it into the step.
5. VERDICT: Decide if the plan is safe to execute.

RULES:
1. FUZZY MATCHING: If the AI sends 'client_name' but the tool needs 'first_name/last_name', try to split the string and heal it.
2. NOMENCLATURE ALIGNMENT: Tools follow 'snake_case'. If the AI uses 'camelCase', convert it.
3. COMPLETENESS: If a required argument is strictly missing and cannot be found in HISTORY, set 'valid' to false and ask a specific question.
4. PROACTIVE CORRECTION: You are encouraged to modify the 'validated_steps' to make them 100% technically correct. Small errors should NEVER stop the system; heal them and move forward.

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], // Only if valid=false.
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

    try {
        const cleanText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        return {
            valid: parsed.valid ?? false,
            questions: parsed.questions ?? [],
            validated_steps: parsed.validated_steps ?? steps
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
