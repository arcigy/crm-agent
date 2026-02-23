const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'src', 'app', 'actions', 'agent-registry.ts');
let code = fs.readFileSync(registryPath, 'utf8');

const patches = {
  db_create_contact: { producesEntityKey: "contact_id", requiredEntityKeys: [], isParallelSafe: false },
  db_search_contacts: { producesEntityKey: "contact_id", requiredEntityKeys: [], isParallelSafe: false },
  db_get_all_contacts: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_delete_contact: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: false },
  db_update_contact: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  db_merge_records: { producesEntityKey: undefined, requiredEntityKeys: ["primary_contact_id", "duplicate_contact_id"], isParallelSafe: false },
  db_get_contacts_without_activity: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_get_contact_overview: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  db_find_duplicate_contacts: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_add_contact_comment: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  
  db_create_project: { producesEntityKey: "project_id", requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  db_search_projects: { producesEntityKey: "project_id", requiredEntityKeys: [], isParallelSafe: false },
  db_fetch_projects: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_update_project: { producesEntityKey: undefined, requiredEntityKeys: ["project_id"], isParallelSafe: true },
  db_delete_project: { producesEntityKey: undefined, requiredEntityKeys: ["project_id"], isParallelSafe: false },
  db_get_pipeline_stats: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  
  db_create_deal: { producesEntityKey: "deal_id", requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  db_search_deals: { producesEntityKey: "deal_id", requiredEntityKeys: [], isParallelSafe: false },
  db_fetch_deals: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_update_deal: { producesEntityKey: undefined, requiredEntityKeys: ["deal_id"], isParallelSafe: true },
  db_invoice_deal: { producesEntityKey: undefined, requiredEntityKeys: ["deal_id"], isParallelSafe: true },
  db_get_deals_by_stage: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_create_invoice: { producesEntityKey: "invoice_id", requiredEntityKeys: ["deal_id"], isParallelSafe: true },
  
  db_create_task: { producesEntityKey: "task_id", requiredEntityKeys: [], isParallelSafe: true },
  db_fetch_tasks: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_complete_task: { producesEntityKey: undefined, requiredEntityKeys: ["task_id"], isParallelSafe: true },
  db_delete_task: { producesEntityKey: undefined, requiredEntityKeys: ["task_id"], isParallelSafe: false },
  db_update_task: { producesEntityKey: undefined, requiredEntityKeys: ["task_id"], isParallelSafe: true },
  db_get_overdue_tasks: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  
  db_create_note: { producesEntityKey: "note_id", requiredEntityKeys: [], isParallelSafe: true },
  db_fetch_notes: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_update_note: { producesEntityKey: undefined, requiredEntityKeys: ["note_id"], isParallelSafe: true },
  db_delete_note: { producesEntityKey: undefined, requiredEntityKeys: ["note_id"], isParallelSafe: false },
  
  db_fetch_leads: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  db_create_lead: { producesEntityKey: "lead_id", requiredEntityKeys: [], isParallelSafe: true },
  db_update_lead_status: { producesEntityKey: undefined, requiredEntityKeys: ["lead_id"], isParallelSafe: true },
  db_convert_lead_to_contact: { producesEntityKey: "contact_id", requiredEntityKeys: ["lead_id"], isParallelSafe: false },
  
  db_create_activity: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  
  db_bulk_update: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: false },
  db_save_analysis: { producesEntityKey: undefined, requiredEntityKeys: ["message_id"], isParallelSafe: true },
  db_update_lead_info: { producesEntityKey: undefined, requiredEntityKeys: ["message_id"], isParallelSafe: true },
  
  gmail_fetch_list: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  gmail_get_details: { producesEntityKey: "message_id", requiredEntityKeys: [], isParallelSafe: true },
  gmail_reply: { producesEntityKey: undefined, requiredEntityKeys: ["threadId"], isParallelSafe: true },
  gmail_send_email: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  gmail_trash_message: { producesEntityKey: undefined, requiredEntityKeys: ["messageId"], isParallelSafe: false },
  gmail_archive_message: { producesEntityKey: undefined, requiredEntityKeys: ["messageId"], isParallelSafe: false },
  gmail_analyze_and_save_lead: { producesEntityKey: undefined, requiredEntityKeys: ["messageId"], isParallelSafe: true },
  gmail_save_draft: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  gmail_get_conversation_with_contact: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  gmail_forward_email: { producesEntityKey: undefined, requiredEntityKeys: ["messageId"], isParallelSafe: true },
  
  ai_deep_analyze_lead: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  ai_suggest_next_action: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  ai_score_lead: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  ai_generate_email: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  
  drive_search_file: { producesEntityKey: "file_id", requiredEntityKeys: [], isParallelSafe: true },
  drive_get_file_link: { producesEntityKey: undefined, requiredEntityKeys: ["file_id"], isParallelSafe: true },
  
  sys_list_files: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_read_file: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_run_diagnostics: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_capture_memory: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_fetch_call_logs: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  sys_show_info: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_export_to_csv: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_set_agent_reminder: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_generate_report: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  sys_execute_plan: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: false },
  
  verify_contact_exists: { producesEntityKey: undefined, requiredEntityKeys: ["contact_id"], isParallelSafe: true },
  verify_contact_by_email: { producesEntityKey: "contact_id", requiredEntityKeys: [], isParallelSafe: true },
  verify_contact_by_name: { producesEntityKey: "contact_id", requiredEntityKeys: [], isParallelSafe: true },
  verify_recent_contacts: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  verify_project_exists: { producesEntityKey: undefined, requiredEntityKeys: ["project_id"], isParallelSafe: true },
  verify_database_health: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  
  calendar_get_upcoming_events: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  calendar_check_availability: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  calendar_schedule_event: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  
  web_scrape_page: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  web_crawl_site: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: false },
  web_search_google: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
  web_extract_data: { producesEntityKey: undefined, requiredEntityKeys: [], isParallelSafe: true },
};

