import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { getValidToken } from "@/lib/google";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * Background Sync for Google Contacts (People API)
 * Pulls new/updated contacts from Google to CRM
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log("[CONTACTS SYNC] Starting background sync job...");

    const tokens = await directus.request(
      readItems("google_tokens", {
        filter: { 
          deleted_at: { _null: true },
          refresh_token: { _null: false }
        },
        limit: -1,
      })
    ) as any[];

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No active Google tokens found" });
    }

    const results = [];

    for (const tokenRecord of tokens) {
      try {
        const userId = tokenRecord.user_id;
        const email = tokenRecord.email || tokenRecord.user_email;
        const syncToken = tokenRecord.people_sync_token;

        console.log(`[CONTACTS SYNC] Syncing ${email}...`);

        const token = await getValidToken(userId, email);
        if (!token || typeof token === "string") {
          results.push({ email, status: "auth_failed" });
          continue;
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials(token);
        const people = google.people({ version: "v1", auth });

        // 1. Fetch connections
        const params: any = {
          resourceName: "people/me",
          pageSize: 100,
          personFields: "names,emailAddresses,phoneNumbers,organizations",
        };

        if (syncToken) {
          params.requestSyncToken = true; // Request new sync token for future use
          // Note: syncing connections by syncToken works differently in People API
          // than Calendar. We often just pull all and local-dedupe during initial development.
        }

        const response = await people.people.connections.list(params);
        const connections = response.data.connections || [];
        const nextSyncToken = response.data.nextSyncToken;

        console.log(`[CONTACTS SYNC] Found ${connections.length} connections for ${email}`);

        // 2. Process each connection
        for (const person of connections) {
          try {
            const primaryEmail = person.emailAddresses?.find(e => e.metadata?.primary)?.value 
                               || person.emailAddresses?.[0]?.value;
            
            if (!primaryEmail) continue;

            const nameObj = person.names?.find(n => n.metadata?.primary) || person.names?.[0];
            const firstName = nameObj?.givenName || "";
            const lastName = nameObj?.familyName || "";
            const phone = person.phoneNumbers?.[0]?.value || "";
            const company = person.organizations?.[0]?.name || "";

            // Check if contact exists locally
            const localContacts = await directus.request(readItems("contacts", {
              filter: {
                _and: [
                  { email: { _eq: primaryEmail } },
                  { user_email: { _eq: email } }
                ]
              },
              limit: 1
            })) as any[];

            const contactData = {
              first_name: firstName,
              last_name: lastName,
              email: primaryEmail,
              phone: phone,
              company: company,
              user_email: email,
              status: "published",
              // We could store the resourceName/etag for future conflict resolution
              metadata: {
                google_resource_name: person.resourceName,
                google_etag: person.etag
              }
            };

            if (localContacts.length > 0) {
              // Update only if local is older or missing data?
              // For now, simple overwrite of missing fields
              const local = localContacts[0];
              const updates: any = {};
              if (!local.first_name && firstName) updates.first_name = firstName;
              if (!local.last_name && lastName) updates.last_name = lastName;
              if (!local.phone && phone) updates.phone = phone;
              if (!local.company && company) updates.company = company;

              if (Object.keys(updates).length > 0) {
                await directus.request(updateItem("contacts", local.id, updates));
              }
            } else {
              // Create new contact
              await directus.request(createItem("contacts", contactData));
            }
          } catch (itemErr) {
            console.error(`[CONTACTS SYNC] Error processing person:`, itemErr);
          }
        }

        // 3. Update Sync Token
        if (nextSyncToken) {
          await directus.request(updateItem("google_tokens", tokenRecord.id, {
            people_sync_token: nextSyncToken,
            last_sync: new Date().toISOString()
          }));
        }

        results.push({ email, processed: connections.length, status: "success" });

      } catch (err: any) {
        console.error(`[CONTACTS SYNC] Fatal error:`, err);
        results.push({ email: tokenRecord.email, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("[CONTACTS SYNC] Global error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
