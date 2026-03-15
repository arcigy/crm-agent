import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: "No user email" }, { status: 401 });

    const logs = await directus.request(
      readItems("android_logs", {
        filter: { 
            _and: [
                { user_email: { _eq: email } }
            ]
        },
        sort: ["-date_created"],
        limit: 100
      }),
    );

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    console.error("Android logs fetch error:", error);
    return NextResponse.json(
      { success: false, error: getDirectusErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await currentUser();

    // Protection: API Key or Clerk session
    if (!user && apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { phone_number, type, body, direction, duration, timestamp } = payload;

    if (!phone_number) {
      return NextResponse.json({ error: "Missing phone_number" }, { status: 400 });
    }

    // 1. Duplicate Prevention (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const existing = await directus.request(
      readItems("android_logs", {
        filter: {
          _and: [
            { phone_number: { _eq: phone_number } },
            { body: { _eq: body } },
            { date_created: { _gt: fiveMinutesAgo } }
          ]
        },
        limit: 1
      })
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ success: true, message: "Duplicate suppressed", id: (existing[0] as any).id });
    }

    // 2. Match contact by suffix (last 9 digits)
    let contact_id = null;
    const cleanPhone = phone_number.replace(/\s+/g, "");
    const suffix = cleanPhone.slice(-9);

    if (suffix.length >= 7) {
      const contacts = await directus.request(
        readItems("contacts", {
          filter: { phone: { _icontains: suffix } },
          limit: 1
        })
      );
      if (Array.isArray(contacts) && contacts.length > 0) {
        contact_id = (contacts[0] as any).id;
      }
    }

    // 3. Log into DB
    const userEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase() || payload.user_email || "android-automated";

    const newLog = await directus.request(
      createItem("android_logs", {
        phone_number: cleanPhone,
        type: type || "unknown",
        body: body || "",
        direction: direction || "incoming",
        duration: duration || 0,
        timestamp: timestamp || new Date().toISOString(),
        contact_id,
        user_email: userEmail,
        date_created: new Date().toISOString()
      })
    );

    return NextResponse.json({ success: true, data: newLog });

  } catch (error: any) {
    console.error("Android logs POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
