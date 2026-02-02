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

import { currentUser } from "@clerk/nextjs/server";

export async function getTodoRelations() {
  try {
    const user = await currentUser();
    if (!user) return { success: false as const, error: "Unauthorized" };
    const email = user.emailAddresses[0]?.emailAddress;

    const [contacts, projects, deals] = await Promise.all([
      directus.request(
        readItems("contacts", {
          filter: { user_email: { _eq: email } },
          limit: 50,
          sort: ["-date_created"],
        }),
      ),
      directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { user_email: { _eq: email } },
              { deleted_at: { _null: true } },
            ],
          },
          limit: 50,
          sort: ["-date_created"],
        }),
      ),
      directus.request(
        readItems("deals", {
          filter: {
            _and: [
              { user_email: { _eq: email } },
              { deleted_at: { _null: true } },
            ],
          },
          limit: 50,
          sort: ["-date_created"],
        }),
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
