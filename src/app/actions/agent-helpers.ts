"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
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
import { AI_MODELS } from "@/lib/ai-providers";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

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
    model: google(AI_MODELS.GATEKEEPER),
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
    AI_MODELS.GATEKEEPER,
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
  console.log(`[INFO-ONLY] Calling AI, prompt length: ${prompt.length}`);
  let output = "Prepáč, nastal problém s AI odpoveďou.";
  try {
    const res = await withRetry(() => generateText({
      model: google(AI_MODELS.REPORT),
      system: "Si ArciGy CRM asistent. Odpovedaj stručne v slovenčine.",
      prompt,
      temperature: 0.3,
    }));
    output = res.text || "Prepáč, nastal problém s AI odpoveďou.";
    console.log(`[INFO-ONLY] Done in ${Date.now() - start}ms`);
  } catch(err: any) {
    console.error(`[INFO-ONLY] Failed: ${err.message}`);
  }
  trackAICall(
    "conversational",
    "gemini",
    AI_MODELS.REPORT,
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
  // Compress results so the prompt stays small
  const resultsSummary = results.slice(0, 10).map(r => ({
    tool: r.tool,
    status: r.status,
    success: (r.result as any)?.success,
    message: (r.result as any)?.message,
  }));
  const prompt = `JAZYK: Slovenčina. ŠTÝL: Extrémne stručný report (max 2 vety). 
    ${orchestratorMessage ? `POVINNOSŤ: Odpovedz na základe tohto odkazu: "${orchestratorMessage}".` : "Povedz presne čo si spravil a čo je výsledok."}
    DÔLEŽITÉ: Ak sú výsledky prázdne ([]), jednoducho povedz že misia skončila bez ďalších akcií.
    Výsledky: ${JSON.stringify(resultsSummary)}`;
  const start = Date.now();
  console.log(`[REPORTER] Calling AI model: ${AI_MODELS.REPORT}, prompt length: ${prompt.length}`);
  let output = "Misia dokončená.";
  try {
    const res = await withRetry(() => generateText({
      model: google(AI_MODELS.REPORT),
      system: "Si stručný CRM reporter. Odpovedaj v slovenčine, max 2 vety.",
      prompt,
      temperature: 0.2,
    }));
    output = res.text || "Misia dokončená.";
    console.log(`[REPORTER] Done in ${Date.now() - start}ms. Output: ${output.substring(0, 100)}`);
  } catch (err: any) {
    console.error(`[REPORTER] Failed: ${err.message}`);
    output = results.length > 0
      ? `Vykonal som ${results.filter(r => r.status === "done").length}/${results.length} krokov úspešne.`
      : "Misia dokončená bez ďalších akcií.";
  }

  trackAICall(
    "reporter",
    "gemini",
    AI_MODELS.REPORT,
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
