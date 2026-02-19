"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { validateActionPlan } from "./agent-preparer";
import { executeAtomicTool } from "./agent-executors";
import { AgentStep, ChatMessage, UserResource, MissionHistoryItem } from "./agent-types";
import { createStreamableValue } from "@ai-sdk/rsc";

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
    lastPlan = await orchestrateParams(messages[messages.length - 1].content, missionHistory.map((h, i) => ({
        role: "assistant",
        content: `Iteration ${i + 1} results: ${JSON.stringify(h.steps)}`
    })));

    // Handle direct message (question/clarification) from Orchestrator
    if (lastPlan.message && (!lastPlan.steps || lastPlan.steps.length === 0)) {
        superState.done({
            content: lastPlan.message,
            status: "done",
            toolResults: finalResults,
            thoughts: {
                intent: lastPlan.intent || "Otázka na užívateľa",
                extractedData: null,
                plan: ["Čakám na odpoveď..."]
            }
        });
        return { finalResults, missionHistory, attempts, lastPlan };
    }

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
  lastUserMessage: string | null,
  conversationHistory: any[]
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
You are the Supreme AI Orchestrator. You are precise, proactive, and concise.

TASK:
1. Analyze input and history.
2. Plan steps using AVAILABLE TOOLS.
3. If IDs are missing, plan SEARCH steps first.
4. If ambiguous (multiple matches), set "steps": [] and ASK for clarification in "message".

AVAILABLE TOOLS:
${JSON.stringify(toolsDocs.map(t => ({name: t.name, desc: t.description, params: t.parameters})), null, 2)}

RULES:
1. TRIPLE-CHECK ID VALIDITY: Never guess. Use search tools (db_search_contacts, db_search_projects, db_fetch_notes) to find IDs.
8. AGGRESSIVE PROGRESSION: Every iteration must bring new info.
10. AMBIGUITY HANDLING: If multiple entities (e.g. two Martins) match, set "steps": [] and ASK in the "message" field.
11. BREVITY & PUNCHINESS: Be extremely brief in your "message". No technical jargon. Max 2 sentences in Slovak.
12. NO TOOL ABUSE: Steps are for DB/External tools only. Translations/Logic happen in your brain.
13. SLOVAK OUTPUT: All 'message' and tool 'args' (titles, content, bodies) MUST be in Slovak.
9. RICH NOTES: When creating notes (db_create_note), you are a Business Strategist:
   - AUTO-EXPAND: If input is sparse, generate a premium report (300+ words) in Slovak.
   - STRUCTURE: Summary, Goals, Risks, Timeline.
   - VALUE: Every note must look expensive and professional.

OUTPUT FORMAT:
{
  "intent": "action_summary",
  "thought": "Internal reasoning in English",
  "message": "Short message/question to user in Slovak",
  "steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    const response = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      temperature: 0.7, // Add a bit of creativity to planning and content generation
      prompt: `HISTORY:\n${JSON.stringify(conversationHistory.slice(-5))}\n\nUSER INPUT:\n${lastUserMessage}`,
    });

    trackAICall(
        "orchestrator",
        "gemini",
        "gemini-2.0-flash",
        systemPrompt + (lastUserMessage || ""),
        response.text,
        Date.now() - start,
        (response.usage as any).inputTokens,
        (response.usage as any).outputTokens
    );

    try {
        let rawText = response.text.trim();
        
        // Find first '{' and last '}'
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        let jsonText = (firstBrace !== -1 && lastBrace !== -1) 
            ? rawText.substring(firstBrace, lastBrace + 1)
            : rawText;

        // Quote bare ??? tokens - handle both comma and closing brace
        jsonText = jsonText
            .replace(/:\s*\?\?\?\s*([,}])/g, ': "???"$1');
            
        try {
            const parsed = JSON.parse(jsonText);
            
            // Normalization
            if (parsed.steps && Array.isArray(parsed.steps)) {
                parsed.steps = parsed.steps.map((s: any) => ({
                    tool: s.tool || s.tool_name || s.name,
                    args: s.args || s.arguments || s.params || {}
                }));
            }
            return parsed;
        } catch (jsonErr: any) {
            console.error("Orchestrator JSON.parse failed on:", jsonText);
            console.error("Error:", jsonErr.message);
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
