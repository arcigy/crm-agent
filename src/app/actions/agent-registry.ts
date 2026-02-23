import { ToolDefinition } from "./agent-types";

export const INBOX_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "gmail_fetch_list",
      description: "Gets a list of message IDs and snippets from Gmail.",
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description: "Search query (e.g., 'from:petra', 'is:unread')",
          },
          maxResults: { type: "number", default: 5 },
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
      name: "gmail_get_details",
      description:
        "Gets the complete content of an email (body, subject, sender) by ID.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string" },
        },
        required: ["messageId"],
      },
      producesEntityKey: "message_id",
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_reply",
      description:
        "Prepares a reply to an existing email thread and opens the compose window. ONLY use this when you have a valid threadId from a previous email. It never sends directly - it only prepares a draft for the user to review.",
      parameters: {
        type: "object",
        properties: {
          threadId: {
            type: "string",
            description: "The ID of the thread to reply to.",
          },
          body: {
            type: "string",
            description:
              "Reply content in HTML or plain text.",
          },
        },
        required: ["threadId", "body"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["threadId"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_send_email",
      description:
        "Opens the compose window for a NEW email (not a reply). Use this when starting a fresh conversation with a contact. It pre-fills the recipient, subject, and body.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address",
          },
          subject: {
            type: "string",
            description: "Email subject",
          },
          body: {
            type: "string",
            description: "Email body content",
          },
        },
        required: ["to", "subject", "body"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_trash_message",
      description: "Moves an email to the trash.",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["messageId"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_archive_message",
      description: "Archives an email (removes it from the inbox).",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["messageId"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_analyze_and_save_lead",
      description: "H4 FIX: Performs deep AI analysis of an email (intent, priority, sentiment) AND automatically saves the result to CRM. Use this instead of CALLING analyze + save separately.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The ID of the email to analyze" },
          content: { type: "string", description: "Body of the email" },
          subject: { type: "string", description: "Subject of the email" },
          sender: { type: "string", description: "Sender's email address" },
        },
        required: ["messageId", "content", "subject", "sender"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["messageId"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "ai_deep_analyze_lead",
      description:
        "In-depth AI analysis of email text (entity extraction, intent identification, and prioritization).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          subject: { type: "string" },
          sender: { type: "string" },
        },
        required: ["content"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "ai_suggest_next_action",
      description: "H5: Analyzes a contact's or project's history to intelligently recommend the next best action.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          project_id: { type: "number" }
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
      name: "ai_score_lead",
      description: "Calculates an AI-driven score (0-100) and recommendation for a lead/contact based on engagement and value.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
        },
        required: ["contact_id"]
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "db_save_analysis",
      description: "Saves the result of a lead's AI analysis into the CRM database.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          intent: { type: "string" },
          summary: { type: "string" },
          next_step: { type: "string" },
          sentiment: { type: "string" },
        },
        required: ["message_id", "intent"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["message_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_info",
      description: "Updates AI analysis data for a specific lead.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string", description: "ID of the message analysis to update" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Urgency level of the lead" },
          next_step: { type: "string", description: "Suggested action to take next" },
        },
        required: ["message_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["message_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_bulk_update",
      description: "Performs a bulk update on multiple CRM records (e.g. projects, deals, tasks) matching a specific Directus schema filter.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "The directus collection name (projects, deals, crm_tasks, contacts)" },
          filter: { type: "object", description: "Directus API filter object (e.g. { name: { _icontains: 'Google' } })" },
          update_payload: { type: "object", description: "The fields and values to update across all matched records" },
        },
        required: ["entity_type", "filter", "update_payload"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "ai_suggest_next_action",
      description: "H5: Analyzes a contact's or project's history to intelligently recommend the next best action.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          project_id: { type: "number" }
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
      name: "sys_generate_report",
      description: "Generates a well-formatted Markdown summary/report based on injected dataset context.",
      parameters: {
        type: "object",
        properties: {
          report_topic: { type: "string" },
          data_context: { type: "string", description: "JSON string or text containing the dataset to report on" },
        },
        required: ["report_topic", "data_context"]
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "ai_score_lead",
      description: "Calculates an AI-driven score (0-100) and recommendation for a lead/contact based on engagement and value.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
        },
        required: ["contact_id"]
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "db_create_contact",
      description: "Creates a new contact in the CRM database.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "First name" },
          last_name: { type: "string", description: "Last name" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          company: { type: "string", description: "Company name" },
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "lost"],
            default: "new",
          },
          comments: { type: "string", description: "Contact notes" },
        },
        required: ["first_name"],
      },
      producesEntityKey: "contact_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_search_contacts",
      description: "Searches for contacts in the CRM by name, email, or company.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query string" },
        },
        required: ["query"],
      },
      producesEntityKey: "contact_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_all_contacts",
      description: "Retrieves a list of all contacts in the CRM.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of contacts to retrieve",
            default: 50,
          },
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
      name: "db_delete_contact",
      description: "Deletes a contact from the CRM database (soft delete).",
      parameters: {
        type: "object",
        properties: {
          contact_id: {
            type: "number",
            description: "ID of the contact to delete",
          },
        },
        required: ["contact_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_save_draft",
      description: "Creates and saves a draft email explicitly into the user's Gmail Drafts without opening the compose UI.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["to", "subject", "body"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_get_conversation_with_contact",
      description: "Retrieves the full Gmail email thread/conversation specifically filtered by the given contact's email address.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Contact email address" },
          limit: { type: "number", default: 10 },
        },
        required: ["email"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_forward_email",
      description: "Forwards an email to a specified address.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string" },
          to: { type: "string", description: "Recipient's email address" },
        },
        required: ["messageId", "to"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["messageId"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_contact",
      description: "Updates details of an existing contact.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string" },
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "lost"],
          },
        },
        required: ["contact_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_merge_records",
      description: "Merges a duplicate contact into a primary contact. Moves all related data (projects, tasks, emails, notes) to the primary contact and archives the duplicate.",
      parameters: {
        type: "object",
        properties: {
          primary_contact_id: { type: "number", description: "ID of the contact to keep" },
          duplicate_contact_id: { type: "number", description: "ID of the contact to merge and archive" },
        },
        required: ["primary_contact_id", "duplicate_contact_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["primary_contact_id","duplicate_contact_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_contacts_without_activity",
      description: "Finds clients/contacts completely missing any activity entries for a specified amount of recent days.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days elapsed without contact. E.g. 30", default: 30 },
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
      name: "db_get_contact_overview",
      description: "H1: Retrieves a comprehensive 360-degree overview of a contact, including their projects, tasks, past deals, activities, and communication history in one call.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number", description: "ID of the contact to overview" },
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
      name: "db_find_duplicate_contacts",
      description: "Scans the entire contact database for potential duplicates based on fuzzy matching logic (same email, phone, or very similar names).",
      parameters: {
        type: "object",
        properties: {},
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "db_add_contact_comment",
      description: "Adds a comment (note) to a contact.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          comment: {
            type: "string",
            description: "The text of the comment to add",
          },
        },
        required: ["contact_id", "comment"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
];

