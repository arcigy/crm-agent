import { ToolDefinition } from "../agent-types";

export const DEAL_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_deal",
      description: "Creates a new deal.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          contact_id: { type: "number" },
          value: { type: "number" },
          description: { type: "string" },
        },
        required: ["name", "contact_id"],
      },
      producesEntityKey: "deal_id",
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_search_deals",
      description: "Searches for deals based on name or description.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
      producesEntityKey: "deal_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_deals",
      description: "Retrieves a list of sales deals.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10, description: "Max deals to return" },
          status: { type: "string", enum: ["open", "won", "lost", "invoiced"], description: "Filter deals by status" },
          contact_id: { type: "string", description: "Filter deals for a specific contact" },
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
      name: "db_update_deal",
      description: "Updates a deal's information.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "number" },
          status: { type: "string" },
          value: { type: "number" },
        },
        required: ["deal_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["deal_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_invoice_deal",
      description: "Invoices a deal (changes status to Invoiced).",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "number" },
        },
        required: ["deal_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["deal_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_deals_by_stage",
      description: "Extracts deals and groups them exclusively by their current Pipeline stage.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filter to a specific stage, optional." },
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
      name: "db_create_invoice",
      description: "Initiates the invoice generation procedure for a valid CRM deal.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "number", description: "Valid deal ID to invoice against" },
        },
        required: ["deal_id"],
      },
      producesEntityKey: "invoice_id",
      requiredEntityKeys: ["deal_id"],
      isParallelSafe: false,
    },
  },
];
