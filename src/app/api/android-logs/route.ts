import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: "No user email" }, { status: 401 });

    // @ts-expect-error - Directus SDK types
    const logs = await directus.request(
      readItems("android_logs", {
        filter: { 
            _or: [
                { user_email: { _eq: email } },
                { contact_id: { _not_null: true } } // Fallback or team access if needed
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
