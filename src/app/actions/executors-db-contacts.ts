"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { syncContactToGoogle } from "./contacts";

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
  args: Record<string, any>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to DB Contact Tool");

  switch (name) {
    case "db_create_contact":
      let firstName = args.first_name || "";
      let lastName = args.last_name || "";
      if (firstName.includes(" ") && !lastName) {
        const parts = firstName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
      const newContact = (await directus.request(
        createItem("contacts", {
          first_name: firstName,
          last_name: lastName,
          email: args.email || null,
          phone: formatPhoneNumber(args.phone),
          company: args.company || null,
          status: args.status || "new",
          user_email: userEmail,
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      const newContactId = newContact.id;
      // Real-time sync to Google
      await syncContactToGoogle(newContactId);

      return {
        success: true,
        data: { contact_id: newContactId },
        message: "Kontakt bol úspešne vytvorený v CRM a Google.",
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
      )) as any[];
      if (current.length === 0) throw new Error("Access denied or not found");

      await directus.request(
        updateItem("contacts", args.contact_id, args as any),
      );
      // Real-time sync to Google
      await syncContactToGoogle(args.contact_id);

      return {
        success: true,
        message: "Údaje kontaktu boli úspešne aktualizované v CRM aj Google.",
      };

    case "db_search_contacts":
      const searchRes = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
              {
                _or: [
                  { first_name: { _icontains: args.query } },
                  { last_name: { _icontains: args.query } },
                  { email: { _icontains: args.query } },
                  { company: { _icontains: args.query } },
                ],
              },
            ] as any,
          },
          limit: 20,
        }),
      )) as any[];
      return {
        success: true,
        data: searchRes,
        message: `Bolo nájdených ${searchRes.length} kontaktov pre dopyt "${args.query}".`,
      };

    case "db_get_all_contacts":
      const allRes = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { user_email: { _eq: userEmail } },
              { status: { _neq: "archived" } },
            ],
          } as any,
          limit: args.limit || 50,
        }),
      )) as any[];
      return {
        success: true,
        data: allRes,
        message: `Zoznam všetkých kontaktov bol načítaný (${allRes.length}).`,
      };

    case "db_delete_contact":
      await directus.request(
        updateItem("contacts", args.contact_id, {
          status: "archived",
          deleted_at: new Date().toISOString(),
        } as any),
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
      )) as any[];

      if (contact.length === 0) throw new Error("Contact not found");

      const currentContact = contact[0];
      const newComment = currentContact.comments
        ? `${currentContact.comments}\n\n[Agent]: ${args.comment}`
        : `[Agent]: ${args.comment}`;

      await directus.request(
        updateItem("contacts", args.contact_id, {
          comments: newComment,
        } as any),
      );
      return {
        success: true,
        message: "Komentár bol úspešne pridaný do histórie kontaktu.",
      };

    default:
      throw new Error(`Tool ${name} not found in DB Contact executors`);
  }
}
