"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems, createItem, updateItem, readItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import type { Project, ProjectStage } from "@/types/project";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import {
  setupProjectStructure,
  updateFolderDescription,
} from "@/lib/google-drive";
import { getCalendarClient } from "@/lib/google";
import { getUserEmail, getAuthorizedEmails, isTeamMember } from "@/lib/auth";

export async function getProjects(): Promise<{
  data: Project[] | null;
  error: string | null;
}> {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    // @ts-ignore
    const projects = await directus.request(
      readItems("projects", {
        filter: {
          _and: [
            { deleted_at: { _null: true } }, 
            { user_email: { _in: authEmails } }
          ],
        },
        sort: ["-date_created"],
      }),
    );
    return { data: projects as Project[], error: null };
  } catch (e: any) {
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

    // 1. Fetch project with potential relation
    // @ts-ignore
    const project = await directus.request(
      readItems("projects", {
        filter: { _and: [{ id: { _eq: id } }, { user_email: { _in: authEmails } }] },
        fields: ["*", { contact_id: ["id", "first_name", "last_name"] }],
        limit: 1,
      }),
    );

    if (!project || project.length === 0) {
      return { data: null, success: false, error: "Project not found" };
    }

    const p = project[0] as any;

    // 2. Fallback: If contact_id is just an ID (not expanded), and we need the name
    if (
      (!p.contact_name || p.contact_name === "Neznámy") &&
      p.contact_id &&
      (typeof p.contact_id === "string" || typeof p.contact_id === "number")
    ) {
      try {
        // @ts-ignore
        const contact = (await directus.request(
          readItems("contacts", {
            filter: {
              _and: [
                { id: { _eq: p.contact_id } },
                { user_email: { _eq: email } },
              ],
            },
            fields: ["first_name", "last_name"],
            limit: 1,
          }),
        )) as any[];

        if (contact && contact.length > 0) {
          p.contact_name =
            `${contact[0].first_name || ""} ${contact[0].last_name || ""}`.trim() ||
            "Neznámy";
        }
      } catch (err) {
        console.error("Fallback contact fetch failed:", err);
      }
    }

    // 3. Reconstruction: If it was expanded automatically
    if (
      (!p.contact_name || p.contact_name === "Neznámy") &&
      p.contact_id &&
      typeof p.contact_id === "object"
    ) {
      p.contact_name =
        `${p.contact_id.first_name || ""} ${p.contact_id.last_name || ""}`.trim() ||
        "Neznámy";
    }

    return { data: p as Project, success: true };
  } catch (e: any) {
    console.error("Fetch project failed:", e);
    return { data: null, success: false, error: e.message };
  }
}

export async function createProject(data: any) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");
    
    // We also need clerkUser for some automations, but let's see if we can get it inside
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Create in Directus
    // @ts-ignore
    const newProject = (await directus.request(
      createItem("projects", {
        ...data,
        contact_name: data.contact_name || "Neznámy",
        stage: data.stage || "planning",
        user_email: email,
        date_created: new Date().toISOString(),
      }),
    )) as any;

    // 2. Automations
    try {
      const client = await clerkClient();
      const tokenRes = await client.users.getUserOauthAccessToken(
        user.id,
        "oauth_google",
      );
      const token = tokenRes.data[0]?.token;

      if (token) {
        const year = new Date().getFullYear().toString();
        const driveId = await setupProjectStructure(token, {
          projectName: data.name || data.project_type,
          projectNumber: "000", // Simplified
          year,
          contactName: data.contact_name || "Neznámy",
        });

        let eventId = null;
        if (data.end_date) {
          const cal = getCalendarClient(token);
          const ev = await cal.events.insert({
            calendarId: "primary",
            requestBody: {
              summary: `PROJEKT: ${data.name}`,
              start: { date: data.end_date },
              end: { date: data.end_date },
            },
          });
          eventId = ev.data.id;
        }

        // @ts-ignore
        await directus.request(
          updateItem("projects", newProject.id, {
            drive_folder_id: driveId,
            google_event_id: eventId,
          }),
        );
      }
    } catch (err) {
      console.error("Automations failed:", err);
    }

    revalidatePath("/dashboard/projects");
    return { 
        success: true, 
        data: {
            id: newProject.id,
            name: newProject.name,
            project_type: newProject.project_type,
            user_email: newProject.user_email
        }
    };
  } catch (e: any) {
    console.error("Create project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function updateProject(id: number, data: Partial<Project>) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    // Verify ownership
    const current = (await directus.request(readItem("projects", id))) as any;
    if (!isTeamMember(current.user_email)) throw new Error("Access denied");

    // @ts-ignore
    await directus.request(
      updateItem("projects", id, {
        ...data,
        updated_at: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/deals");
    return { success: true };
  } catch (e: any) {
    console.error("Update project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function updateProjectStage(id: number, stage: ProjectStage) {
  return updateProject(id, { stage });
}

export async function deleteProject(id: number) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    // Verify ownership
    const current = (await directus.request(readItem("projects", id))) as any;
    if (!isTeamMember(current.user_email)) throw new Error("Access denied");

    // @ts-ignore
    await directus.request(
      updateItem("projects", id, { deleted_at: new Date().toISOString() }),
    );
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (e: any) {
    console.error("Delete project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function syncAllProjectDescriptions() {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");
    
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const client = await clerkClient();
    const tokenRes = await client.users.getUserOauthAccessToken(
      user.id,
      "oauth_google",
    );
    const token = tokenRes.data[0]?.token;
    if (!token) throw new Error("Google Token not found");

    // 1. Fetch all projects
    const { data: projects } = await getProjects();
    if (!projects) return { success: false, message: "No projects found" };

    // 2. Fetch all contacts for THIS USER to have names ready
    const contacts = (await directus.request(
      readItems("contacts", {
        filter: { user_email: { _eq: email } },
        fields: ["id", "first_name", "last_name"],
        limit: -1,
      }),
    )) as any[];

    const results = { total: 0, updated: 0, failed: 0 };

    // 3. Update each project's drive folder
    for (const p of projects) {
      if (p.drive_folder_id) {
        results.total++;
        try {
          // Find contact name
          let name = p.contact_name;
          if (!name || name === "Neznámy") {
            const c = contacts.find(
              (c: any) => String(c.id) === String(p.contact_id),
            );
            if (c) name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
          }

          if (name && name !== "Neznámy") {
            await updateFolderDescription(
              token,
              p.drive_folder_id,
              `Client: ${name}`,
            );
            results.updated++;
          } else {
            results.failed++;
          }
        } catch (err) {
          console.error(`[Sync] Failed project ${p.id}:`, err);
          results.failed++;
        }
      }
    }

    return { success: true, results };
  } catch (error: any) {
    console.error("Sync failed:", error);
    return { success: false, error: error.message };
  }
}
