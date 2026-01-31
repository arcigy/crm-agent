import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

/**
 * Handles database deal operations.
 */
export async function executeDbDealTool(
  name: string,
  args: Record<string, any>,
) {
  switch (name) {
    case "db_create_deal":
      const nDeal = (await directus.request(
        createItem("deals", {
          name: args.name,
          contact_id: args.contact_id,
          value: args.value || 0,
          description: args.description || "",
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      return {
        success: true,
        data: { deal_id: nDeal.id },
        message: "Nový obchod bol úspešne vytvorený.",
      };

    case "db_update_deal":
      await directus.request(updateItem("deals", args.deal_id, args as any));
      return {
        success: true,
        message: "Obchod bol úspešne aktualizovaný.",
      };

    case "db_fetch_deals":
      const dealsRes = (await directus.request(
        readItems("deals", { limit: args.limit || 10 }),
      )) as any[];
      return {
        success: true,
        data: dealsRes,
        message: `Zoznam obchodov načítaný (${dealsRes.length}).`,
      };

    case "db_invoice_deal":
      await directus.request(
        updateItem("deals", args.deal_id, { paid: true } as any),
      );
      return {
        success: true,
        message: "Obchod bol úspešne označený ako zaplatený (paid: true).",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Deal executors`);
  }
}
