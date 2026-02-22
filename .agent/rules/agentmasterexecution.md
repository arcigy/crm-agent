---
trigger: always_on
---

# 🤖 AGENT MASTER EXECUTION: Self-Correction, Safety & Testing

> **Part 2 of 2.** See `AGENT_MASTER_CORE.md` for Architecture, Router, Orchestrator & Preparer.
> When fixing, extending, or debugging — **this document wins over the codebase.**

---

## ⚡ STAGE 4: Executors (`agent-executors.ts`)

### Isolation Principle

Each executor is **completely standalone**. A failure in one must never affect others.

```typescript
async function executeWithIsolation(
  action: PreparedAction,
): Promise<ToolResult> {
  try {
    const executor = executorRegistry[action.tool];
    if (!executor) throw new Error(`No executor for: ${action.tool}`);

    const result = await Promise.race([
      executor(action.args),
      timeout(EXECUTOR_TIMEOUT_MS, action.tool),
    ]);

    return { tool: action.tool, success: true, data: result };
  } catch (error) {
    // NEVER throw — always return structured failure
    return {
      tool: action.tool,
      success: false,
      error: sanitizeError(error), // Strip internal details
      retryable: isRetryable(error), // Flag for self-correction layer
      originalArgs: action.args,
    };
  }
}
```

### Soft Delete Rule (ABSOLUTE — NEVER VIOLATE)

```typescript
// ❌ FORBIDDEN
await directus.items("projects").deleteOne(id);

// ✅ REQUIRED
await directus.items("projects").updateOne(id, {
  deleted_at: new Date().toISOString(),
  deleted_by: currentUser.id,
});
```

---

## 🔁 NEW LAYER: Self-Correction Loop (`agent-self-corrector.ts`)

> Sits between executor output and the next orchestrator iteration.
> Catches failures early. Attempts automatic recovery before escalating.
> Max **2 correction attempts** per tool. No immediate escalation on first failure.

```typescript
async function selfCorrect(
  failedResult: ToolResult,
  state: MissionState,
): Promise<CorrectionDecision> {
  if (!failedResult.retryable || state.correctionAttempts >= 2) {
    return { action: "ESCALATE" };
  }

  const diagnosisPrompt = `
Tool "${failedResult.tool}" failed: "${failedResult.error}"
Resolved entities: ${JSON.stringify(state.resolvedEntities)}
Args used: ${JSON.stringify(failedResult.originalArgs)}

Diagnose and suggest corrected args, or decide to skip.
Common causes:
- Wrong ID format (UUID vs integer)
- Missing field available in resolved entities
- Typo in string field

Respond ONLY with JSON:
{
  "diagnosis": "what went wrong",
  "action": "RETRY_WITH_FIXED_ARGS" | "SKIP_STEP" | "ESCALATE",
  "correctedArgs": { ... }
}
`;

  const diagnosis = await callModel(diagnosisPrompt);

  if (diagnosis.action === "RETRY_WITH_FIXED_ARGS") {
    state.correctionAttempts++;
    log(
      `[SELF-CORRECTION] Attempt ${state.correctionAttempts}: ${diagnosis.diagnosis}`,
    );
    return { action: "RETRY", args: diagnosis.correctedArgs };
  }

  if (diagnosis.action === "SKIP_STEP") {
    log(`[SELF-CORRECTION] Skipping non-critical: ${failedResult.tool}`);
    return { action: "SKIP" };
  }

  return { action: "ESCALATE" };
}
```

---

## 🚨 NEW LAYER: Error Escalation Protocol (`agent-escalator.ts`)

> Triggered when: self-correction fails OR same tool fails 2x.
> User always gets a **clear, actionable Slovak message** — never a raw error.
> Always report partial successes — completed steps have value.

```typescript
function buildEscalationMessage(ctx: EscalationContext): string {
  const { failedTool, attemptsMade, partialSuccesses } = ctx;

  const doneItems = partialSuccesses
    .filter((r) => r.success)
    .map((r) => `✅ ${toolToSlovak(r.tool)}`)
    .join("\n");

  const failedItem = `❌ ${toolToSlovak(failedTool)} — nepodarilo sa po ${attemptsMade} pokusoch`;

  return `
Úlohu som čiastočne dokončil:

${doneItems}
${failedItem}

**Čo môžeš urobiť:**
${buildUserActions(failedTool)}

Chceš, aby som to skúsil inak?
`.trim();
}

function toolToSlovak(tool: string): string {
  const map: Record<string, string> = {
    db_create_project: "Vytvorenie projektu",
    db_create_contact: "Vytvorenie kontaktu",
    gmail_send_email: "Odoslanie emailu",
    db_create_task: "Vytvorenie úlohy",
    db_fetch_contact: "Vyhľadanie kontaktu",
  };
  return map[tool] ?? tool;
}
```

---

## ✅ STAGE 5: Verifier (`agent-verifier.ts`)

Translates raw `missionState` into one coherent, friendly Slovak response. **This is the only layer the user ever sees.**

```typescript
const verifierPrompt = `
You are translating agent results into a friendly Slovak response for a CRM user.

ORIGINAL GOAL: ${brief.goal}
RESULTS: ${JSON.stringify(state.allResults, null, 2)}
PARTIAL_SUCCESS: ${partialSuccess}

