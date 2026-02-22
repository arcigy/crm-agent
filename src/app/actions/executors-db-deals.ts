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
      const stageFilter: any = {
          _and: [
            { user_email: { _eq: userEmail } },
            { deleted_at: { _null: true } },
          ],
      };
      
      if (args.stage) {
          stageFilter._and.push({ stage: { _eq: args.stage as string } });
      }

      const stageDeals = (await directus.request(
        readItems("deals", {
          filter: stageFilter,
          limit: -1,
        }),
      )) as Record<string, unknown>[];

      // Grouping deals by stage if a specific stage isn't provided
      const grouped: Record<string, any[]> = {};
      stageDeals.forEach(d => {
         const stageName = (d.stage as string) || "Neznáma fáza";
         if (!grouped[stageName]) grouped[stageName] = [];
         grouped[stageName].push(d);
      });

      return {
        success: true,
        data: args.stage ? stageDeals : grouped,
        message: args.stage ? `Nájdených ${stageDeals.length} obchodov vo fáze "${args.stage}".` : `Obchody roztriedené podľa fáz (${stageDeals.length} celkovo).`,
      };

    default:
      throw new Error(`Tool ${name} not found in DB Deal executors`);
  }
}
