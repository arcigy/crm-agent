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
      9. V poli 'steps' používaj VÝHRADNE kľúče "tool" (meno nástroja) a "args" (argumenty). NEPOUŽÍVAJ tool_name ani arguments.

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
      model: google("gemini-2.0-flash"), // Flash is fast and works reliably
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(conversationHistory.slice(-5))}\n\nUSER INPUT:\n${lastUserMessage}`,
    });

    try {
        let rawText = response.text.trim();
        
        // Find first '{' and last '}'
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        let jsonText = (firstBrace !== -1 && lastBrace !== -1) 
            ? rawText.substring(firstBrace, lastBrace + 1)
            : rawText;

        // Quote bare ??? tokens - handle both comma and closing brace
        jsonText = jsonText
            .replace(/:\s*\?\?\?\s*([,}])/g, ': "???"$1');
            
        try {
            const parsed = JSON.parse(jsonText);
            
            // Normalization
            if (parsed.steps && Array.isArray(parsed.steps)) {
                parsed.steps = parsed.steps.map((s: any) => ({
                    tool: s.tool || s.tool_name || s.name,
                    args: s.args || s.arguments || s.params || {}
                }));
            }
            return parsed;
        } catch (jsonErr: any) {
            console.error("Orchestrator JSON.parse failed on:", jsonText);
            console.error("Error:", jsonErr.message);
            throw jsonErr;
        }
    } catch (e) {
        return {
            intent: "error_parsing",
            thought: "Failed to parse JSON plan after cleanup.",
            steps: []
        };
    }
} catch (error: any) {
    console.error("Orchestrator Fatal Error:", error);
    return {
        intent: "error",
        thought: error.message,
        steps: []
    };
}
}
