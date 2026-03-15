"use server";

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
  extendedProperties?: {
    private?: {
      type?: string;
      id?: string;
      contactId?: string;
    };
  };
}) {
  const token = await getAccessToken();

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.log("🛠️ [DEV MODE] Simulating event creation (no token)");
      return { 
        success: true, 
        event: { id: "mock-" + Date.now(), ...eventData } 
      };
    }
    return { success: false, error: "Google Calendar not connected" };
  }

  try {
    const calendar = await getCalendarClient(token);
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        recurrence: eventData.recurrence,
        extendedProperties: eventData.extendedProperties,
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

export async function updateCalendarEvent(eventId: string, eventData: {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  recurrence?: string[];
  extendedProperties?: {
    private?: {
      type?: string;
      id?: string;
      contactId?: string;
    };
  };
}) {
  const token = await getAccessToken();

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.log("🛠️ [DEV MODE] Simulating event update (no token)");
      return { 
        success: true, 
        event: { id: eventId, ...eventData } 
      };
    }
    return { success: false, error: "Google Calendar not connected" };
  }

  try {
    const calendar = await getCalendarClient(token);
    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        recurrence: eventData.recurrence,
        extendedProperties: eventData.extendedProperties,
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
    console.error("Update Event Error:", error);
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function deleteCalendarEvent(eventId: string) {
    const token = await getAccessToken();

    if (!token) {
        if (process.env.NODE_ENV === "development") {
            console.log("🛠️ [DEV MODE] Simulating event deletion (no token)");
            return { success: true };
        }
        return { success: false, error: "Google Calendar not connected" };
    }

    try {
        const calendar = await getCalendarClient(token);
        await calendar.events.delete({
            calendarId: "primary",
            eventId: eventId,
        });

        return { success: true };
    } catch (error) {
        console.error("Delete Event Error:", error);
        return { success: false, error: getDirectusErrorMessage(error) };
    }
}
