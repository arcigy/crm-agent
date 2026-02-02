import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";

/**
 * Handles database health and general verification tools.
 */
export async function executeDbVerificationTool(
  name: string,
  args: Record<string, any>,
  userEmail?: string,
) {
  if (!userEmail)
    throw new Error("Unauthorized access to DB Verification Tool");

  switch (name) {
    case "verify_database_health":
      try {
        const healthCheck = (await directus.request(
          readItems("contacts", {
            filter: { user_email: { _eq: userEmail } },
            limit: 1,
          }),
        )) as any[];
        return {
          success: true,
          data: {
            status: "online",
            contacts_available: healthCheck.length > 0,
          },
          message:
            "Pripojenie k databáze Directus je stabilné a funkčné (HEALTH: OK).",
        };
      } catch (e: any) {
        return {
          success: false,
          error: e.message,
          message: "Chyba pripojenia k databáze (HEALTH: FAILED).",
        };
      }

    case "verify_contact_exists":
    case "verify_contact_by_email":
      const vEmail = args.email || "";
      const vId = args.contact_id;
      const vContacts = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              vId ? { id: { _eq: vId } } : { email: { _eq: vEmail } },
            ],
          } as any,
        }),
      )) as any[];
      return {
        success: vContacts.length > 0,
        data: vContacts[0] || null,
        message:
          vContacts.length > 0
            ? "Kontakt bol nájdený a overený."
            : "Kontakt sa v databáze nenachádza.",
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
                  { first_name: { _icontains: args.first_name || "" } },
                  { last_name: { _icontains: args.last_name || "" } },
                ],
              },
            ] as any,
          },
        }),
      )) as any[];
      return {
        success: vNameContacts.length > 0,
        data: vNameContacts,
        message:
          vNameContacts.length > 0
            ? `Nájdených ${vNameContacts.length} kontaktov podľa mena.`
            : "Žiadny kontakt s týmto menom nebol nájdený.",
      };

    case "verify_recent_contacts":
      const recentContacts = (await directus.request(
        readItems("contacts", {
          sort: ["-date_created"] as any,
          limit: args.limit || 5,
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
            ],
          } as any,
        }),
      )) as any[];
      return {
        success: true,
        data: recentContacts,
        message: `Zoznam posledných ${recentContacts.length} kontaktov bol načítaný.`,
      };

    case "db_save_analysis":
      await directus.request(
        createItem("email_analysis", {
          ...args.analysis_data,
          user_email: userEmail,
          date_created: new Date().toISOString(),
        } as any),
      );
      return {
        success: true,
        message: "Analýza e-mailu bola uložená do databázy.",
      };

    case "db_update_lead_info":
      // Ownership check for the contact being updated
      const currentContact = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { id: { _eq: args.contact_id } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as any[];
      if (currentContact.length === 0)
        throw new Error("Access denied or contact not found");

      await directus.request(
        updateItem("contacts", args.contact_id, args.update_data as any),
      );
      return {
        success: true,
        message: "Informácie o leadovi boli aktualizované.",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Verification executors`);
  }
}
