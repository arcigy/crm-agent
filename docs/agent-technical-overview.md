# ArciGy AI Agent — Implementation Audit & Improvement Roadmap

> **Audit date:** 2026-02-22 | Based on commit `b4b58ef`
> **Scope:** Gap analysis between current implementation and production-grade agentic standards.
> **Format:** Severity-ranked findings with concrete fixes and expected outcomes.

---

## 📊 Executive Summary

Your current implementation is **significantly above average** for an agentic CRM system. The core pipeline, MissionState accumulator, self-corrector, and live self-healing search are genuinely impressive. However, there are **12 critical or high-priority gaps** that currently limit reliability, user experience, and scalability. None of them require architectural changes — they are improvements to existing layers.

| Severity    | Count | Impact                                           |
| :---------- | :---: | :----------------------------------------------- |
| 🔴 Critical |   3   | Agent can silently fail or produce wrong results |
| 🟠 High     |   5   | Significant UX or reliability degradation        |
| 🟡 Medium   |   4   | Quality and efficiency improvements              |
| 🔵 Low      |   3   | Scalability and observability                    |

---

## 🔴 CRITICAL ISSUES

---

### C1. Tool Chaining Order Is Prompt-Only — No Code Enforcement

**What you have:**
The dependency graph (Contacts → Projects → Tasks → Communication) exists only in the orchestrator's system prompt. The model _reads_ it, but there is no code-level guard that prevents `db_create_project` from being called before `db_search_contacts` resolves.

**Why it breaks:**
Gemini Flash at temperature > 0 (verifier) and even at temperature 0 can occasionally hallucinate a step sequence, especially in complex 4+ step chains. When it does, the executor hits Directus with a null `contact_id` and fails. This goes through self-corrector (2 attempts), fails, then escalates — but the root cause was a planning error, not an execution error.

**Fix — Code-level dependency guard in `agent-preparer.ts`:**

```typescript
const TOOL_PREREQUISITES: Record<string, string[]> = {
  db_create_project: [
    "db_search_contacts",
    "db_create_contact",
    "db_get_all_contacts",
  ],
  db_create_task: [
    "db_search_contacts",
    "db_create_contact",
    "db_create_project",
  ],
  gmail_send_email: ["db_search_contacts", "db_create_contact"],
  gmail_reply: ["gmail_fetch_list", "gmail_get_details"],
  db_update_project: ["db_search_projects", "db_fetch_projects"],
};

function checkPrerequisites(tool: string, state: MissionState): string | null {
  const prereqs = TOOL_PREREQUISITES[tool];
  if (!prereqs) return null;

  const completed = new Set(state.completedTools);
  const hasPrereq = prereqs.some((p) => completed.has(p));

  // Also accept if the required entity is already in resolvedEntities
  const hasContactId = !!state.resolvedEntities["contact_id"];
  const hasProjectId = !!state.resolvedEntities["project_id"];

  if (!hasPrereq) {
    if (tool.includes("project") && hasContactId) return null; // healed via entity
    if (tool.includes("task") && (hasContactId || hasProjectId)) return null;
    return `Tool "${tool}" requires one of [${prereqs.join(", ")}] to run first.`;
  }
  return null;
}
```

**If check fails:** Preparer rejects the action and forces orchestrator to re-plan with the missing prerequisite as the next step.

**Expected result:** Elimination of "wrong order" failures. Self-corrector workload drops by an estimated 40%.

---

### C2. Router Confidence Score Is Computed but Never Used

**What you have:**
Router returns `confidence: 0.0-1.0` in the structured brief. This value is currently discarded — the pipeline always proceeds regardless of how confident the router is.

**Why it breaks:**
A prompt like `"uprav to"` (no subject, no entity, no context) might return `confidence: 0.31, intent: TASK`. The orchestrator then builds a plan with no entities, iterates until MAX_ITERATIONS, and escalates. The user experience is: agent "tried" for 12 steps and failed on something that should have been a clarification question from the start.

**Fix — Confidence threshold gate after router:**

```typescript
// agent-router.ts — after routeIntent() resolves

const CONFIDENCE_THRESHOLD = 0.65;

if (
  routerResult.type === "TASK" &&
  routerResult.confidence < CONFIDENCE_THRESHOLD
) {
  // Do NOT proceed to orchestrator
  return {
    type: "NEEDS_CLARIFICATION",
    message: buildClarificationFromAmbiguities(
      routerResult.orchestrator_brief_structured.ambiguities,
    ),
  };
}
```

