import { executeGmailTool } from "./executors-gmail";
import { executeDbContactTool } from "./executors-db-contacts";
import { executeDbProjectTool } from "./executors-db-projects";
import { executeDbDealTool } from "./executors-db-deals";
import { executeDbVerificationTool } from "./executors-db-verification";
import { executeDriveTool, executeSysTool } from "./executors-sys-drive";
import { executeWebTool } from "./executors-web";

/**
 * Main router for atomic tool execution.
 * Orchestrates calls to specialized executors based on tool name prefixes.
 */
export async function executeAtomicTool(
  name: string,
  args: Record<string, unknown>,
  user: { id: string; emailAddresses: { emailAddress: string }[] },
) {
  const safeArgs = args as Record<string, any>; // Legacy compat for executors

  try {
    // Gmail Tools
    if (name.startsWith("gmail_")) {
      return await executeGmailTool(name, safeArgs, user.id);
    }

    // Database Tools - Contacts
    if (
      name.startsWith("db_create_contact") ||
      name.startsWith("db_update_contact") ||
      name.startsWith("db_search_contacts") ||
      name.startsWith("db_get_all_contacts") ||
      name.startsWith("db_delete_contact") ||
      name.startsWith("db_add_contact_comment")
    ) {
      return await executeDbContactTool(name, safeArgs);
    }

    // Database Tools - Projects
    if (
      name.startsWith("db_fetch_projects") ||
      name.startsWith("db_create_project") ||
      name.startsWith("db_update_project") ||
      name.startsWith("db_delete_project") ||
      name.startsWith("verify_project_exists")
    ) {
      return await executeDbProjectTool(name, safeArgs);
    }

    // Database Tools - Deals
    if (
      name.startsWith("db_") &&
      (name.includes("deal") || name.includes("invoice"))
    ) {
      return await executeDbDealTool(name, safeArgs);
    }

    // Database Tools - Verification & Health
    if (
      name.startsWith("verify_") ||
      name === "db_save_analysis" ||
      name === "db_update_lead_info"
    ) {
      return await executeDbVerificationTool(name, safeArgs);
    }

    // System Tools
    if (name.startsWith("sys_")) {
      return await executeSysTool(name, safeArgs);
    }

    // Drive Tools
    if (name.startsWith("drive_")) {
      return await executeDriveTool(name, safeArgs, user.id);
    }

    // AI Analysis Tool
    if (name === "ai_deep_analyze_lead") {
      const { classifyEmail } = await import("./ai");
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      const analysis = await classifyEmail(
        safeArgs.content,
        userEmail,
        safeArgs.sender,
        safeArgs.subject,
      );
      return {
        success: true,
        data: analysis,
        message: "AI hĺbková analýza leada bola úspešne dokončená.",
      };
    }

    // Web Tools
    if (name.startsWith("web_")) {
      return await executeWebTool(name, safeArgs);
    }

    return { success: false, error: `Tool group not found for: ${name}` };
  } catch (error) {
    console.error("Executor Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    };
  }
}
