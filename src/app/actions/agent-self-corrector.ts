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
Args used: ${JSON.stringify(failedResult.originalArgs, null, 2)}

Diagnose and suggest corrected args.

Common fixes:
- "not found" → try search by name instead of ID, or check ID format (string vs number)
- "missing field" → identify which field and suggest value
- "permission denied" → escalate, do not retry
- "invalid format" → fix date format (ISO 8601), number format, enum value

Output JSON:
{
  "diagnosis": "brief explanation in Slovak",
  "correctedArgs": { ... },
  "canRetry": true | false
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

  // Helper to slugify names for consistent keys (handles diacritics)
  const slugify = (text: string) => 
    text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 30);

  const storeSemanticId = (entityType: string, id: any, entityData: any, originalArgs: any) => {
    const stringId = String(id);
    // 1. Store generic key (latest one wins, for simple backward compatibility)
    updates[`${entityType}_id`] = stringId;
    
    // 2. Namespaced key based on name from RESULT (e.g., "Google" -> contact_google_id)
    const nameFromResult = entityData?.name || entityData?.first_name || entityData?.company;
    if (nameFromResult) {
       updates[`${entityType}_${slugify(nameFromResult)}_id`] = stringId;
    }

    // 3. Namespaced key based on name from ARGS (e.g., search query "Martin" -> contact_martin_id)
    const nameFromArgs = originalArgs?.query || originalArgs?.first_name || originalArgs?.name || originalArgs?.company;
    if (nameFromArgs && typeof nameFromArgs === "string") {
       updates[`${entityType}_${slugify(nameFromArgs)}_id`] = stringId;
    }

    // 4. Specific tool result key
    updates[`${result.tool}_result_id`] = stringId;
  };

  // Generic ID
  if (data.id) {
    updates["last_id"] = String(data.id);
    storeSemanticId("last", data.id, data, result.originalArgs);
  }

  // Semantic fields in object result
  if (data.contact_id) storeSemanticId("contact", data.contact_id, data, result.originalArgs);
  if (data.project_id) storeSemanticId("project", data.project_id, data, result.originalArgs);
  if (data.deal_id) storeSemanticId("deal", data.deal_id, data, result.originalArgs);
  if (data.task_id) storeSemanticId("task", data.task_id, data, result.originalArgs);
  
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
      storeSemanticId("last", first.id, first, result.originalArgs);
    }
    if (first.contact_id) storeSemanticId("contact", first.contact_id, first, result.originalArgs);
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
