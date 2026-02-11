"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getCalendarClient } from "@/lib/google";
import { getAuthorizedEmails } from "@/lib/auth";
import { getAccessToken } from "./auth";
import { CalendarEvent } from "@/types/calendar";
import { Project } from "@/types/project";
import { ContactItem } from "@/types/contact";
import { Task } from "@/app/actions/tasks";

export async function getCalendarEvents(timeMin?: string, timeMax?: string) {
  try {
    const token = await getAccessToken();
    const authEmails = await getAuthorizedEmails();

    let googleEvents: CalendarEvent[] = [];

    if (token) {
      const calendar = await getCalendarClient(token);
      try {
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: "startTime",
        });
        googleEvents = (response.data.items || []) as CalendarEvent[];
      } catch (err) {
        console.error("Failed to fetch Google Calendar events:", err);
      }
    }

    const [projectData, contactsData, tasksData] = await Promise.all([
      directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { user_email: { _in: authEmails } },
              { deleted_at: { _null: true } },
            ],
          },
          fields: ["*", { contact_id: ["id", "first_name", "last_name"] }] as string[],
          limit: 500,
        }),
      ) as Promise<Project[]>,
      directus.request(
        readItems("contacts", {
          filter: { user_email: { _in: authEmails } },
          limit: 500,
        }),
      ) as Promise<ContactItem[]>,
      authEmails.length > 0
        ? (directus.request(
            readItems("crm_tasks", {
              filter: { user_email: { _in: authEmails } },
              limit: 500,
            }),
          ) as Promise<Task[]>)
        : Promise.resolve([] as Task[]),
    ]);

    const mergedEvents: CalendarEvent[] = [...googleEvents];

    if (projectData) {
      for (const p of projectData) {
        const contact = (contactsData as ContactItem[])?.find(
          (c) => String(c.id) === String(p.contact_id),
        );
        const contactName = contact
          ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
          : "Neznámy";

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
            colorId: "9",
            extendedProperties: {
              private: { type: "project", id: String(p.id), contactId: String(p.contact_id) },
            },
          });
        } catch {
          console.error(`Skipping project ${p.id} start event due to invalid date`);
        }

        if (p.end_date) {
          mergedEvents.push({
            id: `p-end-${p.id}`,
            summary: `🏁 DEADLINE: ${p.project_type || p.name}`,
            description: `Termín pre ${contactName}.\nStatus: ${p.stage}`,
            start: { date: p.end_date as string },
            end: { date: p.end_date as string },
            colorId: "11",
            extendedProperties: {
              private: { type: "project", id: String(p.id), contactId: String(p.contact_id) },
            },
          });
        }
      }
    }

    if (tasksData) {
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
              start: isDeadline ? { date: t.due_date as string } : { dateTime: isoDate },
              end: isDeadline
                ? { date: t.due_date as string }
                : {
                    dateTime: new Date(
                      new Date(taskDate).getTime() + 30 * 60 * 1000,
                    ).toISOString(),
                  },
              colorId: t.completed ? "8" : "5",
              extendedProperties: { private: { type: "task", id: String(t.id) } },
            });
          } catch {
            console.error(`Skipping task ${t.id} due to invalid date`);
          }
        }
      }
    }

    return {
      success: true,
      events: mergedEvents,
      isConnected: !!token,
    };
  } catch (error) {
    console.error("Calendar Fetch Error:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}
