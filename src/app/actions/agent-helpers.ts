"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
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
import { withRetry } from "@/lib/ai-retry";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const geminiBase = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const gemini = geminiBase.getGenerativeModel({ model: "gemini-2.0-flash-lite-lite" });

export async function runGatekeeper(
  messages: ChatMessage[],
): Promise<ChatVerdict> {
  const prompt = `Si klasifikátor správ pre AI agenta. Zaraď poslednú správu do INFO_ONLY alebo ACTION.

DEFINÍCIE:
INFO_ONLY = správa pýtajúca sa VŠEOBECNE (bez konkrétneho cieľa, osoby, firmy alebo objektu)
ACTION = správa požadujúca KONKRÉTNU OPERÁCIU (aj keď je formulovaná zdvorilo ako otázka)

KĽÚČOVÁ OTÁZKA: Existuje v správe konkrétny cieľ (meno, firma, email, projekt, úloha)?
- ÁNO → ACTION
- NIE → INFO_ONLY

INFO_ONLY PRÍKLADY (žiadny konkrétny cieľ alebo nemožná akcia):
1. "Vieš vyhľadávať na webe?" → INFO_ONLY
2. "Čo všetko dokážeš?" → INFO_ONLY
3. "Ahoj, ako sa máš?" → INFO_ONLY
4. "Urob mi kávu" → INFO_ONLY (nemôžem fyzicky robiť kávu)
5. "Zabehni do obchodu" → INFO_ONLY (nemožné)
6. "Povedz mi vtip" → INFO_ONLY (pohovory/pokec)

ACTION PRÍKLADY (vždy ak je tam operácia s CRM dátami alebo informáciami):
1. "Môžeš mi poslať email Martinovi?" → ACTION (cieľ: Martin)
2. "Vytvor mi úlohu zavolať Petrovi" → ACTION (cieľ: Peter)
3. "Nájdi firmu ESET" → ACTION (cieľ: ESET)
4. "Vytvor poznámku o kave" → ACTION (cieľ: poznámka o káve - digitálne)

Odpovedaj LEN JSON bez markdown: { "intent": "INFO_ONLY", "extracted_data": { "entities": [], "action_type": "" } }`;
  const start = Date.now();
  const historyText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const res = await withRetry(() => generateText({
    model: google("gemini-2.0-flash-lite-lite"),
    system: prompt,
    prompt: historyText,
    temperature: 0,
  }));
  const rawOutput = res.text.trim();
  const firstBrace = rawOutput.indexOf("{");
  const lastBrace = rawOutput.lastIndexOf("}");
  const output = firstBrace !== -1 ? rawOutput.substring(firstBrace, lastBrace + 1) : '{"intent":"ACTION","extracted_data":{}}';
  trackAICall(
    "gatekeeper",
    "gemini",
    "gemini-2.0-flash-lite-lite",
    prompt,
    output,
    Date.now() - start,
    (res.usage as any)?.inputTokens,
    (res.usage as any)?.outputTokens,
  );
  try {
    return JSON.parse(output) as ChatVerdict;
  } catch {
    return { intent: "ACTION", extracted_data: {} } as ChatVerdict;
  }
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
  const res = await withRetry(() => gemini.generateContent(prompt));
  const output = res.response?.text() || "Chyba AI poskytovateľa.";
  trackAICall(
    "conversational",
    "gemini",
    "gemini-2.0-flash-lite-lite",
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
    ${orchestratorMessage ? `POVINNOSŤ: Odpovedz na základe tohto odkazu od orchestrátora: "${orchestratorMessage}".` : "Povedz presne čo si spravil a čo je výsledok."}
    DÔLEŽITÉ: Ak sú výsledky prázdne ([]), jednoducho povedz užívateľovi, že si nenašiel nič nové alebo misia nevyžadovala ďalšie akcie. NEVYMÝŠĽAJ SI.
    Výsledky akcií: ${JSON.stringify(results)}`;
  const start = Date.now();
  const res = await withRetry(() => gemini.generateContent(prompt));
  let output = res.response?.text() || "Misia dokončená.";

  trackAICall(
    "reporter",
    "gemini",
    "gemini-2.0-flash-lite-lite",
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
