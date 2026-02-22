---
trigger: always_on
---

# 🤖 AGENT MASTER CORE: Architecture, Routing & Planning

> **Part 1 of 2.** See `AGENT_MASTER_EXECUTION.md` for Self-Correction, Executors, Testing & Rules.
> When fixing, extending, or debugging — **this document wins over the codebase.**

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

| Signal                                                          | → Intent             |
| :-------------------------------------------------------------- | :------------------- |
| Verbs: vytvor, pridaj, uprav, vymaž, pošli, nájdi, zisti        | `TASK`               |
| Questions about facts the agent should know                     | `TASK` (fetch first) |
| Casual chat, greetings, thanks, opinions                        | `CONVERSATION`       |
| Ambiguous but mentions a known entity (contact, project, firma) | `TASK`               |
| "Aký je rozdiel medzi X a Y" (generic knowledge)                | `CONVERSATION`       |

### Critical Fix: Context Injection

The router **must read the last 3 messages** before classifying. A follow-up like _"a pošli mu aj email"_ is `TASK` only because the previous message established a contact. Without context, the router fails.

```typescript
// REQUIRED: Always pass recent context to the router prompt
const recentContext = messages
  .slice(-3)
  .map((m) => `${m.role}: ${m.content}`)
  .join("\n");

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

The router's output must be a **formal brief**, not a copy of the user message:

```typescript
interface OrchestratorBrief {
  intent: "TASK";
  goal: string; // Clean restatement of what needs to happen
  entities: {
    // Pre-extracted named entities
    contacts?: string[];
    companies?: string[];
    projects?: string[];
    emails?: string[];
  };
  constraints: string[]; // User-specified rules ("iba draft", "bez emailu")
  ambiguities: string[]; // Unclear things — preparer will handle these
  raw_message: string; // Original preserved for reference
}
```

### Router Anti-Patterns (NEVER DO)

- ❌ Passing raw `userMessage` directly to orchestrator
- ❌ Classifying without reading recent context
- ❌ Defaulting to `CONVERSATION` when unsure — always default to `TASK`
- ❌ Missing entity extraction — orchestrator must never re-parse the raw message

---

## 🧠 STAGE 2: Orchestrator (`agent-orchestrator.ts`)

> **This is the most critical file. Most bugs originate here.**
> The orchestrator plans AND executes the loop. It must never lose state.

### The Core Problem: ID Loss Between Steps

The #1 failure mode. The orchestrator fetches a contact, gets back `{ id: "abc-123" }`, then calls `create_project` **without** passing `contact_id`. This happens because:

1. The AI model forgets values from previous steps
2. `missionHistory` is built but not properly surfaced in the next prompt

### The Fix: Explicit State Accumulator

```typescript
// agent-orchestrator.ts — REQUIRED PATTERN

interface MissionState {
  iteration: number;
  resolvedEntities: Record<string, string>; // { "contact_id": "abc-123" }
  completedTools: string[];
  lastToolResult: ToolResult | null;
  allResults: ToolResult[];
  correctionAttempts: number;
}

// After EVERY tool execution, extract and store ALL IDs from the result:
function extractAndStoreIds(
  result: ToolResult,
  state: MissionState,
): MissionState {
  const data = result.data;
  if (data?.id) state.resolvedEntities["last_id"] = data.id;
  if (data?.contact_id) state.resolvedEntities["contact_id"] = data.contact_id;
  if (data?.project_id) state.resolvedEntities["project_id"] = data.project_id;
  if (data?.email) state.resolvedEntities["contact_email"] = data.email;
  if (data?.name) state.resolvedEntities["last_name"] = data.name;
  // Tool-specific namespace
  state.resolvedEntities[`${result.tool}_result_id`] = data?.id ?? "";
  return state;
}
```

### Orchestrator Prompt Template (REQUIRED — inject on EVERY iteration)

```typescript
const orchestratorPrompt = `
You are a CRM task orchestrator. Decide the NEXT single tool to call.

## MISSION GOAL
${brief.goal}

## RESOLVED ENTITIES (USE THESE — DO NOT FETCH AGAIN)
${JSON.stringify(state.resolvedEntities, null, 2)}

## STEPS COMPLETED (${state.iteration})
${state.completedTools.map((t, i) => `${i + 1}. ${t} → ${state.allResults[i]?.success ? "SUCCESS" : "FAILED"}`).join("\n")}

## LAST TOOL RESULT
${JSON.stringify(state.lastToolResult, null, 2)}

## AVAILABLE TOOLS
${JSON.stringify(availableTools, null, 2)}

## DECISION RULES
1. ID in RESOLVED ENTITIES → use it directly, do NOT fetch again
2. Something failed → try to heal (different args) or skip if non-critical
3. Goal complete → { "action": "DONE", "summary": "..." }
4. Call ONE tool per iteration only
5. Prefer specific tools over generic ones

Respond ONLY with JSON:
{
  "reasoning": "Why this tool, why now",
  "action": "CALL_TOOL" | "DONE" | "NEED_CLARIFICATION",
  "tool": "tool_name",
  "args": { ... },
  "summary": "..."
}
`;
```

### Loop Guard Rails

```typescript
const MAX_ITERATIONS = 12; // Hard cap
const MAX_SAME_TOOL_REPEAT = 2; // Same tool 2x in a row → self-correction
const ITERATION_TIMEOUT_MS = 25000; // Next.js App Router safe limit

