import { ToolDefinition } from "../agent-types";

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
