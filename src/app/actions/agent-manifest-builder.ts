import { ToolResult, MissionState } from "./agent-types";

// ─────────────────────────────────────────────────────────
// EXECUTION MANIFEST BUILDER
// Builds a flattened, token-efficient summary of the mission.
// Prevents "lost in the middle" phenomena in the Verifier.
// ─────────────────────────────────────────────────────────

export interface ManifestEntry {
  step: number;
  tool: string;
  humanName: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  summary: string;
  keyOutputs: any;
}

export interface ExecutionManifest {
  goal: string;
  totalSteps: number;
  successCount: number;
  failCount: number;
  entries: ManifestEntry[];
  resolvedEntities: Record<string, string>;
}

/**
 * Builds the manifest from mission history.
 */
export function buildExecutionManifest(
  goal: string,
  state: MissionState
): ExecutionManifest {
  const entries: ManifestEntry[] = [];
  let stepCounter = 1;

  for (const result of state.allResults) {
    // 🔍 UNWRAP Dispatcher results (sys_execute_plan) to make them visible to Verifier
    if (result.tool === "sys_execute_plan" && Array.isArray(result.data)) {
      const subResults = result.data as Array<{ tool: string; status: string; output: any }>;
      
      for (const sub of subResults) {
        // Construct a pseudo-result for the helper functions
        const pseudoResult: ToolResult = {
          tool: sub.tool,
          success: sub.status === "success",
          data: sub.output?.data || sub.output,
          error: sub.output?.error,
          message: sub.output?.message
        };

        entries.push({
          step: stepCounter++,
          tool: sub.tool,
          humanName: toolToSlovak(sub.tool),
          status: pseudoResult.success ? "SUCCESS" : "FAILED",
          summary: buildResultSummary(pseudoResult),
          keyOutputs: extractKeyOutputs(pseudoResult),
        });
      }
    } else {
      // Regular tool execution
      entries.push({
        step: stepCounter++,
        tool: result.tool,
        humanName: toolToSlovak(result.tool),
        status: result.success ? "SUCCESS" : "FAILED",
        summary: buildResultSummary(result),
        keyOutputs: extractKeyOutputs(result),
      });
    }
  }

  return {
    goal,
    totalSteps: entries.length,
    successCount: entries.filter((e) => e.status === "SUCCESS").length,
    failCount: entries.filter((e) => e.status === "FAILED").length,
    entries,
    resolvedEntities: state.resolvedEntities,
  };
}

/**
 * Produces a human-readable 1-line Slovak summary of a tool result.
 * Avoids dumping raw JSON.
 */
function buildResultSummary(result: ToolResult): string {
  if (!result.success) {
    return `Zlyhalo: ${result.error || "Neznáma chyba"}`;
  }

  const data = result.data as any;
  if (!data) return "Akcia prebehla úspešne bez vrátených dát.";

  // Array results
  if (Array.isArray(data)) {
    if (data.length === 0) return "Neboli nájdené žiadne záznamy.";
    const first = data[0];
    const name = first.first_name ? `${first.first_name} ${first.last_name || ""}` : (first.name || first.title || first.label || first.id);
    return `Nájdených záznamov: ${data.length}${name ? `, prvý: ${name}` : ""}`;
  }

  // Object results
  if (data.first_name) return `Kontakt: ${data.first_name} ${data.last_name || ""}${data.id ? ` (ID: ${data.id})` : ""}`;
  if (data.name) return `Položka: "${data.name}"${(data.id || data.project_id) ? ` (ID: ${data.id || data.project_id})` : ""}`;
  if (data.title) return `Úloha/Záznam: "${data.title}"${(data.id || data.task_id) ? ` (ID: ${data.id || data.task_id})` : ""}`;
  if (data.subject) return `Email: "${data.subject}"`;
  if (data.id || data.contact_id || data.project_id || data.task_id) {
    return `Vytvorené ID: ${data.id || data.contact_id || data.project_id || data.task_id}`;
  }

  if (result.tool === "sys_show_info") {
    return `Doručená informácia: "${data.title}"\n${data.content}`;
  }

  return result.message || "Operácia úspešná.";
}

/**
 * Extracts only critical IDs and names for the verifier context.
 */
