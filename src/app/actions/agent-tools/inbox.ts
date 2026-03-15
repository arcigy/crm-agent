import { ToolDefinition } from "../agent-types";

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
      description: "H1: Retrieves a comprehensive 360-degree overview of a contact, including their projects, tasks, past deals, activities, notes, and communication history. CRITICAL: Distinguish between 'comments' (direct text field on contact), 'notes' (separate related items), and 'tasks' (actionable items with due dates).",
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
