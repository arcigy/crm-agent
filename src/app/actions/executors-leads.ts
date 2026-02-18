"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

export async function executeDbLeadTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Lead Tool");

  switch (name) {
    case "db_fetch_leads":
      const filter: any = { user_email: { _eq: userEmail } };
      if (args.status) filter.status = { _eq: args.status };

      const leads = (await directus.request(
        readItems("cold_leads", {
          filter,
          sort: ["-date_created"],
          limit: (args.limit as number) || 10,
        }),
      )) as Record<string, unknown>[];

      return {
        success: true,
        data: leads,
        message: `Načítaných ${leads.length} leadov.`,
      };

    case "db_create_lead":
      const newLead = (await directus.request(
        createItem("cold_leads", {
          email: args.email as string,
          first_name: (args.first_name as string) || "",
          last_name: (args.last_name as string) || "",
          company_name_reworked: (args.company as string) || "", // Using this field for company name
          title: (args.company as string) || (args.first_name as string) || "Lead", // Fallback title
          status: (args.status as string) || "new",
          user_email: userEmail,
          date_created: new Date().toISOString(),
        }),
      )) as Record<string, unknown>;

      return {
        success: true,
        data: { lead_id: newLead.id },
        message: "Cold lead bol úspešne vytvorený.",
      };

    case "db_update_lead_status":
      // Verify ownership
      const leadCheck = (await directus.request(
        readItems("cold_leads", {
          filter: {
            id: { _eq: args.lead_id },
            user_email: { _eq: userEmail },
          },
        }),
      )) as any[];

      if (!leadCheck || leadCheck.length === 0) {
        throw new Error("Lead not found or access denied");
      }

      await directus.request(
        updateItem("cold_leads", args.lead_id as number, {
          status: args.status as string,
        }),
      );

      return {
        success: true,
        message: `Status leada zmenený na "${args.status}".`,
      };

    default:
      throw new Error(`Tool ${name} not found in DB Lead executors`);
  }
}