function extractKeyOutputs(result: ToolResult): any {
  const data = result.data as any;
  if (!data) return {};

  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id || item.contact_id || item.project_id || item.task_id,
      name: (item.first_name || item.last_name) 
        ? `${item.first_name || ""} ${item.last_name || ""}`.trim() 
        : (item.name || item.title || item.subject || item.label),
      email: item.email,
      company: item.company,
      stage: item.stage,
      from: item.from,
      subject: item.subject,
      title: item.title,
      completed: item.completed,
      contact_id: item.contact_id,
      contact_name: item.contact_name
    }));
  }

  const outputs: Record<string, string> = {};
  const id = data.id || data.contact_id || data.project_id || data.task_id;
  if (id) outputs["id"] = String(id);
  
  if (data.email) outputs["email"] = String(data.email);
  if (data.first_name || data.last_name) outputs["name"] = `${data.first_name || ""} ${data.last_name || ""}`.trim();
  else if (data.name) outputs["name"] = String(data.name);
  if (data.title) outputs["title"] = String(data.title);
  if (data.subject) outputs["subject"] = String(data.subject);

  if (result.tool === "sys_show_info") {
    outputs["report_title"] = data.title;
    outputs["report_content"] = data.content;
  }

  return outputs;
}

/**
 * Tool to Slovak mapping (internal helper)
 */
export function toolToSlovak(tool: string): string {
  const map: Record<string, string> = {
    db_create_project: "Vytvorenie projektu",
    db_update_project: "Aktualizácia projektu",
    db_fetch_projects: "Vyhľadanie projektov",
    db_search_contacts: "Vyhľadanie kontaktov",
    db_get_all_contacts: "Načítanie všetkých kontaktov",
    db_create_contact: "Vytvorenie kontaktu",
    db_update_contact: "Aktualizácia kontaktu",
    db_create_activity: "Záznam aktivity",
    db_add_contact_comment: "Pridanie poznámky ku kontaktu",
    db_create_task: "Vytvorenie úlohy",
    db_delete_project: "Zmazanie projektu",
    gmail_send_email: "Odoslanie emailu",
    gmail_create_draft: "Vytvorenie konceptu emailu",
    gmail_fetch_list: "Načítanie zoznamu emailov",
    web_search: "Webové vyhľadávanie",
    drive_search_file: "Hľadanie v Google Drive",
    sys_capture_memory: "Uloženie do pamäte",
    sys_show_info: "Zobrazenie informácií v chate",
    db_save_analysis: "Uloženie analýzy emailu",
    gmail_analyze_and_save_lead: "Analýza a uloženie leadu",
    db_merge_records: "Zlúčenie duplicitných kontaktov",
    db_get_pipeline_stats: "Výpočet CRM analytiky a štatistík",
    sys_export_to_csv: "Export dát do formatu CSV",
    sys_set_agent_reminder: "Nastavenie trvalého monitorovania",
    db_get_contact_overview: "Načítanie 360-prehľadu kontaktu",
    db_search_deals: "Vyhľadávanie obchodov",
    db_get_overdue_tasks: "Načítanie úloh po termíne",
    db_find_duplicate_contacts: "Hľadanie duplicitných kontaktov",
    calendar_get_upcoming_events: "Načítanie najbližších udalostí z kalendára",
    db_convert_lead_to_contact: "Konverzia leada na kontakt",
    db_bulk_update: "Hromadná aktualizácia záznamov",
    ai_suggest_next_action: "AI návrh ďalšieho kroku",
    ai_score_lead: "AI ohodnotenie (scoring) kontaktu",
    sys_generate_report: "Vygenerovanie AI reportu",
    db_create_invoice: "Vytvorenie faktúry k obchodu",
    gmail_save_draft: "Zálohovanie konceptu emailu",
    gmail_get_conversation_with_contact: "Načítanie komunikačného vlákna klientskeho kontaktu",
    db_get_contacts_without_activity: "Filtrovanie kontaktov bez nedávnych aktivít",
    db_get_deals_by_stage: "Filtrovanie obchodov podľa fázy"
  };
  return map[tool] ?? `Operácia ${tool}`;
}
