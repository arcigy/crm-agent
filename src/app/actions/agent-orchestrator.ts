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
  ChecklistItem,
} from "./agent-types";
import { createStreamableValue } from "@ai-sdk/rsc";
import { withRetry } from "@/lib/ai-retry";
import { AI_MODELS } from "@/lib/ai-providers";
import { selfCorrect, extractAndStoreIds } from "./agent-self-corrector";
import { buildEscalationMessage, logEscalation } from "./agent-escalator";
import { buildMissionChecklist, updateChecklistState, shouldBuildChecklist } from "./agent-checklist";

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

  console.log(`[ORCHESTRATOR] ======= NEW MISSION STARTED =======`);
  console.log(`[ORCHESTRATOR] User: ${user.emailAddresses[0]?.emailAddress}`);

  // Let the LLM read the context and generate an explicit checklist FIRST
  const intentStr = messages[messages.length - 1]?.content || "Unknown";
  let initialChecklist: ChecklistItem[] = [];
  
  if (shouldBuildChecklist(intentStr)) {
    superState.update({
      status: "thinking" as const,
      attempt: 0,
      message: "Generujem checklist misií...",
      toolResults: finalResults,
    });
    initialChecklist = await buildMissionChecklist(messages, intentStr);
    console.log(`[CHECKLIST] Generated ${initialChecklist.length} steps:`, initialChecklist.map((i: any) => i.toolExpected));
  } else {
    console.log(`[CHECKLIST] Skipped for simple task.`);
  }

  const state: MissionState = {
    iteration: 0,
    resolvedEntities: {},
    completedTools: [],
    lastToolResult: null,
    allResults: [],
    correctionAttempts: 0,
    toolCallCounts: {},
    checklist: initialChecklist,
    checklistComplete: initialChecklist.length === 0,
    checklistReminderInjected: false,
  };

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

    // Update Checklist status based on completed defaults
    state.checklist = updateChecklistState(state.checklist, state.completedTools);
    state.checklistComplete = state.checklist.every(c => c.status === "DONE" || c.status === "FAILED");

    // Pre-empt LLM if it tries to stop early but checklist is NOT done
    let negativeConstraintsForIteration: string[] = [];
    if (!state.checklistComplete) {
       negativeConstraintsForIteration.push("DO NOT STOP. Your checklist is NOT COMPLETE. Return actionable tools.");
    }

    // 1. Plan next steps (inject resolvedEntities into every call)
    lastPlan = await orchestrateParams(messages, missionHistory, state, undefined, negativeConstraintsForIteration);
    console.log(`${tag} Plan: ${JSON.stringify(lastPlan, null, 2)}`);

    if (!lastPlan.steps || lastPlan.steps.length === 0) {
      if (!state.checklistComplete && !state.checklistReminderInjected) {
         console.warn(`${tag} LLM tried to terminate early but checklist implies more tasks! Injecting force warning.`);
         state.checklistReminderInjected = true;
         // Skip termination, force loop to try one more time
         continue;
      }
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
        status: "clarify",
        toolResults: finalResults,
        thoughts: {
          intent: "Potrebujem doplňujúce informácie",
          extractedData: null,
          plan: ["Čakám na užívateľa..."],
        },
      });
      return { finalResults, missionHistory, attempts: state.iteration, status: "clarify" as const, lastPlan };
    }

    // 3. Execution Phase - Parallel Batches
    const iterationSteps: AgentStep[] = [];
    const batches: any[][] = [];
    let currentBatch: any[] = [];

    // Form batches based on isParallelSafe and dependencies
    for (const step of preparer.validated_steps) {
      const def = ALL_ATOMS.find(a => a.function.name === step.tool);
      const isParallelSafe = def?.function?.isParallelSafe ?? false;
      
      if (!isParallelSafe) {
        if (currentBatch.length > 0) { batches.push([...currentBatch]); currentBatch = []; }
        batches.push([step]);
      } else {
        // Break batch if it depends on unresolved keys that might be produced by same batch
        let dependsOnUnresolved = false;
        for (const reqKey of (def?.function?.requiredEntityKeys || [])) {
          if (!state.resolvedEntities[reqKey] && !step.args[reqKey]) {
             dependsOnUnresolved = true;
          }
        }
        if (dependsOnUnresolved) {
          if (currentBatch.length > 0) { batches.push([...currentBatch]); currentBatch = []; }
          batches.push([step]);
        } else {
          currentBatch.push(step);
        }
      }
    }
    if (currentBatch.length > 0) batches.push([...currentBatch]);

    console.log(`${tag} Formed ${batches.length} execution batches:`, batches.map(b => b.map(s => s.tool)));

    for (const batch of batches) {
      superState.update({
        status: "executing" as const,
        message: `Vykonávam: ${batch.map(s => s.tool).join(", ")}...`,
      });

      // Execute all tools in the current batch in parallel
      const batchResults = await Promise.all(batch.map(async (step) => {
        state.toolCallCounts[step.tool] = (state.toolCallCounts[step.tool] ?? 0) + 1;
        console.log(`${tag}[exec=${step.tool}] Args: ${JSON.stringify(step.args)}`);

        const rawResult = await executeAtomicTool(step.tool, step.args, user);
        if (!rawResult) throw new Error(`Execution of ${step.tool} returned no result.`);
        console.log(`${tag}[exec=${step.tool}] Raw result: ${JSON.stringify(rawResult).substring(0, 500)}`);

        const toolResult: ToolResult = {
          tool: step.tool,
          success: !!rawResult.success,
          data: (rawResult as any).data,
          error: rawResult.success ? undefined : String((rawResult as any).error ?? "Unknown error"),
          message: (rawResult as any).message,
          retryable: rawResult.success ? false : isRetryable((rawResult as any).error, step.tool),
          originalArgs: step.args,
        };
        return { step, toolResult };
      }));

      // Process results sequentially (important for state mutations and self-correct escalations)
      for (const { step, toolResult } of batchResults) {
        state.lastToolResult = toolResult;

        if (toolResult.success) {
          extractAndStoreIds(toolResult, state);
          state.correctionAttempts = 0;
          state.completedTools.push(step.tool);
          // Update checklist state immediately for this tool
          state.checklist = updateChecklistState(state.checklist, state.completedTools);
          console.log(`${tag}[exec=${step.tool}] SUCCESS. resolvedEntities now: ${JSON.stringify(state.resolvedEntities)}`);

          const contactId = state.resolvedEntities["contact_id"];
          if (contactId && !step.tool.includes("activity") && !step.tool.includes("fetch") && !step.tool.includes("search")) {
             console.log(`${tag} Silently auto-logging activity for contact ${contactId}...`);
             executeAtomicTool("db_create_activity", {
               contact_id: contactId,
               type: "ai_action",
               subject: `Agent: ${step.tool}`,
               content: `AI agent vykonal akciu: ${step.tool}. Pôvodný cieľ: ${lastPlan.intent || 'Neznámy'}`
             }, user).catch(err => console.error("[AUTO-LOG] Failed:", err));
          }
        } else {
          console.warn(`${tag}[exec=${step.tool}] FAILED: ${toolResult.error}`);
          const correction = await selfCorrect(toolResult, state);
          console.log(`${tag}[self-correct] Decision: ${correction.action}, diagnosis: ${correction.diagnosis}`);

          if (correction.action === "RETRY" && correction.correctedArgs) {
            state.correctionAttempts++;
            console.log(`${tag}[self-correct] Retrying ${step.tool} with fixed args: ${JSON.stringify(correction.correctedArgs)}`);
            const retryRaw = await executeAtomicTool(step.tool, correction.correctedArgs, user);
            if (retryRaw) {
              console.log(`${tag}[self-correct][retry] Result: ${JSON.stringify(retryRaw).substring(0, 300)}`);
              if (retryRaw.success) {
                toolResult.success = true;
                toolResult.data = (retryRaw as any).data;
                toolResult.error = undefined;
                extractAndStoreIds(toolResult, state);
                state.correctionAttempts = 0;
                state.completedTools.push(step.tool);
                // Update checklist state immediately
                state.checklist = updateChecklistState(state.checklist, state.completedTools);
                console.log(`${tag}[self-correct] RETRY SUCCESS.`);
              } else {
                toolResult.error = String((retryRaw as any).error ?? "Retry also failed");
                console.error(`${tag}[self-correct] RETRY FAILED: ${toolResult.error}`);
                
                // Ensure failure is recorded before returning
                state.allResults.push(toolResult);
                const agentStep: AgentStep = { tool: step.tool, status: "error", result: toolResult };
                iterationSteps.push(agentStep);
                finalResults.push(agentStep);

                logEscalation({ failedTool: step.tool, attemptsMade: state.correctionAttempts, partialSuccesses: state.allResults, diagnosis: correction.diagnosis });
                const escalationMsg = buildEscalationMessage({ failedTool: step.tool, attemptsMade: state.correctionAttempts, partialSuccesses: state.allResults, diagnosis: correction.diagnosis });
                superState.done({ content: escalationMsg, status: "done", toolResults: finalResults, thoughts: { intent: "Eskalácia po retry", extractedData: null, plan: state.completedTools }});
                return { finalResults, missionHistory, attempts: state.iteration, lastPlan, state, status: "error" as const };
              }
            }
          } else if (correction.action === "SKIP") {
            console.log(`${tag}[self-correct] Skipping non-critical step: ${step.tool}`);
          } else {
            // Ensure failure is recorded before returning
            state.allResults.push(toolResult);
            const agentStep: AgentStep = { tool: step.tool, status: "error", result: toolResult };
            iterationSteps.push(agentStep);
            finalResults.push(agentStep);

            logEscalation({ failedTool: step.tool, attemptsMade: state.correctionAttempts, partialSuccesses: state.allResults, diagnosis: correction.diagnosis });
            const escalationMsg = buildEscalationMessage({ failedTool: step.tool, attemptsMade: state.correctionAttempts, partialSuccesses: state.allResults, diagnosis: correction.diagnosis });
            superState.done({ content: escalationMsg, status: "done", toolResults: finalResults, thoughts: { intent: "Eskalácia", extractedData: null, plan: state.completedTools }});
            return { finalResults, missionHistory, attempts: state.iteration, lastPlan, state, status: "error" as const };
          }
        }

        state.allResults.push(toolResult);
        const agentStep: AgentStep = { tool: step.tool, status: toolResult.success ? "done" : "error", result: toolResult };
        iterationSteps.push(agentStep);
        finalResults.push(agentStep);
      }
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

  return { finalResults, missionHistory, attempts: state.iteration, lastPlan, state, status: "done" as const };
}

