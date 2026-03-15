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
import { executeDbNoteTool } from "./executors-notes";

/**
 * Normalizes arguments by mapping common aliases and fuzzy naming conventions
 * to the exact keys expected by the tools.
 */
function normalizeArgs(name: string, args: Record<string, any>): Record<string, any> {
    if (!name) return args;
    const normalized: Record<string, any> = { ...args };
    
    // Common ID mapping aliases
    const idAliases = ["id", "contactId", "contactID", "cid"];
    const projectIdAliases = ["projectId", "projectID", "pid"];
    const dealIdAliases = ["dealId", "dealID", "did"];
    const taskIdAliases = ["taskId", "taskID", "tid"];

    // Generic ID correction
    if (name.includes("contact") || name.includes("lead")) {
        idAliases.forEach(alias => {
            if (args[alias] && !args.contact_id) normalized.contact_id = args[alias];
        });
    }
    if (name.includes("project")) {
        projectIdAliases.forEach(alias => {
            if (args[alias] && !args.project_id) normalized.project_id = args[alias];
        });
    }
    if (name.includes("deal")) {
        dealIdAliases.forEach(alias => {
            if (args[alias] && !args.deal_id) normalized.deal_id = args[alias];
        });
    }
    if (name.includes("task")) {
        taskIdAliases.forEach(alias => {
            if (args[alias] && !args.task_id) normalized.task_id = args[alias];
        });
    }

    // Gmail aliases
    if (name.startsWith("gmail_")) {
        if (args.id && !args.messageId) normalized.messageId = args.id;
    }

    return normalized;
}

