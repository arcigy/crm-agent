import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AI_MODELS } from "@/lib/ai-providers";
import { MissionState, ToolResult, CorrectionDecision } from "./agent-types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────
// SELF-CORRECTOR
// Sits between executor output and next orchestrator loop.
// MAX 2 correction attempts per failed tool.
// ─────────────────────────────────────────────────────────

export async function selfCorrect(
  failedResult: ToolResult,
  state: MissionState
): Promise<CorrectionDecision> {
  const tag = `[SELF-CORRECTOR][iter=${state.iteration}][tool=${failedResult.tool}][attempt=${state.correctionAttempts + 1}]`;

  // Guard: max 2 correction attempts per tool, and only retry retryable errors
  if (!failedResult.retryable || state.correctionAttempts >= 2) {
    console.warn(`${tag} Max corrections reached or non-retryable. Escalating.`);
    return { action: "ESCALATE" };
  }

  console.log(`${tag} Starting self-correction. Error: "${failedResult.error}"`);
  console.log(`${tag} Original args: ${JSON.stringify(failedResult.originalArgs)}`);
  console.log(`${tag} Resolved entities: ${JSON.stringify(state.resolvedEntities)}`);

  const diagnosisPrompt = `
Tool "${failedResult.tool}" failed with error: "${failedResult.error}"

Resolved entities available: ${JSON.stringify(state.resolvedEntities, null, 2)}
Args that were used: ${JSON.stringify(failedResult.originalArgs, null, 2)}
Iteration: ${state.iteration}
Correction attempt: ${state.correctionAttempts + 1} / 2

Diagnose the failure and suggest corrected args.

Common root causes to check:
1. Wrong ID format (UUID string vs integer) — check resolvedEntities for correct format
2. Missing field that IS available in resolvedEntities (e.g., contact_id in last_id)
3. Null/undefined field that should have a value
4. Wrong field name (e.g., sent "id" but tool expects "contact_id")
5. Date format mismatch

Rules:
- If you can fix by using values from resolvedEntities → RETRY_WITH_FIXED_ARGS
- If the step is non-critical and can be skipped → SKIP_STEP
- If fundamentally broken and unrecoverable → ESCALATE

Respond ONLY with valid JSON:
{
  "diagnosis": "concise explanation of what went wrong",
  "action": "RETRY_WITH_FIXED_ARGS" | "SKIP_STEP" | "ESCALATE",
  "correctedArgs": { ... }
}
`;

  try {
    const response = await generateText({
      model: google(AI_MODELS.ROUTER), // Fast model for quick diagnosis
      system: "You are a diagnostic specialist for a CRM agent. Analyze failures and suggest fixes. Respond ONLY with JSON.",
      prompt: diagnosisPrompt,
      temperature: 0,
    });

    const raw = response.text || "";
    const startIdx = raw.indexOf("{");
    const endIdx = raw.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      console.error(`${tag} No JSON in diagnosis response. Raw: ${raw.substring(0, 200)}`);
      return { action: "ESCALATE" };
    }

    const diagnosis = JSON.parse(raw.substring(startIdx, endIdx + 1));
    console.log(`${tag} Diagnosis: ${diagnosis.diagnosis}`);
    console.log(`${tag} Decision: ${diagnosis.action}`);

    if (diagnosis.action === "RETRY_WITH_FIXED_ARGS") {
      console.log(`${tag} Corrected args: ${JSON.stringify(diagnosis.correctedArgs)}`);
      return {
        action: "RETRY",
        correctedArgs: diagnosis.correctedArgs,
        diagnosis: diagnosis.diagnosis,
      };
    }

    if (diagnosis.action === "SKIP_STEP") {
      console.log(`${tag} Skipping non-critical step.`);
      return { action: "SKIP", diagnosis: diagnosis.diagnosis };
    }

    console.warn(`${tag} AI decided to ESCALATE. Reason: ${diagnosis.diagnosis}`);
    return { action: "ESCALATE", diagnosis: diagnosis.diagnosis };
  } catch (error: any) {
    console.error(`${tag} Self-corrector threw exception: ${error.message}`);
    return { action: "ESCALATE", diagnosis: `Self-corrector exception: ${error.message}` };
  }
}

// ─────────────────────────────────────────────────────────
// ID EXTRACTOR — call after EVERY tool execution
// Stores all IDs from result into state.resolvedEntities
// ─────────────────────────────────────────────────────────

export function extractAndStoreIds(
  result: ToolResult,
  state: MissionState
): MissionState {
  const tag = `[ID-EXTRACTOR][tool=${result.tool}]`;
  const data = result.data as any;
  if (!data) return state;

  const updates: Record<string, string> = {};

  // Generic ID always stored as last_id
  if (data.id) {
    updates["last_id"] = String(data.id);
    updates[`${result.tool}_result_id`] = String(data.id);
  }

  // Semantic fields
  if (data.contact_id) updates["contact_id"] = String(data.contact_id);
  if (data.project_id) updates["project_id"] = String(data.project_id);
  if (data.deal_id) updates["deal_id"] = String(data.deal_id);
  if (data.task_id) updates["task_id"] = String(data.task_id);
  if (data.email) updates["contact_email"] = String(data.email);
  if (data.first_name || data.last_name) {
    updates["last_name"] = `${data.first_name || ""} ${data.last_name || ""}`.trim();
  }
  if (data.name) updates["last_entity_name"] = String(data.name);

  // Array result — extract first item IDs
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first.id) {
      updates["last_id"] = String(first.id);
      updates[`${result.tool}_result_id`] = String(first.id);
    }
    if (first.contact_id) updates["contact_id"] = String(first.contact_id);
    if (first.email) updates["contact_email"] = String(first.email);
    if (first.first_name || first.last_name) {
      updates["last_name"] = `${first.first_name || ""} ${first.last_name || ""}`.trim();
    }
  }

  if (Object.keys(updates).length > 0) {
    console.log(`${tag} Storing IDs: ${JSON.stringify(updates)}`);
    state.resolvedEntities = { ...state.resolvedEntities, ...updates };
  } else {
    console.log(`${tag} No IDs found to store.`);
  }

  return state;
}