// ─────────────────────────────────────────────────────────
// Plan next action — called every iteration with fresh state
// ─────────────────────────────────────────────────────────
export async function orchestrateParams(
  messages: ChatMessage[],
  missionHistory: MissionHistoryItem[],
  state?: MissionState,
  orchestratorBrief?: string,
  negativeConstraints: string[] = [],
  userName: string = "Používateľ"
) {
  const start = Date.now();
  try {
    // Group tools to help LLM attention focus dynamically by domain
    const registry = await import("./agent-registry");
    const categories = [
      { name: "📇 KONTAKTY & GMAIL", tools: registry.INBOX_ATOMS },
      { name: "🏢 PROJEKTY", tools: registry.PROJECT_ATOMS },
      { name: "💰 OBCHODY", tools: registry.DEAL_ATOMS },
      { name: "📋 ÚLOHY", tools: registry.TASKS_ATOMS },
      { name: "🗓️ KALENDÁR", tools: registry.CALENDAR_ATOMS },
      { name: "🎯 LEADS", tools: registry.LEADS_ATOMS },
      { name: "🧠 AI & ANALÝZA", tools: registry.AI_ATOMS || [] },
      { name: "⚙️ SYSTÉM & OSTATNÉ", tools: [...registry.SYSTEM_ATOMS, ...registry.WEB_ATOMS, ...registry.NOTES_ATOMS, ...registry.ACTIVITY_ATOMS, ...registry.VERIFIER_ATOMS] },
    ];

    // Category-First Scaling: Filter relevant categories to keep prompt clean
    const lowerGoal = (orchestratorBrief || messages[messages.length - 1].content).toLowerCase();
    const rawGoal = (orchestratorBrief || messages[messages.length - 1].content);
    
    // Heuristic: Check for capitalized names (excluding the first word)
    const words = rawGoal.split(/\s+/);
    const hasPotentialName = words.slice(1).some(w => /^[A-ZŠČŤŽĎĽŇ].*/.test(w) && w.length > 2);

    const relevantCategories = categories.filter(cat => {
      // Always include System tools for safety
      if (cat.name.includes("SYSTÉM")) return true;
      
      // Keywords mapping to domains
      const keywords: Record<string, string[]> = {
        "KONTAKTY": ["kontakt", "gmail", "mail", "osoba", "clovek", "email", "volaj", "kto je", "podklady", "info o", "stretnutie"],
        "PROJEKTY": ["projekt", "stavba", "faza", "termin", "drive", "priecinok", "zlozku"],
        "OBCHODY": ["obchod", "deal", "peniaze", "faktura", "suma", "hodnota", "vyhral", "prehral", "stoji"],
        "ÚLOHY": ["uloha", "pripomienka", "task", "urob", "zajtra", "deadline", "priprav", "zariad", "naplanuj"],
        "KALENDÁR": ["kalendar", "event", "udalost", "cas", "stretnutie", "meeting", "zajtra", "dnes", "pondelok", "utorok", "streda", "stvrtok", "piatok"],
        "LEADS": ["lead", "potencial", "marketing", "kampan", " outreach"],
        "AI": ["analyza", "skore", "navrh", "co dalej", "identifikuj", "odporuc"]
      };

      const domain = Object.keys(keywords).find(k => cat.name.includes(k));
      if (!domain) return true; // Default to including unknown categories
      
      const keywordMatch = keywords[domain].some(kw => lowerGoal.includes(kw.toLowerCase()));
      const nameMatch = domain === "KONTAKTY" && hasPotentialName;
      const historyMatch = state?.completedTools.some(tool => cat.tools.some(t => t.function.name === tool));

      return keywordMatch || nameMatch || historyMatch;
    });

    let toolsDocs = "";
    relevantCategories.forEach(cat => {
        toolsDocs += `\n### ${cat.name}\n`;
        toolsDocs += cat.tools.map((t) => `- ${t.function.name}: ${t.function.description}`).join("\n");
        toolsDocs += `\n`;
    });

    // CRITICAL: inject resolvedEntities into every iteration prompt
    const resolvedEntitiesBlock = state?.resolvedEntities && Object.keys(state.resolvedEntities).length > 0
      ? `\n## RESOLVED ENTITIES (USE THESE — DO NOT FETCH AGAIN)\n${JSON.stringify(state.resolvedEntities, null, 2)}`
      : "";

    const completedToolsBlock = state?.completedTools?.length
      ? `\n## COMPLETED TOOLS (DO NOT REPEAT THESE)\n${state.completedTools.join(", ")}`
      : "";

    // D1 FIX: Inject the Checklist into the prompt so LLM aligns with its own predefined phases
    const checklistBlock = state?.checklist?.length
      ? `\n## MISSION CHECKLIST\n${state.checklist.map(i => `[${i.status}] ${i.description} (Expected tool: ${i.toolExpected})`).join("\n")}`
      : "";

    // C3 FIX: Build hard constraints block — injected into EVERY iteration
    const negativeConstraintsList = (negativeConstraints || []).length > 0
      ? (negativeConstraints || []).map((c) => `❌ ZAKÁZANÉ: ${c}`).join("\n")
      : "";
    const hardConstraintsBlock = negativeConstraintsList
      ? `\n## HARD CONSTRAINTS (NEVER VIOLATE — USER EXPLICITLY SET THESE)\n${negativeConstraintsList}`
      : "";

    const systemPrompt = `
ROLE:
You are the Strategic Planner for ArciGy CRM. Map user intent into precise tool sequences.
Current user: ${userName}

AVAILABLE TOOLS:
${toolsDocs}

RESOLVED ENTITIES (already known IDs — use these directly, do not re-fetch):
${resolvedEntitiesBlock}

MISSION CHECKLIST:
${checklistBlock}

CONVERSATION HISTORY:
The history of the current interaction follows.

PLANNING RULES:

1. ALWAYS fetch ID before modifying. If contact_id is unknown → search first.
2. CARRY CONTEXT: If previous turn established an entity (e.g. "Peter Maličký" with ID 278),
   use that ID directly in the next step. Never re-search what is already resolved.
3. For "open deals" or similar → use status filter directly, do not ask what "open" means.
4. For tasks due today → use today's date as due_before filter automatically.
5. Plan maximum 1-2 steps per iteration. Complex missions build step by step.
6. When goal is achieved → return { "action": "DONE" }.
7. Never plan a step that requires information you don't have and can't fetch.

COMMON PATTERNS:
- "pošli mu email" after finding a contact → gmail_send_email with contact's email from resolved entities
- "vytvor úlohu" for a contact → db_create_task with contact_id from resolved entities  
- "najhodnotnejší deal" → db_fetch_deals with status=Open, sort by value
- "čo mám dnes v pláne" → db_fetch_tasks with due_date=today

OUTPUT FORMAT (strict JSON):
{
  "intent": "brief description",
  "thought": "your reasoning",
  "steps": [
    { "tool": "tool_name", "args": { ... } }
  ]
}
Or for completion:
{ "action": "DONE" }
`;

    // Compress mission history aggressively to save tokens
    const historyContext = [
      ...(messages || []).map((m) => ({ role: m.role, content: m.content })),
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
      (negativeConstraints || []).length > 0
        ? `\n\nSTRATEGIC CONSTRAINTS (MUST FOLLOW):\n${(negativeConstraints || []).map((c) => `- ${c}`).join("\n")}`
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

// H5 FIX: Context-aware retryable classification
// Old logic: "not found" was always NOT retryable.
// Problem: search tools SHOULD retry (different query), fetch-by-ID should NOT.
function isRetryable(error: unknown, tool?: string): boolean {
  if (!error) return false;
  const msg = String(error).toLowerCase();

  // Auth: never retry
  if (msg.includes("forbidden") || msg.includes("unauthorized")) return false;

  // Search tools: "not found" / "0 results" is retryable (different query variant)
  if (tool?.includes("search") && (msg.includes("not found") || msg.includes("0 result"))) return true;
  if (tool?.includes("search") && msg.includes("404")) return true;

  // Fetch by ID: "not found" means the ID is wrong — not retryable
  if (tool?.includes("fetch") && (msg.includes("not found") || msg.includes("404"))) return false;

  // Gmail token expiry: not retryable (needs re-auth flow)
  if (msg.includes("invalid_grant") || msg.includes("token expired")) return false;

  // Validation/field errors: retryable (self-corrector can fix args)
  if (msg.includes("invalid") && msg.includes("field")) return true;
  if (msg.includes("required") && msg.includes("missing")) return true;
  if (msg.includes("validation")) return true;

  // Infrastructure: retryable
  if (msg.includes("timeout") || msg.includes("network") || msg.includes("503")) return true;
  if (msg.includes("500") || msg.includes("internal")) return true;

  // Default: attempt correction
  return true;
}

