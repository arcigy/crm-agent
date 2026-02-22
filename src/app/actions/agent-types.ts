// ─────────────────────────────────────────────────────────
// AGENT TYPES
// Central type definitions for the entire agent pipeline.
// See: agentmastercore.md + agentmasterexecution.md
// ─────────────────────────────────────────────────────────

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description?: string;
          enum?: string[];
          default?: unknown;
          items?: any;
          properties?: any;
        }
      >;
      required?: string[];
    };
  };
}

// ─── TOOL RESULT ────────────────────────────────────────
// Returned by every executor. `retryable` flags whether
// the self-corrector should attempt a fix.
export interface ToolResult {
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  retryable?: boolean;     // true = self-corrector may retry
  originalArgs?: Record<string, unknown>; // stored for diagnosis
}

// ─── MISSION STATE ───────────────────────────────────────
// Explicit state accumulator carried through every orchestrator iteration.
// `resolvedEntities` IS the agent's memory between LLM calls.
export interface MissionState {
  iteration: number;
  resolvedEntities: Record<string, string>; // { "contact_id": "abc-123", ... }
  completedTools: string[];
  lastToolResult: ToolResult | null;
  allResults: ToolResult[];
  correctionAttempts: number;      // resets per-tool, max 2
  toolCallCounts: Record<string, number>; // tracks repeats for guard rail
}

// ─── SELF-CORRECTOR DECISION ─────────────────────────────
export type CorrectionAction = "RETRY" | "SKIP" | "ESCALATE";
export interface CorrectionDecision {
  action: CorrectionAction;
  correctedArgs?: Record<string, unknown>;
  diagnosis?: string;
}

// ─── AGENT STEP ──────────────────────────────────────────
export interface AgentStep {
  tool: string;
  args?: Record<string, unknown>;
  status?: "running" | "done" | "error";
  result?: unknown;
}

// ─── CHAT MESSAGE ────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ─── AGENT CHAT ──────────────────────────────────────────
export interface AgentChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  user_email: string;
  date_created: string;
  date_updated: string;
  context?: AgentContext;
}

// ─── CHAT VERDICT (Gatekeeper output) ───────────────────
export interface ChatVerdict {
  intent: "INFO_ONLY" | "ACTION";
  extracted_data: Record<string, unknown>;
  reason?: string;
}

// ─── MISSION HISTORY ITEM ────────────────────────────────
export interface MissionHistoryItem {
  steps: AgentStep[];
  verification: {
    success: boolean;
    analysis?: string;
  };
}

// ─── AGENT TASK ──────────────────────────────────────────
export interface AgentTask {
  id: string;
  intent: string;
  steps: any[];
  status: "PLANNING" | "WAITING_FOR_USER" | "EXECUTING" | "DONE";
  missingInfo?: string[];
  results?: any[];
}

// ─── AGENT CONTEXT ───────────────────────────────────────
export interface AgentContext {
  userId: string;
  userEmail: string;
  currentTask?: AgentTask;
}

// ─── USER RESOURCE ───────────────────────────────────────
export interface UserResource {
  id: string;
  emailAddresses: { emailAddress: string }[];
}

// ─── ACTION RESULT ───────────────────────────────────────
export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}
