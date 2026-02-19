"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

import { trackAICall } from "@/lib/ai-cost-tracker";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function verifyExecutionResults(
  originalIntent: string,
  results: any[]
) {
  const start = Date.now();
  try {
    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status !== "success").length;

    const systemPrompt = `
      Si Verifier (Kontrolór) v CRM systéme.
      Tvojou úlohou je zhodnotiť výsledok vykonania série nástrojov a sformulovať finálnu odpoveď pre užívateľa.
      
      Vstupy:
      1. Pôvodný zámer (Intent): Čo chcel užívateľ dosiahnuť.
      2. Výsledky (Results): Čo sa reálne stalo.
      
      Pravidlá:
      - Ak všetko prebehlo OK, napíš stručnú a pozitívnu správu (napr. "Vybavené. Email bol odoslaný.").
      - Ak nastala chyba, vysvetli ju ľudsky a zrozumiteľne.
      - Ak nástroj vrátil nejaké dáta (napr. zoznam emailov), zhrň ich v odpovedi.
      - Odpovedaj v slovenčine.
    `;

    const response = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: `INTENT: ${originalIntent}\n\nRESULTS:\n${JSON.stringify(
        results,
        null,
        2
      )}`,
    });

    trackAICall(
        "verifier",
        "gemini",
        "gemini-2.0-flash",
        systemPrompt + originalIntent,
        response.text,
        Date.now() - start,
        (response.usage as any).promptTokens || (response.usage as any).inputTokens,
        (response.usage as any).completionTokens || (response.usage as any).outputTokens
    );

    return {
      success: failCount === 0,
      analysis: response.text,
      stats: { success: successCount, failed: failCount },
    };
  } catch (error: any) {
    console.error("Verifier Error:", error);
    return {
      success: false,
      analysis: "Nepodarilo sa overiť výsledky spracovania.",
      error: error.message,
    };
  }
}
