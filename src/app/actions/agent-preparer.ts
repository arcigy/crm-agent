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

const READ_ONLY_TOOLS = new Set([
  'db_search_contacts',
  'db_fetch_contacts', 
  'db_get_all_contacts',
  'db_fetch_projects',
  'db_search_projects',
  'db_fetch_tasks',
  'db_fetch_deals',
  'db_fetch_notes',
  'db_get_pipeline_stats',
  'verify_contact_exists',
  'verify_contact_by_email',
  'verify_contact_by_name',
  'verify_recent_contacts',
  'verify_project_exists',
  'verify_database_health',
  'calendar_check_availability',
  'gmail_fetch_list',
  'gmail_get_details',
  'sys_show_info',
]);

export async function validateActionPlan(
  intent: string,
  steps: any[],
  conversationHistory: any[],
  missionHistory: any[] = [],
  state?: MissionState,
) {
  const start = Date.now();
  try {
    // FAST PATH — skipt LLM for simple 1-step read-only missions
    const isSimpleReadOnly =
      steps.length === 1 &&
      READ_ONLY_TOOLS.has(steps[0].tool);

    if (isSimpleReadOnly) {
      const step = steps[0];
      const toolDef = ALL_ATOMS.find(t => t.function.name === step.tool);
      const required = toolDef?.function.parameters?.required || [];
      const hasAllRequired = required.every((reqKey: string) => step.args[reqKey] !== undefined && step.args[reqKey] !== null);
      
      if (hasAllRequired) {
        console.log(`[PREPARER] Fast-path: skipping LLM validation for simple read-only tool: ${step.tool}`);
        return { valid: true, questions: [], validated_steps: steps };
      }
    }

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
Expert Validator for CRM tool calls. Verify that required arguments are present and correct.
Always respond in Slovak.

VALIDATION RULES:

APPROVE immediately (valid: true) when:
- All REQUIRED fields are present
- Optional fields can be empty or missing — never block for optional fields
- Common sense values are acceptable ("Open" for open deals, today's date for today's tasks)

REQUIRED vs OPTIONAL — know the difference:
- db_create_contact: required = name OR (first_name + last_name). email is OPTIONAL.
- db_create_project: required = contact_id, project_name. deadline is OPTIONAL.
- db_create_task: required = title. contact_id, due_date are OPTIONAL.
- gmail_send_email: required = to, subject, body. All must be present.
- db_fetch_deals: no required args. status is optional filter.

NEVER block for:
- Missing deadline on project creation
- Missing phone number on contact creation
- Missing description on task creation
- Ambiguity in filter terms ("open" = status Open, "today" = current date)

ONLY block (valid: false) when:
- A truly required field is completely missing AND cannot be inferred
- Ask ONE question maximum, in Slovak
- The question must be specific: "Aký je email pre Tomáša Bezáka?" nie "Chýbajú niektoré informácie"

If an ID is missing but available in conversation history or resolved entities → inject it silently.

OUTPUT FORMAT:
{
  "valid": true | false,
  "questions": ["jedna konkrétna otázka po slovensky"], // len ak valid=false
  "validated_steps": [ { "tool": "tool_name", "args": { "key": "value" } } ] // always include validated or healed steps
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
