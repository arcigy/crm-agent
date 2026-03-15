import { ToolDefinition } from "../agent-types";

export const NOTES_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_note",
      description: "Creates a long-form historical note or documentation piece. Use this for recording complex information, call summaries, or detailed background about a contact or project.",
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
