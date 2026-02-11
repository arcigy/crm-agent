import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, readItem } from "@directus/sdk";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { getUserEmail, isTeamMember } from "@/lib/auth";
import { setupProjectStructure } from "@/lib/google-drive";
import { getCalendarClient } from "@/lib/google";
import { Project, ProjectStage } from "@/types/project";

export async function createProject(data: Partial<Project>) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");
    
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const newProject = (await directus.request(
      createItem("projects", {
        ...data,
        contact_name: data.contact_name || "Neznámy",
        stage: data.stage || "planning",
        user_email: email,
        date_created: new Date().toISOString(),
      }),
    )) as Record<string, unknown>;

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
          projectName: data.name || data.project_type || "Project",
          projectNumber: "000",
          year,
          contactName: data.contact_name || "Neznámy",
        });

        let eventId: string | null = null;
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
          eventId = ev.data.id || null;
        }

        await directus.request(
          updateItem("projects", newProject.id as string, {
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
  } catch (e) {
    console.error("Create project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function updateProject(id: number | string, data: Partial<Project>) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    const current = (await directus.request(readItem("projects", id))) as Record<string, unknown>;
    if (!isTeamMember(current.user_email as string)) throw new Error("Access denied");

    await directus.request(
      updateItem("projects", id, {
        ...data,
        date_updated: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/deals");
    return { success: true };
  } catch (e) {
    console.error("Update project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function updateProjectStage(id: number | string, stage: ProjectStage) {
  return updateProject(id, { stage });
}

export async function deleteProject(id: number | string) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    const current = (await directus.request(readItem("projects", id))) as Record<string, unknown>;
    if (!isTeamMember(current.user_email as string)) throw new Error("Access denied");

    await directus.request(
      updateItem("projects", id, { deleted_at: new Date().toISOString() }),
    );
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (e) {
    console.error("Delete project failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}
