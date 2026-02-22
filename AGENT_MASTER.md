# 🤖 AGENT MASTER: ArciGy AI Agent — Production Blueprint

> **This document is the absolute source of truth for Claude Code.**
> When fixing, extending, or debugging the ArciGy AI Agent, follow every rule here **without exception**.
> If a rule conflicts with something in the codebase — **the rule wins. Fix the code.**

---

## 🎯 MISSION STATEMENT

Build and maintain a **100% reliable, self-healing, multi-step CRM agent** that:
- Never loses context or IDs between tool calls
- Correctly routes every user intent on the first try
- Recovers from failures automatically before escalating to the user
- Responds in **Slovak** with human-friendly language, never exposes raw errors

**Stack:** Next.js App Router · TypeScript · Directus · Gemini Flash · Clerk Auth

---

## 🏗️ ARCHITECTURE OVERVIEW: Pipelines of Specialists

```
User Message
     │
     ▼
┌─────────────────┐
│  agent-router   │  ← Intent Gate: TASK vs CONVERSATION
└────────┬────────┘
         │ orchestrator_brief
         ▼
┌─────────────────────┐
│ agent-orchestrator  │  ← Stateful planner. Builds step sequence.
│  [CORE LOOP]        │    Runs until done or max_iterations hit.
└────────┬────────────┘
         │ planned_action
         ▼
┌─────────────────┐
│ agent-preparer  │  ← Healer. Injects missing IDs. Validates args.
└────────┬────────┘
         │ verified_action
         ▼
┌─────────────────┐
│ agent-executors │  ← Isolated atoms. One tool at a time.
└────────┬────────┘
         │ tool_result
         ▼
┌──────────────────────────┐
│ Self-Correction Checker  │  ← NEW LAYER. Did it work? If not → retry.
└────────┬─────────────────┘
         │ (loop back or finalize)
         ▼
┌─────────────────┐
│ agent-verifier  │  ← Final report. Human-centric Slovak response.
└─────────────────┘
```

---

## 🧠 STAGE 1: Intent Router (`agent-router.ts`)

### Purpose
First and most critical gate. A wrong classification here ruins the entire chain.

### Classification Rules (STRICT)

| Signal | → Intent |
|:---|:---|
| Verbs: vytvor, pridaj, uprav, vymaž, pošli, nájdi, zisti | `TASK` |
| Questions about facts the agent should know | `TASK` (fetch first) |
| Casual chat, greetings, thanks, opinions | `CONVERSATION` |
| Ambiguous but mentions a known entity (contact, project, firma) | `TASK` |
| "Aký je rozdiel medzi X a Y" (generic knowledge) | `CONVERSATION` |

### Critical Fix: Context Injection
The router **must read the last 3 messages** before classifying. A follow-up like *"a pošli mu aj email"* is `TASK` only because the previous message established a contact. Without context, the router fails.

```typescript
// REQUIRED: Always pass recent context to the router prompt
const recentContext = messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');

const routerPrompt = `
RECENT CONVERSATION:
${recentContext}

NEW MESSAGE: "${userMessage}"

Classify as TASK or CONVERSATION.
Rules:
- If the new message references entities from recent context → TASK
- If ambiguous but actionable → TASK (safer default)
- CONVERSATION only if clearly no action needed

Respond ONLY with JSON: { "intent": "TASK" | "CONVERSATION", "confidence": 0-1, "reason": "..." }
`;
```

### orchestrator_brief Format
The router's output must be a **formal brief**, not a copy of the user message. Claude Code must enforce this structure:

```typescript
interface OrchestratorBrief {
  intent: 'TASK';
  goal: string;                    // Clean restatement of what needs to happen
  entities: {                      // Pre-extracted named entities
    contacts?: string[];
    companies?: string[];
    projects?: string[];
    emails?: string[];
  };
  constraints: string[];           // Any user-specified rules ("iba draft", "bez emailu")
  ambiguities: string[];           // Things that are unclear — preparer will handle these
  raw_message: string;             // Original preserved for reference
}
```