export const NOTES_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_note",
      description: "Creates a new note in the CRM.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the note" },
          content: { type: "string", description: "Body of the note (Markdown/HTML)" },
          contact_id: { type: "number", description: "Optional link to contact" },
          project_id: { type: "number", description: "Optional link to project" },
        },
        required: ["title", "content"],
      },
      producesEntityKey: "note_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_notes",
      description: "Lists recent CRM notes with an optional limit.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10, description: "Maximum number of notes to return" },
          contact_id: { type: "string", description: "Filter notes for a specific contact" },
          project_id: { type: "string", description: "Filter notes for a specific project" },
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
      name: "db_update_note",
      description: "Updates an existing note.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "number" },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["note_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["note_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete_note",
      description: "Removes a note from the CRM.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "number" },
        },
        required: ["note_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["note_id"],
      isParallelSafe: false,
    },
  },
];

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

export const SYSTEM_ATOMS: ToolDefinition[] = [
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
  {
    type: "function",
    function: {
      name: "db_bulk_update",
      description: "Performs a bulk update on multiple CRM records (projects, deals, tasks, contacts).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["projects", "deals", "crm_tasks", "contacts"] },
          filter: { type: "object", description: "Directus API filter object (e.g. { name: { _icontains: 'X' } })" },
          update_payload: { type: "object", description: "Fields to update" },
        },
        required: ["entity_type", "filter", "update_payload"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
];

export const ACTIVITY_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_activity",
      description: "H3: Logs an action to the CRM activity timeline for a contact. Use this to record sales calls, meetings, or important AI actions manually.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          type: { type: "string", description: "Type of activity (e.g., 'call', 'meeting', 'ai_action')" },
          subject: { type: "string", description: "Brief title of the activity" },
          content: { type: "string", description: "Detailed description of what happened" },
          duration: { type: "number", description: "Duration in minutes" },
          project_id: { type: "number", description: "Optional project link" },
        },
        required: ["contact_id", "type", "subject"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["contact_id"],
      isParallelSafe: false,
    },
  },
];

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

