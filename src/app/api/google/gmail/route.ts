import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

function decodeBase64(data: string) {
  if (!data || typeof data !== "string") return "";
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf-8");
}

function getMessageBody(payload: any): {
  text: string;
  html: string;
  attachments: any[];
} {
  let text = "";
  let html = "";
  const attachments: any[] = [];

  const traverse = (part: any) => {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text += decodeBase64(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64(part.body.data);
    } else if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    }

    if (part.parts) {
      part.parts.forEach(traverse);
    }
  };

  if (payload) {
    traverse(payload);
  }

  // Fallback if no parts (simple message)
  if (!text && !html && payload.body?.data) {
    const decoded = decodeBase64(payload.body.data);
    if (payload.mimeType === "text/html") {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  return { text, html, attachments };
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ isConnected: false, error: "Google account not linked or token expired" });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: "-category:promotions -category:social",
    });

    if (!listRes.data.messages)
      return NextResponse.json({ isConnected: true, messages: [] });

    const messages = await Promise.all(
      listRes.data.messages.map(async (m) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "full",
          });

          const headers = detail.data.payload?.headers;
          const subject =
            headers?.find((h) => h.name === "Subject")?.value || "No Subject";
          const from =
            headers?.find((h) => h.name === "From")?.value || "Unknown";
          const date = headers?.find((h) => h.name === "Date")?.value || "";

          const { text, html, attachments } = getMessageBody(
            detail.data.payload,
          );

          return {
            id: m.id,
            threadId: m.threadId,
            subject,
            from,
            date: new Date(date).toISOString(),
            snippet: detail.data.snippet,
            body: text || detail.data.snippet || "",
            bodyHtml: html,
            attachments,
            isRead: !detail.data.labelIds?.includes("UNREAD"),
          };
        } catch (e) {
          return null;
        }
      }),
    );

    return NextResponse.json({
      isConnected: true,
      messages: messages.filter((m) => m !== null),
    });
  } catch (error: any) {
    console.error("Gmail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await req.json();
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ error: "Google account not linked or token expired" }, { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: [messageId],
        removeLabelIds: ["UNREAD"],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Attachment Download Logic
  try {
    const { messageId, attachmentId } = await req.json();
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token) return new Response("Google account not linked or token expired", { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    const attRes = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const data = attRes.data.data;
    if (!data) throw new Error("No data");

    const safeData = data && typeof data === "string" ? data : "";
    const buffer = Buffer.from(
      safeData.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    return new Response(buffer);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