### Router Anti-Patterns (NEVER DO)
- ❌ Passing raw `userMessage` directly to orchestrator
- ❌ Classifying without reading recent context
- ❌ Defaulting to `CONVERSATION` when unsure (default to `TASK`)
- ❌ Missing entity extraction — orchestrator should never re-parse the raw message

---

## 🧠 STAGE 2: Orchestrator (`agent-orchestrator.ts`)

> **This is the most critical file. Most bugs originate here.**
> The orchestrator plans AND executes the loop. It must never lose state.

### The Core Problem: ID Loss Between Steps

The #1 failure mode. The orchestrator fetches a contact, gets back `{ id: "abc-123", name: "Google" }`, then in the next step calls `create_project` **without** passing `contact_id`. This happens because:
1. The AI model forgets values from previous steps
2. `missionHistory` is built but not properly surfaced in the next prompt

### The Fix: Explicit State Accumulator

```typescript
// agent-orchestrator.ts — REQUIRED PATTERN

interface MissionState {
  iteration: number;
  resolvedEntities: Record<string, string>;  // e.g. { "Google_contact_id": "abc-123" }
  completedTools: string[];
  pendingGoals: string[];
  lastToolResult: ToolResult | null;
  allResults: ToolResult[];
}

// After EVERY tool execution, extract and store ALL IDs from the result:
function extractAndStoreIds(result: ToolResult, state: MissionState): MissionState {
  const data = result.data;
  
  // Auto-extract common ID patterns
  if (data?.id) state.resolvedEntities[`last_id`] = data.id;
  if (data?.contact_id) state.resolvedEntities[`contact_id`] = data.contact_id;
  if (data?.project_id) state.resolvedEntities[`project_id`] = data.project_id;
  if (data?.email) state.resolvedEntities[`contact_email`] = data.email;
  if (data?.name) state.resolvedEntities[`last_name`] = data.name;
  
  // Store under tool-specific namespace too
  state.resolvedEntities[`${result.tool}_result_id`] = data?.id ?? '';
  
  return state;
}
```

### The Orchestrator Prompt Template (REQUIRED STRUCTURE)

Every iteration of the loop must inject the full current state. No exceptions.

```typescript
const orchestratorPrompt = `
You are a CRM task orchestrator. Your job is to decide the NEXT single tool to call.

## MISSION GOAL
${brief.goal}

## WHAT WE KNOW (Resolved Entities — USE THESE, DO NOT FETCH AGAIN)
${JSON.stringify(state.resolvedEntities, null, 2)}

## WHAT WE'VE DONE SO FAR (${state.iteration} steps)
${state.completedTools.map((t, i) => `${i + 1}. ${t} → ${state.allResults[i]?.success ? 'SUCCESS' : 'FAILED'}`).join('\n')}

## LAST TOOL RESULT
${JSON.stringify(state.lastToolResult, null, 2)}

## AVAILABLE TOOLS
${JSON.stringify(availableTools, null, 2)}

## DECISION RULES
1. If you need an ID and it's in RESOLVED ENTITIES → use it directly, do NOT fetch again
2. If something failed → try to heal it (different args) or skip if non-critical
3. If goal is complete → respond with { "action": "DONE", "summary": "..." }
4. Only call ONE tool per iteration
5. Prefer specific tools over generic ones

Respond ONLY with JSON:
{
  "reasoning": "Why this tool, why now",
  "action": "CALL_TOOL" | "DONE" | "NEED_CLARIFICATION",
  "tool": "tool_name",
  "args": { ... },
  "summary": "..." // only if DONE
}
`;
```

### Loop Guard Rails

```typescript
const MAX_ITERATIONS = 12;          // Hard cap — never exceed
const MAX_SAME_TOOL_REPEAT = 2;     // If same tool called 2x in a row → escalate
const ITERATION_TIMEOUT_MS = 25000; // Per-iteration timeout for Next.js App Router

// Before each iteration, check:
if (state.iteration >= MAX_ITERATIONS) {
  return escalateToUser('Dosiahnutý maximálny počet krokov. Úloha sa nepodarila dokončiť automaticky.');
}

const toolCallCounts = countToolCalls(state.completedTools);
if (toolCallCounts[plannedTool] >= MAX_SAME_TOOL_REPEAT) {
  // Trigger self-correction before escalating
  return triggerSelfCorrection(state, plannedTool);
}
```

