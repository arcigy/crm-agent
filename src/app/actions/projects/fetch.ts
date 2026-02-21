"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getUserEmail, getAuthorizedEmails } from "@/lib/auth";
import { Project } from "@/types/project";

export async function getProjects(): Promise<{
  data: Project[] | null;
  error: string | null;
}> {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    const projects = await directus.request(
      readItems("projects", {
        filter: {
          _and: [
            { deleted_at: { _null: true } }, 
            { user_email: { _in: authEmails } }
          ],
        },
        sort: ["-date_created"] as string[],
      }),
    );
    return { data: projects as unknown as Project[], error: null };
  } catch (e) {
    console.error("Fetch projects failed:", e);
    return { data: [], error: null };
  }
}

export async function getProject(id: string | number): Promise<{
  data: Project | null;
  success: boolean;
  error?: string;
}> {
  try {
    const email = await getUserEmail();
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    const projectsRes = (await directus.request(
      readItems("projects", {
        filter: { _and: [{ id: { _eq: id } }, { user_email: { _in: authEmails } }] },
        fields: ["*", { contact_id: ["id", "first_name", "last_name"] }] as string[],
        limit: 1,
      }),
    )) as Record<string, unknown>[];

    if (!projectsRes || projectsRes.length === 0) {
      return { data: null, success: false, error: "Project not found" };
    }

    const p = projectsRes[0];

    if (
      (!p.contact_name || p.contact_name === "Neznámy") &&
      p.contact_id &&
      (typeof p.contact_id === "string" || typeof p.contact_id === "number")
    ) {
      try {
        const contact = (await directus.request(
          readItems("contacts", {
              filter: {
                _and: [
                  { id: { _eq: p.contact_id as string | number } },
                  { user_email: { _in: authEmails } },
                ],
              },
            fields: ["first_name", "last_name"] as string[],
            limit: 1,
          }),
        )) as Record<string, unknown>[];

        if (contact && contact.length > 0) {
          p.contact_name =
            `${(contact[0].first_name as string) || ""} ${(contact[0].last_name as string) || ""}`.trim() ||
            "Neznámy";
        }
      } catch (err) {
        console.error("Fallback contact fetch failed:", err);
      }
    }

    if (
      (!p.contact_name || p.contact_name === "Neznámy") &&
      p.contact_id &&
      typeof p.contact_id === "object"
    ) {
      const c = p.contact_id as Record<string, unknown>;
      p.contact_name =
        `${(c.first_name as string) || ""} ${(c.last_name as string) || ""}`.trim() ||
        "Neznámy";
    }

    return { data: p as unknown as Project, success: true };
  } catch (error) {
    console.error("Fetch project failed:", error);
    return { data: null, success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
