"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";

export async function getTodoRelations() {
  try {
    const [contacts, projects, deals] = await Promise.all([
      directus.request(
        readItems("contacts", { limit: 10, sort: ["-date_created"] }),
      ),
      directus.request(
        readItems("projects", { limit: 10, sort: ["-date_created"] }),
      ),
      directus.request(
        readItems("deals", { limit: 10, sort: ["-date_created"] }),
      ),
    ]);

    return {
      success: true,
      data: {
        contacts: contacts as any[],
        projects: projects as any[],
        deals: deals as any[],
      },
    };
  } catch (error: any) {
    console.error("Get Todo Relations Error:", error);
    return { success: false, error: error.message };
  }
}
