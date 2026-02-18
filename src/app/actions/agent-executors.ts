"use server";

import { getDirectusErrorMessage } from "@/lib/directus";

import { executeGmailTool } from "./gmail/executors";
import { executeDbContactTool } from "./executors-db-contacts";
import { executeDbProjectTool } from "./executors-db-projects";
import { executeDbDealTool } from "./executors-db-deals";
import { executeDbVerificationTool } from "./executors-db-verification";
import { executeDriveTool, executeSysTool } from "./executors-sys-drive";
import { executeWebTool } from "./executors-web";
import { executeDbTaskTool } from "./executors-tasks";
import { executeDbLeadTool } from "./executors-leads";
import { executeCalendarTool } from "./executors-calendar";
import { executeAiTool } from "./executors-ai";

/**
 * Main router for atomic tool execution.
 * Orchestrates calls to specialized executors based on tool name prefixes.
 */
export async function executeAtomicTool(
  name: string,
  args: Record<string, unknown>,
  user: { id: string; emailAddresses: { emailAddress: string }[] },
) {
  const safeArgs = args; // Type is already Record<string, unknown>
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const userId = user?.id;

  try {
    // Gmail Tools
    if (name.startsWith("gmail_")) {
      return await executeGmailTool(name, safeArgs, userId);
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
      return await executeDbContactTool(name, safeArgs, userEmail);
    }

    // Database Tools - Projects
    if (
      name.startsWith("db_fetch_projects") ||
      name.startsWith("db_create_project") ||
      name.startsWith("db_update_project") ||
      name.startsWith("db_delete_project") ||
      name.startsWith("verify_project_exists")
    ) {
      return await executeDbProjectTool(name, safeArgs, userEmail, userId);
    }

    // Database Tools - Deals
    if (
      name.startsWith("db_") &&
      (name.includes("deal") || name.includes("invoice"))
    ) {
      return await executeDbDealTool(name, safeArgs, userEmail);
    }

    // Database Tools - Verification & Health
    if (
      name.startsWith("verify_") ||
      name === "db_save_analysis" ||
      name === "db_update_lead_info"
    ) {
      return await executeDbVerificationTool(name, safeArgs, userEmail);
    }

    // System Tools
    if (name.startsWith("sys_")) {
      return await executeSysTool(name, safeArgs);
    }

    // Drive Tools
    if (name.startsWith("drive_")) {
      return await executeDriveTool(name, safeArgs, userId);
    }

    // AI Tools
    if (name.startsWith("ai_")) {
        return await executeAiTool(name, safeArgs, userEmail);
    }

    // Web Tools
    if (name.startsWith("web_")) {
      return await executeWebTool(name, safeArgs);
    }

    // Task Tools
    if (name.startsWith("db_") && (name.includes("task"))) {
        return await executeDbTaskTool(name, safeArgs, userEmail);
    }

    // Lead Tools
    if (name.startsWith("db_") && (name.includes("lead"))) {
        return await executeDbLeadTool(name, safeArgs, userEmail);
    }

    // Calendar Tools
    if (name.startsWith("calendar_")) {
        return await executeCalendarTool(name, safeArgs, userEmail, userId);
    }

    // Meta-Tool (Dispatcher)
    if (name === "sys_execute_plan") {
        const steps = (safeArgs.steps as Array<{ tool_name: string; arguments: Record<string, unknown> }>) || [];
        const results = [];
        
        console.log(`[Dispatcher] Executing plan with ${steps.length} steps...`);

        for (const step of steps) {
            try {
                console.log(`[Dispatcher] Running ${step.tool_name}...`);
                const result = await executeAtomicTool(step.tool_name, step.arguments, user);
                results.push({
                    tool: step.tool_name,
                    status: result.success ? "success" : "error",
                    output: result
                });
                
                // Optional: Stop on error? For now we continue but log it.
                if (!result.success) {
                    console.error(`[Dispatcher] Step ${step.tool_name} failed:`, result.error);
                }
            } catch (err: any) {
                 results.push({
                    tool: step.tool_name,
                    status: "failed",
                    error: err.message
                });
            }
        }

        return {
            success: true,
            data: results,
            message: `Plán bol vykonaný (${results.filter(r => r.status === 'success').length}/${steps.length} úspešných krokov).`
        };
    }

    return { success: false, error: `Tool group not found for: ${name}` };
  } catch (error) {
    console.error("Executor Error:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error),
    };
  }
}
