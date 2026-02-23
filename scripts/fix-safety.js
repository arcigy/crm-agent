const fs = require('fs');

const registryPath = 'src/app/actions/agent-registry.ts';
let content = fs.readFileSync(registryPath, 'utf8');

// The tools that can safely run in parallel (mostly reads/fetches/verifiers/AI generation)
const SAFE_TOOLS = [
  "gmail_fetch_list",
  "gmail_get_details",
  "gmail_get_conversation_with_contact",
  "ai_generate_email",
  "ai_suggest_next_action",
  "ai_score_lead",
  "ai_deep_analyze_lead",
  "db_search_contacts",
  "db_get_all_contacts",
  "db_get_contact_overview",
  "db_find_duplicate_contacts",
  "db_get_contacts_without_activity",
  "db_search_projects",
  "db_fetch_projects",
  "db_get_pipeline_stats",
  "db_search_deals",
  "db_fetch_deals",
  "db_get_deals_by_stage",
  "db_fetch_tasks",
  "db_get_overdue_tasks",
  "db_fetch_notes",
  "db_fetch_leads",
  "sys_list_files",
  "sys_read_file",
  "sys_run_diagnostics",
  "sys_capture_memory",
  "sys_fetch_call_logs",
  "sys_show_info",
  "sys_generate_report",
  "sys_export_to_csv",
  "verify_contact_exists",
  "verify_contact_by_email",
  "verify_contact_by_name",
  "verify_recent_contacts",
  "verify_project_exists",
  "verify_database_health",
  "calendar_get_upcoming_events",
  "calendar_check_availability",
  "web_scrape_page",
  "web_search_google",
  "web_extract_data",
  "drive_search_file",
  "drive_get_file_link",
];

// Everything else becomes isParallelSafe: false
// We will replace `isParallelSafe: true` with `isParallelSafe: false` if it's not in SAFE_TOOLS.

const toolBlocks = content.split(/name:\s*"/);
let newContent = toolBlocks[0];

for (let i = 1; i < toolBlocks.length; i++) {
  const block = toolBlocks[i];
  const endQuoteIdx = block.indexOf('"');
  const toolName = block.substring(0, endQuoteIdx);
  
  if (!SAFE_TOOLS.includes(toolName)) {
    // Replace isParallelSafe: true with isParallelSafe: false
    const replaced = block.replace(/isParallelSafe\s*:\s*true/, "isParallelSafe: false");
    newContent += 'name: "' + replaced;
  } else {
    newContent += 'name: "' + block;
  }
}

// Remove DISPATCHER_ATOM from ALL_ATOMS
newContent = newContent.replace(/\.\.\.DISPATCHER_ATOM,?\s*\n?/g, "");

fs.writeFileSync(registryPath, newContent, 'utf8');
console.log("Updated safety flags and removed DISPATCHER_ATOM from ALL_ATOMS.");
