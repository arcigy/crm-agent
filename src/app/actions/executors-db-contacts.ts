"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { syncContactToGoogle } from "./google-contacts";

/**
 * Formats phone number to international format.
 */
function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("09")) {
    cleaned = "+421" + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Handles database contact operations.
 */
export async function executeDbContactTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Contact Tool");

  switch (name) {
    case "db_create_contact":
      let firstName = (args.first_name as string) || "";
      let lastName = (args.last_name as string) || "";
      if (firstName.includes(" ") && !lastName) {
        const parts = firstName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
      const newContact = (await directus.request(
        createItem("contacts", {
          first_name: firstName,
          last_name: lastName,
          email: (args.email as string) || null,
          phone: formatPhoneNumber(args.phone as string),
          company: (args.company as string) || null,
          status: (args.status as string) || "new",
          user_email: userEmail,
          date_created: new Date().toISOString(),
        }),
      )) as Record<string, unknown>;
      const newContactId = newContact.id as string;
      // Real-time sync to Google (Non-blocking)
      syncContactToGoogle(newContactId).catch(err => console.error("[Background Sync] Failed:", err));

      return {
        success: true,
        data: { contact_id: newContactId },
        message: "Kontakt bol úspešne vytvorený v CRM. Synchronizácia s Google prebieha na pozadí.",
      };

    case "db_update_contact":
      // Ownership check for security
      const current = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { id: { _eq: args.contact_id } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as Record<string, unknown>[];
      if (current.length === 0) throw new Error("Access denied or not found");

      await directus.request(
        updateItem("contacts", args.contact_id as string, args as Record<string, unknown>),
      );
      // Real-time sync to Google
      await syncContactToGoogle(args.contact_id as string);

      return {
        success: true,
        message: "Údaje kontaktu boli úspešne aktualizované v CRM aj Google.",
      };

    case "db_search_contacts":
      const query = (args.query as string || "").trim();
      const queryParts = query.split(/\s+/);
      
      const filter: any = {
        _and: [
          { user_email: { _eq: userEmail } },
          { status: { _neq: "archived" } },
        ]
      };

      if (queryParts.length > 1) {
        // Multi-word search (e.g. "Martin Mrkva")
        filter._and.push({
          _or: [
            {
              _and: [
                { first_name: { _icontains: queryParts[0] } },
                { last_name: { _icontains: queryParts.slice(1).join(" ") } }
              ]
            },
            {
              _and: [
                { last_name: { _icontains: queryParts[0] } },
                { first_name: { _icontains: queryParts.slice(1).join(" ") } }
              ]
            },
            { first_name: { _icontains: query } },
            { last_name: { _icontains: query } },
            { company: { _icontains: query } }
          ]
        });
      } else {
        // Single word search
        filter._and.push({
          _or: [
            { first_name: { _icontains: query } },
            { last_name: { _icontains: query } },
            { email: { _icontains: query } },
            { company: { _icontains: query } },
          ]
        });
      }

      const searchRes = (await directus.request(
        readItems("contacts", {
          filter,
          limit: 20,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: searchRes,
        message: `Bolo nájdených ${searchRes.length} kontaktov pre dopyt "${query}".`,
      };

    case "db_get_all_contacts":
      const allRes = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
            ],
          } as Record<string, unknown>,
          limit: (args.limit as number) || 50,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: allRes,
        message: `Zoznam všetkých kontaktov bol načítaný (${allRes.length}).`,
      };

    case "db_delete_contact":
      await directus.request(
        updateItem("contacts", args.contact_id as string, {
          status: "archived",
          deleted_at: new Date().toISOString(),
        }),
      );
      return {
        success: true,
        message: "Kontakt bol úspešne archivovaný (zmazaný).",
      };

    case "db_add_contact_comment":
      const contact = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { id: { _eq: args.contact_id } },
              { user_email: { _eq: userEmail } },
            ],
          },
        }),
      )) as Record<string, unknown>[];

      if (contact.length === 0) throw new Error("Contact not found");

      const currentContact = contact[0];
      const newComment = currentContact.comments
        ? `${currentContact.comments}\n\n[Agent]: ${args.comment as string}`
        : `[Agent]: ${args.comment as string}`;

      await directus.request(
        updateItem("contacts", args.contact_id as string, {
          comments: newComment,
        }),
      );
      return {
        success: true,
        message: "Komentár bol úspešne pridaný do histórie kontaktu.",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Contact executors`);
  }
}
