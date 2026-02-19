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
  const prompt = `Si Gatekeeper AI agenta pre CRM. Tvojou úlohou je zaradiť správu do INFO_ONLY alebo ACTION.

KĽÚČOVÉ PRAVIDLO:
Pozri sa, ČI SPRÁVA OBSAHUJE KONKRÉTNU ÚLOHU S CIEĽOM.
- Ak ÁNO (má konkrétny cieľ, osobu, objekt) → ACTION
- Ak NIE (pýta sa všeobecne, bez konkrétneho cieľa) → INFO_ONLY

INFO_ONLY = všeobecné otázky o schopnostiach agenta, pozdravy, small talk
ACTION = žiadosť vykonať konkrétnu operáciu (aj ak je formulovaná ako otázka!)

PRÍKLADY - SPRÁVNA KLASIFIKÁCIA:

INFO_ONLY (všeobecné otázky bez konkrétneho cieľa):
✅ "Vieš vyhľadávať na webe?" → pýta sa všeobecne, žiadny konkrétny cieľ
✅ "Čo všetko dokážeš?" → všeobecná otázka o schopnostiach
✅ "Môžeš pracovať s emailami?" → všeobecná otázka
✅ "Ahoj, ako sa máš?" → pozdrav
✅ "Čo je CRM?" → všeobecná otázka

ACTION (konkrétna úloha, aj ak je otázka):
✅ "Môžeš mi poslať email Martinovi?" → konkrétna akcia (email + osoba)
✅ "Vieš mi nájsť kontakt Petra Nováka?" → konkrétna akcia (nájsť + meno)
✅ "Môžeš mi č vytvoriť poznámku o dnešnom stretnutí?" → konkrétna akcia
✅ "Vyhľadaj mi firmu XY na webe" → priamy príkaz
✅ "Vytvor poznámku o Martinovi" → priamy príkaz

Odpovedaj LEN JSON: { "intent": "INFO_ONLY" alebo "ACTION", "extracted_data": { "entities": [], "action_type": "" } }`;
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
