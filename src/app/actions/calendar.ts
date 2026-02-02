"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getCalendarClient } from "@/lib/google";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

async function getAccessToken() {
  const user = await currentUser();
  if (!user) return null;

  const client = await clerkClient();
  const response = await client.users.getUserOauthAccessToken(
    user.id,
    "oauth_google",
  );
  return response.data[0]?.token || null;
}

export async function getCalendarConnectionStatus() {
  const token = await getAccessToken();
  return { isConnected: !!token };
}

export async function getCalendarEvents(timeMin?: string, timeMax?: string) {
  try {
    const token = await getAccessToken();
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    let googleEvents: any[] = [];

    // 1. Fetch from Google Calendar if connected
    if (token) {
      const calendar = getCalendarClient(token);
      try {
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: "startTime",
        });
        googleEvents = response.data.items || [];
      } catch (err) {
        console.error("Failed to fetch Google Calendar events:", err);
        // Don't fail completely, just return non-google events
      }
    }

    // 2. Fetch Projects & Contacts from Directus (filtered by user)
    // @ts-ignore
    const projectData = await directus.request(
      readItems("projects", {
        filter: {
          _and: [
            { user_email: { _eq: userEmail } },
            { deleted_at: { _null: true } },
          ],
        },
        limit: -1,
      }),
    );

    // @ts-ignore
    const contactsData = await directus.request(
      readItems("contacts", {
        filter: { user_email: { _eq: userEmail } },
        limit: -1,
      }),
    );

    // @ts-ignore
    const tasksData = userEmail
      ? await directus.request(
          readItems("crm_tasks", {
            filter: { user_email: { _eq: userEmail } },
            limit: -1,
          }),
        )
      : [];

    const mergedEvents: any[] = [...googleEvents];

    // --- Process Projects ---
    if (projectData) {
      // @ts-ignore
      for (const p of projectData) {
        const contact = (contactsData as any[])?.find(
          (c) => String(c.id) === String(p.contact_id),
        );
        const contactName = contact
          ? `${contact.first_name} ${contact.last_name}`
          : "Neznámy";

        // Add creation date event
        try {
          const creationDate = p.date_created
            ? new Date(p.date_created).toISOString()
            : new Date().toISOString();
          mergedEvents.push({
            id: `p-start-${p.id}`,
            summary: `🚀 START: ${p.project_type || p.name || "Projekt"}`,
            description: `Nový projekt pre ${contactName}.\nŠtádium: ${p.stage}`,
            start: { dateTime: creationDate },
            end: {
              dateTime: new Date(
                new Date(creationDate).getTime() + 60 * 60 * 1000,
              ).toISOString(),
            },
            colorId: "9", // Blueberry (approx blue)
            extendedProperties: {
              private: { type: "project", id: p.id, contactId: p.contact_id },
            },
          });
        } catch (e) {
          console.error(
            `Skipping project ${p.id} start event due to invalid date:`,
            p.date_created,
          );
        }

        // Add end date event
        if (p.end_date) {
          mergedEvents.push({
            id: `p-end-${p.id}`,
            summary: `🏁 DEADLINE: ${p.project_type || p.name}`,
            description: `Termín pre ${contactName}.\nStatus: ${p.stage}`,
            start: { date: p.end_date }, // All day
            end: { date: p.end_date },
            colorId: "11", // Tomato (approx red)
            extendedProperties: {
              private: { type: "project", id: p.id, contactId: p.contact_id },
            },
          });
        }
      }
    }

    // --- Process Tasks ---
    if (tasksData) {
      // @ts-ignore
      for (const t of tasksData) {
        const taskDate = t.due_date || t.date_created;
        if (taskDate) {
          try {
            const isDeadline = !!t.due_date;
            const isoDate = new Date(taskDate).toISOString();

            mergedEvents.push({
              id: `t-${t.id}`,
              summary: `📝 TODO: ${t.title || "Úloha"}`,
              description: `Úloha z tvojho zoznamu.\nStav: ${t.completed ? "Hotovo" : "Prebieha"}`,
              start: isDeadline ? { date: t.due_date } : { dateTime: isoDate },
              end: isDeadline
                ? { date: t.due_date }
                : {
                    dateTime: new Date(
                      new Date(taskDate).getTime() + 30 * 60 * 1000,
                    ).toISOString(),
                  },
              colorId: t.completed ? "8" : "5", // Gray or Yellow
              extendedProperties: { private: { type: "task", id: t.id } },
            });
          } catch (e) {
            console.error(
              `Skipping task ${t.id} due to invalid date:`,
              taskDate,
            );
          }
        }
      }
    }

    return {
      success: true,
      events: mergedEvents,
      isConnected: !!token,
    };
  } catch (error: any) {
    console.error("Calendar Fetch Error:", error);
    return { success: false, error: error.message };
  }
}

export async function disconnectGoogle() {
  // With Clerk, we might not need to explicitly "disconnect" on our side unless we want to revoke token
  // For now, we'll just simulate success
  return { success: true };
}

export async function createCalendarEvent(eventData: {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  recurrence?: string[];
}) {
  const token = await getAccessToken();

  if (!token) {
    return { success: false, error: "Google Calendar not connected" };
  }

  try {
    const calendar = getCalendarClient(token);
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start as any,
        end: eventData.end as any,
        location: eventData.location,
        recurrence: eventData.recurrence,
      },
    });

    return { success: true, event: response.data };
  } catch (error: any) {
    console.error("Create Event Error:", error);
    return { success: false, error: error.message || "Failed to create event" };
  }
}
