"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getAuthorizedEmails } from "@/lib/auth";

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
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) return { success: false as const, error: "Unauthorized" };

    const [contacts, projects, deals] = await Promise.all([
      directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              {
                _or: [
                   { user_email: { _in: authEmails } },
                   { user_email: { _null: true } },
                ],
              },
              { deleted_at: { _null: true } },
            ],
          },
          limit: -1,
          sort: ["-date_created"],
        }),
      ),
      directus.request(
        readItems("projects", {
          filter: {
            _and: [
              {
                _or: [
                   { user_email: { _in: authEmails } },
                   { user_email: { _null: true } },
                ],
              },
              { deleted_at: { _null: true } },
            ],
          },
          limit: -1,
          sort: ["-date_created"],
        }),
      ),
      directus.request(
        readItems("deals", {
          filter: {
            _and: [
              {
                _or: [
                   { user_email: { _in: authEmails } },
                   { user_email: { _null: true } },
                ],
              },
              { deleted_at: { _null: true } },
            ],
          },
          limit: -1,
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
  } catch (error: any) {
    console.error("Get Todo Relations Error:", error);
    
    // Directus or Axios error objects often have nested errors
    const errorMessage = error?.errors?.[0]?.message || 
                         error?.message || 
                         (typeof error === 'string' ? error : JSON.stringify(error));

    return {
      success: false as const,
      error: errorMessage,
    };
  }
}