### Tool Chaining Rules (CANONICAL ORDER)

The orchestrator **must follow this dependency order**. Claude Code must enforce it.

```
RULE: Never call a child tool before its parent resolves successfully.

Dependency Graph:
─────────────────────────────────────────────────────
CONTACTS (always first if entity unknown)
  db_fetch_contact → db_create_contact → db_update_contact
        │
        ▼
PROJECTS (needs contact_id)
  db_create_project → db_update_project → db_fetch_project
        │
        ▼
TASKS (needs project_id OR contact_id)
  db_create_task → db_update_task
        │
        ▼
COMMUNICATION (needs contact email — fetch it if missing)
  gmail_send_email → gmail_create_draft
─────────────────────────────────────────────────────

CONTEXT tools (db_fetch_*) run FIRST if any ID is unknown.
COMMUNICATION tools run LAST, always.
Multiple independent branches (e.g. task + email) can share one fetched contact_id.
```

---

## 🛠️ STAGE 3: Preparer + Auto-Healer (`agent-preparer.ts`)

### Purpose
The preparer is the **safety net between planning and execution**. It prevents bad tool calls from ever reaching the executor.

### Verification Checklist (Run in Order)

```typescript
async function prepareAndHeal(
  plannedAction: PlannedAction,
  state: MissionState,
  registry: ToolRegistry
): Promise<PreparedAction | HealingResult> {

  // 1. REGISTRY CHECK — Does this tool exist?
  const tool = registry.getTool(plannedAction.tool);
  if (!tool) return requestClarification(`Neznámy nástroj: ${plannedAction.tool}`);

  // 2. REQUIRED ARGS CHECK — Are all required args present?
  const missingArgs = tool.requiredArgs.filter(arg => !(arg in plannedAction.args));
  
  // 3. AUTO-HEALING — Try to fill missing args from state BEFORE asking user
  for (const missing of missingArgs) {
    const healed = attemptHeal(missing, plannedAction, state);
    if (healed) {
      plannedAction.args[missing] = healed;
      log(`[HEALER] Auto-filled '${missing}' = '${healed}'`);
    }
  }

  // 4. RE-CHECK after healing
  const stillMissing = tool.requiredArgs.filter(arg => !(arg in plannedAction.args));
  if (stillMissing.length > 0) {
    return requestClarification(buildClarificationMessage(stillMissing));
  }

  // 5. TYPE VALIDATION — Are arg types correct?
  const typeErrors = validateArgTypes(plannedAction.args, tool.argSchema);
  if (typeErrors.length > 0) return healTypes(plannedAction, tool.argSchema);

  // 6. SAFETY CHECK — Destructive actions need confirmation flag
  if (tool.isDestructive && !plannedAction.args._confirmed) {
    return requestConfirmation(tool, plannedAction.args);
  }

  return { status: 'READY', action: plannedAction };
}
```

### Auto-Healing Logic (`attemptHeal`)

This function is the most important part of the preparer. It must be comprehensive:

```typescript
function attemptHeal(
  missingArg: string,
  action: PlannedAction,
  state: MissionState
): string | null {

  const entities = state.resolvedEntities;

  // Direct match in resolved entities
  if (entities[missingArg]) return entities[missingArg];

  // Semantic aliases — handle naming inconsistencies
  const aliases: Record<string, string[]> = {
    'contact_id':  ['last_id', 'db_fetch_contact_result_id', 'db_create_contact_result_id'],
    'project_id':  ['last_project_id', 'db_create_project_result_id'],
    'email':       ['contact_email', 'recipient_email'],
    'company_id':  ['contact_id'],  // Sometimes the same in this schema
  };

  for (const alias of (aliases[missingArg] ?? [])) {
    if (entities[alias]) return entities[alias];
  }

  // Pattern: if tool is db_*_project and contact_id missing, check last contact fetch
  if (missingArg === 'contact_id' && action.tool.includes('project')) {
    const contactResult = state.allResults.find(r => r.tool.includes('contact'));
    if (contactResult?.data?.id) return contactResult.data.id;
  }

  return null; // Cannot heal — will request clarification
}
```