Rules:
1. Write in Slovak, informal but professional ("ty" form)
2. Lead with what SUCCEEDED, not what failed
3. Emoji: ✅ done · ❌ failed · 📋 info — use sparingly
4. All succeeded → concise confirmation, 2-3 sentences max
5. Partial → clearly explain what worked, what didn't, what to do next
6. NEVER expose: stack traces, IDs, internal field names, model names
7. NEVER say "As an AI" or "I was unable to" — be direct and specific

RESPOND IN SLOVAK ONLY.
`;
```

---

## 💾 MEMORY SYSTEM

| Tier           | Mechanism                | Scope                | Use For                        |
| :------------- | :----------------------- | :------------------- | :----------------------------- |
| **Short-term** | `messages[]` in request  | Single conversation  | Chat context, follow-ups       |
| **Mid-term**   | `missionState` in loop   | Single request cycle | ID passing, step results       |
| **Long-term**  | `ai_memories` (Directus) | Persistent           | User prefs, recurring entities |

**Write to `ai_memories` only when:**

- User explicitly states a preference ("vždy posielaj emaily v angličtine")
- A recurring entity is confirmed (primary contact for a company)
- A task pattern repeats 3+ times

Never auto-write speculative facts. Hallucinated memories are worse than no memory.

---

## 🔐 AUTHENTICATION (`app/api/ai/agent/route.ts`)

```typescript
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  let user = await currentUser();

  // Dev fallback — ONLY on localhost, NEVER in production
  if (!user && process.env.NODE_ENV === "development") {
    user = DEV_FALLBACK_USER;
  }

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runAgentPipeline(req, user.id);
  return Response.json(result);
}
```

---

## 🧪 TESTING PROTOCOL

### Run a Test

```powershell
./scripts/test-agent.ps1 -Prompt "Vytvor mi projekt pre firmu Google"
```

### Debug Checklist (Check Every Layer in JSON Output)

```
□ ROUTER
  □ intent = "TASK"
  □ entities.companies includes "Google"
  □ orchestrator_brief.goal is clean and specific

□ ORCHESTRATOR — Iteration 1
  □ First tool = db_fetch_contact (NOT db_create_project directly)
  □ reasoning explains WHY this tool first

□ PREPARER
  □ No missing args (or correctly healed)
  □ Healing logged: [HEALER] entry visible

□ EXECUTOR
  □ db_fetch_contact returned data.id
  □ id stored in resolvedEntities.contact_id

□ ORCHESTRATOR — Iteration 2
  □ args.contact_id is populated (not null/undefined)
  □ db_create_project called with correct contact_id

□ SELF-CORRECTION (on failure)
  □ Retry attempted before escalating
  □ Escalation message is in Slovak

□ VERIFIER
  □ Response in Slovak
  □ No internal IDs exposed
  □ User knows exactly what happened
```

### Test Coverage Matrix

| Scenario            | Test Prompt                 | Expected Flow                         |
| :------------------ | :-------------------------- | :------------------------------------ |
| Simple fetch        | "Nájdi kontakt Google"      | router→fetch→verify                   |
| Multi-step          | "Vytvor projekt pre Google" | fetch_contact→create_project→verify   |
| Ambiguous follow-up | "Pošli mu email"            | router reads context→fetch_email→send |
| Unknown entity      | "Vytvor projekt pre Alzu"   | fetch_contact(fail)→clarify           |
| Self-correction     | Force executor fail         | retry×2→Slovak escalation             |
| Context follow-up   | "a pridaj mu aj úlohu"      | router uses context→reuses contact_id |

---

## 📜 MASTER RULES (Claude Code Must Never Violate)

**Rule 1 — Registry is Law**
Every tool must exist in `agent-registry.ts` first. Add it there before implementing anywhere else.

**Rule 2 — Soft Deletes Only**
`deleted_at` update. Never `.deleteOne()`. No exceptions.

**Rule 3 — State Must Flow**
`resolvedEntities` must be injected into EVERY orchestrator iteration prompt. The model has no memory between LLM calls — the state object IS the memory.

**Rule 4 — Slovak Responses Always**
Verifier responds in Slovak. No English errors, no JSON, no stack traces reach the user.

**Rule 5 — No Placeholders in Production**
Every executor hits real Directus/API endpoints. `TODO` and `return mock` are forbidden in production files.

**Rule 6 — Next.js App Router Constraints**

- `Response.json()` not `res.json()`
- `await req.json()` not `req.body`
- Respect 60s Vercel timeout — complex chains need streaming or chunking
- Always check `process.env` values exist before using them

**Rule 7 — Fail Loudly in Logs, Silently to User**
Log every failure with full context: tool name, args, error, iteration number.
User sees only a clean Slovak message.

**Rule 8 — Self-Correction Before Escalation**
Self-correction gets exactly 2 attempts before escalating. No immediate escalation on first failure. Ever.

---

## 🔁 LIVING DOCUMENT PROTOCOL

When Claude Code makes any architectural change:

1. Update the relevant section in this file or `AGENT_MASTER_CORE.md` first
2. Add `// Updated: [reason]` comment in the changed code
3. Add a test case to the Testing Matrix above
4. Never delete existing rules — add exceptions with justification if needed

_Build upon this document. Never ignore it._
