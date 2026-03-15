import { ToolDefinition } from "../agent-types";

export const LEADS_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_fetch_leads",
      description: "Retrieves a list of cold leads with status filtering.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by status (e.g., 'new', 'rejected')",
          },
          limit: { type: "number", default: 10, description: "Max leads to return" },
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
      name: "db_create_lead",
      description: "Creates a new cold lead in the CRM.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Lead email address" },
          first_name: { type: "string", description: "First name" },
          last_name: { type: "string", description: "Last name" },
          company: { type: "string", description: "Company name" },
          status: { type: "string", default: "new", description: "Initial status" },
        },
        required: ["email"],
      },
      producesEntityKey: "lead_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_status",
      description: "Updates the status of an existing cold lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "The ID of the lead to update" },
          status: { type: "string", description: "The new status" },
        },
        required: ["lead_id", "status"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["lead_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_convert_lead_to_contact",
      description: "Converts an existing cold lead into a CRM contact. Closes the lead and provisions a contact record simultaneously.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "ID of the lead to convert" },
          status: { type: "string", description: "Status of the new contact", enum: ["new", "contacted", "qualified", "lost"], default: "new" }
        },
        required: ["lead_id"],
      },
      producesEntityKey: "contact_id",
      requiredEntityKeys: ["lead_id"],
      isParallelSafe: false,
    },
  },
];
