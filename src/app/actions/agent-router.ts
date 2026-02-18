"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function routeIntent(
  lastUserMessage: string,
  history: any[]
) {
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
      model: google("gemini-2.0-flash"), // Fast & cost-effective model for routing
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(history.slice(-2))}\n\nMESSAGE:\n${lastUserMessage}`,
    });

    try {
        const cleanText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (e) {
        return { type: "CONVERSATION", reason: "Fallback on parse error" };
    }

  } catch (error) {
    console.error("Router Error:", error);
    return { type: "CONVERSATION", reason: "Fallback on error" };
  }
}
