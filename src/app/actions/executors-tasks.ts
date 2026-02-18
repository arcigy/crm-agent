"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

export async function executeDbTaskTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Task Tool");

  switch (name) {
    case "db_create_task":
      const newTask = (await directus.request(
        createItem("crm_tasks", {
          title: args.title as string,
          due_date: (args.due_date as string) || null,
          contact_id: (args.contact_id as number) || null,
          project_id: (args.project_id as number) || null,
          user_email: userEmail,
          completed: false,
          date_created: new Date().toISOString(),
        }),
      )) as Record<string, unknown>;

      return {
        success: true,
        data: { task_id: newTask.id },
        message: `Úloha "${args.title}" bola vytvorená.`,
      };

    case "db_fetch_tasks":
      const filter: any = { user_email: { _eq: userEmail } };
      if (args.status === "pending") filter.completed = { _eq: false };
      if (args.status === "completed") filter.completed = { _eq: true };

      const tasks = (await directus.request(
        readItems("crm_tasks", {
          filter,
          sort: ["due_date", "-date_created"],
          limit: (args.limit as number) || 10,
        }),
      )) as Record<string, unknown>[];

      return {
        success: true,
        data: tasks,
        message: `Načítaných ${tasks.length} úloh.`,
      };

    case "db_complete_task":
      // Verify ownership
      const taskCheck = (await directus.request(
        readItems("crm_tasks", {
          filter: {
            id: { _eq: args.task_id },
            user_email: { _eq: userEmail },
          },
        }),
      )) as any[];

      if (!taskCheck || taskCheck.length === 0) {
        throw new Error("Task not found or access denied");
      }

      await directus.request(
        updateItem("crm_tasks", args.task_id as number, {
          completed: true,
        }),
      );
      return {
        success: true,
        message: "Úloha bola označená ako splnená.",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Task executors`);
  }
}
