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
const gemini = geminiBase.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function runGatekeeper(
  messages: ChatMessage[],
): Promise<ChatVerdict> {
  const prompt = `Si klasifikátor správ pre AI agenta. Zaraď poslednú správu do INFO_ONLY alebo ACTION.\r\n\r\nDEFINÍCIE:\r\nINFO_ONLY = správa pýtajúca sa VŠEOBECNE (bez konkrétneho cieľa, osoby, firmy alebo objektu)\r\nACTION = správa požadujúca KONKRÉTNU OPERÁCIU (aj keď je formulovaná zdvorilo ako otázka)\r\n\r\nKĽÚČOVÁ OTÁZKA: Existuje v správe konkrétny cieľ (meno, firma, email, projekt, úloha)?\r\n- ÁNO → ACTION\r\n- NIE → INFO_ONLY\r\n\r\nINFO_ONLY PRÍKLADY (žiadny konkrétny cieľ alebo nemožná akcia):\r\n1. "Vieš vyhľadávať na webe?" → INFO_ONLY\r\n2. "Čo všetko dokážeš?" → INFO_ONLY\r\n3. "Ahoj, ako sa máš?": INFO_ONLY\r\n4. "Urob mi kávu" → INFO_ONLY (nemôžem fyzicky robiť kávu)\r\n5. "Zabehni do obchodu" → INFO_ONLY (nemožné)\r\n6. "Povedz mi vtip" → INFO_ONLY (pohovory/pokec)\r\n\r\nACTION PRÍKLADY (vždy ak je tam operácia s CRM dátami alebo informáciami):\r\n1. "Môžeš mi poslať email Martinovi?": ACTION, extracted_data: { "action_type": "send_email", "entities": { "contact_name": "Martin" } }\r\n2. "Vytvor mi úlohu zavolať Petrovi": ACTION, extracted_data: { "action_type": "create_task", "entities": { "contact_name": "Peter", "task_description": "zavolať" } }\r\n3. "Nájdi firmu ESET": ACTION, extracted_data: { "action_type": "search_company", "entities": { "company_name": "ESET" } }\r\n4. "Vytvor poznámku o kave": ACTION, extracted_data: { "action_type": "create_note", "entities": { "note_topic": "káva" } }\r\n5. "Vytvor mi kontakt Marek Stehlík, +421951741852, stehlik@gmail.comn poznamka: veľmi milý človek": ACTION, extracted_data: { "action_type": "create_contact", "entities": { "first_name": "Marek", "last_name": "Stehlík", "phone": "+421951741852", "email": "stehlik@gmail.com", "comments": "veľmi milý človek" } }\r\n\r\nOdpovedaj LEN JSON bez markdown. Pre ACTION intent, MUSÍŠ vyplniť "extracted_data" s "action_type" a relevantnými "entities" (napr. "first_name", "email", "phone", "comments" pre kontakt).`;
  const start = Date.now();
  const historyText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const res = await withRetry(() => generateText({
    model: google("gemini-2.0-flash"),
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
    "gemini-2.0-flash",
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
  const prompt = `Si ArciGy AI Agent pre CRM systém. \r\n JAZYK: Slovenčina. ŠTÝL: Stručný, priamy (1-2 vety).\r\n SCHOPNOSTI: Môžeš vyhľadávať na webe (Google Search), scrapovať stránky, pracovať s kontaktmi/projektmi/dealmi/poznámkami/úlohami v CRM, čítať a písať emaily (Gmail), analyzovať prílohy, pamätať si fakty o užívateľovi, vykonávať multi-step akcie.\r\n KONTEXT: Užívateľ "${context.user_nickname}".\r\n OTÁZKA: ${userText}\r\n Odpovedaj priamo a stručne. Ak sa pýta na tvoje schopnosti, odpovedaj áno/nie + krátke vysvetlenie.`;
  const start = Date.now();
  const res = await withRetry(() => gemini.generateContent(prompt));
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
  const prompt = `JAZYK: Slovenčina. ŠTÝL: Extrémne stručný report (max 2 vety). \r\n     ${orchestratorMessage ? `POVINNOSŤ: Odpovedz na základe tohto odkazu od orchestrátora: "${orchestratorMessage}".` : "Povedz presne čo si spravil a čo je výsledok."}\r\n     DÔLEŽITÉ: Ak sú výsledky prázdne ([]), jednoducho povedz užívateľovi, že si nenašiel nič nové alebo misia nevyžadovala ďalšie akcie. NEVYMÝŠĽAJ SI.\r\n     Výsledky akcií: ${JSON.stringify(results)}`;
  const start = Date.now();
  const res = await withRetry(() => gemini.generateContent(prompt));
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
