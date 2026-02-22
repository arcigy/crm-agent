# 🤖 AGENT MISSION MASTER: Perfection Phase

## 🎯 MISSION STATEMENT

Our sole focus is to achieve **100% reliability and capability parity** for the ArciGy AI Agent. The agent must be able to handle complex, multi-step CRM tasks with precision, safety, and modern aesthetics.

---

## 🏗️ AGENTIC WORKFLOW (Architecture)

The agent operates as a **Pipelines of Specialists**, orchestrated by a central loop.

## 🧠 AGENTIC WORKFLOW (Detailed Lifecycle)

### Stage 1: Intent Routing (`agent-router.ts`)

- **First logic gate**: Decides if we need tools (`TASK`) or just a chat (`CONVERSATION`).
- **Context Injection**: Reads the last few messages to maintain thread continuity.
- **Instruction Generation**: Translates messy user input into a formal `orchestrator_brief`.

### Stage 2: Orchestration Loop (`agent-orchestrator.ts`)

- **Stateful Execution**: Maintains a `missionHistory` within the current request cycle.
- **Reasoning**: Uses a strong model (Gemini Flash) to decide which "Atom" (tool) to call.
- **Planning**: It doesn't just call tools; it thinks about the _sequence_ (e.g., Fetch Contact ID -> Create Project -> Send Email).

### Stage 3: Preparation & Healing (`agent-preparer.ts`)

- **Verification**: Cross-checks tool arguments against the registry.
- **Data Recovery**: If the Orchestrator forgets a `contact_id` but it's in the previous step's output, the Preparer **injects it automatically**.

### Stage 4: Atomic Execution (`agent-executors.ts`)

- **Isolation**: Each executor is standalone. If Projects fails, Gmail still works.
- **Strict Typing**: Validates inputs before hitting the Database or APIs.

### Stage 5: Verification & Reporting (`agent-verifier.ts`)

- **Result Analysis**: Reviews the success/failure of all iterations.
- **Human-Centric Report**: Translates technical results into a friendly Slovak response.

---

## 💾 MEMORY & STATE

- **Short-term**: `messages` array passed in each request.
- **Mid-term**: `missionHistory` (results of tools used in the currently running loop).
- **Long-term**: `ai_memories` table (Directus). Categorized facts about the user/business.

---

## 🛡️ AUTHENTICATION & SAFETY

- **Clerk Native**: The agent always runs under the context of the `currentUser()`.
- **Local Debugging**: Route `/api/ai/agent` has a fallback user for terminal testing on localhost.
- **Soft Deletes**: Deletion tools update `deleted_at` instead of removing rows.

---

## 📜 RULES FOR THE MISSION (AI Interaction)

1. **Terminal-First Testing**: Every new fix must be validated via `test-agent.ps1` (Invoke-RestMethod).
2. **Registry as Source of Truth**: All capabilities must exist as "Atoms" in `agent-registry.ts`.
3. **No Placeholders**: Every tool must have a production-ready implementation.
4. **Soft Deletes Only**: Never use hard delete in any executor (Rule #2 of GEMINI.md).
5. **Detailed Debugging**: When a task fails, I will use `Copy Debug` (JSON) to analyze the step-by-step failure.

---

## 🧪 TESTING WORKFLOW

To test a specific task, run:

```powershell
./scripts/test-agent.ps1 -Prompt "Vytvor mi projekt pre firmu Google"
```

### Response Analysis Checklist:

- [ ] **Router**: Did it correctly identify the intent?
- [ ] **Orchestrator**: Is the plan logical? Does it minimize steps?
- [ ] **Preparer**: Did it catch missing IDs or ask for clarification correctly?
- [ ] **Executor**: Did the database update happen? Is the response message in Slovak/English as requested?

---

## 🛠️ TOOL CATEGORY MAP

| Category          | Prefix         | Focus                                    |
| :---------------- | :------------- | :--------------------------------------- |
| **Contacts**      | `db_*_contact` | CRUD for people and companies.           |
| **Tasks**         | `db_*_task`    | Itemized actions and reminders.          |
| **Projects**      | `db_*_project` | Project lifecycle and Drive integration. |
| **Communication** | `gmail_*`      | Email automation.                        |
| **Context**       | `db_fetch_*`   | Retrieving state to inform decisions.    |

---

_This document is the living guide for the AI Agent Perfection Phase. Build upon it, never ignore it._
