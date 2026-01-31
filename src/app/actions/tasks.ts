"use server";

import directus, {
  getDirectusErrorMessage,
  getDirectusErrorMessage,
} from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  user_email: string;
}

export async function getTasks(date?: string) {
  try {
    const user = await currentUser();
    if (!user) return { success: false as const, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress;
    const filter: Record<string, unknown> = { user_email: { _eq: email } };

    if (date) {
      filter._and = [
        { user_email: { _eq: email } },
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
    const user = await currentUser();
    if (!user) return { success: false as const, error: "Unauthorized" };
    const email = user.emailAddresses[0]?.emailAddress;

    // Search for mention tag in HTML content
    // Format: data-contact-id="ID" data-type="TYPE"
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
    const user = await currentUser();
    if (!user) return { success: false as const, error: "Unauthorized" };

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
    return { success: true as const, data: task as unknown as Task };
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
