"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

/**
 * Handles database health and general verification tools.
 */
export async function executeDbVerificationTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access");

  switch (name) {
    case "verify_database_health":
      try {
        const healthCheck = (await directus.request(
          readItems("contacts", {
            filter: { user_email: { _eq: userEmail } },
            limit: 1,
          }),
        )) as Record<string, unknown>[];
        return {
          success: true,
          data: { status: "online", contacts_available: healthCheck.length > 0 },
          message: "Pripojenie k databáze Directus je stabilné.",
        };
      } catch {
        return { success: false, message: "Chyba pripojenia k databáze." };
      }

    case "verify_contact_exists":
    case "verify_contact_by_email":
      const vEmail = (args.email as string) || "";
      const vId = args.contact_id as string;
      const vContacts = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              vId ? { id: { _eq: vId } } : { email: { _eq: vEmail } },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      return {
        success: vContacts.length > 0,
        data: vContacts[0] || null,
        message: vContacts.length > 0 ? "Kontakt overený." : "Kontakt nenájdený.",
      };

    case "verify_contact_by_name":
      const vNameContacts = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
              {
                _or: [
                  { first_name: { _icontains: (args.first_name as string) || "" } },
                  { last_name: { _icontains: (args.last_name as string) || "" } },
                ],
              },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      return {
        success: vNameContacts.length > 0,
        data: vNameContacts,
        message: vNameContacts.length > 0 ? `Nájdených ${vNameContacts.length} kontaktov.` : "Nenájdené.",
      };

    case "verify_recent_contacts":
      const recentContacts = (await directus.request(
        readItems("contacts", {
          sort: ["-date_created"] as string[],
          limit: (args.limit as number) || 5,
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: recentContacts,
        message: `Načítaných ${recentContacts.length} kontaktov.`,
      };

    case "db_save_analysis":
      await directus.request(
        createItem("email_analysis", {
          ...(args.analysis_data as Record<string, unknown>),
          user_email: userEmail,
          date_created: new Date().toISOString(),
        }),
      );
      return { success: true, message: "Analýza uložená." };

    case "db_update_lead_info":
      const currentContact = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { id: { _eq: args.contact_id as string } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      if (currentContact.length === 0) throw new Error("Denied");

      await directus.request(
        updateItem("contacts", args.contact_id as string, args.update_data as Record<string, unknown>),
      );
      return { success: true, message: "Lead aktualizovaný." };

    default:
      throw new Error(`Tool ${name} not found`);
  }
}
