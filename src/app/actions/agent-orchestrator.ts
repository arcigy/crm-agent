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
    const preparer = await validateActionPlan(lastPlan.intent, lastPlan.steps, messages);
    
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
  missionHistory: MissionHistoryItem[]
) {
  const start = Date.now();
  try {
    const toolsDocs = ALL_ATOMS.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const systemPrompt = `
ROLE:
You are the Supreme Strategic Planner for a Business CRM. Your sole responsibility is to map the user's high-level intent into a sequence of structural actions (steps). 

CORE PRINCIPLE: PARAMETER AGNOSTICISM
You are a STRUCTURAL ARCHITECT. Your job is to decide *which* tools must be called to fulfill the intent, not to verify the data.
1. You do NOT care if the user provided all required parameters for a tool yet.
2. You do NOT care if the parameters are currently empty or invalid.
3. If the user's intent clearly maps to a tool's capability (e.g., "vytvor", "posli", "uprav", "najdi"), you MUST include that tool in the 'steps' array.
4. For any missing parameters, use an empty string "" or null.
5. Do NOT try to be a gatekeeper. If the intent is there, the tool must be in the plan. A secondary "Preparer" layer will handle data gathering from the user.

TASK LOGIC:
1. Analyze user intent from messages and history.
2. If identifying data (IDs) are missing, search for them first (db_search_contacts, etc.).
3. Map every pending action to its corresponding tool.
4. Only return steps: [] if the message is purely conversational (greetings, thanks) or if the mission is 100% complete.

RULES:
1. ID VALIDITY: Never guess IDs. Use search tools if they are not in history.
2. ATOMICITY: One tool = one step.
3. NO REPETITION: If a tool returned 0 results in history, don't repeat it.
4. SLOVAK ARGS: All text arguments (title, content, comment, subject, body) must be in Slovak.
5. NO REDUNDANCY: Never repeat a successful action already present in HISTORY.

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "short_description",
  "thought": "structural reasoning in English",
  "steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    const historyContext = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        ...missionHistory.map((h, i) => ({
            role: "assistant",
            content: `KROK ${i + 1} VÝSLEDKY: ${JSON.stringify(h.steps)}`
        }))
    ];
    console.log("[ORCHESTRATOR] History Context sent to AI:", JSON.stringify(historyContext, null, 2));

    const response = await withRetry(() => generateText({
      model: google(AI_MODELS.ORCHESTRATOR),
      system: systemPrompt,
      temperature: 0.1, // Near-deterministic planning
      prompt: `KONTEXT KONVERZÁCIE A DOTERAJŠIE VÝSLEDKY:\n${JSON.stringify(historyContext.slice(-10))}\n\nDOSIAHNI CIEĽ Z POSLEDNEJ SPRÁVY UŽÍVATEĽA.`,
    }));

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