if (state.iteration >= MAX_ITERATIONS) {
  return escalateToUser("Dosiahnutý maximálny počet krokov.");
}
if (toolCallCounts[plannedTool] >= MAX_SAME_TOOL_REPEAT) {
  return triggerSelfCorrection(state, plannedTool);
}
```

### Tool Chaining Rules (CANONICAL ORDER)

**Never call a child tool before its parent resolves successfully.**

```
CONTACTS  (always first if entity unknown)
  db_fetch_contact → db_create_contact → db_update_contact
        │
        ▼
PROJECTS  (needs contact_id)
  db_create_project → db_update_project → db_fetch_project
        │
        ▼
TASKS  (needs project_id OR contact_id)
  db_create_task → db_update_task
        │
        ▼
COMMUNICATION  (needs contact email — fetch if missing, always runs LAST)
  gmail_send_email → gmail_create_draft
```

`db_fetch_*` context tools always run **first** if any ID is unknown.
Multiple independent branches (task + email) can share one fetched `contact_id`.

---

## 🛠️ STAGE 3: Preparer + Auto-Healer (`agent-preparer.ts`)

### Purpose

Safety net between planning and execution. Prevents bad tool calls from ever reaching the executor.

### Verification Flow (Run in Order)

```typescript
async function prepareAndHeal(
  plannedAction: PlannedAction,
  state: MissionState,
  registry: ToolRegistry,
): Promise<PreparedAction | HealingResult> {
  // 1. Does this tool exist in registry?
  const tool = registry.getTool(plannedAction.tool);
  if (!tool)
    return requestClarification(`Neznámy nástroj: ${plannedAction.tool}`);

  // 2. Find missing required args
  const missingArgs = tool.requiredArgs.filter(
    (arg) => !(arg in plannedAction.args),
  );

  // 3. AUTO-HEAL — fill from state BEFORE asking user
  for (const missing of missingArgs) {
    const healed = attemptHeal(missing, plannedAction, state);
    if (healed) {
      plannedAction.args[missing] = healed;
      log(`[HEALER] Auto-filled '${missing}' = '${healed}'`);
    }
  }

  // 4. Re-check after healing
  const stillMissing = tool.requiredArgs.filter(
    (arg) => !(arg in plannedAction.args),
  );
  if (stillMissing.length > 0)
    return requestClarification(buildClarificationMessage(stillMissing));

  // 5. Type validation
  const typeErrors = validateArgTypes(plannedAction.args, tool.argSchema);
  if (typeErrors.length > 0) return healTypes(plannedAction, tool.argSchema);

  // 6. Destructive action guard
  if (tool.isDestructive && !plannedAction.args._confirmed) {
    return requestConfirmation(tool, plannedAction.args);
  }

  return { status: "READY", action: plannedAction };
}
```

### Auto-Healing Logic (`attemptHeal`) — Most Important Function

```typescript
function attemptHeal(
  missingArg: string,
  action: PlannedAction,
  state: MissionState,
): string | null {
  const entities = state.resolvedEntities;

  // Direct match
  if (entities[missingArg]) return entities[missingArg];

  // Semantic aliases — handle naming inconsistencies between tools
  const aliases: Record<string, string[]> = {
    contact_id: [
      "last_id",
      "db_fetch_contact_result_id",
      "db_create_contact_result_id",
    ],
    project_id: ["last_project_id", "db_create_project_result_id"],
    email: ["contact_email", "recipient_email"],
    company_id: ["contact_id"],
  };

  for (const alias of aliases[missingArg] ?? []) {
    if (entities[alias]) return entities[alias];
  }

  // Pattern: project tool missing contact_id → check last contact result
  if (missingArg === "contact_id" && action.tool.includes("project")) {
    const contactResult = state.allResults.find((r) =>
      r.tool.includes("contact"),
    );
    if (contactResult?.data?.id) return contactResult.data.id;
  }

  return null; // Cannot heal — will request clarification
}
```

### Clarification Message Format (Slovak, specific, actionable)

```typescript
function buildClarificationMessage(missingArgs: string[]): string {
  const humanNames: Record<string, string> = {
    contact_id: "kontakt (meno alebo firma)",
    project_id: "projekt",
    email: "emailová adresa",
    title: "názov",
    due_date: 'termín (napr. "zajtra" alebo "15.3.")',
  };
  const readable = missingArgs.map((a) => humanNames[a] ?? a).join(", ");
  return `Aby som mohol pokračovať, potrebujem: **${readable}**. Môžeš mi to upresniť?`;
}
```

---

## 🗂️ TOOL CATEGORY MAP

| Category          | Prefix         | Required Args                         | Depends On          |
| :---------------- | :------------- | :------------------------------------ | :------------------ |
| **Contacts**      | `db_*_contact` | `name` or `id`                        | —                   |
| **Projects**      | `db_*_project` | `name`, `contact_id`                  | Contact             |
| **Tasks**         | `db_*_task`    | `title`, `contact_id` or `project_id` | Contact/Project     |
| **Communication** | `gmail_*`      | `to`, `subject`, `body`               | Contact (for email) |
| **Context**       | `db_fetch_*`   | `query` or `id`                       | — (always first)    |
| **Memory**        | `memory_*`     | `category`, `content`                 | —                   |

---

_See `AGENT_MASTER_EXECUTION.md` for: Self-Correction, Escalation, Executors, Verifier, Testing & Master Rules._