```typescript
function buildClarificationFromAmbiguities(ambiguities: string[]): string {
  if (ambiguities.length === 0) {
    return "Môžeš mi upresniť, čo presne chceš spraviť? Napríklad pre koho alebo čo?";
  }
  return `Pred tým, ako začnem, potrebujem vedieť: ${ambiguities.join(", ")}`;
}
```

**Expected result:** Ambiguous prompts get answered in 1 round-trip instead of 12 failed iterations. Saves cost, saves time, better UX.

---

### C3. `negative_constraints` Are Extracted but Never Injected Into Orchestrator Prompt

**What you have:**
Router correctly identifies `negative_constraints: ["Do not send email directly"]` and stores them in the brief. But looking at the orchestrator prompt injection, only `resolvedEntities` and `completedTools` are injected per iteration. There is no evidence that `negative_constraints` are enforced in the orchestrator loop.

**Why it breaks:**
User says `"Vytvor projekt pre Google ale neposielajte žiadny email"`. Router correctly flags this. Orchestrator plans `[db_search_contacts, db_create_project, gmail_send_email]`. Agent sends the email anyway because the constraint was in the brief object but not in the hot-path prompt injection.

**Fix — Add to every orchestrator iteration prompt:**

```typescript
// In orchestrator prompt template, add a mandatory section:
## HARD CONSTRAINTS (NEVER VIOLATE THESE)
${brief.negative_constraints.map(c => `❌ ${c}`).join('\n') || 'None'}
${brief.constraints.map(c => `✅ REQUIRED: ${c}`).join('\n') || ''}
```

Also enforce in preparer:

```typescript
if (
  negative_constraints.some((nc) => action.tool.includes("gmail")) &&
  negative_constraints.some((nc) => nc.toLowerCase().includes("email"))
) {
  return {
    status: "BLOCKED",
    reason: "Email tools blocked by user constraint",
  };
}
```

**Expected result:** User instructions are actually respected. Without this fix, you have a CRM agent that might ignore explicit user restrictions — a serious trust issue.

---

## 🟠 HIGH PRIORITY

---

### H1. Diacritics in Search Is Handled by Retry — Should Be Normalized at Source

**What you have:**
When searching "Teodor Vážny" fails, the agent iterates with "Vážny" (just surname). This works but wastes 1-2 full orchestrator iterations + Directus calls.

**Better approach — normalize at executor level before the first call:**

```typescript
// In db_search_contacts executor, before calling Directus:
function normalizeSearchQuery(query: string): string[] {
  const stripped = query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove diacritics

  const queries = [query]; // Always try original first
  if (stripped !== query) queries.push(stripped); // Add stripped version

  // Also add surname-only fallback if multi-word
  const parts = query.trim().split(/\s+/);
  if (parts.length > 1) queries.push(parts[parts.length - 1]); // last word = surname

  return [...new Set(queries)]; // Deduplicate
}

// Execute: try each query, return first non-empty result
for (const q of normalizeSearchQuery(args.query)) {
  const result = await directus.items("contacts").readByQuery({ search: q });
  if (result.data.length > 0) return result;
}
```

**Expected result:** Diacritics issue resolved in 1 Directus call instead of 3 orchestrator iterations. Faster, cheaper, same reliability.

---

### H2. No Streaming — User Sees Nothing for 30-60 Seconds on Complex Tasks

**What you have:**
The agent runs its full pipeline and returns one final response. A 4-step task (search → create project → create task → send email) can take 20-45 seconds. During this time the user interface shows nothing.

**Why this is critical for production CRM:**
Users will think the app crashed. In user research, anything over 3-4 seconds without feedback causes "did it work?" anxiety. At 30 seconds, users often click again or refresh, causing duplicate operations.

**Fix — Stream status updates via Server-Sent Events or Vercel Streaming:**

Option A (quickest to implement) — Return intermediate status via streaming:

```typescript
// app/api/ai/agent/route.ts
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Run pipeline async, emit status events
  runAgentPipeline(req, user.id, (event: StatusEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(data));
  }).then((finalResult) => {
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({ type: "DONE", result: finalResult })}\n\n`,
      ),
    );
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

Status events to emit (at minimum):

