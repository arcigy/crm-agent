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
  const tab = searchParams.get("tab") || searchParams.get("category") || "inbox";
  const pageToken = searchParams.get("pageToken") || undefined;
  const maxResults = parseInt(searchParams.get("pageSize") || "50");

  const CATEGORY_QUERIES: Record<string, any> = {
    inbox: { labelIds: ["INBOX"], q: "-category:promotions -category:social" },
    starred: { labelIds: ["STARRED"] },
    sent: { labelIds: ["SENT"] },
    drafts: { labelIds: ["DRAFT"] },
    spam: { labelIds: ["SPAM"] },
    trash: { labelIds: ["TRASH"] },
    purchases: { q: "category:purchases" },
    archive: { q: "-in:inbox -in:trash -in:spam" },
    snoozed: { labelIds: ["SNOOZED"] },
    unread: { q: "is:unread -category:promotions -category:social" }
  };

  let query = CATEGORY_QUERIES[tab];
  
  // If tab is not a predefined category, assume it's a specific label name/query
  if (!query) {
    query = { q: `label:"${tab}"` };
  }

  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ isConnected: false, error: "Google account not linked or token expired" });

    const gmail = await getGmailClient(token);
    
    // Fetch labels map to show human-readable names and colors
    const labelsRes = await gmail.users.labels.list({ userId: "me" });
    const labelInfoMap: Record<string, { name: string, color?: { backgroundColor: string, textColor: string } }> = {};
    (labelsRes.data.labels || []).forEach((l: any) => {
      if (l.id && l.name) {
        labelInfoMap[l.id] = { 
          name: l.name, 
          color: l.color 
        };
      }
    });

    // FIX 1.4: Retry logic for fetch failures
    let listRes;
    try {
      listRes = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        pageToken,
        ...query,
      });
    } catch (err: any) {
      if (err.status >= 500) {
        // Retry once after 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
        listRes = await gmail.users.messages.list({
          userId: "me",
          maxResults,
          pageToken,
          ...query,
        });
      } else {
        throw err;
      }
    }

    if (!listRes.data.messages)
      return NextResponse.json({ 
        isConnected: true, 
        messages: [],
        totalMessages: 0,
        message: `No emails in tab: ${tab}` 
      });

    const messages = await Promise.all(
      (listRes.data.messages || []).map(async (m: any) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "full",
          });

          const headers = detail.data.payload?.headers;
          const subject =
            headers?.find((h: any) => h.name === "Subject")?.value || "No Subject";
          const from =
            headers?.find((h: any) => h.name === "From")?.value || "Unknown";
          const date = headers?.find((h: any) => h.name === "Date")?.value || "";
          const to = headers?.find((h: any) => h.name === "To")?.value || "";

          const { text, html, attachments } = getMessageBody(
            detail.data.payload,
          );

            return {
              id: m.id,
              threadId: m.threadId,
              subject,
              from,
              to,
              date: new Date(date).toISOString(),
              snippet: detail.data.snippet,
              body: text || detail.data.snippet || "",
              bodyHtml: html,
              attachments,
              isRead: !detail.data.labelIds?.includes("UNREAD"),
              isStarred: detail.data.labelIds?.includes("STARRED"),
              labels: detail.data.labelIds || [],
              googleLabels: (detail.data.labelIds || []).map((id: string) => labelInfoMap[id]?.name || id),
              googleLabelColors: (detail.data.labelIds || []).reduce((acc: any, id: string) => {
                const info = labelInfoMap[id];
                if (info?.color) {
                  acc[info.name] = info.color.backgroundColor;
                }
                return acc;
              }, {})
            };
        } catch (e) {
          return null;
        }
      }),
    );

    const userLabels = (labelsRes.data.labels || [])
      .filter((l: any) => l.type === "user" && !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'IMPORTANT'].includes(l.id))
      .map((l: any) => ({
        name: l.name,
        color: l.color?.backgroundColor,
        messagesTotal: l.messagesTotal || 0,
        messagesUnread: l.messagesUnread || 0
      }))
      .sort((a: any, b: any) => {
        // CRM labels first
        const aCrm = a.name.startsWith("CRM/");
        const bCrm = b.name.startsWith("CRM/");
        if (aCrm && !bCrm) return -1;
        if (!aCrm && bCrm) return 1;
        return a.name.localeCompare(b.name);
      });

    // Create stats object for quick access to system label counts
    const systemLabels = (labelsRes.data.labels || []).filter((l: any) => l.type === "system");
    const stats: Record<string, { total: number, unread: number }> = {};
    systemLabels.forEach((l: any) => {
      stats[l.id.toLowerCase()] = {
        total: l.messagesTotal || 0,
        unread: l.messagesUnread || 0
      };
    });

    // Fetch specific label stats for total count if possible
    let totalMessages = listRes.data.resultSizeEstimate || 0;
    let unreadMessages = 0;

    const labelId = query.labelIds?.[0];
    
    // If we have a query 'q', labels.get(id).messagesTotal will likely overcount 
    // because it ignores the filter (e.g. it includes promotions/social in INBOX).
    // In that case, resultSizeEstimate is a better (though still rough) guess.
    const hasQuery = !!query.q;

    if (labelId && !hasQuery) {
      try {
        const labelStats = await gmail.users.labels.get({ userId: "me", id: labelId });
        totalMessages = labelStats.data.messagesTotal || totalMessages;
        unreadMessages = labelStats.data.messagesUnread || 0;
      } catch (e) {}
    } else if (tab !== "all" && tab !== "archive") {
      // For filtered views like 'Inbox' (with category filters), we might want to try to find 
      // the closest label info for stats, but prioritize the list estimate if it's smaller.
      const targetLabel = (labelsRes.data.labels || []).find((l: any) => l.name === tab || l.name === `CRM/${tab}`);
      if (targetLabel && !hasQuery) {
        try {
          const labelStats = await gmail.users.labels.get({ userId: "me", id: targetLabel.id });
          totalMessages = labelStats.data.messagesTotal || totalMessages;
          unreadMessages = labelStats.data.messagesUnread || 0;
        } catch (e) {}
      }
    }

    return NextResponse.json({
      isConnected: true,
      messages: messages.filter((m) => m !== null),
      nextPageToken: listRes.data.nextPageToken,
      totalMessages,
      unreadMessages,
      stats,
      userLabels
    });
  } catch (error: any) {
    console.error("Gmail API Error:", error);
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
