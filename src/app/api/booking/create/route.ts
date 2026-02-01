import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import directus from "@/lib/directus";
import { createItem, readItems } from "@directus/sdk";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, username, start, end, name, email } = body;

    // 1. Find User by Username in CRM
    // @ts-ignore
    const crmUsers = await directus.request(
      readItems("crm_users", {
        filter: { first_name: { _icontains: username } }, // Simple match for now
        limit: 1,
      }),
    );

    const crmUser = crmUsers?.[0];
    if (!crmUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Identify/Create Contact in CRM
    // @ts-ignore
    let contact = (
      await directus.request(
        readItems("contacts", {
          filter: { email: { _eq: email } },
          limit: 1,
        }),
      )
    )?.[0];

    if (!contact) {
      const [fName, ...lNameParts] = name.split(" ");
      // @ts-ignore
      contact = await directus.request(
        createItem("contacts", {
          first_name: fName,
          last_name: lNameParts.join(" ") || "-",
          email: email,
          status: "published",
        }),
      );
    }

    // 3. Create Appointment in CRM
    // @ts-ignore
    await directus.request(
      createItem("activities", {
        type: "meeting",
        contact_id: contact.id,
        subject: `Calendar Booking: ${slug}`,
        content: `Klient: ${name} (${email})\nSlug: ${slug}\nČas: ${start} - ${end}`,
        activity_date: start,
      }),
    );

    // 4. Create Google Calendar Event
    // We need the clerk_id (assumed to be stored in crm_user or we try to find it via email)
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({
      emailAddress: [crmUser.email],
    });
    const clerkUser = clerkUsers.data[0];

    if (clerkUser) {
      const tokenRes = await client.users.getUserOauthAccessToken(
        clerkUser.id,
        "oauth_google",
      );
      const token = tokenRes.data[0]?.token;

      if (token) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });
        const calendar = google.calendar({ version: "v3", auth });

        await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: `${(slug || "").toString().replace(/-/g, " ")} | ${name}`,
            description: `Booking from CRM Scheduler.\nClient: ${name}\nEmail: ${email}`,
            start: { dateTime: start },
            end: { dateTime: end },
            attendees: [{ email: email }],
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Booking Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
