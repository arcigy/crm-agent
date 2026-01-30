"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getTasks() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress;

    const data = await directus.request(
      readItems("crm_tasks", {
        filter: { user_email: { _eq: email } },
        sort: ["date_created"],
        limit: -1,
      }),
    );

    return { success: true, data: data as any[] };
  } catch (error: any) {
    console.error("Get Tasks Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createTask(title: string, dueDate?: string) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress;

    const task = await directus.request(
      createItem("crm_tasks", {
        title,
        user_email: email,
        due_date: dueDate || null,
        completed: false,
      }),
    );

    revalidatePath("/dashboard/todo");
    return { success: true, data: task };
  } catch (error: any) {
    console.error("Create Task Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleTaskStatus(id: string, completed: boolean) {
  try {
    await directus.request(
      // @ts-ignore
      updateItem("crm_tasks", id, {
        completed,
      }),
    );

    revalidatePath("/dashboard/todo");
    return { success: true };
  } catch (error: any) {
    console.error("Toggle Task Error:", error);
    return { success: false, error: error.message };
  }
}

export async function removeTask(id: string) {
  try {
    // @ts-ignore
    await directus.request(deleteItem("crm_tasks", id));
    revalidatePath("/dashboard/todo");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Task Error:", error);
    return { success: false, error: error.message };
  }
}
