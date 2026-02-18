# Task: Implement Agentic CRM Logic

- [x] **Stage 0: Tool Definition & Registry**
  - [x] Define `AgentStep`, `AgentTask`, `AgentContext` interfaces.
  - [x] Create `ALL_ATOMS` registry in `agent-registry.ts`.
  - [x] Implement `sys_execute_plan` meta-tool.
  - [x] **Implement `sys_capture_memory` tool for long-term facts.**

- [x] **Stage 1: Router (Classification)**
  - [x] Implement `classifyRequest` to distinguish between Chat/Action/Query.
  - [x] Connect `POST` route to Router.

- [x] **Stage 2: Orchestrator (Planning)**
  - [x] Create `agent-orchestrator.ts` with `orchestrateParams`.
  - [x] Define system prompt for breaking down intents into tools.
  - [x] Handle multi-step dependencies (e.g., fetch -> reply).
  - [x] **High Quality Planning: Upgrade model to `gemini-2.0-pro-exp-02-05`.**

- [x] **Stage 3: Preparer (Validation)**
  - [x] Create `agent-preparer.ts` with `validateActionPlan`.
  - [x] Implement logic to detect missing arguments.
  - [x] Generate clarifying questions for the user.

- [x] **Stage 4: Executor (Action)**
  - [x] Refactor `route.ts` to execute tools dynamically.
  - [x] Implement `executeAtomicTool` wrapper.
  - [x] **Real-time Log Streaming: Interleave debug logs with AI response.**
  - [x] **Background Sync: Make Google Contact sync non-blocking.**

- [x] **Stage 5: Verifier (Feedback)**
  - [x] Implement `verifyExecutionResults` to check outcomes.
  - [x] Add auto-correction logic (e.g., if finding email fails, try name).

- [x] **Implement Debug Chatbot Area**
  - [x] Create `src/app/dashboard/agent-debug/page.tsx`
  - [x] Update `/api/ai/agent` to support verbatim debug streaming.
  - [x] Add "Copy Debug Data" functionality.
  - [x] **Fixed buffering issues in debug console for reliable log display.**
  - [x] **Diagnosed 422 Clerk OAuth error (missing Google connection).**
