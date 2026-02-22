"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { validateActionPlan } from "./agent-preparer";
import { executeAtomicTool } from "./agent-executors";
import { AgentStep, ChatMessage, UserResource, MissionHistoryItem } from "./agent-types";
import { createStreamableValue } from "@ai-sdk/rsc";
import { withRetry } from "@/lib/ai-retry";
import { AI_MODELS } from "@/lib/ai-providers";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function runOrchestratorLoop(
  messages: ChatMessage[],
  user: UserResource,
  superState: ReturnType<typeof createStreamableValue>
) {
  let attempts = 0;
  const maxAttempts = 5;
  const finalResults: AgentStep[] = [];
  const missionHistory: MissionHistoryItem[] = [];

  let lastPlan: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    superState.update({
      status: "thinking" as const,
      attempt: attempts,
      toolResults: finalResults,
    });

    // 1. Plan next steps
    lastPlan = await orchestrateParams(messages, missionHistory);
    console.log(`[ORCHESTRATOR] Plan for attempt ${attempts}:`, JSON.stringify(lastPlan, null, 2));

    if (!lastPlan.steps || lastPlan.steps.length === 0) {
      break;
    }

    // 2. Validate and Heal
    const preparer = await validateActionPlan(lastPlan.intent, lastPlan.steps, messages, missionHistory);
    
    if (!preparer.valid && preparer.questions && preparer.questions.length > 0) {
        // STOP and ask the user
        superState.done({
            content: preparer.questions[0],
            status: "done",
            toolResults: finalResults,
            thoughts: {
                intent: "Potrebujem doplňujúce informácie",
                extractedData: null,
                plan: ["Čakám na užívateľa..."]
            }
        });
        return { finalResults, missionHistory, attempts };
    }

    // 3. Execute
    const iterationSteps: AgentStep[] = [];
    for (const step of preparer.validated_steps) {
      superState.update({
        status: "executing" as const,
        message: `Vykonávam ${step.tool}...`,
      });

      const result = await executeAtomicTool(step.tool, step.args, user);
      const agentStep: AgentStep = {
        tool: step.tool,
        status: result.success ? "done" : "error",
        result: result,
      };
      
      iterationSteps.push(agentStep);
      finalResults.push(agentStep);
    }

    missionHistory.push({
      steps: iterationSteps,
      verification: {
        success: iterationSteps.every(s => s.status === "done")
      }
    });
  }

  return { finalResults, missionHistory, attempts, lastPlan };
}

