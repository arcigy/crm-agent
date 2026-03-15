import { ToolDefinition } from "../agent-types";

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

export const TASKS_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_task",
      description: "Creates an actionable task with a title and due date. CRITICAL: A 'task' is something TO BE DONE, not just a historical note or information about a person.",
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
