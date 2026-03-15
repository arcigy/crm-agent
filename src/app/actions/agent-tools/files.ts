import { ToolDefinition } from "../agent-types";

export const FILE_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "drive_search_file",
      description: "Searches for a file in Google Drive (e.g., invoice, contract).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Filename to search for" },
        },
        required: ["query"],
      },
      producesEntityKey: "file_id",
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "drive_get_file_link",
      description: "Gets a download link for a file.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "string" },
        },
        required: ["file_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["file_id"],
      isParallelSafe: true,
    },
  },
];
