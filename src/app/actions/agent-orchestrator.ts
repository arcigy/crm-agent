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
You are the Supreme AI Orchestrator for a Business CRM. You plan steps using available tools. Be efficient and logical.

TASK:
1. Analyze user input and history.
2. Plan the minimum steps needed using AVAILABLE TOOLS.
3. If IDs are missing, search for them first.
4. If the objective is complete, return steps: [].

AVAILABLE TOOLS:
${JSON.stringify(toolsDocs.map(t => ({name: t.name, desc: t.description, params: t.parameters})), null, 2)}

RULES:
1. ID VALIDITY: Never guess IDs. Use db_search_contacts, db_fetch_notes, db_search_projects to find them.
2. CRM-FIRST: Check internal DB before Gmail or Web.
3. ATOMICITY: One tool = one step.
4. NO REPETITION: If a tool returned 0 results in history, don't repeat it.
5. COMPLETION: When done, return steps: [].
6. RICH NOTES: For db_create_note, generate 300+ word professional notes in Slovak.
7. SLOVAK ARGS: All text arguments (title, content, comment, subject, body) must be in Slovak.

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "short_description",
  "thought": "reasoning in English",
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
