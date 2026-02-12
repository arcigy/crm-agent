"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, deleteItem, readItem } from "@directus/sdk";
import { getUserEmail, isTeamMember } from "@/lib/auth";
import { Task } from "./fetch";

export async function createTask(title: string, dueDate?: string) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const task = (await directus.request(
      createItem("crm_tasks", {
        title,
        user_email: email,
        due_date: dueDate || null,
        completed: false,
      }),
    )) as Record<string, unknown>;

    revalidatePath("/dashboard/todo");
    return {
        success: true as const,
        data: {
            id: task.id as string,
            title: task.title as string,
            completed: task.completed as boolean,
            due_date: task.due_date as string | null,
            user_email: task.user_email as string
        } as Task
    };
  } catch (error) {
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

    const current = (await directus.request(readItem("crm_tasks", id))) as Record<string, unknown>;
    if ((current.user_email as string).toLowerCase() !== email.toLowerCase()) {
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

    const current = (await directus.request(readItem("crm_tasks", id))) as Record<string, unknown>;
    if ((current.user_email as string).toLowerCase() !== email.toLowerCase()) {
      throw new Error("Access denied");
    }

    await directus.request(deleteItem("crm_tasks", id));
    revalidatePath("/dashboard/todo");
    return { success: true as const };
  } catch (error) {
    console.error("Delete Task Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}

export async function updateTask(id: string, data: Partial<Task>) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    const current = (await directus.request(readItem("crm_tasks", id))) as Record<string, unknown>;
    if ((current.user_email as string).toLowerCase() !== email.toLowerCase()) {
      throw new Error("Access denied");
    }

    const updated = (await directus.request(
      updateItem("crm_tasks", id, data)
    )) as Record<string, unknown>;

    revalidatePath("/dashboard/todo");
    return { 
      success: true as const,
      data: {
        id: updated.id as string,
        title: updated.title as string,
        completed: updated.completed as boolean,
        due_date: updated.due_date as string | null,
        user_email: updated.user_email as string
      } as Task
    };
  } catch (error) {
    console.error("Update Task Error:", error);
    return {
      success: false as const,
      error: getDirectusErrorMessage(error),
    };
  }
}
