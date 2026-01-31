"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import type { Project, ProjectStage } from "@/types/project";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { setupProjectStructure } from "@/lib/google-drive";
import { getCalendarClient } from "@/lib/google";

export async function getProjects(): Promise<{
  data: Project[] | null;
  error: string | null;
}> {
  try {
    // @ts-ignore
    const projects = await directus.request(
      readItems("projects", {
        filter: { deleted_at: { _null: true } },
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
    // 1. Fetch project with potential relation
    // @ts-ignore
    const project = await directus.request(
      readItems("projects", {
        filter: { id: { _eq: id } },
        fields: ["*", { contact_id: ["first_name", "last_name"] }],
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
            filter: { id: { _eq: p.contact_id } },
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
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Create in Directus
    // @ts-ignore
    const newProject = (await directus.request(
      createItem("projects", {
        ...data,
        contact_name: data.contact_name || "Neznámy",
        stage: data.stage || "planning",
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
    return { success: true, data: newProject };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateProject(id: number, data: Partial<Project>) {
  try {
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
    return { success: false, error: e.message };
  }
}

export async function updateProjectStage(id: number, stage: ProjectStage) {
  return updateProject(id, { stage });
}

export async function deleteProject(id: number) {
  try {
    // @ts-ignore
    await directus.request(
      updateItem("projects", id, { deleted_at: new Date().toISOString() }),
    );
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
