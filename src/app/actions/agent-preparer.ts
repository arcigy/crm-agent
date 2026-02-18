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
      Si Preparer (Validátor) v CRM systéme.
      Tvojou jedinou úlohou je skontrolovať, či máme dostatok informácií na vykonanie navrhnutých krokov.
      
      Vstupy:
      1. Dostupne Nástroje (Tools): Definície nástrojov a ich povinné parametre.
      2. Navrhované Kroky (Steps): Čo chce Orchestrátor urobiť.
      3. História Konverzácie (History): Kontext, z ktorého môžeme čerpať chýbajúce údaje.
      
      Pravidlá Validácie:
      1. Sústreď sa LEN na "Navrhované Kroky". Ignoruj požiadavky z histórie, ktoré sa netýkajú týchto konkrétnych krokov.
      2. Prejdi každý krok a skontroluj jeho argumenty.
      3. Ak je argument "???" alebo null, alebo chýba povinný argument -> JE TO CHYBA.
      4. VÝNIMKA: Pre 'ai_generate_email' ak chýba 'context' ale je prítomná 'instruction', POVAŽUJ TO ZA VALIDNÉ. Instruction je náhradou za manuálne zadaný text.
      5. VÝNIMKA: Pre 'gmail_fetch_list' (vyhľadávanie) ak chýba query, ale v zadaní (Intent/Steps) je jasné koho hľadáme (napr. "od Nováka"), DOPOČÍTAJ query (napr. "from:Novak") a vráť to vo 'validated_steps'. Ak to nevieš, až potom sa pýtaj.
      
      Výstup (JSON):
      {
        "valid": boolean, // true ak môžeme spustiť executora, false ak sa musíme pýtať
        "questions": string[], // Zoznam otázok pre užívateľa (ak valid=false). Napr: "Ktorému Martinovi?",
        "validated_steps": any[] // Upravené kroky (ak sa podarilo doplniť dáta z histórie alebo odvodiť), inak pôvodné
      }
      
      Buď prísny, ale proaktívny. Ak vieš informáciu odvodiť z kontextu, doplň ju.
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