- `{ type: 'ROUTING', message: 'Analyzujem požiadavku...' }`
- `{ type: 'PLANNING', message: 'Pripravujem plán...' }`
- `{ type: 'EXECUTING', tool: 'db_create_project', message: 'Vytváram projekt...' }`
- `{ type: 'CORRECTING', message: 'Opravujem chybu, skúšam znova...' }`

**Expected result:** User sees real-time progress. Trust in the system increases dramatically. Duplicate action rate drops to near zero.

---

### H3. No Tool Defined for `activities` Collection — Agent Cannot Log Its Own Actions

**What you have:**
Your Directus schema has an `activities` collection (`type, contact_id, subject, content, duration`). This is a CRM timeline — exactly the kind of record you'd want after an agent action. But there is no `db_create_activity` or `db_fetch_activities` tool in the registry.

**Why this matters:**
Every agent action (project created, email sent, contact updated) should automatically create an activity record. Currently, the CRM timeline is empty for agent-initiated actions. Users can't see what the agent did historically.

**Fix — Add tools + auto-logging:**

```typescript
// agent-registry.ts — add to SYSTEM_ATOMS or create ACTIVITY_ATOMS

{
  name: 'db_create_activity',
  description: 'Log an action to the CRM activity timeline for a contact',
  required_args: ['contact_id', 'type', 'subject'],
  optional_args: ['content', 'duration', 'project_id'],
  category: 'ACTIVITY_ATOMS',
}
```

Additionally, auto-log after successful executor runs (in the orchestrator loop, not as a planned tool — so it never counts toward MAX_ITERATIONS):

```typescript
// After successful tool execution, auto-log silently:
if (result.success && state.resolvedEntities["contact_id"]) {
  await autoLogActivity({
    contact_id: state.resolvedEntities["contact_id"],
    type: "ai_agent_action",
    subject: `Agent: ${result.tool}`,
    content: brief.goal,
  });
}
```

**Expected result:** Complete audit trail in the CRM. Users can review everything the agent did. Builds trust. Also useful for debugging.

---

### H4. `ai_deep_analyze_lead` + `db_save_analysis` Require Explicit 2-Step Orchestration

**What you have:**
These two tools are in the registry as separate atoms. The orchestrator has to plan both calls in sequence. If it plans only `ai_deep_analyze_lead` without `db_save_analysis`, the analysis is computed and discarded — never saved.

**Why it breaks:**
The orchestrator might complete `ai_deep_analyze_lead`, see a successful result, and mark the goal as DONE before calling `db_save_analysis`. Analysis done, data lost.

**Fix — Compose these into a single atomic tool:**

```typescript
// Instead of two separate tools, create one composed tool:
{
  name: 'gmail_analyze_and_save_lead',
  description: 'Perform deep AI analysis of an email and save it to Directus. Always use this instead of calling analyze + save separately.',
  required_args: ['email_id'],
  // Internally calls ai_deep_analyze_lead → db_save_analysis
}
```

Keep the individual tools in registry (for edge cases) but document them as "internal use only" and make the composed version the default the orchestrator sees.

**Expected result:** Analysis is always saved. Zero data loss on email analysis.

---

### H5. Self-Corrector's Retryable Classification Is Naive — "not found" Should Sometimes Retry

**What you have:**

```typescript
"not found" | "404" → NOT retryable
```

**Why this is wrong:**

