import { ToolDefinition } from "./agent-types";
import { INBOX_ATOMS } from "./agent-tools/inbox";
import { DEAL_ATOMS } from "./agent-tools/deals";
import { PROJECT_ATOMS } from "./agent-tools/projects";
import { FILE_ATOMS } from "./agent-tools/files";
import { SYSTEM_ATOMS } from "./agent-tools/system";
import { ACTIVITY_ATOMS, TASKS_ATOMS } from "./agent-tools/tasks";
import { VERIFIER_ATOMS } from "./agent-tools/verifier";
import { WEB_ATOMS } from "./agent-tools/web";
import { LEADS_ATOMS } from "./agent-tools/leads";
import { NOTES_ATOMS } from "./agent-tools/notes";
import { CALENDAR_ATOMS } from "./agent-tools/calendar";
import { AI_ATOMS } from "./agent-tools/ai";
import { DISPATCHER_ATOM } from "./agent-tools/dispatcher";

export { 
  INBOX_ATOMS, 
  DEAL_ATOMS, 
  PROJECT_ATOMS, 
  FILE_ATOMS, 
  SYSTEM_ATOMS, 
  ACTIVITY_ATOMS, 
  VERIFIER_ATOMS, 
  WEB_ATOMS, 
  TASKS_ATOMS, 
  LEADS_ATOMS, 
  NOTES_ATOMS, 
  CALENDAR_ATOMS, 
  AI_ATOMS,
  DISPATCHER_ATOM
};

export const ALL_ATOMS: ToolDefinition[] = [
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

// sys_execute_plan (DISPATCHER_ATOM) is intentionally excluded from ALL_ATOMS
// Reason: Bypasses checklist system - orchestrator cannot see individual step completions.
