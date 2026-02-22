"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { validateActionPlan } from "./agent-preparer";
import { executeAtomicTool } from "./agent-executors";
import {
  AgentStep,
  ChatMessage,
  UserResource,
  MissionHistoryItem,
  MissionState,
  ToolResult,
} from "./agent-types";
import { createStreamableValue } from "@ai-sdk/rsc";
import { withRetry } from "@/lib/ai-retry";
import { AI_MODELS } from "@/lib/ai-providers";
import { selfCorrect, extractAndStoreIds } from "./agent-self-corrector";
import { buildEscalationMessage, logEscalation } from "./agent-escalator";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── GUARD RAILS (per agentmastercore.md) ───────────────
const MAX_ITERATIONS = 12;
const MAX_SAME_TOOL_REPEAT = 2;

// ─────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────
export async function runOrchestratorLoop(
  messages: ChatMessage[],
  user: UserResource,
  superState: ReturnType<typeof createStreamableValue>
) {
  const finalResults: AgentStep[] = [];
  const missionHistory: MissionHistoryItem[] = [];
  let lastPlan: any = null;

  // Initialize mission state — this IS the agent's memory between LLM calls
  const state: MissionState = {
    iteration: 0,
    resolvedEntities: {},
    completedTools: [],
    lastToolResult: null,
    allResults: [],
    correctionAttempts: 0,
    toolCallCounts: {},
  };

  console.log(`[ORCHESTRATOR] ======= NEW MISSION STARTED =======`);
  console.log(`[ORCHESTRATOR] User: ${user.emailAddresses[0]?.emailAddress}`);

  while (state.iteration < MAX_ITERATIONS) {
    state.iteration++;
    const tag = `[ORCHESTRATOR][iter=${state.iteration}]`;

    console.log(`${tag} ─── Iteration start ───`);
    console.log(`${tag} resolvedEntities: ${JSON.stringify(state.resolvedEntities)}`);
    console.log(`${tag} completedTools: ${JSON.stringify(state.completedTools)}`);

    superState.update({
      status: "thinking" as const,
      attempt: state.iteration,
      toolResults: finalResults,
    });

    // 1. Plan next steps (inject resolvedEntities into every call)
    lastPlan = await orchestrateParams(messages, missionHistory, state);
    console.log(`${tag} Plan: ${JSON.stringify(lastPlan, null, 2)}`);

    if (!lastPlan.steps || lastPlan.steps.length === 0) {
      console.log(`${tag} No more steps. Mission complete.`);
      break;
    }

    // Guard: same tool repeated too many times?
    const plannedToolName = lastPlan.steps[0]?.tool;
    const repeatCount = state.toolCallCounts[plannedToolName] ?? 0;
    if (repeatCount >= MAX_SAME_TOOL_REPEAT) {
      console.warn(`${tag} Tool "${plannedToolName}" repeated ${repeatCount} times — triggering self-correction fallback.`);
      const escalationMsg = buildEscalationMessage({
        failedTool: plannedToolName,
        attemptsMade: repeatCount,
        partialSuccesses: state.allResults,
        diagnosis: `Nástroj bol volaný ${repeatCount}x bez úspechu.`,
      });
      logEscalation({
        failedTool: plannedToolName,
        attemptsMade: repeatCount,
        partialSuccesses: state.allResults,
        diagnosis: `Repeat guard triggered after ${repeatCount} calls.`,
      });
      superState.done({
        content: escalationMsg,
        status: "done",
        toolResults: finalResults,
        thoughts: { intent: "Eskalácia", extractedData: null, plan: state.completedTools },
      });
      return { finalResults, missionHistory, attempts: state.iteration, lastPlan };
    }

    // 2. Validate and Heal (Preparer)
    const preparer = await validateActionPlan(
      lastPlan.intent,
      lastPlan.steps,
      messages,
      missionHistory
    );
    console.log(`${tag} Preparer valid=${preparer.valid}, questions=${JSON.stringify(preparer.questions)}`);

    if (!preparer.valid && preparer.questions && preparer.questions.length > 0) {
      console.log(`${tag} Preparer requesting clarification: ${preparer.questions[0]}`);
      superState.done({
        content: preparer.questions[0],
        status: "done",
        toolResults: finalResults,
        thoughts: {
          intent: "Potrebujem doplňujúce informácie",
          extractedData: null,
          plan: ["Čakám na užívateľa..."],
        },
      });
      return { finalResults, missionHistory, attempts: state.iteration };
    }

    // 3. Execute each validated step
    const iterationSteps: AgentStep[] = [];

    for (const step of preparer.validated_steps) {
      superState.update({
        status: "executing" as const,
        message: `Vykonávam ${step.tool}...`,
      });

      // Track tool call count
      state.toolCallCounts[step.tool] = (state.toolCallCounts[step.tool] ?? 0) + 1;
      console.log(`${tag}[exec=${step.tool}] Args: ${JSON.stringify(step.args)}`);

      const rawResult = await executeAtomicTool(step.tool, step.args, user);
      console.log(`${tag}[exec=${step.tool}] Raw result: ${JSON.stringify(rawResult).substring(0, 500)}`);

      // Build normalized ToolResult with retryable flag
      const toolResult: ToolResult = {
        tool: step.tool,
        success: rawResult.success,
        data: (rawResult as any).data,
        error: rawResult.success ? undefined : String((rawResult as any).error ?? "Unknown error"),
        message: (rawResult as any).message,
        retryable: rawResult.success ? false : isRetryable((rawResult as any).error),
        originalArgs: step.args,
      };

      // Update state
      state.lastToolResult = toolResult;

      if (toolResult.success) {
        // Extract all IDs from successful result into resolvedEntities
        extractAndStoreIds(toolResult, state);
        state.correctionAttempts = 0; // Reset correction attempts on success
        state.completedTools.push(step.tool);
        console.log(`${tag}[exec=${step.tool}] SUCCESS. resolvedEntities now: ${JSON.stringify(state.resolvedEntities)}`);
      } else {
        // SELF-CORRECTION LAYER
        console.warn(`${tag}[exec=${step.tool}] FAILED: ${toolResult.error}`);
        const correction = await selfCorrect(toolResult, state);
        console.log(`${tag}[self-correct] Decision: ${correction.action}, diagnosis: ${correction.diagnosis}`);

        if (correction.action === "RETRY" && correction.correctedArgs) {
          state.correctionAttempts++;
          console.log(`${tag}[self-correct] Retrying ${step.tool} with fixed args: ${JSON.stringify(correction.correctedArgs)}`);
          const retryRaw = await executeAtomicTool(step.tool, correction.correctedArgs, user);
          console.log(`${tag}[self-correct][retry] Result: ${JSON.stringify(retryRaw).substring(0, 300)}`);

          if (retryRaw.success) {
            toolResult.success = true;
            toolResult.data = (retryRaw as any).data;
            toolResult.error = undefined;
            extractAndStoreIds(toolResult, state);
            state.correctionAttempts = 0;
            state.completedTools.push(step.tool);
            console.log(`${tag}[self-correct] RETRY SUCCESS.`);
          } else {
            toolResult.error = String((retryRaw as any).error ?? "Retry also failed");
            console.error(`${tag}[self-correct] RETRY FAILED: ${toolResult.error}`);
            // Escalate
            logEscalation({
              failedTool: step.tool,
              attemptsMade: state.correctionAttempts,
              partialSuccesses: state.allResults,
              diagnosis: correction.diagnosis,
            });
            const escalationMsg = buildEscalationMessage({
              failedTool: step.tool,
              attemptsMade: state.correctionAttempts,
              partialSuccesses: state.allResults,
              diagnosis: correction.diagnosis,
            });
            superState.done({
              content: escalationMsg,
              status: "done",
              toolResults: finalResults,
              thoughts: { intent: "Eskalácia po retry", extractedData: null, plan: state.completedTools },
            });
            return { finalResults, missionHistory, attempts: state.iteration, lastPlan };
          }
        } else if (correction.action === "SKIP") {
          console.log(`${tag}[self-correct] Skipping non-critical step: ${step.tool}`);
          // Continue to next step
        } else {
          // ESCALATE immediately
          logEscalation({
            failedTool: step.tool,
            attemptsMade: state.correctionAttempts,
            partialSuccesses: state.allResults,
            diagnosis: correction.diagnosis,
          });
          const escalationMsg = buildEscalationMessage({
            failedTool: step.tool,
            attemptsMade: state.correctionAttempts,
            partialSuccesses: state.allResults,
            diagnosis: correction.diagnosis,
          });
          superState.done({
            content: escalationMsg,
            status: "done",
            toolResults: finalResults,
            thoughts: { intent: "Eskalácia", extractedData: null, plan: state.completedTools },
          });
          return { finalResults, missionHistory, attempts: state.iteration, lastPlan };
        }
      }

      state.allResults.push(toolResult);

      const agentStep: AgentStep = {
        tool: step.tool,
        status: toolResult.success ? "done" : "error",
        result: toolResult,
      };
      iterationSteps.push(agentStep);
      finalResults.push(agentStep);
    }

    missionHistory.push({
      steps: iterationSteps,
      verification: {
        success: iterationSteps.every((s) => s.status === "done"),
      },
    });
  }

  if (state.iteration >= MAX_ITERATIONS) {
    console.warn(`[ORCHESTRATOR] MAX_ITERATIONS (${MAX_ITERATIONS}) reached. Stopping.`);
  }

  console.log(`[ORCHESTRATOR] ======= MISSION COMPLETE =======`);
  console.log(`[ORCHESTRATOR] Total iterations: ${state.iteration}`);
  console.log(`[ORCHESTRATOR] Completed tools: ${JSON.stringify(state.completedTools)}`);
  console.log(`[ORCHESTRATOR] Final resolvedEntities: ${JSON.stringify(state.resolvedEntities)}`);

  return { finalResults, missionHistory, attempts: state.iteration, lastPlan };
}

