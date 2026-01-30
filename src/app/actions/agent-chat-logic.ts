import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { currentUser } from "@clerk/nextjs/server";
import { getIsolatedAIContext, AIContextBundle } from "@/lib/ai-context";
import {
  startCostSession,
  trackAICall,
  endCostSession,
  type SessionCost,
} from "@/lib/ai-cost-tracker";
import { ALL_ATOMS } from "./agent-registry";
import { executeAtomicTool } from "./agent-executors";
import {
  AgentStep,
  ChatMessage,
  ToolDefinition,
  ChatVerdict,
  MissionHistoryItem,
  UserResource,
} from "./agent-types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const geminiBase = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const gemini = geminiBase.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function chatWithAgent(messages: ChatMessage[]) {
  const superState = createStreamableValue({
    toolResults: [] as AgentStep[],
    content: "",
    status: "thinking" as const,
    attempt: 1,
    thoughts: {
      intent: "",
      plan: [] as string[],
      extractedData: null as Record<string, any> | null,
    },
    providers: {
      gatekeeper: "OpenAI GPT-4o-mini",
      orchestrator: "Anthropic Claude 3.7 Sonnet",
      verifier: "Google Gemini 2.0 Flash",
      reporter: "Google Gemini 2.0 Flash",
    },
    costTracking: null as SessionCost | null,
  });

  (async () => {
    try {
      const user = (await currentUser()) as UserResource | null;
      if (!user) {
        superState.error("Unauthorized");
        return;
      }
      const userEmail = user.emailAddresses[0].emailAddress;
      const context = await getIsolatedAIContext(userEmail, "GLOBAL");

      startCostSession(userEmail);

      // 1. GATEKEEPER
      const verdict = await runGatekeeper(messages);
      const initialState = {
        toolResults: [],
        content: "",
        status: "thinking" as const,
        attempt: 1,
        thoughts: {
          intent:
            verdict.intent === "INFO_ONLY"
              ? "Iba informačná otázka"
              : "Požiadavka na akciu v systéme",
          extractedData: verdict.extracted_data,
          plan: [],
        },
        providers: {
          gatekeeper: "OpenAI GPT-4o-mini",
          orchestrator: "Anthropic Claude 3.7 Sonnet",
          verifier: "Google Gemini 2.0 Flash",
          reporter: "Google Gemini 2.0 Flash",
        },
        costTracking: null,
      };
      superState.update(initialState);

      if (verdict.intent === "INFO_ONLY") {
        await handleInfoOnly(messages, context, superState, verdict);
        return;
      }

      // 2. ORCHESTRATOR LOOP
      const { finalResults, missionHistory, attempts } =
        await runOrchestratorLoop(messages, user, superState);

      // 3. FINAL REPORTER
      await runFinalReporter(
        messages,
        finalResults,
        missionHistory,
        attempts,
        verdict,
        superState,
      );
    } catch (error: any) {
      console.error("Agent Error:", error);
      endCostSession();
      superState.error(error instanceof Error ? error.message : String(error));
    }
  })();

  return { stream: superState.value };
}

async function runGatekeeper(messages: ChatMessage[]): Promise<ChatVerdict> {
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

async function handleInfoOnly(
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

async function runOrchestratorLoop(
  messages: ChatMessage[],
  user: UserResource,
  superState: ReturnType<typeof createStreamableValue>,
) {
  let missionAccomplished = false;
  let attempts = 0;
  const maxAttempts = 3;
  const missionHistory: MissionHistoryItem[] = [];
  let finalResults: AgentStep[] = [];

  const toolDescriptions = ALL_ATOMS.map((t: ToolDefinition) => {
    const params = t.function.parameters?.properties || {};
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}: ${(v as any).type}`)
      .join(", ");
    return `- ${t.function.name}: ${t.function.description}. Args: {${paramStr}}`;
  }).join("\n");

  const architectPrompt = `Si Orchestrator. Navrhni PLÁN pre: ${messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n")}. 
Dostupné nástroje:
${toolDescriptions}
Výstup LEN JSON: { "plan": [{ "tool": "...", "args": {...} }], "readable_plan": ["..."] }`;

  while (!missionAccomplished && attempts < maxAttempts) {
    attempts++;
    const start = Date.now();
    const res = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2048,
      messages: [{ role: "user", content: architectPrompt }],
    });
    const raw = res.content.find((c) => c.type === "text") as any;
    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude failed to produce plan JSON");
    const plannerOutput = JSON.parse(jsonMatch[0]);
    trackAICall(
      "orchestrator",
      "anthropic",
      "claude-3-7-sonnet",
      architectPrompt,
      raw.text,
      Date.now() - start,
      res.usage.input_tokens,
      res.usage.output_tokens,
    );

    const currentStepResults: AgentStep[] = [];
    for (const step of plannerOutput.plan || []) {
      const result = await executeAtomicTool(step.tool, step.args, user);
      currentStepResults.push({ tool: step.tool, args: step.args, result });
      superState.update({
        toolResults: [...finalResults, ...currentStepResults],
        status: "thinking",
        attempt: attempts,
      });
    }
    finalResults = [...finalResults, ...currentStepResults];

    // Verifier
    const vPrompt = `Bolo toto úspešné pre požiadavku používateľa? ${JSON.stringify(currentStepResults)}. Odpovedaj LEN JSON: { "success": true/false, "analysis": "..." }`;
    const vRes = await gemini.generateContent(vPrompt);
    const vText = vRes.response?.text() || "{}";
    const vJsonMatch = vText.match(/\{[\s\S]*\}/);
    const vOutput = vJsonMatch ? JSON.parse(vJsonMatch[0]) : { success: true };
    missionHistory.push({ steps: currentStepResults, verification: vOutput });
    if (vOutput.success) missionAccomplished = true;
  }

  return { finalResults, missionHistory, attempts };
}

async function runFinalReporter(
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