### Clarification Message Format

When the preparer cannot heal and must ask the user, the message must be **Slovak, specific, and actionable**:

```typescript
function buildClarificationMessage(missingArgs: string[]): string {
  const humanNames: Record<string, string> = {
    'contact_id': 'kontakt (meno alebo firma)',
    'project_id': 'projekt',
    'email': 'emailová adresa',
    'title': 'názov',
    'due_date': 'termín (napr. "zajtra" alebo "15.3.")',
  };
  
  const readable = missingArgs.map(a => humanNames[a] ?? a).join(', ');
  return `Aby som mohol pokračovať, potrebujem: **${readable}**. Môžeš mi to upresniť?`;
}
```

---

## ⚡ STAGE 4: Executors (`agent-executors.ts`)

### Isolation Principle
Each executor is **completely standalone**. A failure in one must never affect others. Use this pattern:

```typescript
async function executeWithIsolation(action: PreparedAction): Promise<ToolResult> {
  try {
    const executor = executorRegistry[action.tool];
    if (!executor) throw new Error(`No executor for: ${action.tool}`);
    
    const result = await Promise.race([
      executor(action.args),
      timeout(EXECUTOR_TIMEOUT_MS, action.tool)
    ]);
    
    return { tool: action.tool, success: true, data: result };
    
  } catch (error) {
    // NEVER throw — always return structured failure
    return {
      tool: action.tool,
      success: false,
      error: sanitizeError(error),    // Strip internal details
      retryable: isRetryable(error),  // Flag for self-correction layer
    };
  }
}
```

### Soft Delete Rule (ABSOLUTE — NEVER VIOLATE)
```typescript
// ❌ FORBIDDEN
await directus.items('projects').deleteOne(id);

// ✅ REQUIRED
await directus.items('projects').updateOne(id, {
  deleted_at: new Date().toISOString(),
  deleted_by: currentUser.id,
});
```

---

## 🔁 NEW LAYER: Self-Correction Loop

> This layer sits between executor output and the next orchestrator iteration.
> It catches failures early and attempts automatic recovery before escalating.

```typescript
// agent-self-corrector.ts — NEW FILE

interface CorrectionAttempt {
  originalTool: string;
  originalArgs: Record<string, unknown>;
  failureReason: string;
  attempt: number;
}

async function selfCorrect(
  failedResult: ToolResult,
  state: MissionState,
  orchestrator: Orchestrator
): Promise<CorrectionDecision> {

  // Only retry if flagged as retryable and under attempt limit
  if (!failedResult.retryable || state.correctionAttempts >= 2) {
    return { action: 'ESCALATE' };
  }

  // Ask the orchestrator model to self-diagnose
  const diagnosisPrompt = `
Tool "${failedResult.tool}" failed with: "${failedResult.error}"

Current resolved entities: ${JSON.stringify(state.resolvedEntities)}
Original args used: ${JSON.stringify(failedResult.originalArgs)}

Diagnose the failure and suggest corrected args, OR decide to skip this step.
Common causes:
- Wrong ID format (UUID vs integer)
- Missing required field that IS available in resolved entities
- Typo in string field

Respond ONLY with JSON:
{
  "diagnosis": "what went wrong",
  "action": "RETRY_WITH_FIXED_ARGS" | "SKIP_STEP" | "ESCALATE",
  "correctedArgs": { ... }  // only if RETRY
}
`;

  const diagnosis = await callModel(diagnosisPrompt);
  
  if (diagnosis.action === 'RETRY_WITH_FIXED_ARGS') {
    state.correctionAttempts++;
    log(`[SELF-CORRECTION] Attempt ${state.correctionAttempts}: ${diagnosis.diagnosis}`);
    return { action: 'RETRY', args: diagnosis.correctedArgs };
  }

  if (diagnosis.action === 'SKIP_STEP') {
    log(`[SELF-CORRECTION] Skipping non-critical step: ${failedResult.tool}`);
    return { action: 'SKIP' };
  }

  return { action: 'ESCALATE' };
}
```