export const WEB_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "web_scrape_page",
      description:
        "Downloads and reads the content of a single webpage (returns Markdown).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Page URL" },
        },
        required: ["url"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "web_crawl_site",
      description:
        "Crawls an entire website (including subpages) and maps it.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Main website URL" },
          limit: {
            type: "number",
            default: 10,
            description: "Max number of pages to crawl",
          },
        },
        required: ["url"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "web_search_google",
      description:
        "Searches for information on the internet (Google Search via Firecrawl).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (e.g., 'Finstat ArciGy')",
          },
        },
        required: ["query"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "web_extract_data",
      description:
        "Intelligently extracts structured data from a URL based on a specified schema.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          prompt: {
            type: "string",
            description: "What to extract (e.g., 'All product prices')",
          },
        },
        required: ["url", "prompt"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
];

export const TASKS_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_task",
      description: "Creates a new task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title/description" },
          due_date: {
            type: "string",
            description: "Deadline or reminder time. Supports YYYY-MM-DD or full ISO string (YYYY-MM-DDTHH:mm:ss) for specific time alerts.",
          },
          contact_id: { type: "number", description: "Optional contact ID" },
          project_id: { type: "number", description: "Optional project ID" },
        },
        required: ["title"],
      },
      producesEntityKey: "task_id",
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_tasks",
      description: "Retrieves a list of pending or completed tasks.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "pending", "completed", "overdue"],
            default: "pending",
            description: "Filter tasks by completion status"
          },
          limit: { type: "number", default: 10, description: "Max tasks to return" },
          contact_id: { type: "string", description: "Filter tasks by contact ID" },
          project_id: { type: "string", description: "Filter tasks by project ID" },
          due_before: { type: "string", description: "ISO date string — return tasks due before this date" },
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
      name: "db_complete_task",
      description: "Marks a task as completed (completed: true).",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "number", description: "The ID of the task to complete" },
        },
        required: ["task_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["task_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete_task",
      description: "Permanently removes a task from the CRM.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "number", description: "The ID of the task to delete" },
        },
        required: ["task_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["task_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_task",
      description: "Updates an existing task's title, due date, or completion status.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "number", description: "The ID of the task to update" },
          title: { type: "string", description: "New title for the task" },
          due_date: { type: "string", description: "New deadline or reminder time (YYYY-MM-DD or ISO string)" },
          completed: { type: "boolean", description: "Set to true for completed, false for pending" },
        },
        required: ["task_id"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: ["task_id"],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_overdue_tasks",
      description: "Retrieves a list of all tasks that are past their due date and not yet marked as completed.",
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

export const CALENDAR_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "calendar_get_upcoming_events",
      description: "Retrieves upcoming events from the user's primary calendar.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Number of days ahead to look for events", default: 3 },
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
      name: "calendar_check_availability",
      description: "Checks calendar availability for the upcoming days.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", default: 3 },
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
      name: "calendar_schedule_event",
      description: "Creates a new event in Google Calendar.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Event title" },
          start_time: { type: "string", description: "ISO string of start time" },
          end_time: { type: "string", description: "ISO string of end time" },
          description: { type: "string", description: "Event description" },
        },
        required: ["summary", "start_time", "end_time"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
];

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

export const ALL_ATOMS = [
  ...INBOX_ATOMS,
  ...DEAL_ATOMS,
  ...PROJECT_ATOMS,
  ...FILE_ATOMS,
  ...SYSTEM_ATOMS,
  ...VERIFIER_ATOMS,
  ...WEB_ATOMS,
  ...TASKS_ATOMS,
  ...LEADS_ATOMS,
  ...NOTES_ATOMS,
  ...CALENDAR_ATOMS,
  ...AI_ATOMS,
  ...ACTIVITY_ATOMS,
];

// sys_execute_plan — INTENTIONALLY EXCLUDED from ALL_ATOMS
// Reason: Bypasses checklist system — orchestrator cannot see individual step completions
// Do NOT add back to ALL_ATOMS without updating checklist integration first.
