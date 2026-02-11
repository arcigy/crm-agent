"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

/**
 * Handles database deal operations.
 */
export async function executeDbDealTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Deal Tool");

  switch (name) {
    case "db_create_deal":
      const nDeal = (await directus.request(
        createItem("deals", {
          name: args.name as string,
          contact_id: args.contact_id as string,
          value: (args.value as number) || 0,
          description: (args.description as string) || "",
          user_email: userEmail,
          date_created: new Date().toISOString(),
        }),
      )) as Record<string, unknown>;
      return {
        success: true,
        data: { deal_id: nDeal.id },
        message: "Nový obchod bol úspešne vytvorený.",
      };

    case "db_update_deal":
      // Ownership check
      const current = (await directus.request(
        readItems("deals", {
          filter: {
            _and: [
              { id: { _eq: args.deal_id } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      if (current.length === 0) throw new Error("Access denied or not found");

      await directus.request(updateItem("deals", args.deal_id as string, args));
      return {
        success: true,
        message: "Obchod bol úspešne aktualizovaný.",
      };

    case "db_fetch_deals":
      const dealsRes = (await directus.request(
        readItems("deals", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { deleted_at: { _null: true } },
            ],
          },
          limit: (args.limit as number) || 10,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: dealsRes,
        message: `Zoznam obchodov načítaný (${dealsRes.length}).`,
      };

    case "db_invoice_deal":
      await directus.request(
        updateItem("deals", args.deal_id as string, { paid: true }),
      );
      return {
        success: true,
        message: "Obchod bol úspešne označený ako zaplatený (paid: true).",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Deal executors`);
  }
}
