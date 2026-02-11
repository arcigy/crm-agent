import { getDirectusErrorMessage } from "@/lib/directus";
import { getCalendarClient } from "@/lib/google";
import { getAccessToken } from "./auth";

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
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        recurrence: eventData.recurrence,
      },
    });

    return { 
        success: true, 
        event: {
            id: response.data.id,
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end
        }
    };
  } catch (error) {
    console.error("Create Event Error:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}
