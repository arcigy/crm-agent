"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { setupProjectStructure } from "@/lib/google-drive";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Handles database project operations.
 */
export async function executeDbProjectTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
  userId?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access");

  switch (name) {
    case "db_fetch_projects":
      const filters: any[] = [
        {
          _or: [
            { user_email: { _eq: userEmail } },
            { user_email: { _null: true } },
          ]
        },
        { deleted_at: { _null: true } },
      ];

      if (args.contact_id) {
        filters.push({ contact_id: { _eq: String(args.contact_id) } });
      }

      if (args.stage) {
        filters.push({ stage: { _eq: args.stage as string } });
      }

      const prRes = (await directus.request(
        readItems("projects", {
          filter: {
            _and: filters,
          },
          sort: ["-date_created"],
          limit: (args.limit as number) || 20,
        }),
      )) as Record<string, unknown>[];
      return { success: true, data: prRes, message: `Načítaných ${prRes.length} projektov.` };

    case "db_create_project":
      const nProj = (await directus.request(
        createItem("projects", {
          name: (args.name as string) || (args.project_type as string),
          project_type: args.project_type as string,
          contact_id: args.contact_id as string,
          contact_name: (args.contact_name as string) || "Neznámy",
          value: (args.value as number) || 0,
          stage: (args.stage as string) || "planning",
          end_date: (args.end_date as string) || null,
          user_email: userEmail,
          date_created: new Date().toISOString(),
        }),
      )) as Record<string, unknown>;

      if (userId) {
        try {
          const client = await clerkClient();
          const tokenRes = await client.users.getUserOauthAccessToken(userId, "oauth_google");
          const token = tokenRes.data[0]?.token;

          if (token) {
            const driveId = await setupProjectStructure(token, {
              projectName: (args.name as string) || (args.project_type as string),
              projectNumber: String(nProj.id).padStart(3, "0"),
              year: new Date().getFullYear().toString(),
              contactName: (args.contact_name as string) || "Neznámy",
            });
            await directus.request(updateItem("projects", nProj.id as string, { drive_folder_id: driveId }));
          }
        } catch (err) {
          console.error("Automation failed:", err);
        }
      }
      return { success: true, data: { project_id: nProj.id }, message: "Projekt založený." };

    case "db_update_project":
      const [current] = (await directus.request(
        readItems("projects", {
          filter: { _and: [{ id: { _eq: args.project_id as string } }, { user_email: { _eq: userEmail } }] },
        }),
      )) as Record<string, unknown>[];
      if (!current) throw new Error("Denied");

      await directus.request(updateItem("projects", args.project_id as string, args as Record<string, unknown>));
      return { success: true, message: "Projekt aktualizovaný." };

    case "db_delete_project":
      await directus.request(updateItem("projects", args.project_id as string, {
        status: "archived",
        deleted_at: new Date().toISOString(),
      }));
      return { success: true, message: "Projekt archivovaný." };

    case "db_search_projects":
      const sPrRes = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [
              {
                _or: [
                  { user_email: { _eq: userEmail } },
                  { user_email: { _null: true } },
                ]
              },
              { deleted_at: { _null: true } },
              { name: { _icontains: args.query as string } },
            ],
          },
          limit: 10,
        }),
      )) as Record<string, unknown>[];
      return { success: true, data: sPrRes, message: `Nájdených ${sPrRes.length} projektov pre "${args.query}".` };

    case "verify_project_exists":
      const [vProj] = (await directus.request(
        readItems("projects", {
          filter: { _and: [{ id: { _eq: args.project_id as string } }, { user_email: { _eq: userEmail } }] },
        }),
      )) as Record<string, unknown>[];
      return { success: !!vProj, data: vProj || null, message: vProj ? "Nájdený." : "Nenájdený." };

    default:
      throw new Error(`Tool ${name} not found`);
  }
}