---

## 🚨 NEW LAYER: Error Escalation Protocol

> Triggered when self-correction fails OR when the same tool fails 2x.
> User gets a **clear, actionable Slovak message** — never a raw error.

```typescript
// agent-escalator.ts — NEW FILE

interface EscalationContext {
  failedTool: string;
  attemptsMade: number;
  partialSuccesses: ToolResult[];
  originalGoal: string;
}

function buildEscalationMessage(ctx: EscalationContext): string {
  const { failedTool, attemptsMade, partialSuccesses, originalGoal } = ctx;
  
  // Report what DID work (partial success is still valuable)
  const doneItems = partialSuccesses
    .filter(r => r.success)
    .map(r => `✅ ${toolToSlovak(r.tool)}`)
    .join('\n');
    
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

// Map tool names to Slovak human descriptions
function toolToSlovak(tool: string): string {
  const map: Record<string, string> = {
    'db_create_project':  'Vytvorenie projektu',
    'db_create_contact':  'Vytvorenie kontaktu',
    'gmail_send_email':   'Odoslanie emailu',
    'db_create_task':     'Vytvorenie úlohy',
    'db_fetch_contact':   'Vyhľadanie kontaktu',
  };
  return map[tool] ?? tool;
}
```

---

## ✅ STAGE 5: Verifier (`agent-verifier.ts`)

### Purpose
Translate the raw `missionState` into one coherent, friendly Slovak response. This is the only layer the user ever sees.

### Verifier Prompt (REQUIRED TEMPLATE)

```typescript
const verifierPrompt = `
You are translating agent results into a friendly Slovak response for a CRM user.

ORIGINAL GOAL: ${brief.goal}
RESULTS: ${JSON.stringify(state.allResults, null, 2)}
PARTIAL_SUCCESS: ${partialSuccess}

Rules:
1. Write in Slovak, informal but professional ("ty" form)
2. Lead with what SUCCEEDED, not what failed
3. Use emoji sparingly (✅ for done, ❌ for failed, 📋 for info)
4. If all succeeded: be concise and confirmatory (2-3 sentences max)
5. If partial: clearly explain what worked, what didn't, what user should do
6. NEVER expose: stack traces, IDs, internal field names, model names
7. NEVER say "As an AI" or "I was unable to" — be direct and specific

RESPOND IN SLOVAK ONLY.
`;
```

---

## 💾 MEMORY SYSTEM

### Three Tiers (Use the Right One)

| Tier | Mechanism | Scope | Use For |
|:---|:---|:---|:---|
| **Short-term** | `messages[]` in request | Single conversation | Chat context, follow-ups |
| **Mid-term** | `missionState` in loop | Single request cycle | ID passing, step results |
| **Long-term** | `ai_memories` (Directus) | Persistent across sessions | User prefs, recurring entities |

### Long-term Memory Write Rules
Only write to `ai_memories` when:
- User explicitly states a preference ("vždy posielaj emaily v angličtine")
- A recurring entity is confirmed (primary contact for a company)
- A task pattern repeats 3+ times

Never auto-write speculative facts. Hallucinated memories are worse than no memory.

---

## 🔐 AUTHENTICATION & SECURITY

### Next.js App Router Pattern (REQUIRED)

```typescript
// app/api/ai/agent/route.ts

import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  // Production: always use Clerk
  let user = await currentUser();
  
  // Local dev fallback (ONLY on localhost, NEVER in production)
  if (!user && process.env.NODE_ENV === 'development') {
    user = DEV_FALLBACK_USER;
  }
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Pass userId into ALL executor calls — used for audit trail
  const result = await runAgentPipeline(req, user.id);
  return Response.json(result);
}
```

---

## 🧪 TESTING PROTOCOL

### Every Fix Must Pass This Checklist

**Step 1: Run the test**
```powershell
./scripts/test-agent.ps1 -Prompt "Vytvor mi projekt pre firmu Google"
```

