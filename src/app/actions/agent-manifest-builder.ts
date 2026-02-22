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
  keyOutputs: Record<string, string>;
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
  const entries: ManifestEntry[] = state.allResults.map((result, index) => {
    return {
      step: index + 1,
      tool: result.tool,
      humanName: toolToSlovak(result.tool),
      status: result.success ? "SUCCESS" : "FAILED",
      summary: buildResultSummary(result),
      keyOutputs: extractKeyOutputs(result),
    };
  });

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
  if (data.name) return `Položka: "${data.name}"${data.id ? ` (ID: ${data.id})` : ""}`;
  if (data.title) return `Úloha/Záznam: "${data.title}"${data.id ? ` (ID: ${data.id})` : ""}`;
  if (data.subject) return `Email: "${data.subject}"`;
  if (data.id) return `Vytvorené/Nájdené ID: ${data.id}`;

  return result.message || "Operácia úspešná.";
}

/**
 * Extracts only critical IDs and names for the verifier context.
 */
function extractKeyOutputs(result: ToolResult): Record<string, string> {
  const outputs: Record<string, string> = {};
  const data = result.data as any;
  if (!data) return outputs;

  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return outputs;

  if (item.id) outputs["id"] = String(item.id);
  if (item.email) outputs["email"] = String(item.email);
  if (item.first_name) outputs["name"] = `${item.first_name} ${item.last_name || ""}`.trim();
  else if (item.name) outputs["name"] = String(item.name);
  if (item.title) outputs["title"] = String(item.title);

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
    gmail_send_email: "Odoslanie emailu",
    gmail_create_draft: "Vytvorenie konceptu emailu",
    gmail_fetch_list: "Načítanie zoznamu emailov",
    web_search: "Webové vyhľadávanie",
    drive_search_file: "Hľadanie v Google Drive",
    sys_capture_memory: "Uloženie do pamäte",
    db_save_analysis: "Uloženie analýzy emailu",
    gmail_analyze_and_save_lead: "Analýza a uloženie leadu"
  };
  return map[tool] ?? `Operácia ${tool}`;
}