- `db_search_contacts("Teodor Vážny")` → 404/not found → **should retry** with different query
- `db_get_contact(id: "999999")` → 404 → **should NOT retry** (ID doesn't exist)

The error message alone isn't enough context. You need the tool type:

**Fix — Context-aware retryability:**

```typescript
function isRetryable(
  error: string,
  tool: string,
  args: Record<string, unknown>,
): boolean {
  const e = error.toLowerCase();

  // Auth errors: never retry
  if (e.includes("forbidden") || e.includes("unauthorized")) return false;

  // Search tools: "not found" is always retryable (try different query)
  if (tool.includes("search") && e.includes("not found")) return true;
  if (tool.includes("search") && e.includes("0 results")) return true;

  // Fetch by ID: "not found" means the ID is wrong — retryable if ID came from AI, not if user-provided
  if (tool.includes("fetch") && e.includes("not found")) {
    return args.id === undefined; // If no explicit ID, it was hallucinated — retry
  }

  // Field/validation errors: always retryable
  if (
    e.includes("required field") ||
    e.includes("invalid field") ||
    e.includes("validation")
  )
    return true;

  // Infrastructure: retryable
  if (e.includes("timeout") || e.includes("503") || e.includes("500"))
    return true;

  return false;
}
```

**Expected result:** Fewer incorrect escalations on search failures. Self-corrector handles the "different search query" case that currently burns 1-2 unnecessary orchestrator iterations.

---

## 🟡 MEDIUM PRIORITY

---

### M1. History Compression May Truncate Critical Data

**What you have:**
Strings longer than 150 chars are truncated. This is applied to all fields uniformly.

**Risk:**

- An email body truncated at 150 chars loses context needed for `gmail_reply`
- A long project description truncated before a key identifier

**Fix — Field-aware compression:**

```typescript
const NEVER_TRUNCATE_FIELDS = [
  "email",
  "id",
  "contact_id",
  "project_id",
  "threadId",
  "messageId",
];
const SHORT_TRUNCATE_FIELDS = ["content", "body", "description"]; // Truncate these aggressively
const DEFAULT_TRUNCATE_LENGTH = 150;
const SHORT_TRUNCATE_LENGTH = 80;

function compressField(key: string, value: string): string {
  if (NEVER_TRUNCATE_FIELDS.includes(key)) return value; // Never truncate IDs/emails
  const limit = SHORT_TRUNCATE_FIELDS.includes(key)
    ? SHORT_TRUNCATE_LENGTH
    : DEFAULT_TRUNCATE_LENGTH;
  return value.length > limit ? value.slice(0, limit) + "…" : value;
}
```

**Expected result:** No more "lost contact_id due to truncation" class of bugs.

---

### M2. `verify_*` Tools Have No Defined Role in the Orchestration Flow

**What you have:**
You have 5 `verify_*` tools (`verify_contact_exists`, `verify_contact_by_email`, etc.) but they're not in the tool chaining order and the orchestrator has no instruction for when to use them vs. `db_search_contacts`.

**The ambiguity:**

- When should the agent use `verify_contact_exists(id)` vs. `db_search_contacts(name)`?
- Are verify tools for the verifier stage only? For mid-loop sanity checks?

**Fix — Document and enforce their purpose:**

```typescript
/**
 * verify_* tools: Use ONLY for post-action confirmation
 * (after creating/updating something, verify it exists)
 *
 * db_search_contacts: Use for user-initiated lookups
 * db_get_all_contacts: Use when user wants a list
 *
 * NEVER use verify_contact_exists as a search tool — it requires an exact ID.
 */
```

Add to orchestrator system prompt:

```
verify_* tools are ONLY for confirming a previous action succeeded.
Never use verify_* for initial search — use db_search_contacts instead.
```

**Expected result:** No wasted verify calls at the start of a chain. Cleaner plans.

---

### M3. No Proactive Memory Capture Suggestions

**What you have:**
Agent writes to `ai_memories` only when: user explicitly states preference, or entity repeats 3+ times. This is correct and safe. But it's entirely passive.

**The gap:**
User creates a project for "Google" for the 3rd time. The agent has the data. But it silently captures the memory with no user awareness. The user never knows the agent is learning about them.

**Fix — Surface memory capture as a gentle suggestion:**

```typescript
// In verifier, when a new memory is captured:
if (memoryCaptured) {
  appendToResponse(
    `\n\n💡 Zapamätal som si, že Google je jeden z tvojich pravidelných klientov — nabudúce to bude rýchlejšie.`,
  );
}
```

And for patterns about to trigger (after 2nd occurrence, not 3rd):

```typescript
// Suggestion before writing, not after:
if (occurrenceCount === 2) {
  appendToResponse(
    `\n\n💡 Vidím, že s Google pracuješ pravidelne. Mám si to zapamätať pre budúcnosť?`,
  );
  // Wait for user confirmation before writing to ai_memories
}
```

**Expected result:** Users feel the agent is intelligent and growing. Builds product attachment. Also prevents incorrect memory writes because user confirms first.

---

### M4. Gmail OAuth Expiry Has No Recovery Path

**What you have:**
"If OAuth token expired, gmail tools fail." The self-corrector marks these as NOT retryable (403/forbidden). The escalation message says the tool failed. But the user doesn't know they need to re-authenticate — they just see an error.

**Fix — Token expiry detection in executor + specific escalation:**

```typescript
// In gmail executor:
if (error.status === 401 || error.message?.includes("invalid_grant")) {
  return {
    success: false,
    error: "GMAIL_TOKEN_EXPIRED",
    retryable: false,
    userAction: "reauth_gmail",
  };
}
```

```typescript
// In escalator — specific handling for GMAIL_TOKEN_EXPIRED:
if (failedResult.error === "GMAIL_TOKEN_EXPIRED") {
  return `Tvoje Gmail pripojenie vypršalo. Obnov ho v Nastaveniach → Integrácie → Gmail. Potom túto akciu zopakuj.`;
}
```

**Expected result:** User knows exactly what to do instead of seeing a generic failure. Reauth rate improves. Support tickets drop.

---

## 🔵 LOW PRIORITY (Scalability & Observability)

---

### L1. No Rate Limiting on the Agent API Route

The `/api/ai/agent` endpoint has no rate limiting. A user (or a bug causing a retry loop on the frontend) can spam the endpoint, burning Railway compute and Gemini API quota. Add middleware-level rate limiting: 10 requests/minute per user.

---

### L2. Cost Tracking Is Collected but Has No Budget Enforcement

You track `cost_tracking` per call. But there's no mechanism to stop a runaway agent that somehow calls Gemini 50 times in one session. Add a session budget cap: if total tokens in a session exceed X, reject the next call with a friendly message.

---

### L3. `android_logs` Collection Has No Agent Interface

You have call and SMS logs from Android. This is potentially very powerful — the agent could see "last call with Google was 3 days ago" when creating a follow-up task. Zero tools currently expose this data. Consider adding `db_fetch_call_logs(contact_id)` as a context enrichment tool.

---

## 🗺️ RECOMMENDED IMPLEMENTATION ORDER

Based on severity and implementation effort:

| Priority | Fix                                                             |  Effort   |    Impact    |
| :------- | :-------------------------------------------------------------- | :-------: | :----------: |
| 1        | **C3** — Inject `negative_constraints` into orchestrator prompt |  30 min   | 🔴 Critical  |
| 2        | **C2** — Confidence threshold gate                              |  1 hour   | 🔴 Critical  |
| 3        | **C1** — Code-level tool dependency guard in preparer           |  2 hours  | 🔴 Critical  |
| 4        | **H1** — Diacritics normalization in search executor            |  1 hour   |   🟠 High    |
| 5        | **H5** — Context-aware retryable classification                 |  1 hour   |   🟠 High    |
| 6        | **H4** — Compose `analyze + save` into single tool              |  30 min   |   🟠 High    |
| 7        | **H3** — `db_create_activity` tool + auto-logging               |  3 hours  |   🟠 High    |
| 8        | **M1** — Field-aware history compression                        |  1 hour   |  🟡 Medium   |
| 9        | **M2** — Document and enforce `verify_*` tool role              |  30 min   |  🟡 Medium   |
| 10       | **M4** — Gmail token expiry recovery path                       |  1 hour   |  🟡 Medium   |
| 11       | **H2** — Streaming status updates                               | 4-6 hours | 🟠 High (UX) |
| 12       | **M3** — Proactive memory suggestions                           |  2 hours  |  🟡 Medium   |

---

## ✅ What Is Done Well (Keep It)

These are genuinely strong implementations — do not change them:

- **MissionState + `extractAndStoreIds()`** — Clean, correct, and it's working in live tests. The pattern of auto-parking every ID after every tool call is exactly right.
- **Self-healing search** (the Teodor Vážny example) — This is the agent at its best. The iterative narrowing (full name → surname only) works and it's a product differentiator.
- **JSON rescue in orchestrator** — Regex fallback for malformed AI output is pragmatic and correct. Gemini Flash occasionally produces broken JSON; this saves the loop.
- **Gatekeeper as pre-filter** — Separating INFO_ONLY before the full orchestrator pipeline is smart. It saves cost and latency on conversational messages.
- **Cost tracking granularity** — Per-stage, per-model tracking with token counts is the right level of observability. Most teams don't have this.
- **Soft deletes everywhere** — Zero hard deletes. Correct.
- **`temperature: 0` on router** — Deterministic classification is correct. The verifier being non-zero is also correct (natural language needs variation).
- **Compressed history with max 10 messages** — Prevents context window bloat in long sessions.

---

_This document should be reviewed after each sprint. Check off implemented items and re-evaluate priorities based on live production data._