**Step 2: Analyze the JSON debug output — check each layer:**

```
□ ROUTER
  □ intent = "TASK" (not CONVERSATION)
  □ entities.companies includes "Google"
  □ orchestrator_brief.goal is clean and specific

□ ORCHESTRATOR — Iteration 1
  □ First tool = db_fetch_contact (NOT db_create_project directly)
  □ reasoning explains WHY this tool first

□ PREPARER
  □ No missing args warnings (or correctly healed)
  □ If healing happened: log shows [HEALER] entry

□ EXECUTOR
  □ db_fetch_contact returned data with id
  □ id was stored in resolvedEntities.contact_id

□ ORCHESTRATOR — Iteration 2
  □ args.contact_id is populated (not null/undefined)
  □ db_create_project is called with correct contact_id

□ SELF-CORRECTION (if any failure)
  □ Attempted retry before escalating
  □ Escalation message is in Slovak

□ VERIFIER
  □ Response is in Slovak
  □ No internal IDs exposed
  □ User knows exactly what happened
```

### Test Coverage Matrix

| Scenario | Test Prompt | Expected Flow |
|:---|:---|:---|
| Simple fetch | "Nájdi kontakt Google" | router→fetch→verify |
| Multi-step | "Vytvor projekt pre Google" | fetch_contact→create_project→verify |
| Ambiguous | "Pošli mu email" | router reads context→fetch_email→send |
| Unknown entity | "Vytvor projekt pre Alzu" | fetch_contact (fail)→clarify |
| Self-correction | Force executor fail | retry→escalate with Slovak msg |
| Follow-up | "a pridaj mu aj úlohu" | router uses context→finds contact_id from history |

---

## 📜 MASTER RULES (Claude Code Must Never Violate)

### Rule 1: Registry is Law
Every tool capability must exist in `agent-registry.ts`. If it's not in the registry, it doesn't exist. Claude Code must add it there first before implementing.

### Rule 2: Soft Deletes Only
`deleted_at` update. Never `.deleteOne()`. No exceptions, no matter what.

### Rule 3: State Must Flow
`resolvedEntities` must be built and injected into EVERY orchestrator iteration prompt. The model has no memory between LLM calls — the state object IS the memory.

### Rule 4: Slovak Responses Always
The verifier responds in Slovak. No English errors, no JSON, no stack traces ever reach the user response.

### Rule 5: No Placeholders in Production
Every executor must hit real Directus/API endpoints. `TODO` and `return mock` are forbidden in any file that runs in production.

### Rule 6: Next.js App Router Constraints
- No `res.json()` — use `Response.json()`
- No `req.body` — use `req.json()`
- Respect 60s Vercel timeout — complex chains need streaming or chunking
- Never use `process.env` without fallback checks

### Rule 7: Fail Loudly in Logs, Silently to User
Every failure must be logged with full context (tool, args, error, iteration number). But the user sees only a clean Slovak message.

### Rule 8: Self-Correction Before Escalation
If a tool fails, the self-correction layer gets exactly 2 attempts before escalating to the user. This is non-negotiable — no immediate escalation on first failure.

---

## 🗂️ TOOL CATEGORY MAP (Extended)

| Category | Prefix | Required Args | Depends On |
|:---|:---|:---|:---|
| **Contacts** | `db_*_contact` | `name` or `id` | — |
| **Tasks** | `db_*_task` | `title`, `contact_id` or `project_id` | Contact/Project |
| **Projects** | `db_*_project` | `name`, `contact_id` | Contact |
| **Communication** | `gmail_*` | `to` (email), `subject`, `body` | Contact (for email) |
| **Context** | `db_fetch_*` | `query` or `id` | — (always runs first) |
| **Memory** | `memory_*` | `category`, `content` | — |

---

## 🔁 LIVING DOCUMENT PROTOCOL

This file is the **single source of truth**. When Claude Code makes any architectural change:

1. Update the relevant section here first
2. Note the change with `// Updated: [reason]` in code comments
3. Add a test case to the Testing Matrix above
4. Never delete existing rules — add exceptions with justification if needed

_Build upon this document. Never ignore it._
