"use server";

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { trackAICall, endCostSession } from "@/lib/ai-cost-tracker";
import { AIContextBundle } from "@/lib/ai-context";
import {
  ChatMessage,
  ChatVerdict,
  AgentStep,
  MissionHistoryItem,
} from "./agent-types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const geminiBase = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const gemini = geminiBase.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function runGatekeeper(
  messages: ChatMessage[],
): Promise<ChatVerdict> {
  const prompt = `Si Gatekeeper AI agenta pre CRM. Tvojou úlohou je zaradiť správu do jednej z dvoch kategórií.

INFO_ONLY = otázka, pozdrav, všeobecná konverzácia, otázka o schopnostiach agenta, žiadosť o vysvetlenie.
ACTION = žiadosť o vykonanie konkrétnej operácie v systéme (vytvor, uprav, zmaž, nájdi, pošli, pridaj...).

PRÍKLADY INFO_ONLY:
- "Vieš vyhľadávať na webe?"
- "Čo všetko dokážeš?"
- "Ahoj, ako sa máš?"
- "Vysvetli mi čo je CRM"
- "Môžeš mi pomôcť s emailom?"
- Akákoľvek otázka začínajúca: Vieš...? Môžeš...? Čo je...? Ako...?

PRÍKLADY ACTION:
- "Vytvor poznámku o stretnutí s Martinom"
- "Nájdi kontakt Jana Nováka"
- "Uprav projekt WebDev"
- "Pošli email Petrovi"

Odpovedaj LEN JSON formátom: { "intent": "INFO_ONLY" alebo "ACTION", "extracted_data": { "entities": [], "action_type": "" } }`;
  const start = Date.now();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }, ...messages],
    response_format: { type: "json_object" },
  });
  const output = res.choices[0].message.content || "{}";
  trackAICall(
    "gatekeeper",
    "openai",
    "gpt-4o-mini",
    prompt,
    output,
    Date.now() - start,
    res.usage?.prompt_tokens,
    res.usage?.completion_tokens,
  );
  return JSON.parse(output) as ChatVerdict;
}

export async function handleInfoOnly(
  messages: ChatMessage[],
  context: AIContextBundle,
  superState: ReturnType<typeof createStreamableValue>,
  verdict: ChatVerdict,
) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const prompt = `Si ArciGy AI Agent pre CRM systém. 
JAZYK: Slovenčina. ŠTÝL: Stručný, priamy (1-2 vety).
SCHOPNOSTI: Môžeš vyhľadávať na webe (Google Search), scrapovať stránky, pracovať s kontaktmi/projektmi/dealmi/poznámkami/úlohami v CRM, čítať a písať emaily (Gmail), analyzovať prílohy, pamätať si fakty o užívateľovi, vykonávať multi-step akcie.
KONTEXT: Užívateľ "${context.user_nickname}".
OTÁZKA: ${userText}
Odpovedz priamo a stručne. Ak sa pýta na tvoje schopnosti, odpovedz áno/nie + krátke vysvetlenie.`;
  const start = Date.now();
  const res = await gemini.generateContent(prompt);
  const output = res.response?.text() || "Chyba AI poskytovateľa.";
  trackAICall(
    "conversational",
    "gemini",
    "gemini-2.0-flash",
    prompt,
    output,
    Date.now() - start,
  );

  superState.done({
    content: output,
    status: "done",
    thoughts: {
      intent: "Informačná odpoveď",
      extractedData: verdict.extracted_data,
      plan: ["Odpovedám..."],
    },
    costTracking: endCostSession(),
  });
}

export async function runFinalReporter(
  messages: ChatMessage[],
  results: AgentStep[],
  history: MissionHistoryItem[],
  attempts: number,
  verdict: ChatVerdict,
  superState: ReturnType<typeof createStreamableValue>,
  lastPlan?: any,
) {
  const orchestratorMessage = lastPlan?.message ? `Orchestrátor odkázal: ${lastPlan.message}` : "";
  const prompt = `JAZYK: Slovenčina. ŠTÝL: Extrémne stručný report (max 2 vety). 
    ${orchestratorMessage ? `POVINNOSŤ: Odpovedz na základe tohto odkazu od orchestrátora: "${orchestratorMessage}".` : "Povedz presne čo si spravil a čo je výsledok. Žiadna omáčka."}
    Výsledky akcií: ${JSON.stringify(results)}`;
  const start = Date.now();
  const res = await gemini.generateContent(prompt);
  let output = res.response?.text() || "Misia dokončená.";

  trackAICall(
    "reporter",
    "gemini",
    "gemini-2.0-flash",
    prompt,
    output,
    Date.now() - start,
  );

  superState.done({
    content: output,
    status: "done",
    toolResults: results,
    attempt: attempts,
    thoughts: {
      intent: "Misia dokončená",
      extractedData: verdict.extracted_data,
      plan: history.flatMap((h) => h.steps.map((s) => s.tool)),
    },
    costTracking: endCostSession(),
  });
}
