import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { generateAvailableSlots, AvailabilityWindow } from "@/lib/booking";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import client from "openai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // yyyy-MM-dd
    const slug = searchParams.get("slug"); // intro-30
    const username = searchParams.get("username"); // owner nickname

    if (!dateStr || !slug || !username) {
      return NextResponse.json(
        { error: "Missing date, slug or username" },
        { status: 400 },
      );
    }

    // 1. Get Owner from Directus
    // @ts-ignore
    const owners = await directus.request(
      readItems("crm_users", {
        filter: {
          _or: [
            { nickname: { _eq: username } },
            { email: { _eq: username } },
            { first_name: { _icontains: username } },
          ],
        },
        limit: 1,
      }),
    );

    const owner = owners?.[0];
    if (!owner)
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });

    // 1. Get Booking Type from Directus (Gracefully handle missing collection/record)
    let bookingType = null;
    try {
      // @ts-ignore
      const types = await directus.request(
        readItems("booking_types", {
          filter: { slug: { _eq: slug } },
          limit: 1,
        }),
      );
      bookingType = types?.[0];
    } catch (e) {
      console.log("booking_types collection missing, using defaults");
    }

    // Default availability: 09:00 - 18:00 every day
    const defaultAvailability: AvailabilityWindow[] = [0, 1, 2, 3, 4, 5, 6].map(
      (day) => ({
        day,
        slots: [{ start: "09:00", end: "18:00" }],
      }),
    );

    const availability = bookingType?.availability_json || defaultAvailability;
    const duration = bookingType?.duration || 30;

    // 2. Get Busy Slots from Owner's Google Calendar
    let busySlots: { start: string; end: string }[] = [];

    try {
      const client = await clerkClient();
      // We need to find the Clerk user ID for the owner's email
      const clerkUsers = await client.users.getUserList({
        emailAddress: [owner.email],
      });
      const clerkUser = clerkUsers.data[0];

      if (clerkUser) {
        const response = await client.users.getUserOauthAccessToken(
          clerkUser.id,
          "oauth_google",
        );
        const token = response.data[0]?.token;

        if (token) {
          const auth = new google.auth.OAuth2();
          auth.setCredentials({ access_token: token });
          const calendar = google.calendar({ version: "v3", auth });

          const start = new Date(dateStr);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateStr);
          end.setHours(23, 59, 59, 999);

          const freeBusyRes = await calendar.freebusy.query({
            requestBody: {
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              items: [{ id: "primary" }],
            },
          });

          busySlots = (freeBusyRes.data.calendars?.primary?.busy || []).map(
            (b: any) => ({
              start: b.start,
              end: b.end,
            }),
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch busy slots:", err);
    }

    // 3. Generate Free Slots
    const targetDate = new Date(dateStr);
    const freeSlots = generateAvailableSlots(
      targetDate,
      duration,
      availability as AvailabilityWindow[],
      busySlots,
    );

    return NextResponse.json({
      date: dateStr,
      duration,
      slots: freeSlots,
    });
  } catch (error: any) {
    console.error("Booking API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
