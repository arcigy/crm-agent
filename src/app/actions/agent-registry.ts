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
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_reply",
      description:
        "Prepares a reply to an email and opens the compose window in the CRM. This tool NEVER sends the email directly - it only prepares a draft for the user to review and send manually.",
      parameters: {
        type: "object",
        properties: {
          threadId: {
            type: "string",
            description: "ID of the thread being replied to",
          },
          body: {
            type: "string",
            description:
              "Reply text in HTML or plain text - AI pre-fills this content",
          },
        },
        required: ["threadId", "body"],
      },
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
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_info",
      description: "Updates lead analysis data in the CRM.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          next_step: { type: "string" },
        },
        required: ["message_id"],
      },
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
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_deals",
      description: "Retrieves a list of deals.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          status: { type: "string" },
        },
      },
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
    },
  },
];

export const PROJECT_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_fetch_projects",
      description: "Retrieves a list of projects.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          contact_id: { type: "number" },
        },
      },
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
            description: "Due date (YYYY-MM-DD)",
          },
          contact_id: { type: "number", description: "Optional contact ID" },
          project_id: { type: "number", description: "Optional project ID" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_tasks",
      description: "Retrieves a list of tasks.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "pending", "completed"],
            default: "pending",
          },
          limit: { type: "number", default: 10 },
        },
      },
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
          task_id: { type: "number" },
        },
        required: ["task_id"],
      },
    },
  },
];

export const LEADS_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_fetch_leads",
      description: "Retrieves a list of cold leads.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by status (e.g., 'new')",
          },
          limit: { type: "number", default: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_create_lead",
      description: "Creates a new cold lead.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          company: { type: "string" },
          status: { type: "string", default: "new" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_status",
      description: "Changes a cold lead's status.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number" },
          status: { type: "string" },
        },
        required: ["lead_id", "status"],
      },
    },
  },
];

export const CALENDAR_ATOMS: ToolDefinition[] = [
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
  ...CALENDAR_ATOMS,
  ...AI_ATOMS,
  ...DISPATCHER_ATOM,
];
