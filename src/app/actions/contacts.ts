"use server";
// Build trigger: 2026-02-02 - Robust Auth Update

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, readItems, readItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";

export interface ContactItem {
  id: string | number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  comments?: string;
  user_email?: string;
  date_created?: string;
  projects?: any[];
  deals?: any[];
  activities?: any[];
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
        }),
      )) as any[];

      contacts.forEach((contact) => {
        contact.projects = allProjects.filter(
          (p) => String(p.contact_id) === String(contact.id),
        );
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
    await syncContactToGoogle(drContact.id);

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

    await directus.request(updateItem("contacts", id, data));
    await syncContactToGoogle(id);

    revalidatePath("/dashboard/contacts");
    return { success: true };
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

    const current = (await directus.request(readItem("contacts", id))) as any;
    if (current.user_email !== userEmail) throw new Error("Access denied");

    await directus.request(updateItem("contacts", id, {
      status: "archived",
      deleted_at: new Date().toISOString()
    } as any));

    syncContactToGoogle(id).catch(err => console.error("[Sync] Immediate delete sync failed:", err));

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete contact:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
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

export async function importGoogleContacts() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();
    
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
    let tokens = tokenResponse.data[0]?.token;

    if (!tokens) {
        const dbTokens = await directus.request(readItems("google_tokens", {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        })) as any[];
        if (dbTokens && dbTokens[0]) tokens = dbTokens[0].access_token;
    }

    if (!tokens) return { success: false, error: "Google not connected" };

    const { getPeopleClient } = await import("@/lib/google");
    const people = getPeopleClient(tokens);

    const response = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      personFields: "names,emailAddresses,phoneNumbers,organizations",
    });
    const connections = response.data.connections || [];

    const crmContacts = (await directus.request(readItems("contacts", {
        filter: { user_email: { _eq: userEmail } },
        fields: ["id", "email", "google_id", "first_name", "last_name"],
        limit: -1
    }))) as any[];

    const idMap = new Map();
    const emailMap = new Map();
    crmContacts.forEach(c => {
        if (c.google_id) idMap.set(c.google_id, c);
        if (c.email) emailMap.set(c.email.toLowerCase().trim(), c);
    });

    let importCount = 0;
    const activeGoogleIds = new Set();

    for (const person of connections) {
        if (!person.resourceName) continue;
        const googleId = person.resourceName;
        activeGoogleIds.add(googleId);

        const name = (person.names || [])[0]?.displayName || "Google Contact";
        const email = (person.emailAddresses || [])[0]?.value?.toLowerCase().trim() || "";
        const phone = (person.phoneNumbers || [])[0]?.value?.replace(/\s/g, "") || "";
        const company = (person.organizations || [])[0]?.name || "";

        const contactData: any = {
            first_name: name.split(" ")[0] || "Unknown",
            last_name: name.split(" ").slice(1).join(" ") || "",
            email: email,
            phone: phone,
            company: company,
            google_id: googleId,
            user_email: userEmail,
            status: "active",
            deleted_at: null
        };

        const existing = idMap.get(googleId) || (email ? emailMap.get(email) : null);

        if (existing) {
            const needsUpdate = existing.first_name !== contactData.first_name || 
                               existing.email !== contactData.email || 
                               existing.google_id !== contactData.google_id ||
                               existing.status === "archived";
            if (needsUpdate) {
                await directus.request(updateItem("contacts", existing.id, contactData));
            }
        } else {
            try {
                const created = await directus.request(createItem("contacts", contactData));
                idMap.set(googleId, created);
                if (email) emailMap.set(email, created);
                importCount++;
            } catch (err: any) {
                if (!err.message?.includes("UNIQUE")) console.error("[Google Sync] Failed to create contact:", err);
            }
        }
    }

    const toArchive = crmContacts.filter(c => c.google_id && !activeGoogleIds.has(c.google_id));
    if (toArchive.length > 0) {
        for (const c of toArchive) {
            await directus.request(updateItem("contacts", c.id, {
                status: "archived",
                deleted_at: new Date().toISOString()
            } as any));
        }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true, count: importCount };
  } catch (error) {
    console.error("Google Import Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function exportContactsToGoogle() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
    let tokens = tokenResponse.data[0]?.token;

    if (!tokens) {
        const dbTokens = await directus.request(readItems("google_tokens", {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        })) as any[];
        if (dbTokens && dbTokens[0]) tokens = dbTokens[0].access_token;
    }

    if (!tokens) return { success: false, error: "Google not connected" };

    const { getPeopleClient } = await import("@/lib/google");
    const people = getPeopleClient(tokens);

    const crmContacts = (await directus.request(readItems("contacts", {
        filter: {
            _and: [
                { user_email: { _eq: user.emailAddresses[0].emailAddress.toLowerCase() } },
                { status: { _eq: "active" } },
                { google_id: { _null: true } },
                { deleted_at: { _null: true } }
            ]
        },
        limit: -1
    }))) as any[];

    if (crmContacts.length === 0) return { success: true, count: 0 };

    const googleRes = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      personFields: "emailAddresses",
    });
    
    const existingEmails = new Set();
    (googleRes.data.connections || []).forEach(p => {
        p.emailAddresses?.forEach(e => {
            if (e.value) existingEmails.add(e.value.toLowerCase().trim());
        });
    });

    let exportedCount = 0;
    for (const contact of crmContacts) {
        const email = contact.email?.toLowerCase().trim();
        if (email && existingEmails.has(email)) continue;
        
        try {
            const res = await people.people.createContact({
                requestBody: {
                    names: [{ givenName: contact.first_name, familyName: contact.last_name || "" }],
                    emailAddresses: contact.email ? [{ value: contact.email }] : [],
                    phoneNumbers: contact.phone ? [{ value: contact.phone }] : [],
                    organizations: contact.company ? [{ name: contact.company }] : [],
                    biographies: [{ value: "Synchronizované z Agentic CRM" }]
                }
            });
            const googleId = (res.data as any).resourceName;
            await directus.request(updateItem("contacts", contact.id, { google_id: googleId }));
            exportedCount++;
        } catch (err) {
            console.error(`[Google Sync] Failed to export ${contact.email}:`, err);
        }
    }

    return { success: true, count: exportedCount };
  } catch (error) {
    console.error("Google Export Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function syncGoogleContacts() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const userId = user.id;

    const dbTokens = await directus.request(readItems("google_tokens", {
        filter: { user_id: { _eq: userId } },
        limit: 1
    })) as any[];

    const now = new Date();
    if (dbTokens && dbTokens[0]) {
        const lastSync = dbTokens[0].last_sync ? new Date(dbTokens[0].last_sync) : null;
        if (lastSync && (now.getTime() - lastSync.getTime()) < 30000) return { success: true, imported: 0, exported: 0, throttled: true };
        await directus.request(updateItem("google_tokens", dbTokens[0].id, { last_sync: now.toISOString() }));
    }

    const importResult = await importGoogleContacts();
    const exportResult = await exportContactsToGoogle();
    
    return {
        success: true,
        imported: importResult.success ? (importResult as any).count : 0,
        exported: exportResult.success ? (exportResult as any).count : 0,
        error: !importResult.success ? importResult.error : (!exportResult.success ? exportResult.error : null)
    };
  } catch (error) {
    console.error("Sync Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function createTestGoogleContact() {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
        let token = tokenResponse.data[0]?.token;

        if (!token) {
            const dbTokens = await directus.request(readItems("google_tokens", {
                filter: { user_id: { _eq: user.id } },
                limit: 1
            })) as any[];
            if (dbTokens && dbTokens[0]) token = dbTokens[0].access_token;
        }

        if (!token) return { success: false, error: "No Google Token" };

        const { getPeopleClient } = await import("@/lib/google");
        const people = getPeopleClient(token);

        const res = await people.people.createContact({
            requestBody: {
                names: [{ givenName: "Test", familyName: "Agentic CRM" }],
                emailAddresses: [{ value: "test@example.com" }],
                phoneNumbers: [{ value: "+421900111222" }],
                biographies: [{ value: "Tento kontakt bol vytvorený automaticky testovacím tlačidlom." }]
            }
        });

        // @ts-expect-error - Google API typing
        const personData = res.data || res;
        return { success: true, data: personData };
    } catch (error: any) {
        console.error("Test Create Error:", error);
        return { success: false, error: error.message };
    }
}

export async function syncContactToGoogle(contactId: string | number) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
        let token = tokenResponse.data[0]?.token;

        if (!token) {
            const dbTokens = await directus.request(readItems("google_tokens", {
                filter: { user_id: { _eq: user.id } },
                limit: 1
            })) as any[];
            if (dbTokens && dbTokens[0]) token = dbTokens[0].access_token;
        }
        if (!token) return { success: false, error: "No Google connection" };

        const { getPeopleClient } = await import("@/lib/google");
        const people = getPeopleClient(token);

        const contact = (await directus.request(readItem("contacts", contactId))) as any;
        if (!contact) return { success: false, error: "Contact not found" };

        if (contact.status === "archived" || contact.deleted_at) {
            if (contact.google_id) {
                try {
                    await people.people.deleteContact({ resourceName: contact.google_id });
                    await directus.request(updateItem("contacts", contactId, { google_id: null }));
                } catch (err: any) {
                    if (err.code !== 404) console.error("[Google Sync] Delete failed:", err);
                }
            }
            return { success: true };
        }

        const requestBody = {
            names: [{ givenName: contact.first_name, familyName: contact.last_name || "" }],
            emailAddresses: contact.email ? [{ value: contact.email }] : [],
            phoneNumbers: contact.phone ? [{ value: contact.phone }] : [],
            organizations: contact.company ? [{ name: contact.company }] : [],
            biographies: [{ value: "Synchronizované z Agentic CRM" }]
        };

        if (contact.google_id) {
            try {
                await people.people.updateContact({
                    resourceName: contact.google_id,
                    updatePersonFields: "names,emailAddresses,phoneNumbers,organizations,biographies",
                    requestBody
                });
            } catch (err: any) {
                if (err.code === 404) {
                    const res = await people.people.createContact({ requestBody });
                    const newGoogleId = (res.data as any).resourceName;
                    await directus.request(updateItem("contacts", contactId, { google_id: newGoogleId }));
                }
            }
        } else {
            const res = await people.people.createContact({ requestBody });
            const googleId = (res.data as any).resourceName;
            await directus.request(updateItem("contacts", contactId, { google_id: googleId }));
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
