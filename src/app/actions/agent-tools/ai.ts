import { ToolDefinition } from "../agent-types";

export const AI_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "ai_generate_email",
      description: "Generates email text based on context and instructions. Input is message history and what to reply.",
      parameters: {
        type: "object",
        properties: {
          context: {
             type: "array", 
             description: "Message history (previous emails)",
             items: { type: "object" } 
          },
          instruction: { type: "string", description: "What the email content should be (e.g., 'I agree with the deadline')" },
        },
        required: ["context", "instruction"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
];