export async function executeAtomicTool(
  name: string,
  args: Record<string, unknown>,
  user: { id: string; emailAddresses: { emailAddress: string }[] },
  userFullName: string = "Používateľ CRM"
) {
  if (!name) return { success: false, error: "Tool name is missing (undefined)." };
  
  const safeArgs = normalizeArgs(name, args); 
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const userId = user?.id;

  // Security layer: Check tool permissions from Agent Control Console
  const { getAgentSettings } = await import("./agent-settings");
  const agentSettings = await getAgentSettings();
  
  const isAllowed = (n: string) => {
    if (n.startsWith("sys_") || n.startsWith("verify_") || n.startsWith("drive_")) return true; // System tools always allowed
    
    if (n.startsWith("gmail_") || n.includes("contact")) return agentSettings.tools_allowed.includes("contacts");
    if (n.startsWith("calendar_")) return agentSettings.tools_allowed.includes("calendar");
    if (n.includes("note")) return agentSettings.tools_allowed.includes("notes");
    if (n.includes("deal") || n.includes("invoice")) return agentSettings.tools_allowed.includes("billing");
    if (n.includes("lead") || n.startsWith("web_")) return agentSettings.tools_allowed.includes("marketing");
    
    return true; // Default allow for unspecified categories to avoid breaking existing flows
  };

  if (!isAllowed(name)) {
    return { success: false, error: `Bezpečnostné obmedzenie: Agent nemá oprávnenie na spustenie nástroja '${name}'. Povoľte prístup v Agent Control Console.` };
  }

  try {
    // Gmail Tools
    if (name.startsWith("gmail_")) {
      return await executeGmailTool(name, safeArgs, userId, userEmail);
    }

    // Database Tools - Contacts
    if (
      name.startsWith("db_create_contact") ||
      name.startsWith("db_update_contact") ||
      name.startsWith("db_search_contacts") ||
      name.startsWith("db_get_all_contacts") ||
      name.startsWith("db_delete_contact") ||
      name.startsWith("db_add_contact_comment") ||
      name === "db_merge_records" ||
      name === "db_get_contact_overview" ||
      name === "db_find_duplicate_contacts" ||
      name === "db_get_contacts_without_activity"
    ) {
      return await executeDbContactTool(name, safeArgs, userEmail);
    }

    // Database Tools - Projects
    if (
      name.startsWith("db_fetch_projects") ||
      name.startsWith("db_create_project") ||
      name.startsWith("db_update_project") ||
      name.startsWith("db_delete_project") ||
      name.startsWith("db_search_projects") ||
      name.startsWith("verify_project_exists") ||
      name === "db_get_pipeline_stats"
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

    // Meta-Tool (Dispatcher)
    if (name === "sys_execute_plan") {
        const steps = (safeArgs.steps as Array<{ tool_name?: string; tool?: string; arguments?: Record<string, unknown>; args?: Record<string, unknown> }>) || [];
        const results = [];
        let finalAction: string | undefined;
        let finalUrl: string | undefined;
        
        console.log(`[Dispatcher] Executing plan with ${steps.length} steps...`);

        for (const step of steps) {
            try {
                const toolName = step.tool_name || step.tool;
                const toolArgs = step.arguments || step.args || {};
                
                if (!toolName) continue;
                
                // Security/Stability: Prevent deep recursion (no plans inside plans)
                if (toolName === "sys_execute_plan") {
                    console.warn(`[Dispatcher] Blocked nested 'sys_execute_plan' to prevent recursion.`);
                    results.push({
                        tool: toolName,
                        status: "skipped",
                        error: "Vnáranie plánov (sys_execute_plan) nie je povolené z bezpečnostných dôvodov."
                    });
                    continue;
                }
                const result = (await executeAtomicTool(toolName, toolArgs as any, user, userFullName)) as any;
                
                // Propagate special actions like redirecting to a specific URL
                if (result.action) finalAction = result.action;
                if (result.url) finalUrl = result.url;

                results.push({
                    tool: toolName,
                    status: result.success ? "success" : "error",
                    output: result
                });
                
                if (!result.success) {
                    console.error(`[Dispatcher] Step ${toolName} failed:`, result.error);
                }
            } catch (err: any) {
                 results.push({
                    tool: step.tool_name || step.tool,
                    status: "failed",
                    error: err.message
                });
            }
        }

        return {
            success: true,
            data: results,
            action: finalAction,
            url: finalUrl,
            message: `Plán bol vykonaný (${results.filter(r => r.status === 'success').length}/${steps.length} úspešných krokov).`
        };
    }

    // Drive Tools
    if (name.startsWith("drive_")) {
      return await executeDriveTool(name, safeArgs, userId);
    }

    // AI Tools
    if (name.startsWith("ai_") || name === "gmail_analyze_and_save_lead") {
        if (name === "gmail_analyze_and_save_lead") {
            const analysisRes = await executeAiTool("ai_deep_analyze_lead", safeArgs, userEmail, userFullName);
            if (!analysisRes.success) return analysisRes;
            
            return await executeDbVerificationTool("db_save_analysis", { 
                analysis_data: analysisRes.data 
            }, userEmail);
        }
        return await executeAiTool(name, safeArgs, userEmail, userFullName);
    }

    // Web Tools
    if (name.startsWith("web_")) {
      return await executeWebTool(name, safeArgs);
    }

    // Activity Tools
    if (name.startsWith("db_") && name.includes("activity")) {
        const { executeDbActivityTool } = await import("./executors-db-activities");
        return await executeDbActivityTool(name, safeArgs, userEmail);
    }

    // Task Tools
    if (name.startsWith("db_") && (name.includes("task"))) {
        return await executeDbTaskTool(name, safeArgs, userEmail);
    }

    // Lead Tools
    if (name.startsWith("db_") && (name.includes("lead"))) {
        return await executeDbLeadTool(name, safeArgs, userEmail);
    }

    // Note Tools
    if (name.startsWith("db_") && (name.includes("note"))) {
        return await executeDbNoteTool(name, safeArgs, userEmail);
    }

    // Calendar Tools
    if (name.startsWith("calendar_")) {
        return await executeCalendarTool(name, safeArgs, userEmail, userId);
    }

    // System Tools
    if (name.startsWith("sys_") || name === "db_bulk_update") {
      return await executeSysTool(name, safeArgs, userId);
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
