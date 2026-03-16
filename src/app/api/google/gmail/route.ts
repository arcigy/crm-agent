import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("id");

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return NextResponse.json({ error: "No primary email" }, { status: 400 });

    // Single message fetch for EmailDetailView (fetch HTML body directly from Gmail)
    if (messageId) {
      const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
      const token = await getValidToken(user.id, userEmail);
      if (!token) return NextResponse.json({ error: "Not Google connected" }, { status: 400 });

      const gmail = await getGmailClient(token);
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      const { html } = getMessageBody(detail.data.payload);
      return NextResponse.json({ message: { bodyHtml: html } });
    }

    // List fetching from local DB
    const { db } = await import("@/lib/db");
    
    const category = searchParams.get("tab") || searchParams.get("category") || "inbox";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "50");
    const offset = (page - 1) * limit;

    const LABEL_MAP: Record<string, string> = {
      inbox: "INBOX",
      starred: "STARRED",
      sent: "SENT",
      drafts: "DRAFT",
      spam: "SPAM",
      trash: "TRASH",
      important: "IMPORTANT",
      unread: "UNREAD",
      purchases: "CATEGORY_PROMOTIONS",
      archive: "archive",
    };
    const labelId = LABEL_MAP[category] || category; // For custom labels, we'll assume the category is the exact label name for now.

    const countResult = await db.query(`
      SELECT total_count, unread_count 
      FROM gmail_label_counts
      WHERE user_email = $1 AND label_id = $2
    `, [userEmail, labelId]);

    const totalCount = countResult.rows[0]?.total_count || 0;
    const unreadCount = countResult.rows[0]?.unread_count || 0;

    const emailsResult = await db.query(`
      SELECT 
        gmail_message_id as id,
        gmail_thread_id as thread_id,
        subject,
        from_email as from,
        to_emails,
        snippet,
        received_at as date,
        is_read as "isRead",
        is_starred as "isStarred",
        has_attachments as "hasAttachments",
        label_ids as labels,
        ai_intent,
        ai_priority,
        ai_summary,
        body_text as body
      FROM gmail_messages
      WHERE user_email = $1
      ${labelId === 'archive' ? 'AND NOT (label_ids @> ARRAY[\'INBOX\'] OR label_ids @> ARRAY[\'TRASH\'] OR label_ids @> ARRAY[\'SPAM\'])' : 'AND label_ids @> ARRAY[$2]'}
      ORDER BY received_at DESC
      LIMIT $3 OFFSET $4
    `, labelId === 'archive' ? [userEmail, limit, offset] : [userEmail, labelId, limit, offset]);

    const syncState = await db.query(`
      SELECT sync_status, synced_messages, total_messages, last_full_sync
      FROM gmail_sync_state
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [userEmail]);

    // Format for existing Frontend component compatibility
    const formattedEmails = emailsResult.rows.map(row => ({
      ...row,
      googleLabels: row.labels,
      to: row.to_emails?.join(', ') || '',
      classification: row.ai_intent ? {
        intent: row.ai_intent,
        priority: row.ai_priority,
        summary: row.ai_summary
      } : undefined
    }));

    return NextResponse.json({
      isConnected: true,
      emails: formattedEmails,
      messages: formattedEmails, // legacy fallback for existing generic components
      pagination: {
        total: totalCount,
        unread: unreadCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount
      },
      sync: syncState.rows[0] || { sync_status: 'pending' },
      
      // Provide dynamic stubs required by LeadsSidebar if db stats don't exist yet
      stats: {}, 
      userLabels: []
    });

  } catch (error: any) {
    console.error("Gmail API DB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ error: "Not connected" }, { status: 400 });

    if (action === "emptyTrash") {
      const gmail = await getGmailClient(token);
      
      // Batch delete instead of trash.trash which might not empty it
      const trashMessages = await gmail.users.messages.list({
        userId: "me",
        labelIds: ["TRASH"],
        maxResults: 500
      });

      if (trashMessages.data.messages?.length) {
        await gmail.users.messages.batchDelete({
          userId: "me",
          requestBody: {
            ids: trashMessages.data.messages.map((m: any) => m.id!)
          }
        });
      }
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messageId, action } = body;
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ error: "Google account not linked or token expired" }, { status: 400 });

    const gmail = await getGmailClient(token);

    if (action === "star") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: ["STARRED"],
        },
      });
    } else if (action === "unstar") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["STARRED"],
        },
      });
    } else if (action === "trash") {
      await gmail.users.messages.trash({
        userId: "me",
        id: messageId,
      });
    } else if (action === "archive") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["INBOX"],
        },
      });
    } else if (action === "spam") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: ["SPAM"],
          removeLabelIds: ["INBOX"],
        },
      });
    } else if (action === "unread") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: ["UNREAD"],
        },
      });
    } else if (action === "untrash") {
      await gmail.users.messages.untrash({
        userId: "me",
        id: messageId,
      });
    } else if (action === "empty_trash") {
      // List everything in trash
      const trashList = await gmail.users.messages.list({
        userId: "me",
        q: "label:TRASH"
      });
      
      if (trashList.data.messages && trashList.data.messages.length > 0) {
        // PERMANENT DELETE (Batch)
        await gmail.users.messages.batchDelete({
          userId: "me",
          requestBody: {
            ids: trashList.data.messages.map((m: any) => m.id as string)
          }
        });
      }
    } else {
      // Default behavior (mark as read)
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    }

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
    const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
    const token = await getValidToken(user.id, userEmail);

    if (!token) return new Response("Google account not linked or token expired", { status: 400 });

    const gmail = await getGmailClient(token || "");

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
