"use server";

import { currentUser } from "@clerk/nextjs/server";

export async function executeCalendarTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
  userId?: string,
) {
  if (!userEmail || !userId) throw new Error("Unauthorized access to Calendar Tool");

  const { getValidToken, getCalendarClient } = await import("@/lib/google");
  const token = await getValidToken(userId, userEmail);

  if (!token) {
    return {
      success: false,
      error: "GOOGLE_ACCOUNT_NOT_CONNECTED",
      message: "Google účet nie je prepojený. Prosím pripojte ho v nastaveniach.",
    };
  }

  if (token === "MISSING_REFRESH_TOKEN") {
    return {
      success: false,
      error: "MISSING_REFRESH_TOKEN",
      message: "Tvoje Google pripojenie vypršalo a vyžaduje opätovné schválenie prístupu (consent).",
    };
  }

  const calendar = await getCalendarClient(token);

  switch (name) {
    case "calendar_check_availability":
    case "calendar_get_upcoming_events":
      const days = (args.days as number) || (args.days_ahead as number) || 3;
      const timeMin = new Date().toISOString();
      const timeMax = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = res.data.items || [];
      if (events.length === 0) {
        return {
          success: true,
          message: "V najbližších dňoch nemáte žiadne udalosti.",
        };
      }

      const agenda = events
        .map(
          (e) =>
            `${e.summary} (${e.start?.dateTime || e.start?.date} - ${
              e.end?.dateTime || e.end?.date
            })`,
        )
        .join("\n");

      return {
        success: true,
        data: events,
        message: `Nájdené udalosti:\n${agenda}`,
      };

    case "calendar_schedule_event":
      const startTime = args.start_time as string;
      const endTime = args.end_time as string;

      // 1. Conflict Check (Safety Step)
      const existingRes = await calendar.events.list({
        calendarId: "primary",
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
      });

      if (existingRes.data.items && existingRes.data.items.length > 0) {
        return {
          success: false,
          error: "SLOT_OCCUPIED",
          message: `Nemožno rezervovať termín o ${startTime}, tento čas je už obsadený inou udalosťou: "${existingRes.data.items[0].summary}".`,
        };
      }

      // 2. Insert if free
      const newEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: args.summary as string,
          description: (args.description as string) || "",
          start: { dateTime: startTime },
          end: { dateTime: endTime },
        },
      });

      // Point to internal CRM calendar view for the event's day
      const eventDate = startTime.split('T')[0];
      const internalUrl = `/dashboard/calendar?date=${eventDate}`;

      return {
        success: true,
        action: "open_url",
        url: internalUrl,
        data: { 
            eventLink: internalUrl,
            googleLink: newEvent.data.htmlLink,
            eventId: newEvent.data.id
        },
        message: "Udalosť bola úspešne pridaná do kalendára. Otváram detail v CRM...",
      };

    default:
      throw new Error(`Tool ${name} not found in Calendar executors`);
  }
}
