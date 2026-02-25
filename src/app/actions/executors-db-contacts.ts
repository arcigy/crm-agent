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

      // FIX #4: Try all query variants in one request
      const queryVariants = buildSearchQueryVariants(rawQuery);
      let searchRes: Record<string, unknown>[] = [];
      let usedQuery = rawQuery;

      const orVariants: any[] = queryVariants.flatMap((q): any[] => {
        const qParts = q.split(/\s+/);
        if (qParts.length > 1) {
          return [
            { _and: [{ first_name: { _icontains: qParts[0] } }, { last_name: { _icontains: qParts.slice(1).join(" ") } }] },
            { _and: [{ last_name: { _icontains: qParts[0] } }, { first_name: { _icontains: qParts.slice(1).join(" ") } }] },
            { first_name: { _icontains: q } },
            { last_name: { _icontains: q } },
            { company: { _icontains: q } },
          ];
        } else {
          return [
            { first_name: { _icontains: q } },
            { last_name: { _icontains: q } },
            { email: { _icontains: q } },
            { company: { _icontains: q } },
          ];
        }
      });

      const filter: any = {
        _and: [
          {
            _or: [
              { user_email: { _eq: userEmail } },
              { user_email: { _null: true } },
            ],
          },
          { status: { _neq: "archived" } },
          { _or: orVariants }
        ]
      };

      const res = (await directus.request(readItems("contacts", { 
        filter, 
        limit: 20,
        sort: ["-date_created"] 
      }))) as Record<string, any>[];
      
      if (res.length > 0) {
        // C1/H1 FIX: Strict similarity verification to prevent Novák -> Nováková auto-matches
        const exactMatch = res.find(c => 
          (c.first_name?.toLowerCase() === rawQuery.toLowerCase()) ||
          (`${c.first_name} ${c.last_name}`.toLowerCase() === rawQuery.toLowerCase()) ||
          (c.last_name?.toLowerCase() === rawQuery.toLowerCase()) ||
          (c.company?.toLowerCase() === rawQuery.toLowerCase()) ||
          (c.email?.toLowerCase() === rawQuery.toLowerCase())
        );

        if (exactMatch) {
          searchRes = [exactMatch];
          usedQuery = rawQuery;
        } else {
          // If no exact match, but results found, we return them all as potential candidates.
          // This forces the Orchestrator/Preparer to trigger a CLARIFY in the next step.
          searchRes = res;
          usedQuery = rawQuery; // Just keep raw query for message
          console.log(`[SEARCH][H1] Fuzzy match detected for "${rawQuery}", returning ${res.length} candidates for clarification.`);
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

    case "db_get_contact_overview":
      const overviewCid = args.contact_id as number;
      
      const [
        [baseContact],
        relatedProjects,
        relatedTasks,
        relatedActivities,
        relatedNotes
      ] = await Promise.all([
        directus.request(readItems("contacts", { filter: { id: { _eq: overviewCid }, user_email: { _eq: userEmail } } })),
        directus.request(readItems("projects", { filter: { contact_id: { _eq: overviewCid }, user_email: { _eq: userEmail } } })),
        directus.request(readItems("crm_tasks", { filter: { contact_id: { _eq: overviewCid }, user_email: { _eq: userEmail } } })),
        directus.request(readItems("activities", { filter: { contact_id: { _eq: String(overviewCid) } } })),
        directus.request(readItems("crm_notes", { filter: { contact_id: { _eq: overviewCid }, user_email: { _eq: userEmail } } }))
      ]).catch(e => {
        throw new Error("Nepodarilo sa načítať komplexný prehľad kontaktu: " + e.message);
      });

      if (!baseContact) throw new Error(`Kontakt ID ${overviewCid} sa nenašiel.`);

      return {
        success: true,
        data: {
          contact: baseContact,
          projects: relatedProjects || [],
          tasks: relatedTasks || [],
          activities: relatedActivities || [],
          notes: relatedNotes || []
        },
        message: `Komplexný prehľad kontaktu ID ${overviewCid} načítaný (Projekty: ${(relatedProjects||[]).length}, Úlohy: ${(relatedTasks||[]).length}, Aktivity: ${(relatedActivities||[]).length}).`
      };

    case "db_find_duplicate_contacts":
      const allC = (await directus.request(
        readItems("contacts", {
          filter: {
            user_email: { _eq: userEmail },
            deleted_at: { _null: true },
            status: { _neq: "archived" }
          },
          limit: -1,
        })
      )) as Record<string, any>[];

      // Very simple O(n^2) duplicate detector for fuzzy matching
      // Groups by email or exact phone or similar first_name+last_name
      const duplicateGroups: Record<string, any[]> = {};

      for (const current of allC) {
        let matchKey = null;
        if (current.email) matchKey = `email:${current.email.toLowerCase()}`;
        else if (current.phone) matchKey = `phone:${current.phone}`;
        else if (current.first_name && current.last_name) matchKey = `name:${current.first_name.toLowerCase()}_${current.last_name.toLowerCase()}`;
        
        if (matchKey) {
          if (!duplicateGroups[matchKey]) duplicateGroups[matchKey] = [];
          duplicateGroups[matchKey].push({
            id: current.id,
            name: `${current.first_name} ${current.last_name || ""}`,
            company: current.company,
            email: current.email,
            phone: current.phone,
            created: current.date_created
          });
        }
      }

      const confirmedDuplicates = Object.values(duplicateGroups).filter(group => group.length > 1);

      return {
        success: true,
        data: confirmedDuplicates,
        message: confirmedDuplicates.length > 0 
           ? `Našiel som ${confirmedDuplicates.length} skupín duplicitných kontaktov pripravených na zlúčenie.` 
           : "Nenašli sa žiadne zjavné duplicity."
      };

    case "db_get_contacts_without_activity":
      const days = (args.days as number) || 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const allContacts = (await directus.request(
        readItems("contacts", {
          filter: {
            user_email: { _eq: userEmail },
            deleted_at: { _null: true },
          },
          limit: -1,
        })
      )) as Record<string, any>[];

      const allActivities = (await directus.request(
        readItems("activities", {
            filter: {
               activity_date: { _gt: cutoff }
            },
            fields: ["contact_id"],
            limit: -1,
        })
      )) as Record<string, any>[];

      const activeContactIds = new Set(allActivities.map(a => String(a.contact_id)));
      
      const inactiveContacts = allContacts.filter(
         c => !activeContactIds.has(String(c.id))
      );

      return {
          success: true,
          data: inactiveContacts,
          message: `Nájdených ${inactiveContacts.length} kontaktov, ktoré nemali pridanú žiadnu aktivitu za posledných ${days} dní.`
      };
      
    default:
      throw new Error(`Tool ${name} not found in DB Contact executors`);
  }
}
