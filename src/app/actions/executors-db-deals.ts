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
      const fetchDealFilters: any[] = [
        { user_email: { _eq: userEmail } },
        { deleted_at: { _null: true } },
      ];
      if (args.contact_id) {
        fetchDealFilters.push({ contact_id: { _eq: String(args.contact_id) } });
      }
      const dealsRes = (await directus.request(
        readItems("deals", {
          filter: {
            _and: fetchDealFilters,
          },
          limit: (args.limit as number) || 10,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: dealsRes,
        message: `Zoznam obchodov načítaný (${dealsRes.length}).`,
      };

    case "db_search_deals":
      const sdealsRes = (await directus.request(
        readItems("deals", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { deleted_at: { _null: true } },
              {
                _or: [
                   { name: { _icontains: args.query as string } },
                   { description: { _icontains: args.query as string } }
                ]
              }
            ],
          },
          limit: 10,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: sdealsRes,
        message: `Nájdených obchodov pre "${args.query}": ${sdealsRes.length}.`,
      };

    case "db_create_invoice":
      await directus.request(
        updateItem("deals", args.deal_id as string, { paid: true }),
      );
      return {
        success: true,
        message: "Obchod bol úspešne označený ako zaplatený (paid: true).",
      };

    case "db_get_deals_by_stage":
      const dealFilters: any = {
          _and: [
            { user_email: { _eq: userEmail } },
            { deleted_at: { _null: true } },
          ],
      };
      
      const allDeals = (await directus.request(
        readItems("deals", {
          filter: dealFilters,
          limit: -1,
        }),
      )) as Record<string, unknown>[];

      const groupedDeals: Record<string, any[]> = { "Zaplatené": [], "Nezaplatené": [] };
      allDeals.forEach(d => {
         const isPaid = !!d.paid;
         if (isPaid) groupedDeals["Zaplatené"].push(d);
         else groupedDeals["Nezaplatené"].push(d);
      });

      return {
        success: true,
        data: groupedDeals,
        message: `Nájdené obchody: ${groupedDeals["Zaplatené"].length} zaplatených, ${groupedDeals["Nezaplatené"].length} nezaplatených.`,
      };

    default:
      throw new Error(`Tool ${name} not found in DB Deal executors`);
  }
}
