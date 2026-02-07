"use server";

import { revalidatePath } from "next/cache";
import directus from "@/lib/directus";
import { createItem, updateItem, readItems, readItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { normalizeSlovakPhone } from "@/lib/phone";

async function getUserEmail() {
    const user = await currentUser();
    return user?.emailAddresses[0]?.emailAddress?.toLowerCase();
}

/**
 * Sweeps all contacts for the current user and normalizes their phone numbers.
 */
export async function normalizeAllCRMContacts() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) return { success: false, error: "Unauthorized" };

        const contacts = (await directus.request(readItems("contacts", {
            filter: {
                _and: [
                    { user_email: { _eq: userEmail } },
                    { deleted_at: { _null: true } },
                    { phone: { _nnull: true } }
                ]
            },
            fields: ["id", "phone"],
            limit: -1
        }))) as any[];

        let updatedCount = 0;
        for (const c of contacts) {
            if (!c.phone) continue;
            const normalized = normalizeSlovakPhone(c.phone);
            if (normalized !== c.phone) {
                await directus.request(updateItem("contacts", c.id, { phone: normalized }));
                updatedCount++;
            }
        }

        if (updatedCount > 0) revalidatePath("/dashboard/contacts");
        return { success: true, count: updatedCount };
    } catch (e: any) {
        console.error("Manual normalization failed:", e);
        return { success: false, error: e.message };
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
        fields: ["id", "email", "google_id", "first_name", "last_name", "phone"],
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
        const rawPhone = (person.phoneNumbers || [])[0]?.value || "";
        const phone = normalizeSlovakPhone(rawPhone);
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
                               existing.phone !== contactData.phone ||
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

    const crmContacts = (await directus.request(readItems("contacts", {
        filter: {
            _and: [
                { user_email: { _eq: userEmail } },
                { status: { _eq: "active" } },
                { deleted_at: { _null: true } }
            ]
        },
        limit: -1
    }))) as any[];

    if (crmContacts.length === 0) return { success: true, count: 0 };

    let processedCount = 0;
    for (const contact of crmContacts) {
        try {
            // Use existing sync logic which handles both create and update
            await syncContactToGoogle(contact.id);
            processedCount++;
        } catch (err) {
            console.error(`[Google Sync] Failed to sync ${contact.email || contact.id}:`, err);
        }
    }

    return { success: true, count: processedCount };
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

    // First, normalize all existing CRM contacts to fix "09" -> "+4219" etc.
    await normalizeAllCRMContacts();

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

        const personData = res.data || res;
        return { success: true, data: personData };
    } catch (error: any) {
        console.error("Test Create Error:", error);
        return { success: false, error: error.message };
    }
}

export async function syncContactToGoogle(contactId: string | number, forceCreate?: boolean) {
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

        const contact = (await directus.request(readItem("contacts", contactId, {
            fields: ["*", "labels.contact_labels_id.*"]
        }))) as any;
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

        const memberships = (contact.labels || [])
            .map((l: any) => l.contact_labels_id?.google_id)
            .filter(Boolean)
            .map((gid: string) => ({
                contactGroupMembership: { contactGroupResourceName: gid }
            }));

        // Date parsing for birthday
        let birthdays: any[] = [];
        if (contact.birthday) {
            try {
                const date = new Date(contact.birthday);
                if (!isNaN(date.getTime())) {
                    birthdays = [{
                        date: {
                            year: date.getFullYear(),
                            month: date.getMonth() + 1,
                            day: date.getDate()
                        }
                    }];
                }
            } catch (e) {
                console.warn("[Sync] Birthday date parse failed", e);
            }
        }

        const requestBody: any = {
            names: [{ givenName: contact.first_name, familyName: contact.last_name || "" }],
            emailAddresses: contact.email ? [{ value: contact.email }] : [],
            phoneNumbers: contact.phone ? [{ value: normalizeSlovakPhone(contact.phone) }] : [],
            organizations: (contact.company || contact.job_title) ? [{ 
                name: contact.company || "", 
                title: contact.job_title || "" 
            }] : [],
            biographies: [{ value: contact.comments || "Synchronizované z Agentic CRM" }],
            urls: contact.website ? [{ value: contact.website, type: 'website' }] : [],
            addresses: contact.address ? [{ formattedValue: contact.address, type: 'home' }] : [],
            memberships: memberships.length > 0 ? memberships : undefined
        };

        if (birthdays.length > 0) requestBody.birthdays = birthdays;

        if (contact.google_id && !forceCreate) {
            try {
                console.log(`[Google Sync] Fetching etag for ${contact.google_id}...`);
                // 1. Get current person to fetch the etag (required for update)
                const currentPersonRes = await people.people.get({
                    resourceName: contact.google_id,
                    personFields: "names" // fetching just names to get the etag
                });
                const etag = currentPersonRes.data.etag;
                console.log(`[Google Sync] Etag found: ${etag}. Updating...`);

                // Dynamically build fields to update
                const fields = ["names", "emailAddresses", "phoneNumbers", "organizations", "biographies", "urls", "addresses"];
                if (birthdays.length > 0) fields.push("birthdays");
                
                // Only include memberships if there are any, to avoid "Contact must always be in at least one contact group"
                if (memberships.length > 0) {
                    fields.push("memberships");
                }

                // 2. Perform the update with the etag
                const updateRes = await people.people.updateContact({
                    resourceName: contact.google_id,
                    updatePersonFields: fields.join(","),
                    requestBody: {
                        ...requestBody,
                        etag
                    }
                });
                console.log(`[Google Sync] Update successful for ${contact.google_id}`);
            } catch (err: any) {
                console.error(`[Google Sync] Update failed for ${contact.google_id}:`, err.message);
                if (err.code === 404) {
                    console.log(`[Google Sync] Contact not found (404), creating new...`);
                    const res = await people.people.createContact({ requestBody });
                    const newGoogleId = (res.data as any).resourceName;
                    await directus.request(updateItem("contacts", contactId, { google_id: newGoogleId }));
                    console.log(`[Google Sync] New contact created: ${newGoogleId}`);
                } else {
                    throw err; // Re-throw to be caught by the outer catch
                }
            }
        } else {
            console.log(`[Google Sync] ${forceCreate ? 'Forced creation' : 'No google_id'}, creating new contact...`);
            const res = await people.people.createContact({ requestBody });
            const googleId = (res.data as any).resourceName;
            await directus.request(updateItem("contacts", contactId, { google_id: googleId }));
            console.log(`[Google Sync] Contact created with ID: ${googleId}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error(`[Google Sync Error] Global catch:`, error.message);
        
        // Handle Quota Exceeded specifically
        if (error.message?.includes('Quota exceeded') || error.code === 429) {
            return { 
                success: false, 
                error: "Google limit bol prekročený (Quota exceeded). Prosím počkajte minútu a skúste znova." 
            };
        }

        return { success: false, error: error.message };
    }
}
