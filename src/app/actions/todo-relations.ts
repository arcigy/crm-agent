"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";

export interface ContactRelation {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
}

export interface ProjectRelation {
  id: number;
  project_type: string;
  stage?: string;
}

export interface DealRelation {
  id: number;
  name: string;
  value?: number;
}

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
      success: true as const,
      data: {
        contacts: contacts as ContactRelation[],
        projects: projects as ProjectRelation[],
        deals: deals as DealRelation[],
      },
    };
  } catch (error) {
    console.error("Get Todo Relations Error:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
