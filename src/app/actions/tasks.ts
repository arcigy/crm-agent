"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem, readItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import { getUserEmail, getAuthorizedEmails, isTeamMember } from "@/lib/auth";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  user_email: string;
}

export async function getTasks(date?: string) {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) return { success: false as const, error: "Unauthorized" };

    const filter: any = { user_email: { _in: authEmails } };

    if (date) {
      filter._and = [
        { user_email: { _in: authEmails } },
        {
          _or: [
            { due_date: { _starts_with: date } },
            { due_date: { _null: true } },
          ],
        },
      ];
    }

    const data = await directus.request(
      readItems("crm_tasks", {
        filter: filter as any,
        sort: ["date_created"] as string[],
        limit: -1,
      }),
    );

    return { success: true as const, data: data as unknown as Task[] };
  } catch (error) {
    console.error("Get Tasks Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}

export async function getTasksForEntity(
  id: string | number,
  type: "contact" | "project",
) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const searchString = `data-contact-id="${id}"`;
    const typeString = `data-type="${type}"`;

    const data = await directus.request(
      readItems("crm_tasks", {
        filter: {
          _and: [
            { user_email: { _eq: email } },
            { title: { _contains: searchString } },
            { title: { _contains: typeString } },
          ],
        },
        sort: ["-date_created"] as string[],
        limit: -1,
      }),
    );

    return { success: true as const, data: data as unknown as Task[] };
  } catch (error) {
    console.error("Get Related Tasks Error:", error);
    return { success: false as const, error: getDirectusErrorMessage(error) };
  }
}

export async function createTask(title: string, dueDate?: string) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const task = await directus.request(
      createItem("crm_tasks", {
        title,
        user_email: email,
        due_date: dueDate || null,
        completed: false,
      }),
    );

    revalidatePath("/dashboard/todo");
    return {
        success: true as const,
        data: {
            id: task.id,
            title: task.title,
            completed: task.completed,
            due_date: task.due_date,
            user_email: task.user_email
        } as Task
    };
  } catch (error: any) {
    console.error("Create Task Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}

export async function toggleTaskStatus(id: string, completed: boolean) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const current = (await directus.request(readItem("crm_tasks", id))) as any;
    if (current.user_email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error("Access denied");
    }

    await directus.request(
      updateItem("crm_tasks", id, {
        completed,
      }),
    );

    revalidatePath("/dashboard/todo");
    return { success: true as const };
  } catch (error) {
    console.error("Toggle Task Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}

export async function removeTask(id: string) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const current = (await directus.request(readItem("crm_tasks", id))) as any;
    if (!isTeamMember(current.user_email)) {
      throw new Error("Access denied");
    }

    await directus.request(deleteItem("crm_tasks", id));
    revalidatePath("/dashboard/todo");
    return { success: true as const };
  } catch (error: any) {
    console.error("Delete Task Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}
