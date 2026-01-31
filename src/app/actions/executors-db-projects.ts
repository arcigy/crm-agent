import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

/**
 * Handles database project operations.
 */
export async function executeDbProjectTool(
  name: string,
  args: Record<string, any>,
) {
  switch (name) {
    case "db_fetch_projects":
      const prRes = (await directus.request(
        readItems("projects", {
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
          name: args.name,
          contact_id: args.contact_id,
          value: args.value || 0,
          stage: args.stage || "lead",
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      return {
        success: true,
        data: { project_id: nProj.id },
        message: "Nový projekt bol úspešne založený.",
      };

    case "db_update_project":
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
          filter: { id: { _eq: vProjId } } as any,
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
