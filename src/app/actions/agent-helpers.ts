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
  const prompt = `Si Gatekeeper. Urči intent: INFO_ONLY alebo ACTION. Extrahuj entity. Odpovedaj LEN JSON: { "intent": "...", "extracted_data": {...} }`;
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
  const prompt = `Si ArciGy Agent. Odpovedaj priateľsky v slovenčine. Kontext: ${context.user_nickname}. Otázka: ${userText}`;
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
) {
  const prompt = `Zhrň misiu v slovenčine. Výsledky: ${JSON.stringify(results)}`;
  const start = Date.now();
  const res = await gemini.generateContent(prompt);
  const output = res.response?.text() || "Generovanie zhrnutia zlyhalo.";
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
