import { ToolDefinition } from "../agent-types";

export const SYSTEM_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "sys_fetch_by_date",
      description: "H10: Fetches all relevant CRM data for a specific date, including tasks, project deadlines, calendar events, and notes mentioning the date. Use this for 'What is my plan today?' or 'What happened on [date]?' requests.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "The date to fetch data for (YYYY-MM-DD)." },
        },
        required: ["date"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_list_files",
      description: "Displays the project's file structure (tree view).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path (defaults to root .)",
          },
          depth: { type: "number", default: 2 },
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
      name: "sys_read_file",
      description: "Reads the content of a specific file in the project.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_run_diagnostics",
      description:
        "Runs a diagnostic command in the terminal (e.g., 'npm run build', 'git status'). Used for monitoring status only.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
        required: ["command"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_capture_memory",
      description: "Saves an important fact about the user or their preferences to long-term memory.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string", description: "The fact to remember (e.g., 'User prefers billing in EUR')" },
          category: { type: "string", description: "Category (e.g., 'preferences', 'personal')", default: "general" }
        },
        required: ["fact"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_fetch_call_logs",
      description: "L3: Retrieves metadata from Android call logs (duration, direction, phone number) for a contact. Use this to find the last interaction date.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID of the contact to fetch logs for" },
          limit: { type: "number", default: 5 },
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
      name: "sys_show_info",
      description: "Directly displays a formatted report, table, or detailed text in the chat for the user. Use this when you have a finalized list, status report, or data that MUST be seen by the user apart from the standard confirmation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the report or information block" },
          content: { type: "string", description: "The content to display (Markdown supported)" },
          type: { type: "string", enum: ["text", "table", "list"], default: "text" }
        },
        required: ["title", "content"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_export_to_csv",
      description: "Generates a CSV export of contacts or projects based on a specific filter, and returns a download link.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "projects"], description: "Which entity to export" },
          filter: { type: "string", description: "Optional filter description to apply for the export (e.g., 'only IT sector', 'no recent deals')" },
        },
        required: ["entity_type"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_set_agent_reminder",
      description: "Sets a proactive system reminder/monitor. The agent will check conditions in the background and notify the user when met.",
      parameters: {
        type: "object",
        properties: {
          condition: { type: "string", description: "Condition to monitor (e.g., 'If Peter doesn't reply in 3 days')" },
          action: { type: "string", description: "What to do or inform about when condition is met" },
        },
        required: ["condition", "action"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "sys_generate_report",
      description: "Generates a well-formatted Markdown summary/report based on injected dataset context.",
      parameters: {
        type: "object",
        properties: {
          report_topic: { type: "string" },
          data_context: { type: "string", description: "JSON string or text containing the dataset" },
        },
        required: ["report_topic", "data_context"]
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
];
