"use server";
// Build trigger: 2026-02-02 - Robust Auth Update

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, readItems, readItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export interface ContactItem {
  id: string | number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  comments?: string;
  birthday?: string;
  nameday?: string;
  job_title?: string;
  address?: string;
  website?: string;
  user_email?: string;
  date_created?: string;
  projects?: any[];
  deals?: any[];
  activities?: any[];
  labels?: any[]; // M2M junction items
}

export async function getContact(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const contact = (await directus.request(
      readItem("contacts", id),
    )) as unknown as ContactItem;

    if (!contact || contact.user_email !== userEmail) {
      return { success: false, error: "Contact not found or access denied" };
    }

    if (contact) {
      const [projects, deals, activities] = await Promise.all([
        directus.request(
          readItems("projects", {
            filter: {
              _and: [
                { contact_id: { _eq: id } },
                { user_email: { _eq: userEmail } },
              ],
            },
          }),
        ),
        directus.request(
          readItems("deals", {
            filter: {
              _and: [
                { contact_id: { _eq: id } },
                { user_email: { _eq: userEmail } },
              ],
            },
          }),
        ),
        directus.request(
          readItems("activities", {
            filter: { contact_id: { _eq: id } },
          }),
        ),
      ]);

      contact.projects = projects as unknown as any[];
      contact.deals = deals as unknown as any[];
      contact.activities = activities as unknown as any[];
    }

    return { success: true, data: contact };
  } catch (error) {
    console.error(`Failed to fetch contact ${id}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function getContacts() {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const contacts = (await directus.request(
      readItems("contacts", {
        filter: {
          _and: [
            { deleted_at: { _null: true } },
            { user_email: { _eq: userEmail } },
          ],
        },
        fields: [
          "*",
          "labels.contacts_contact_labels_id.*",
          "labels.contact_labels_id.*",
        ] as any[],
        sort: ["-date_created"] as string[],
        limit: -1,
      }),
    )) as unknown as ContactItem[];

    if (contacts && contacts.length > 0) {
      const allProjects = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { contact_id: { _nnull: true } },
              { user_email: { _eq: userEmail } },
            ],
          },
          limit: -1,
        }),
      )) as any[];

      // Create a map for O(1) lookups
      const projectsByContact = new Map<string, any[]>();
      allProjects.forEach(p => {
        const cid = String(p.contact_id);
        if (!projectsByContact.has(cid)) projectsByContact.set(cid, []);
        projectsByContact.get(cid)!.push(p);
      });

      contacts.forEach((contact) => {
        contact.projects = projectsByContact.get(String(contact.id)) || [];
      });
    }

    return { success: true, data: contacts };
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createContact(data: Partial<ContactItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    if (!data.first_name) {
      throw new Error("First name is required");
    }

    const drContact = await directus.request(
      createItem("contacts", {
        first_name: data.first_name,
        last_name: data.last_name || "",
        email: data.email || "",
        phone: (data.phone || "").replace(/\s/g, ""),
        company: data.company || "",
        status: data.status || "lead",
        comments: data.comments || "",
        user_email: userEmail,
      }),
    );

    revalidatePath("/dashboard/contacts");
    // Sync to Google in background to keep UI fast
    syncContactToGoogle(drContact.id, true).catch(err => {
      console.error("[Background Sync] Failed for new contact:", err);
    });

    return { 
        success: true, 
        contact: {
            id: drContact.id,
            first_name: drContact.first_name,
            last_name: drContact.last_name,
            email: drContact.email,
            user_email: drContact.user_email
        } as ContactItem 
    };
  } catch (error: any) {
    console.error("Failed to create contact:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error)
    };
  }
}

export async function updateContact(
  id: number | string,
  data: Partial<ContactItem>,
) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const current = (await directus.request(readItem("contacts", id))) as any;
    if (current.user_email !== userEmail) throw new Error("Access denied");

    // Perform the update in CRM
    await directus.request(updateItem("contacts", id, data));
    
    // Now sync to Google and CAPTURE the result
    const syncRes = await syncContactToGoogle(id);
    
    if (!syncRes.success) {
      console.warn(`[Sync Warning] CRM updated but Google sync failed for contact ${id}:`, syncRes.error);
    }

    revalidatePath("/dashboard/contacts");
    return { 
      success: true, 
      sync: syncRes.success, 
      syncError: syncRes.error 
    };
  } catch (error: any) {
    console.error("Failed to update contact:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error)
    };
  }
}

export async function deleteContact(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    // 1. Fetch contact first to verify ownership and get current state (e.g. google_id)
    const current = (await directus.request(readItem("contacts", id))) as any;
    if (!current || current.user_email !== userEmail) {
      throw new Error("Contact not found or access denied");
    }

    // 2. Soft delete in Directus
    await directus.request(updateItem("contacts", id, {
      status: "archived",
      deleted_at: new Date().toISOString()
    } as any));

    // 3. Sync deletion to Google Contacts
    // The syncContactToGoogle function handles deletion internally if status is 'archived'
    try {
      await syncContactToGoogle(id);
    } catch (googleErr) {
      console.error("[Sync] Google delete failed, but CRM contact was archived:", googleErr);
      // We don't fail the whole operation if Google sync fails, 
      // but we log it. The user will see 'Success' because the CRM part worked.
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete contact:", error);
    return { 
      success: false, 
      error: getDirectusErrorMessage(error) 
    };
  }
}

export async function updateContactComments(id: number, comments: string) {
  return updateContact(id, { comments });
}

export async function uploadVCard(formData: FormData) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");
    const vcardContent = await file.text();

    const contentNodes = vcardContent
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    const rawCards = contentNodes
      .split("BEGIN:VCARD")
      .filter((c) => c.trim().length > 0 && c.includes("END:VCARD"));

    let successCount = 0;
    for (const rawCard of rawCards) {
      const lines = rawCard.split("\n");
      let fn = "",
        email = "",
        phone = "",
        org = "";
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith("FN:")) fn = line.split(":")[1];
        else if (line.startsWith("EMAIL:")) email = line.split(":")[1];
        else if (line.startsWith("TEL:")) phone = line.split(":")[1];
        else if (line.startsWith("ORG:")) org = line.split(":")[1];
      }

      const fullName = fn || "Unknown Import";
      const nameParts = fullName.split(" ");
      const lastName = nameParts.length > 1 ? nameParts.pop() : "";
      const firstName = nameParts.join(" ");

      try {
        await directus.request(
          createItem("contacts", {
            first_name: firstName,
            last_name: lastName || "",
            email: email || "",
            phone: (phone || "").replace(/\s/g, ""),
            company: org || "",
            status: "lead",
            user_email: userEmail,
          }),
        );
        successCount++;
      } catch (e) {
        console.error("Import failed for one contact", e);
      }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true, count: successCount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bulkCreateContacts(contacts: any[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    let successCount = 0;

    const existingContacts = await directus.request(
      readItems("contacts", {
        filter: { user_email: { _eq: userEmail } },
        fields: ["email"] as string[],
        limit: -1,
      }),
    );
    const existingEmails = new Set(
      (existingContacts as unknown as ContactItem[])
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean),
    );

    for (const contact of contacts) {
      const hasName = String(contact.name || contact.first_name || contact.last_name || "").trim().length > 0;
      const hasEmail = String(contact.email || "").trim().length > 0;
      const hasPhone = String(contact.phone || contact.tel || "").trim().length > 0;

      if (!hasName && !hasEmail && !hasPhone) continue;

      const rawName = contact.name || contact.first_name || "Neznámy";
      const nameParts = String(rawName).split(" ");
      const lastName =
        nameParts.length > 1 ? nameParts.pop() : contact.last_name || "";
      const firstName = nameParts.join(" ");

      const email = Array.isArray(contact.email) ? contact.email[0] : contact.email || "";
      const phone = Array.isArray(contact.phone || contact.tel) ? (contact.phone || contact.tel)[0] : contact.phone || contact.tel || "";
      const company = contact.company || contact.org || "";

      const normalizedEmail = String(email || "").toLowerCase().trim();
      if (normalizedEmail && existingEmails.has(normalizedEmail)) continue;

      try {
        await directus.request(
          createItem("contacts", {
            first_name: firstName,
            last_name: lastName || "",
            email: email ? String(email) : "",
            phone: phone ? String(phone).replace(/\s/g, "") : "",
            company: company ? String(company) : "",
            status: contact.status || "lead",
            user_email: userEmail,
          }),
        );
        successCount++;
        if (normalizedEmail) existingEmails.add(normalizedEmail);
      } catch (e) {
        console.error("Bulk item failed", e);
      }
    }
    revalidatePath("/dashboard/contacts");
    return { success: true, count: successCount };
  } catch (e: any) {
    console.error("Bulk create failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

import { syncContactToGoogle } from "./google-contacts";

export async function bulkUpdateContacts(ids: (string | number)[], data: Partial<ContactItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    for (const id of ids) {
      const current = (await directus.request(readItem("contacts", id))) as any;
      if (current.user_email === userEmail) {
        await directus.request(updateItem("contacts", id, data));
        // We sync individually to Google for now as People API doesn't have a bulk update for multiple different people easily
        syncContactToGoogle(id).catch(err => console.error(`[Sync] Bulk update sync failed for ${id}:`, err));
      }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk update failed:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function bulkDeleteContacts(ids: (string | number)[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    for (const id of ids) {
      const current = (await directus.request(readItem("contacts", id))) as any;
      if (current.user_email === userEmail) {
        await directus.request(updateItem("contacts", id, {
          status: "archived",
          deleted_at: new Date().toISOString()
        } as any));
        syncContactToGoogle(id).catch(err => console.error(`[Sync] Bulk delete sync failed for ${id}:`, err));
      }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk delete failed:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function runTestSyncUpdate(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const companies = [
      "Tech Innovations", "Global Logistics", "Digital Agency", "Creative Studio", "Future Systems",
      "NextGen Robotics", "Skyline Architects", "Eco Solutions", "Quantum Soft", "Alpha Media"
    ];
    const domains = ["gmail.com", "outlook.com", "arcigy.com", "company.sk", "test.dev", "icloud.com", "proton.me"];
    const descriptions = [
      "VIP klient", "Potenciálny partner", "Nereaguje na maily", "Záujem o web", "Sleduje nás na LinkedIn",
      "Zajtra zavolať", "Stretnutie v Bratislave", "Chce cenovú ponuku", "Dohodnuté demo", "Odoslaný draft zmluvy"
    ];

    const rIdx = (arr: any[]) => Math.floor(Math.random() * arr.length);
    const rNum = () => Math.floor(Math.random() * 89999 + 10000);
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    const testData = {
      phone: `+4219${Math.floor(Math.random() * 89 + 10)}${Math.floor(Math.random() * 899 + 100)}`,
      email: `test.${rNum()}@${domains[rIdx(domains)]}`,
      company: `${companies[rIdx(companies)]} ${randomNum}`,
      comments: `Test ${new Date().toLocaleTimeString()} - ${descriptions[rIdx(descriptions)]}`
    };

    const res = await updateContact(id, testData);
    if (res.success) {
      const updated = await directus.request(readItem("contacts", id));
      return { 
        success: true, 
        data: updated, 
        sync: (res as any).sync,
        syncError: (res as any).syncError 
      };
    }
    return res;
  } catch (error: any) {
    console.error("Test sync update failed:", error);
    return { success: false, error: String(error) };
  }
}
