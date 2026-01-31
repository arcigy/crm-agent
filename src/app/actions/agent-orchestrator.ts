import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { ALL_ATOMS } from "./agent-registry";
import { executeAtomicTool } from "./agent-executors";
import {
  AgentStep,
  ChatMessage,
  ToolDefinition,
  MissionHistoryItem,
  UserResource,
} from "./agent-types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const geminiBase = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const gemini = geminiBase.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function runOrchestratorLoop(
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
      .map(([k, v]) => `${k}: ${v.type}`)
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

    // Safety check for content
    const textBlock = res.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text")
      throw new Error("Claude failed to produce plan text");

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude failed to produce plan JSON");

    const plannerOutput = JSON.parse(jsonMatch[0]);
    trackAICall(
      "orchestrator",
      "anthropic",
      "claude-3-7-sonnet",
      architectPrompt,
      textBlock.text,
      Date.now() - start,
      res.usage.input_tokens,
      res.usage.output_tokens,
    );

    const currentStepResults: AgentStep[] = [];
    for (const step of plannerOutput.plan || []) {
      const result = await executeAtomicTool(
        step.tool,
        step.args as Record<string, unknown>,
        user,
      );
      currentStepResults.push({
        tool: step.tool,
        args: step.args as Record<string, unknown>,
        result,
      });
      superState.update({
        toolResults: [...finalResults, ...currentStepResults],
        status: "thinking" as const,
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
