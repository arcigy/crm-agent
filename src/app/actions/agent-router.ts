"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { trackAICall } from "@/lib/ai-cost-tracker";

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
        "reason": "Vysvetlenie"
      }
    `;

    const response = await generateText({
      model: google("gemini-2.0-flash"), 
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(history?.slice?.(-2) || [])}\n\nMESSAGE:\n${lastUserMessage}`,
    });

    trackAICall(
        "conversational",
        "gemini",
        "gemini-2.0-flash",
        systemPrompt + lastUserMessage,
        response.text,
        Date.now() - start,
        (response.usage as any).inputTokens,
        (response.usage as any).outputTokens
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
    return { type: "CONVERSATION", reason: `Fallback: ${error.message}` };
  }
}