let updated = 0;
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nameMatch = line.match(/name:\s*"([^"]+)"/);
  if (nameMatch) {
    const tName = nameMatch[1];
    if (patches[tName]) {
      let bracketCount = 0;
      let inParameters = false;
      let injectLineIdx = -1;
      
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        if (l.includes('parameters: {')) {
          inParameters = true;
          bracketCount += (l.match(/{/g) || []).length;
          bracketCount -= (l.match(/}/g) || []).length;
        } else if (inParameters) {
          bracketCount += (l.match(/{/g) || []).length;
          bracketCount -= (l.match(/}/g) || []).length;
          
          if (bracketCount === 0) {
            // End of parameters block
            injectLineIdx = j + 1;
            break;
          }
        }
      }

      if (injectLineIdx !== -1) {
        // Double check not already injected
        if (!lines[injectLineIdx].includes('producesEntityKey')) {
          const p = patches[tName];
          const producesMap = p.producesEntityKey ? '"' + p.producesEntityKey + '"' : "undefined";
          const reqMap = JSON.stringify(p.requiredEntityKeys);
          const isPar = p.isParallelSafe;
          
          const injectStr = 
"      producesEntityKey: " + producesMap + ",\n" +
"      requiredEntityKeys: " + reqMap + ",\n" +
"      isParallelSafe: " + isPar + ",";
          
          lines.splice(injectLineIdx, 0, injectStr);
          updated++;
        }
      } else {
        // Fallback if there are no parameters! (e.g. sys_database_health)
        // Find the closing } of function:
        let fnBracket = 0;
        let inFn = false;
        for (let j = i; j < lines.length; j++) {
           const l = lines[j];
           if (l.includes('function: {')) {
             inFn = true;
             fnBracket += (l.match(/{/g) || []).length;
             fnBracket -= (l.match(/}/g) || []).length;
           } else if (inFn) {
             fnBracket += (l.match(/{/g) || []).length;
             fnBracket -= (l.match(/}/g) || []).length;
             if (fnBracket === 0) {
                 const p = patches[tName];
                 const producesMap = p.producesEntityKey ? '"' + p.producesEntityKey + '"' : "undefined";
                 const reqMap = JSON.stringify(p.requiredEntityKeys);
                 const isPar = p.isParallelSafe;
                if (!lines[j-1].includes('producesEntityKey')) {
                  const injectStr = 
"      producesEntityKey: " + producesMap + ",\n" +
"      requiredEntityKeys: " + reqMap + ",\n" +
"      isParallelSafe: " + isPar + ",";
                  lines.splice(j, 0, injectStr);
                  updated++;
                }
                break;
             }
           }
        }
      }
    }
  }
}

console.log("Updated", updated, "tools");
fs.writeFileSync(registryPath, lines.join('\n'));
