import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { getValidToken } from "@/lib/google";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * Background Sync for Google Calendar
 * Runs periodically to pull changes using delta sync (syncToken)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log("[CALENDAR SYNC] Starting background sync job...");

    // 1. Fetch all connected Google accounts
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
        const syncToken = tokenRecord.calendar_sync_token;

        console.log(`[CALENDAR SYNC] Syncing ${email}...`);

        // Get auth client
        const token = await getValidToken(userId, email);
        if (!token || typeof token === "string") {
          console.warn(`[CALENDAR SYNC] Invalid token for ${email}, skipping.`);
          results.push({ email, status: "auth_failed" });
          continue;
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials(token);
        const calendar = google.calendar({ version: "v3", auth });

        // 2. Fetch changes
        const params: any = {
          calendarId: "primary",
          singleEvents: true, // Expand recurring events
        };

        if (syncToken) {
          params.syncToken = syncToken;
        } else {
          // Initial sync: last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          params.timeMin = thirtyDaysAgo.toISOString();
        }

        let eventsResponse;
        try {
          eventsResponse = await calendar.events.list(params);
        } catch (e: any) {
          if (e.code === 410) {
            // syncToken expired, do full sync
            console.warn(`[CALENDAR SYNC] SyncToken expired for ${email}, restarting.`);
            delete params.syncToken;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.timeMin = thirtyDaysAgo.toISOString();
            eventsResponse = await calendar.events.list(params);
          } else {
            throw e;
          }
        }

        const items = eventsResponse.data.items || [];
        const nextSyncToken = eventsResponse.data.nextSyncToken;

        console.log(`[CALENDAR SYNC] Found ${items.length} changes for ${email}`);

        // 3. Process changes (Upsert)
        for (const gEvent of items) {
          try {
            const isDeleted = gEvent.status === "cancelled";
            
            // Look for existing local record
            const localEvents = await directus.request(readItems("calendar_events", {
              filter: { google_event_id: { _eq: gEvent.id } },
              limit: 1
            })) as any[];

            if (isDeleted) {
              if (localEvents.length > 0) {
                await directus.request(updateItem("calendar_events", localEvents[0].id, {
                  deleted_at: new Date().toISOString(),
                  status: "cancelled"
                }));
              }
              continue;
            }

            const eventData = {
              title: gEvent.summary || "(No Title)",
              description: gEvent.description || "",
              start_date: gEvent.start?.dateTime || gEvent.start?.date,
              end_date: gEvent.end?.dateTime || gEvent.end?.date,
              location: gEvent.location || "",
              google_event_id: gEvent.id,
              user_email: email,
              calendar_id: "primary",
              status: gEvent.status || "confirmed",
              deleted_at: null
            };

            if (localEvents.length > 0) {
              await directus.request(updateItem("calendar_events", localEvents[0].id, eventData));
            } else {
              await directus.request(createItem("calendar_events", eventData));
            }
          } catch (itemErr) {
            console.error(`[CALENDAR SYNC] Error processing event ${gEvent.id}:`, itemErr);
          }
        }

        // 4. Update sync token in DB
        if (nextSyncToken) {
          await directus.request(updateItem("google_tokens", tokenRecord.id, {
            calendar_sync_token: nextSyncToken,
            last_sync: new Date().toISOString()
          }));
        }

        results.push({ email, processed: items.length, status: "success" });

      } catch (err: any) {
        console.error(`[CALENDAR SYNC] Fatal error for token ${tokenRecord.id}:`, err);
        results.push({ email: tokenRecord.email, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("[CALENDAR SYNC] Global error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
