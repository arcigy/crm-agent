// ─────────────────────────────────────────────────────────
// ESCALATOR
// Called when self-correction fails or MAX_SAME_TOOL_REPEAT hit.
// Always produces a clean, actionable Slovak message.
// NEVER exposes raw errors, IDs, or stack traces.
// ─────────────────────────────────────────────────────────

import { ToolResult } from "./agent-types";

export interface EscalationContext {
  failedTool: string;
  attemptsMade: number;
  partialSuccesses: ToolResult[];
  diagnosis?: string;
}

// Maps internal tool names to Slovak human-readable descriptions
function toolToSlovak(tool: string): string {
  const map: Record<string, string> = {
    db_create_project: "Vytvorenie projektu",
    db_update_project: "Aktualizácia projektu",
    db_fetch_projects: "Vyhľadanie projektov",
    db_delete_project: "Vymazanie projektu",
    db_create_contact: "Vytvorenie kontaktu",
    db_update_contact: "Aktualizácia kontaktu",
    db_search_contacts: "Vyhľadanie kontaktov",
    db_get_all_contacts: "Načítanie všetkých kontaktov",
    db_delete_contact: "Vymazanie kontaktu",
    db_add_contact_comment: "Pridanie komentára ku kontaktu",
    db_create_deal: "Vytvorenie obchodu",
    db_update_deal: "Aktualizácia obchodu",
    db_create_task: "Vytvorenie úlohy",
    db_update_task: "Aktualizácia úlohy",
    db_create_note: "Vytvorenie poznámky",
    db_update_note: "Aktualizácia poznámky",
    gmail_send_email: "Odoslanie emailu",
    gmail_create_draft: "Vytvorenie konceptu emailu",
    gmail_reply: "Odpoveď na email",
    gmail_get_emails: "Načítanie emailov",
    calendar_create_event: "Vytvorenie udalosti v kalendári",
    calendar_get_events: "Načítanie udalostí z kalendára",
    web_search: "Webové vyhľadávanie",
    web_scrape: "Stiahnutie obsahu stránky",
    drive_list_files: "Výpis súborov z Google Drive",
    ai_generate_email: "Generovanie emailu pomocou AI",
    verify_project_exists: "Overenie existencie projektu",
    db_save_analysis: "Uloženie analýzy",
  };
  return map[tool] ?? `Operácia "${tool}"`;
}

// Generates user-facing action hints per failed tool
function buildUserActions(tool: string): string {
  const hints: Record<string, string> = {
    gmail_send_email: "Skontroluj pripojenie Gmail účtu alebo skús znova o chvíľu.",
    gmail_reply: "Skontroluj, či vlákno emailu stále existuje a Gmail je pripojený.",
    db_create_contact: "Skontroluj, či email nie je duplicitný a všetky polia sú vyplnené.",
    db_create_project: "Uisti sa, že kontakt existuje v systéme a projekt má názov.",
    db_create_task: "Skontroluj, či úloha má všetky povinné informácie (nadpis, termín).",
    calendar_create_event: "Skontroluj Google Calendar pripojenie a formát dátumu.",
    web_search: "Webové vyhľadávanie zlyhalo — skús reforumulovať vyhľadávací dotaz.",
    web_scrape: "Stránka môže blokovať prístup — skús iný zdroj informácií.",
  };
  const fallback = "Skús svoju požiadavku zopakovať alebo mi povedz viac detailov.";
  return hints[tool] ?? fallback;
}

export function buildEscalationMessage(ctx: EscalationContext): string {
  const { failedTool, attemptsMade, partialSuccesses, diagnosis } = ctx;

  // M4 FIX: Special handling for Gmail OAuth expiry
  const isGmailAuthError = 
    diagnosis?.includes("GMAIL_TOKEN_EXPIRED") || 
    partialSuccesses.some(r => r.error === "GMAIL_TOKEN_EXPIRED");

  if (isGmailAuthError) {
    return `
❌ **Tvoje pripojenie k Gmailu vypršalo.**

Aby som mohol pokračovať v odosielaní alebo čítaní emailov, musíš si účet znova prepojiť. Trvá to len pár sekúnd.

**👉 [Klikni sem pre opätovné pripojenie Gmailu](/settings/integrations)**

Po pripojení mi stačí napísať "skús to znova".
`.trim();
  }

  const successItems = partialSuccesses
    .filter((r) => r.success)
    .map((r) => `✅ ${toolToSlovak(r.tool)}`)
    .join("\n");

  const failedItem = `❌ ${toolToSlovak(failedTool)} — nepodarilo sa ani po ${attemptsMade} pokusoch`;

  const userAction = buildUserActions(failedTool);

  const diagnosisNote = diagnosis && !isGmailAuthError
    ? `\n*Technický detail:* ${diagnosis}`
    : "";

  const successSection = successItems
    ? `\nDokončené kroky:\n${successItems}\n`
    : "";

  return `
Úlohu som ${successItems ? "čiastočne" : "nedokázal"} dokončiť.
${successSection}
${failedItem}

**Čo môžeš urobiť:**
${userAction}${diagnosisNote}

Chceš, aby som to skúsil inak?
`.trim();
}


// Logs the full escalation context for debugging
export function logEscalation(ctx: EscalationContext): void {
  console.error(`[ESCALATOR] ==========================================`);
  console.error(`[ESCALATOR] Tool: ${ctx.failedTool}`);
  console.error(`[ESCALATOR] Attempts made: ${ctx.attemptsMade}`);
  console.error(`[ESCALATOR] Diagnosis: ${ctx.diagnosis ?? "N/A"}`);
  console.error(`[ESCALATOR] Partial successes: ${ctx.partialSuccesses.filter(r => r.success).length}`);
  console.error(`[ESCALATOR] ==========================================`);
}
