import { ToolDefinition } from "../agent-types";

export const VERIFIER_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "verify_contact_exists",
      description: "Verifies if a contact with a given ID exists in the database.",
      parameters: {
        type: "object",
        properties: {
          contact_id: {
            type: "number",
            description: "ID of the contact to verify",
          },
        },
        required: ["contact_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "verify_contact_by_email",
      description: "Verifies if a contact with a given email exists in the database.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email of the contact to verify" },
        },
        required: ["email"],
      },
      producesEntityKey: "contact_id",
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "verify_contact_by_name",
      description: "Verifies if a contact with a given name exists in the database.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "First name" },
          last_name: { type: "string", description: "Last name" },
        },
        required: ["first_name"],
      },
      producesEntityKey: "contact_id",
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "verify_recent_contacts",
      description:
        "Retrieves a list of the last N created contacts for verification.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of contacts to check", default: 5 },
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
      name: "verify_project_exists",
      description: "Verifies if a project with a given ID exists.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project ID" },
        },
        required: ["project_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["project_id"],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "verify_database_health",
      description: "Verifies database connection and returns basic statistics.",
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
