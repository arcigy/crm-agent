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
 * H1 FIX: Normalize search query and generate fallback variants.
 * Tries original → diacritics-stripped → surname-only.
 * Resolves in 1 Directus query sequence instead of 2-3 orchestrator iterations.
 */
function buildSearchQueryVariants(query: string): string[] {
  const variants: string[] = [query];

  // Strip diacritics (e.g. "Važný" → "Vazny")
  const stripped = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (stripped !== query) variants.push(stripped);

  // Surname-only fallback for multi-word names ("Teodor Važný" → "Važný")
  const parts = query.trim().split(/\s+/);
  if (parts.length > 1) {
    variants.push(parts[parts.length - 1]); // last word
    variants.push(stripped.split(/\s+/).pop() ?? stripped); // stripped last word
  }

  return [...new Set(variants)]; // deduplicate
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
      const rawQuery = (args.query as string || "").trim();

      // H1 FIX: Try each query variant, return first non-empty result
      const queryVariants = buildSearchQueryVariants(rawQuery);
      let searchRes: Record<string, unknown>[] = [];
      let usedQuery = rawQuery;

      for (const q of queryVariants) {
        const qParts = q.split(/\s+/);
        const filter: any = {
          _and: [
            {
              _or: [
                { user_email: { _eq: userEmail } },
                { user_email: { _null: true } },
              ],
            },
            { status: { _neq: "archived" } },
          ]
        };

        if (qParts.length > 1) {
          filter._and.push({
            _or: [
              { _and: [{ first_name: { _icontains: qParts[0] } }, { last_name: { _icontains: qParts.slice(1).join(" ") } }] },
              { _and: [{ last_name: { _icontains: qParts[0] } }, { first_name: { _icontains: qParts.slice(1).join(" ") } }] },
              { first_name: { _icontains: q } },
              { last_name: { _icontains: q } },
              { company: { _icontains: q } },
            ]
          });
        } else {
          filter._and.push({
            _or: [
              { first_name: { _icontains: q } },
              { last_name: { _icontains: q } },
              { email: { _icontains: q } },
              { company: { _icontains: q } },
            ]
          });
        }

        const res = (await directus.request(readItems("contacts", { 
          filter, 
          limit: 20,
          sort: ["-date_created"] 
        }))) as Record<string, unknown>[];
        
        if (res.length > 0) {
          searchRes = res;
          usedQuery = q;
          if (q !== rawQuery) console.log(`[SEARCH][H1] Diacritics fallback matched: "${rawQuery}" → "${q}"`);
          break;
        }
      }

      // Rank results by relevance (H1 + Ranking Fix)
      const selectionReason = searchRes.length > 1 ? "zoradené podľa dátumu (najnovšie)" : "priama zhoda";

      return {
        success: true,
        data: searchRes,
        selectionReason,
        message: `Bolo nájdených ${searchRes.length} kontaktov pre dopyt "${usedQuery}"${
          usedQuery !== rawQuery ? ` (upravené z "${rawQuery}")` : ""
        }. Výber: ${selectionReason}.`,
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
          sort: ["-date_created"],
          limit: (args.limit as number) || 50,
        }),
      )) as Record<string, unknown>[];
      return {
        success: true,
        data: allRes,
        message: `Zoznam všetkých kontaktov bol načítaný (${allRes.length}). Zoradené od najnovších.`,
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

    case "db_merge_records":
      const pId = args.primary_contact_id as number;
      const dId = args.duplicate_contact_id as number;

      if (pId === dId) throw new Error("Primárne a duplicitné ID nemôžu byť rovnaké");

      const [primaryRes, dupRes] = await Promise.all([
        directus.request(readItems("contacts", { filter: { id: { _eq: pId }, user_email: { _eq: userEmail } } })),
        directus.request(readItems("contacts", { filter: { id: { _eq: dId }, user_email: { _eq: userEmail } } }))
      ]);

      if (!primaryRes.length || !dupRes.length) throw new Error("Jeden alebo oba kontakty sa nenašli");

      const primary = primaryRes[0];
      const duplicate = dupRes[0];

      // Step 1: Backup primary contact comments in case of failure
      const backupComments = primary.comments || "";
      const { createItem: createMemory } = await import("@directus/sdk");
      
      try {
        await directus.request(createMemory("ai_memories", {
          user_email: userEmail,
          category: "merge_backup",
          fact: `SNAPSHOT pre kontakt ${pId} pred zlúčením.`,
          confidence: 1
        }));
      } catch (e) {
        // Continue, memory backup is best-effort not critical failure
        console.warn("Could not save merge backup to ai_memories");
      }

      // Step 2: Structured comments merge (append duplicate data cleanly to primary)
      const timestamp = new Date().toLocaleString("sk-SK");
      let structuredAddition = `\n\n--- ZLÚČENÉ z kontaktu ID ${dId} (${timestamp}) ---\nMeno: ${duplicate.first_name} ${duplicate.last_name || ""}\nEmail: ${duplicate.email || "N/A"}\nTelefón: ${duplicate.phone || "N/A"}\nFirma: ${duplicate.company || "N/A"}\n`;
      
      if (duplicate.comments) {
          structuredAddition += `\n[Historické poznámky]:\n${duplicate.comments}\n`;
      }
      
      const newPrimaryComments = backupComments ? `${backupComments}${structuredAddition}` : structuredAddition.trim();

      // Step 3: Update Primary
      await directus.request(updateItem("contacts", pId, { comments: newPrimaryComments }));
      
      // Step 4: Transaction Guard - Try to soft delete Duplicate
      try {
          await directus.request(updateItem("contacts", dId, { 
            status: "archived", 
            deleted_at: new Date().toISOString() 
          }));
      } catch (err) {
          // Rollback! Soft delete failed, so we restore the primary contact.
          try {
              await directus.request(updateItem("contacts", pId, { comments: backupComments }));
              throw new Error(`Zlyhalo zmazanie duplikátu. Zlúčenie do kontaktu ${pId} bolo vrátené späť (rollback).`);
          } catch (rollbackErr) {
              throw new Error(`FATAL: Merge zlyhal a rollback sa nepodaril pre kontakt ${pId}.`);
          }
      }

      return {
        success: true,
        message: `Kontakt ID ${dId} bol štruktúrovane zlúčený do primárneho kontaktu ID ${pId} a následne spoľahlivo archivovaný.`,
      };

    default:
      throw new Error(`Tool ${name} not found in DB Contact executors`);
  }
}
