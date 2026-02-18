"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function orchestrateParams(
  lastUserMessage: string | null,
  conversationHistory: any[]
) {
  try {
    const toolsDocs = ALL_ATOMS.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const systemPrompt = `
      Si Orchestrátor (Plánovač) v CRM systéme.
      Tvojou úlohou je rozložiť požiadavku užívateľa na sériu atomických krokov (tools).

      Dostupné Nástroje:
      ${JSON.stringify(toolsDocs.map(t => ({name: t.name, desc: t.description, params: t.parameters})), null, 2)}
      
      Pravidlá:
      1. VŽDY SKONTROLUJ HISTÓRIU na výsledky predošlých toolov. Ak nástroj (napr. 'db_search_contacts' alebo 'db_create_project') vrátil "id" alebo dáta v poli "data", POUŽI TIETO HODNOTY namiesto "???".
      2. Uprednostňuj ITERATÍVNE PLÁNOVANIE. Ak ti chýba ID, naplánuj len hľadanie ('db_search_contacts'). Nenaplánuj ďalšie kroky s "???", ak ich môžeš naplánovať v ďalšej iterácii s reálnym ID.
      3. PRI HĽADANÍ E-MAILOV OD OSOBY:
         - VŽDY najprv skús nájsť kontakt v CRM ('db_search_contacts').
         - Až keď máš email z CRM, použi 'gmail_fetch_list' s query 'from:email@adresa'.
         - Iba ak kontakt v CRM nenájdeš, použi 'gmail_fetch_list' priamo s menom ('from:Meno').
      5. Ak je úloha HOTOVÁ, vráť prázdne pole 'steps: []'.
      6. VÝSTUP MUSÍ BYŤ ČISTÝ JSON. Žiadne kecy okolo.
      7. NIKDY neopakuj ten istý krok s tými istými argumentmi, ak už bol úspešne vykonaný v histórii. Ak je krok hotový, prejdi na ďalší alebo vráť prázdne pole.
      8. Ak nevieš ID kontaktu/firmy, ale poznáš meno/názov, VŽDY najprv použi 'db_search_contacts' na získanie ID. Nepoužívaj "???" hneď v prvom kroku, ak môžeš ID zistiť vyhľadávaním.

      Výstup (JSON):
      {
        "intent": "stručný_názov_zámeru",
        "thought": "krátke vysvetlenie prečo si zvolil tieto kroky",
        "steps": [
          { "tool": "názov_toolu", "args": { ... } }
        ]
      }
    `;

    const response = await generateText({
      model: google("gemini-3-pro-preview"),
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(conversationHistory.slice(-5))}\n\nUSER INPUT:\n${lastUserMessage}`,
    });

    try {
        const cleanText = response.text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .replace(/\/\/.*$/gm, "") // Remove single line comments
            .replace(/:\s*\?\?\?/g, ': "???"') // Quote bare ??? tokens for valid JSON
            .trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Orchestrator JSON Parse Error", response.text);
        return {
            intent: "error_parsing",
            thought: "Failed to parse JSON plan.",
            steps: []
        };
    }

  } catch (error: any) {
    console.error("Orchestrator Error:", error);
    return {
        intent: "error",
        thought: error.message,
        steps: []
    };
  }
}
