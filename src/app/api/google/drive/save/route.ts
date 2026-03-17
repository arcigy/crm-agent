import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

async function getCurrentUserContext() {
  const user = await currentUser();
  if (!user) return null;

  const { db } = await import("@/lib/db");

  // Prefer the actually linked Google email (google_tokens.user_email)
  const linked = await db.query(
    "SELECT user_email FROM google_tokens WHERE user_id = $1 LIMIT 1",
    [user.id],
  );

  const userEmail =
    linked.rows[0]?.user_email?.toLowerCase() ||
    user.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!userEmail) return null;

  return { clerkUserId: user.id, userEmail };
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === "suggest") {
      const { suggestDrivePath } = await import("@/app/actions/drive-ai-path");
      const suggestion = await suggestDrivePath({
        filename: body.filename,
        mimeType: body.mimeType,
        emailSubject: body.emailSubject,
        emailFrom: body.emailFrom,
        emailFromName: body.emailFromName,
        userDescription: body.description || "",
        existingFolders: body.existingFolders,
      });
      return NextResponse.json(suggestion);
    }

    if (action === "save") {
      const { saveFileToDrive } = await import("@/app/actions/drive-save-file");
      const result = await saveFileToDrive({
        gmailMessageId: body.gmailMessageId,
        attachmentId: body.attachmentId,
        filename: body.filename,
        mimeType: body.mimeType,
        drivePath: body.drivePath,
        description: body.description,
        userEmail: ctx.userEmail,
        clerkUserId: ctx.clerkUserId,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Drive Save API] Error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

