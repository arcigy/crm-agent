"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { AI_MODELS } from "@/lib/ai-providers";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function routeIntent(
  lastUserMessage: string,
  history: any[]
) {
  const start = Date.now();
  try {
    const systemPrompt = `
      Si Router (Triedič) v CRM systéme.
      Tvojou úlohou je rozhodnúť, či správa užívateľa vyžaduje použitie nástrojov (TASK), alebo je to len bežná konverzácia (CONVERSATION).
      
      Kategórie:
      1. **TASK**: Užívateľ chce niečo spraviť, zistiť, nájsť, poslať, vytvoriť. (napr. "Nájdi email", "Vytvor kontakt", "Odpíš mu", "Kedy mám čas?", "Zanalyzuj tento text").
      2. **CONVERSATION**: Bežný pozdrav, poďakovanie, filozofická otázka, alebo reakcia na predošlú odpoveď bez novej požiadavky. (napr. "Ahoj", "Ďakujem", "Ako sa máš?", "Super").
      
      Výstup (JSON):
      {
        "type": "TASK" | "CONVERSATION",
        "reason": "Detailed reasoning in English",
        "orchestrator_brief": "If TASK, translate and expand the user's request into a highly precise English instruction for the Strategic Planner. Be very specific about details mentioned by the user. If CONVERSATION, keep empty.",
        "negative_constraints": ["List of explicit negative constraints mentioned by the user in English (e.g., 'Do not send email', 'Do not delete record'). ONLY include things the user explicitly forbade. If none, empty array."]
      }
    `;

    const response = await generateText({
      model: google(AI_MODELS.ROUTER), 
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(history?.slice?.(-2).map(m => ({ ...m, content: m.content?.substring(0, 1000) })) || [])}\n\nMESSAGE:\n${lastUserMessage.substring(0, 2000)}`,
    });

    trackAICall(
        "conversational",
        "gemini",
        AI_MODELS.ROUTER,
        systemPrompt + JSON.stringify(history) + lastUserMessage,
        response.text,
        Date.now() - start,
        (response.usage as any).promptTokens ?? (response.usage as any).inputTokens ?? 0,
        (response.usage as any).completionTokens ?? (response.usage as any).outputTokens ?? 0
    );

    const rawText = response.text || "";
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    
    if (startIdx === -1) {
        throw new Error("No JSON found");
    }

    const clean = rawText.substring(startIdx, endIdx + 1);
    return JSON.parse(clean);

  } catch (error: any) {
    console.error("Router Error:", error);
    return { 
      type: "CONVERSATION", 
      reason: `Fallback: ${error.message}`,
      orchestrator_brief: "",
      negative_constraints: []
    };
  }
}
