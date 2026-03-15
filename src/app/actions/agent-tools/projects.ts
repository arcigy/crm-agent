import { ToolDefinition } from "../agent-types";

export const PROJECT_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_search_projects",
      description: "Searches for projects by name in the CRM.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query string (project name)" },
        },
        required: ["query"],
      },
      producesEntityKey: "project_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_projects",
      description: "Retrieves a list of projects, optionally filtered by contact or stage. Returns latest projects first.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10, description: "Max projects to return" },
          contact_id: { type: "string", description: "Filter projects for a specific contact" },
          stage: { type: "string", description: "Filter by stage name" },
        },
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "db_create_project",
      description: "Creates a new project.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          contact_id: { type: "number" },
          value: { type: "number" },
          deadline: { type: "string" },
        },
        required: ["name", "contact_id"],
      },
      producesEntityKey: "project_id",
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_project",
      description: "Updates a project's information.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number" },
          stage: { type: "string" },
          value: { type: "number" },
        },
        required: ["project_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["project_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete_project",
      description: "Deletes a project (soft delete).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number" },
        },
        required: ["project_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["project_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_pipeline_stats",
      description: "Retrieves aggregated statistics and analytics for projects/deals (e.g., total pipeline value, count by stage).",
      parameters: {
        type: "object",
        properties: {},
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
];
