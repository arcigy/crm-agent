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
      error: "Google účet nie je prepojený. Prosím pripojte ho v nastaveniach.",
    };
  }

  const calendar = await getCalendarClient(token);

  switch (name) {
    case "calendar_check_availability":
      const days = (args.days as number) || 3;
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
      const newEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: args.summary as string,
          description: (args.description as string) || "",
          start: { dateTime: args.start_time as string },
          end: { dateTime: args.end_time as string },
        },
      });

      return {
        success: true,
        action: "open_url",
        url: newEvent.data.htmlLink,
        data: { eventLink: newEvent.data.htmlLink },
        message: "Udalosť bola úspešne pridaná do kalendára. Otváram detail v Google kalendári...",
      };

    default:
      throw new Error(`Tool ${name} not found in Calendar executors`);
  }
}
