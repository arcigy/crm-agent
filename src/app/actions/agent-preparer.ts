"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { withRetry } from "@/lib/ai-retry";
import { AI_MODELS } from "@/lib/ai-providers";
import { MissionState } from "./agent-types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────
// C1 FIX: Code-level tool dependency guard
// Prevents wrong-order tool calls before they hit Directus.
// Eliminates the "null contact_id on db_create_project" bug class.
// Self-corrector drop ~40% expected.
// ─────────────────────────────────────────────────────────

const TOOL_PREREQUISITES: Record<string, string[]> = {
  db_create_project:   ["db_search_contacts", "db_create_contact", "db_get_all_contacts"],
  db_update_project:   ["db_search_projects", "db_fetch_projects", "db_create_project"],
  db_create_task:      ["db_search_contacts", "db_create_contact", "db_create_project", "db_fetch_projects"],
  gmail_send_email:    ["db_search_contacts", "db_create_contact", "db_get_all_contacts"],
  gmail_reply:         ["gmail_fetch_list", "gmail_get_details"],
  gmail_forward_email: ["gmail_fetch_list", "gmail_get_details"],
  db_create_deal:      ["db_search_contacts", "db_create_contact"],
};

function checkPrerequisites(
  tool: string,
  completedTools: string[],
  resolvedEntities: Record<string, string>
): string | null {
  const prereqs = TOOL_PREREQUISITES[tool];
  if (!prereqs) return null;

  // If required entity already in resolvedEntities — prerequisite fulfilled via healing
  if (tool.includes("project") && resolvedEntities["contact_id"]) return null;
  if (tool.includes("task") && (resolvedEntities["contact_id"] || resolvedEntities["project_id"])) return null;
  if (tool.startsWith("gmail_send") && resolvedEntities["contact_email"]) return null;
  if (tool.startsWith("gmail_reply") && resolvedEntities["thread_id"]) return null;
  if (tool.includes("deal") && resolvedEntities["contact_id"]) return null;

  const completed = new Set(completedTools);
  const hasPrereq = prereqs.some((p) => completed.has(p));

  if (!hasPrereq) {
    return `Nástroj "${tool}" vyžaduje najprv: [${prereqs.join(", ")}].`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// M1 FIX: Field-aware history compression
// IDs/emails are NEVER truncated. Content/body fields get aggressive limit.
// ─────────────────────────────────────────────────────────

const NEVER_TRUNCATE = new Set([
  "id", "email", "contact_id", "project_id", "deal_id", "task_id",
  "thread_id", "threadId", "messageId", "message_id",
]);
const SHORT_TRUNCATE = new Set(["content", "body", "description", "comments"]);

function compressField(key: string, value: string): string {
  if (NEVER_TRUNCATE.has(key)) return value;
  const limit = SHORT_TRUNCATE.has(key) ? 80 : 150;
  return value.length > limit ? value.slice(0, limit) + "…" : value;
}

export async function validateActionPlan(
  intent: string,
  steps: any[],
  conversationHistory: any[],
  missionHistory: any[] = [],
  state?: MissionState,
) {
  const start = Date.now();
  try {
    // ── C1: Code-level prerequisite check (runs BEFORE AI call) ──────────────
    if (state) {
      for (const step of steps) {
        const violation = checkPrerequisites(
          step.tool,
          state.completedTools,
          state.resolvedEntities
        );
        if (violation) {
          console.warn(`[PREPARER][C1-GUARD] ${violation}`);
          return {
            valid: false,
            questions: [],           // empty = orchestrator replans, no user question
            validated_steps: steps,
            _prereq_violation: violation,
          };
        }
      }
    }

    // ── Schema for proposed tools only ────────────────────────────────────────
    const proposedToolNames = new Set(steps.map(s => s.tool));
    const toolsContext = ALL_ATOMS
      .filter(t => proposedToolNames.has(t.function.name))
      .map((t) => {
        const p = t.function.parameters?.properties || {};
        const required = t.function.parameters?.required || [];
        const paramsSummary = Object.keys(p).map(k => {
          const isReq = required.includes(k) ? "*" : "";
          return `${isReq}${k}`;
        }).join(",");
        return `${t.function.name}(${paramsSummary})`;
      }).join(" | ");

    const systemPrompt = `
ROLE:
You are the Action Preparer (Safety Net) for a CRM agent. Your job: validate and heal the plan.

TASK:
1. HEAL: If a required ID is missing in PROPOSED STEPS, find it in MISSION HISTORY and INJECT it.
2. DETECT AMBIGUITY: If multiple items exist and you can't decide, set valid:false and ask the user.
3. TRUST SEARCH: Never block search tools if they have a query.

SCHEMA FOR CURRENT STEPS:
${toolsContext}

OUTPUT FORMAT (STRICT JSON):
{
  "valid": boolean,
  "questions": string[], 
  "validated_steps": [ { "tool": "tool_name", "args": { "key": "value" } } ]
}
`;

    // M1: Field-aware compression for mission history
    const compressedHistory = missionHistory.slice(-3).map(h => {
      return h.steps.map((s: any) => {
        let res = s.result as any;
        if (res && res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : [res.data];
          res = {
            success: true,
            data: data.slice(0, 5).map((item: any) => {
              const { date_created, date_updated, deleted_at, user_email, google_id, labels, ...essential } = item;
              const compressed: Record<string, any> = {};
              for (const [k, v] of Object.entries(essential)) {
                compressed[k] = typeof v === "string" ? compressField(k, v) : v;
              }
              return compressed;
            })
          };
        }
        return { tool: s.tool, status: s.status, result: res };
      });
    });

    const prompt = `
      INTENT: ${intent}
      PROPOSED STEPS: ${JSON.stringify(steps)}
      CHAT HISTORY: ${JSON.stringify(conversationHistory.slice(-3))}
      MISSION HISTORY (Last results): ${JSON.stringify(compressedHistory)}
    `;

    console.log(`[PREPARER] Prompt length: ${systemPrompt.length + prompt.length} chars`);

    const response = await withRetry(() => generateText({
      model: google(AI_MODELS.PREPARER),
      system: systemPrompt,
      prompt: prompt,
    }));

    trackAICall(
      "orchestrator",
      "gemini",
      AI_MODELS.PREPARER,
      systemPrompt + prompt,
      response.text,
      Date.now() - start,
      (response.usage as any).promptTokens || (response.usage as any).inputTokens,
      (response.usage as any).completionTokens || (response.usage as any).outputTokens
    );

    try {
      let clean = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const startIdx = clean.indexOf('{');
      const endIdx = clean.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        clean = clean.substring(startIdx, endIdx + 1);
      }

      clean = clean.replace(/"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, "\\n")
                       .replace(/\r/g, "\\r")
                       .replace(/\t/g, "\\t")
                       .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") + '"';
      });

      const parsed = JSON.parse(clean);

      let validatedSteps = parsed.validated_steps || steps;
      if (Array.isArray(validatedSteps)) {
        validatedSteps = validatedSteps.map((s: any) => ({
          tool: s.tool || s.tool_name || s.name,
          args: s.args || s.arguments || s.params || {}
        }));
      }

      return {
        valid: parsed.valid ?? false,
        questions: parsed.questions ?? [],
        validated_steps: validatedSteps
      };
    } catch (e) {
      console.error("Preparer JSON Parse Error", response.text);
      return {
        valid: false,
        questions: ["Prepáč, nerozumel som presne zadaniu. Môžeš to upresniť?"],
        validated_steps: steps
      };
    }

  } catch (error: any) {
    console.error("Preparer Error:", error);
    return {
      valid: false,
      questions: ["Nastala chyba pri validácii požiadavky."],
      validated_steps: steps,
      error: error.message,
    };
  }
}
