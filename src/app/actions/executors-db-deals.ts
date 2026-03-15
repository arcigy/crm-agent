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

    case "db_invoice_deal":
    case "db_update_deal":
    case "db_create_invoice":
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
      )) as Record<string, any>[];
      
      if (current.length === 0) throw new Error("Access denied or not found");
      const dealRecord = current[0];

      // Optimistic Locking Check
      const expectedVersion = args.expected_date_updated as string;
      if (expectedVersion && dealRecord.date_updated !== expectedVersion) {
         return { 
           success: false, 
           error: "CONFLICT", 
           message: "Záznam bol zmenený iným používateľom. Prosím, obnovte stránku.",
           retryable: true 
         };
      }

      const updatePayload: any = { ...args };
      delete updatePayload.deal_id;
      delete updatePayload.expected_date_updated;
      
      if (name === "db_invoice_deal") {
        updatePayload.status = "invoiced";
        updatePayload.invoice_date = new Date().toISOString();
        
        // Sequence integration
        try {
          const { db } = await import("@/lib/db");
          const seqRes = await db.query("SELECT nextval('invoice_number_seq') as num");
          updatePayload.invoice_number = seqRes.rows[0].num;
        } catch (seqErr) {
          console.error("[Deal Executor] Sequence failed:", seqErr);
        }
      } else if (name === "db_create_invoice") {
        updatePayload.paid = true;
      }

      updatePayload.date_updated = new Date().toISOString();

      await directus.request(updateItem("deals", args.deal_id as string, updatePayload));
      
      return {
        success: true,
        message: name === "db_invoice_deal" ? "Obchod bol úspešne vyfakturovaný." : 
                 name === "db_create_invoice" ? "Obchod bol úspešne označený ako zaplatený." :
                 "Obchod bol úspešne aktualizovaný.",
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
