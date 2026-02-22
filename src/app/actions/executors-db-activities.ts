"use server";

import directus from "@/lib/directus";
import { createItem } from "@directus/sdk";

/**
 * H3 FIX: Logs an action to the CRM activity timeline for a contact.
 */
export async function executeDbActivityTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Activity Tool");

  if (name === "db_create_activity") {
    const res = await directus.request(
      createItem("activities" as any, {
        contact_id: Number(args.contact_id),
        type: (args.type as string) || "ai_action",
        subject: (args.subject as string) || "AI Agent Action",
        content: (args.content as string) || "",
        duration: args.duration ? Number(args.duration) : null,
        project_id: args.project_id ? Number(args.project_id) : null,
        date_created: new Date().toISOString(),
      })
    );

    return {
      success: true,
      data: res,
      message: "Záznam o aktivite bol úspešne vytvorený.",
    };
  }

  throw new Error(`Tool ${name} not found in Activity executors`);
}