export async function orchestrateParams(
  messages: ChatMessage[],
  missionHistory: MissionHistoryItem[],
  orchestratorBrief?: string,
  negativeConstraints: string[] = []
) {
  const start = Date.now();
  try {
    // Compact tool documentation for the Orchestrator (just name and description)
    const toolsDocs = ALL_ATOMS.map((t) => {
      return `- ${t.function.name}: ${t.function.description}`;
    }).join("\n");

    const systemPrompt = `
ROLE:
You are the Supreme Strategic Planner for a Business CRM. Your sole responsibility is to map the user's high-level intent into a sequence of structural actions (steps). 

AVAILABLE TOOLS:
${toolsDocs}

CORE PRINCIPLE: PARAMETER AGNOSTICISM
You are a STRUCTURAL ARCHITECT. Your job is to decide *which* tools must be called to fulfill the intent, not to verify the data completeness.
1. You do NOT care if the user provided all required parameters for a tool yet.
2. You do NOT care if the parameters are currently empty or invalid.
3. If the user's intent clearly maps to a tool's capability, you MUST include that tool in the 'steps' array.
4. For any missing parameters, use an empty string "" or null.
5. Do NOT try to be a gatekeeper or ask questions.

TASK LOGIC:
1. Analyze user intent from messages and history.
2. If identifying data (IDs) are missing, search for them first.
3. Map every pending action to its corresponding tool.
4. Only return steps: [] if the message is purely conversational or if the mission is 100% complete.

RULES:
1. ID VALIDITY: Never guess IDs. Use search tools if they are not in history.
2. ATOMICITY: One tool = one step.
3. NO REPETITION: If a tool returned 0 results in history, don't repeat it.
4. SLOVAK ARGS: All text arguments (title, content, comment, subject, body) must be in Slovak.
5. NO REDUNDANCY: Never repeat a successful action already present in HISTORY.
6. STRICT PARAMS: Always use exact parameter names from the provided TOOL DEFINITIONS.
7. NEGATIVE CONSTRAINTS: You MUST strictly adhere to the provided STRATEGIC CONSTRAINTS. If a constraint says "Do not send email", you must NOT plan 'send_email' or 'gmail_reply' tool calls.

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "short_description",
  "thought": "one short sentence reasoning in English, specifically noting if you are respecting a negative constraint",
  "steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    const historyContext = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        ...missionHistory.map((h, i) => {
            // Aggressive content compression
            const compressedSteps = h.steps.map(s => {
                let compressedResult = s.result as any;
                if (compressedResult && compressedResult.success && compressedResult.data) {
                    const data = Array.isArray(compressedResult.data) ? compressedResult.data : [compressedResult.data];
                    compressedResult = {
                        success: true,
                        data: data.slice(0, 5).map((item: any) => {
                            // Keep only essential ID and identity fields
                            const { 
                              date_created, date_updated, deleted_at, user_email, 
                              google_id, labels, comments, ...essential 
                            } = item;
                            
                            // Truncate long strings in essential fields to 150 chars
                            Object.keys(essential).forEach(key => {
                                if (typeof essential[key] === 'string' && essential[key].length > 150) {
                                    essential[key] = essential[key].substring(0, 150) + "... [truncated]";
                                }
                            });
                            return essential;
                        })
                    };
                }
                return { tool: s.tool, result: compressedResult };
            });
            return {
                role: "assistant",
                content: `STEP ${i + 1} RESULT: ${JSON.stringify(compressedSteps)}`
            };
        })
    ];

    console.log(`[ORCHESTRATOR] System Prompt length: ${systemPrompt.length} chars`);
    console.log(`[ORCHESTRATOR] History Context sent to AI: ${JSON.stringify(historyContext).length} chars`);
    console.log(`[ORCHESTRATOR] Calling AI model: ${AI_MODELS.ORCHESTRATOR}...`);
    
    const constraintsText = negativeConstraints.length > 0 
      ? `\n\nSTRATEGIC CONSTRAINTS (MUST FOLLOW):\n${negativeConstraints.map(c => `- ${c}`).join("\n")}`
      : "";

    const aiStart = Date.now();
    const response = await withRetry(() => generateText({
      model: google(AI_MODELS.ORCHESTRATOR),
      system: systemPrompt,
      temperature: 0.1, // Near-deterministic planning
      prompt: `KONVERZÁCIA (Context): \n${JSON.stringify(historyContext.slice(-10))}\n\nSTRATEGICKÉ ZADANIE (Brief): ${orchestratorBrief || "Analyze last message."}${constraintsText}\n\nDOSIAHNI CIEĽ.`,
    }));
    console.log(`[ORCHESTRATOR] AI Call finished in ${Date.now() - aiStart}ms`);

    trackAICall(
        "orchestrator",
        "gemini",
        AI_MODELS.ORCHESTRATOR,
        systemPrompt + (messages[messages.length - 1].content || ""),
        response.text,
        Date.now() - start,
        (response.usage as any).inputTokens,
        (response.usage as any).outputTokens
    );

    try {
        const rawText = response.text || "";
        
        // 1. Extreme Extraction: Find the outermost { }
        const startIdx = rawText.indexOf('{');
        const endIdx = rawText.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) {
             throw new Error("No JSON object found in AI response");
        }
        let clean = rawText.substring(startIdx, endIdx + 1);

        // 2. Targeted Escape: Only escape control characters that are INSIDE double quotes.
        // We look for " ... " and replace any literal newlines/tabs inside them.
        // Using [^] or [\s\S] instead of /s flag for compatibility.
        clean = clean.replace(/"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
            return '"' + p1.replace(/\n/g, "\\n")
                           .replace(/\r/g, "\\r")
                           .replace(/\t/g, "\\t")
                           .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") + '"';
        });

        // 3. Fix unquoted "???" (LLM placeholder)
        clean = clean.replace(/:\s*\?\?\?\s*([,}])/g, ': "???"$1');

        try {
            const parsed = JSON.parse(clean);
            
            // Normalization
            if (parsed.steps && Array.isArray(parsed.steps)) {
                parsed.steps = parsed.steps.map((s: any) => ({
                    tool: s.tool || s.tool_name || s.name,
                    args: s.args || s.arguments || s.params || {}
                }));
            }
            return parsed;
        } catch (jsonErr: any) {
            console.error("CRITICAL JSON PARSE ERROR. Position:", jsonErr.message);
            console.error("RAW OUTPUT:", rawText.substring(0, 500) + "...");
            
            // EMERGENCY FALLBACK: If JSON fails, try to extract steps via simple regex
            // This allows the agent to at least DO something if the report part of JSON broke
            const stepsMatch = clean.match(/"steps"\s*:\s*(\[[\s\S]*?\])/);
            if (stepsMatch) {
                try {
                    const steps = JSON.parse(stepsMatch[1].replace(/\\/g, "\\\\"));
                    return { intent: "fallback_rescue", thought: "JSON broke, rescued steps.", steps };
                } catch { /* nested fail */ }
            }
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
