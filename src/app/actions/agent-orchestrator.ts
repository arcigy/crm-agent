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
You are the Supreme AI Orchestrator for a Business CRM. You plan steps using available tools. Be efficient and logical.

TASK:
1. Analyze user input and history.
2. Plan the minimum steps needed using AVAILABLE TOOLS.
3. If IDs are missing, search for them first.
4. BEFORE CREATING: Always check if the entity (contact, project, task) already exists in the CRM using search/fetch tools. Never create duplicate contacts if they already exist.
5. If the objective is complete, return steps: [].

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
8. NO REDUNDANCY: Never repeat a successful action (e.g., creating a contact/note/task) if it is already in HISTORY. If the goal is reached, return steps: [].

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "short_description",
  "thought": "reasoning in English",
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
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      temperature: 0.1, // Near-deterministic planning
      prompt: `KONTEXT KONVERZÁCIE A DOTERAJŠIE VÝSLEDKY:\n${JSON.stringify(historyContext.slice(-10))}\n\nDOSIAHNI CIEĽ Z POSLEDNEJ SPRÁVY UŽÍVATEĽA.`,
    }));

    trackAICall(
        "orchestrator",
        "gemini",
        "gemini-2.0-flash",
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