// ─────────────────────────────────────────────────────────
// Plan next action — called every iteration with fresh state
// ─────────────────────────────────────────────────────────
export async function orchestrateParams(
  messages: ChatMessage[],
  missionHistory: MissionHistoryItem[],
  state?: MissionState,
  orchestratorBrief?: string,
  negativeConstraints: string[] = []
) {
  const start = Date.now();
  try {
    const toolsDocs = ALL_ATOMS.map((t) => {
      return `- ${t.function.name}: ${t.function.description}`;
    }).join("\n");

    // CRITICAL: inject resolvedEntities into every iteration prompt
    const resolvedEntitiesBlock = state?.resolvedEntities && Object.keys(state.resolvedEntities).length > 0
      ? `\n## RESOLVED ENTITIES (USE THESE — DO NOT FETCH AGAIN)\n${JSON.stringify(state.resolvedEntities, null, 2)}`
      : "";

    const completedToolsBlock = state?.completedTools?.length
      ? `\n## COMPLETED TOOLS (DO NOT REPEAT THESE)\n${state.completedTools.join(", ")}`
      : "";

    const systemPrompt = `
ROLE:
You are the Supreme Strategic Planner for a Business CRM. Map user's intent into tool call sequences.

AVAILABLE TOOLS:
${toolsDocs}
${resolvedEntitiesBlock}
${completedToolsBlock}

CORE PRINCIPLE: PARAMETER AGNOSTICISM
You are a STRUCTURAL ARCHITECT. Decide *which* tools to call, not validate data completeness.
1. If an ID is in RESOLVED ENTITIES → use it directly. DO NOT fetch again.
2. For missing parameters, use empty string "" or null.
3. Do NOT try to gatekeep or ask questions yourself.

TASK LOGIC:
1. Analyze user intent from messages and history.
2. If needed IDs are in RESOLVED ENTITIES → use them directly.
3. If IDs are not in RESOLVED ENTITIES → search for them first (db_search_contacts, db_fetch_projects, etc.).
4. Map every pending action to its corresponding tool.
5. Only return steps: [] if message is purely conversational or mission is 100% complete.

RULES:
1. ID VALIDITY: Never guess IDs. Use RESOLVED ENTITIES if available, else search first.
2. ATOMICITY: One tool = one step. Return ONLY the next 1-3 steps needed.
3. NO REPETITION: If a tool returned 0 results in history, don't repeat it.
4. SLOVAK ARGS: All text arguments (title, content, comment, subject, body) must be in Slovak.
5. STRICT PARAMS: Always use exact parameter names from the TOOL DEFINITIONS.
6. NEGATIVE CONSTRAINTS: Strictly adhere to provided strategic constraints.

TOOL CHAINING ORDER (never skip):
- CONTACTS always first if entity unknown → db_search_contacts → db_create_contact
- PROJECTS need contact_id → db_create_project (use contact_id from RESOLVED ENTITIES)
- TASKS need project_id OR contact_id
- COMMUNICATION runs last (needs contact email)

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "short_description",
  "thought": "one short sentence reasoning in English, noting if you are using RESOLVED ENTITIES or need to fetch",
  "steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    // Compress mission history aggressively to save tokens
    const historyContext = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      ...missionHistory.map((h, i) => {
        const compressedSteps = h.steps.map((s) => {
          let compressedResult = s.result as any;
          if (compressedResult?.success && compressedResult.data) {
            const data = Array.isArray(compressedResult.data)
              ? compressedResult.data
              : [compressedResult.data];
            compressedResult = {
              success: true,
              data: data.slice(0, 5).map((item: any) => {
                const {
                  date_created, date_updated, deleted_at,
                  user_email, google_id, labels, comments, ...essential
                } = item;
                Object.keys(essential).forEach((key) => {
                  if (typeof essential[key] === "string" && essential[key].length > 150) {
                    essential[key] = essential[key].substring(0, 150) + "... [truncated]";
                  }
                });
                return essential;
              }),
            };
          }
          return { tool: s.tool, result: compressedResult };
        });
        return {
          role: "assistant",
          content: `STEP ${i + 1} RESULT: ${JSON.stringify(compressedSteps)}`,
        };
      }),
    ];

    console.log(`[ORCHESTRATOR][orchestrateParams] System prompt length: ${systemPrompt.length} chars`);
    console.log(`[ORCHESTRATOR][orchestrateParams] History context length: ${JSON.stringify(historyContext).length} chars`);
    console.log(`[ORCHESTRATOR][orchestrateParams] Calling model: ${AI_MODELS.ORCHESTRATOR}`);

    const constraintsText =
      negativeConstraints.length > 0
        ? `\n\nSTRATEGIC CONSTRAINTS (MUST FOLLOW):\n${negativeConstraints.map((c) => `- ${c}`).join("\n")}`
        : "";

    const aiStart = Date.now();
    const response = await withRetry(() =>
      generateText({
        model: google(AI_MODELS.ORCHESTRATOR),
        system: systemPrompt,
        temperature: 0.1,
        prompt: `KONVERZÁCIA (Context): \n${JSON.stringify(historyContext.slice(-10))}\n\nSTRATEGICKÉ ZADANIE (Brief): ${orchestratorBrief || "Analyze last message and decide next steps."}${constraintsText}\n\nDOSIAHNI CIEĽ.`,
      })
    );
    console.log(`[ORCHESTRATOR][orchestrateParams] AI call finished in ${Date.now() - aiStart}ms`);

    trackAICall(
      "orchestrator",
      "gemini",
      AI_MODELS.ORCHESTRATOR,
      systemPrompt + (messages[messages.length - 1]?.content || ""),
      response.text,
      Date.now() - start,
      (response.usage as any).inputTokens,
      (response.usage as any).outputTokens
    );

    try {
      const rawText = response.text || "";
      console.log(`[ORCHESTRATOR][orchestrateParams] Raw AI output (first 500): ${rawText.substring(0, 500)}`);

      const startIdx = rawText.indexOf("{");
      const endIdx = rawText.lastIndexOf("}");
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("No JSON object found in AI response");
      }
      let clean = rawText.substring(startIdx, endIdx + 1);

      // Escape control chars inside strings only
      clean = clean.replace(/\"((?:[^\"\\]|\\.)*)\"/g, (match, p1) => {
        return (
          '"' +
          p1
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")
            .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") +
          '"'
        );
      });

      // Fix unquoted "???" placeholders
      clean = clean.replace(/:\s*\?\?\?\s*([,}])/g, ': "???"$1');

      try {
        const parsed = JSON.parse(clean);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          parsed.steps = parsed.steps.map((s: any) => ({
            tool: s.tool || s.tool_name || s.name,
            args: s.args || s.arguments || s.params || {},
          }));
        }
        console.log(`[ORCHESTRATOR][orchestrateParams] Parsed steps: ${JSON.stringify(parsed.steps?.map((s: any) => s.tool))}`);
        return parsed;
      } catch (jsonErr: any) {
        console.error(`[ORCHESTRATOR][orchestrateParams] JSON parse error: ${jsonErr.message}`);
        console.error(`[ORCHESTRATOR][orchestrateParams] Raw output: ${rawText.substring(0, 500)}`);

        // Emergency fallback: try to rescue steps array
        const stepsMatch = clean.match(/"steps"\s*:\s*(\[[\s\S]*?\])/);
        if (stepsMatch) {
          try {
            const steps = JSON.parse(stepsMatch[1].replace(/\\/g, "\\\\"));
            console.log(`[ORCHESTRATOR][orchestrateParams] Rescued steps via regex fallback.`);
            return { intent: "fallback_rescue", thought: "JSON broke, rescued steps.", steps };
          } catch {
            /* nested fail */
          }
        }
        throw jsonErr;
      }
    } catch (e) {
      console.error(`[ORCHESTRATOR][orchestrateParams] Critical parse failure. Returning empty.`);
      return {
        intent: "error_parsing",
        thought: "Failed to parse JSON plan after cleanup.",
        steps: [],
      };
    }
  } catch (error: any) {
    console.error(`[ORCHESTRATOR][orchestrateParams] Fatal error: ${error.message}`);
    return {
      intent: "error",
      thought: error.message,
      steps: [],
    };
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function isRetryable(error: unknown): boolean {
  if (!error) return false;
  const msg = String(error).toLowerCase();
  // Non-retryable: validation errors, auth, not found
  if (msg.includes("forbidden") || msg.includes("unauthorized")) return false;
  if (msg.includes("not found") || msg.includes("404")) return false;
  if (msg.includes("invalid") && msg.includes("field")) return true; // Wrong field → correctable
  if (msg.includes("required") && msg.includes("missing")) return true;
  // Retryable: network, timeout, server errors
  if (msg.includes("timeout") || msg.includes("network") || msg.includes("503")) return true;
  if (msg.includes("500") || msg.includes("internal")) return true;
  // Default: attempt correction
  return true;
}
