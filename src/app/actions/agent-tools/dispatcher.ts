import { ToolDefinition } from "../agent-types";

export const DISPATCHER_ATOM: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "sys_execute_plan",
      description: "Executes a sequence of tools in the specified order. ALWAYS use this when you need to perform multiple actions at once (e.g., create a contact and immediately schedule a meeting). Accepts an array of steps.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            description: "List of tools to execute",
            items: {
              type: "object",
              properties: {
                tool_name: { type: "string" },
                arguments: { type: "object" },
              },
              required: ["tool_name", "arguments"],
            },
          },
        },
        required: ["steps"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
];
