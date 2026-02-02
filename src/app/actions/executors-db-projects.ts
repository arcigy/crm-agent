import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { setupProjectStructure } from "@/lib/google-drive";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Handles database project operations.
 */
export async function executeDbProjectTool(
  name: string,
  args: Record<string, any>,
  userEmail?: string,
  userId?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Project Tool");

  switch (name) {
    case "db_fetch_projects":
      const prRes = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { deleted_at: { _null: true } },
            ],
          },
          limit: args.limit || 20,
        }),
      )) as any[];
      return {
        success: true,
        data: prRes,
        message: `Bolo načítaných ${prRes.length} projektov.`,
      };

    case "db_create_project":
      const nProj = (await directus.request(
        createItem("projects", {
          name: args.name || args.project_type,
          project_type: args.project_type,
          contact_id: args.contact_id,
          contact_name: args.contact_name || "Neznámy",
          value: args.value || 0,
          stage: args.stage || "planning",
          end_date: args.end_date || null,
          user_email: userEmail,
          date_created: new Date().toISOString(),
        } as any),
      )) as any;

      // Handle Automations if userId is provided
      if (userId) {
        try {
          const client = await clerkClient();
          const tokenRes = await client.users.getUserOauthAccessToken(
            userId,
            "oauth_google",
          );
          const token = tokenRes.data[0]?.token;

          if (token) {
            const year = new Date().getFullYear().toString();
            const driveId = await setupProjectStructure(token, {
              projectName: args.name || args.project_type,
              projectNumber: String(nProj.id).padStart(3, "0"),
              year,
              contactName: args.contact_name || "Neznámy",
            });

            await directus.request(
              updateItem("projects", nProj.id, {
                drive_folder_id: driveId,
              } as any),
            );
          }
        } catch (err) {
          console.error("Agent Project Automation failed:", err);
        }
      }

      return {
        success: true,
        data: { project_id: nProj.id },
        message: "Nový projekt bol úspešne založený vrátane automatizácií.",
      };

    case "db_update_project":
      // Ownership check
      const current = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { id: { _eq: args.project_id } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as any[];
      if (current.length === 0) throw new Error("Access denied or not found");

      await directus.request(
        updateItem("projects", args.project_id, args as any),
      );
      return {
        success: true,
        message: "Projekt bol úspešne aktualizovaný.",
      };

    case "db_delete_project":
      await directus.request(
        updateItem("projects", args.project_id, {
          status: "archived",
          deleted_at: new Date().toISOString(),
        } as any),
      );
      return { success: true, message: "Projekt bol archivovaný." };

    case "verify_project_exists":
      const vProjId = args.project_id;
      const vProjs = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [{ id: { _eq: vProjId } }, { user_email: { _eq: userEmail } }],
          } as any,
        }),
      )) as any[];
      return {
        success: vProjs.length > 0,
        data: vProjs[0] || null,
        message:
          vProjs.length > 0
            ? "Projekt bol nájdený a overený."
            : "Projekt sa v databáze nenachádza.",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Project executors`);
  }
}
