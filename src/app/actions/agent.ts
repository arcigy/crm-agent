"use server";

export * from "./agent-types";
export * from "./agent-registry";
export * from "./agent-executors";
export * from "./agent-persistence";
export * from "./agent-chat-logic";

import { currentUser } from "@clerk/nextjs/server";
import { executeAtomicTool } from "./agent-executors";
import { ALL_ATOMS } from "./agent-registry";
import { UserResource, ActionResult } from "./agent-types";

/**
 * High-level atomic server actions for UI components
 */

export async function agentSendEmail(args: {
  recipient: string;
  subject: string;
  body_html: string;
  threadId?: string;
}): Promise<ActionResult> {
  const user = (await currentUser()) as UserResource | null;
  if (!user) return { success: false, error: "Unauthorized" };

  // Use the executor we already have
  return (await executeAtomicTool(
    "gmail_reply",
    {
      threadId: args.threadId || "new",
      body: args.body_html,
    },
    user,
  )) as ActionResult;
}

export async function agentCreateContact(
  args: Record<string, any>,
): Promise<ActionResult> {
  const user = (await currentUser()) as UserResource | null;
  if (!user) return { success: false, error: "Unauthorized" };
  return (await executeAtomicTool(
    "db_create_contact",
    args,
    user,
  )) as ActionResult;
}

export async function agentCreateDeal(
  args: Record<string, any>,
): Promise<ActionResult> {
  const user = (await currentUser()) as UserResource | null;
  if (!user) return { success: false, error: "Unauthorized" };
  return (await executeAtomicTool(
    "db_create_deal",
    args,
    user,
  )) as ActionResult;
}

export async function agentCheckAvailability(
  _timeRange: string,
): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return { success: true, message: "Calendar checked (mock)" };
}

export async function agentScheduleEvent(
  _args: Record<string, any>,
): Promise<ActionResult> {
  return { success: true, message: "Meeting scheduled (mock)" };
}

export async function getStructuredTools() {
  // Group ALL_ATOMS by category for the debugger UI
  return [
    {
      category: "Gmail & Inbox",
      tools: ALL_ATOMS.filter(
        (t) =>
          t.function.name.startsWith("gmail_") ||
          t.function.name.includes("analyze"),
      ),
    },
    {
      category: "Database & CRM",
      tools: ALL_ATOMS.filter((t) => t.function.name.startsWith("db_")),
    },
    {
      category: "System & Files",
      tools: ALL_ATOMS.filter(
        (t) =>
          t.function.name.startsWith("sys_") ||
          t.function.name.startsWith("drive_"),
      ),
    },
    {
      category: "Verification",
      tools: ALL_ATOMS.filter((t) => t.function.name.startsWith("verify_")),
    },
  ];
}

export async function runToolManually(
  name: string,
  args: Record<string, any>,
): Promise<ActionResult> {
  const user = (await currentUser()) as UserResource | null;
  if (!user) throw new Error("Unauthorized");
  return (await executeAtomicTool(name, args, user)) as ActionResult;
}
