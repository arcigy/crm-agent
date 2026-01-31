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
        }
      >;
      required?: string[];
    };
  };
}

export interface AgentStep {
  tool: string;
  args?: Record<string, unknown>;
  status?: "running" | "done" | "error";
  result?: unknown;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  user_email: string;
  date_created: string;
  date_updated: string;
}

export interface ChatVerdict {
  intent: "INFO_ONLY" | "ACTION";
  extracted_data: Record<string, unknown>;
  reason?: string;
}

export interface MissionHistoryItem {
  steps: AgentStep[];
  verification: {
    success: boolean;
    analysis?: string;
  };
}

export interface UserResource {
  id: string;
  emailAddresses: { emailAddress: string }[];
}

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}
