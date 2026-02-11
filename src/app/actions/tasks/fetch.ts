import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getAuthorizedEmails } from "@/lib/auth";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  user_email: string;
  date_created?: string;
}

export async function getTasks(date?: string) {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) return { success: false as const, error: "Unauthorized" };

    const filter: Record<string, unknown> = { user_email: { _in: authEmails } };

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
        filter,
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
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) return { success: false as const, error: "Unauthorized" };

    const searchString = `data-contact-id="${id}"`;
    const typeString = `data-type="${type}"`;

    const data = await directus.request(
      readItems("crm_tasks", {
        filter: {
          _and: [
            { user_email: { _in: authEmails } },
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
