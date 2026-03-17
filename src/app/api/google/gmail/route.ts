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
    
    // List fetching from local DB
    const { db } = await import("@/lib/db");
    
    // IMPORTANT: Get the actually linked Google email for this user
    const linkedToken = await db.query(
      'SELECT user_email FROM google_tokens WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    
    const userEmail = linkedToken.rows[0]?.user_email?.toLowerCase() || 
                      user.emailAddresses[0]?.emailAddress?.toLowerCase();
                      
    if (!userEmail) return NextResponse.json({ error: "No email identified" }, { status: 400 });

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
      
      const headers = detail.data.payload?.headers || [];
      const messageIdHeader = headers.find((h: any) => h.name.toLowerCase() === 'message-id')?.value;
      const referencesHeader = headers.find((h: any) => h.name.toLowerCase() === 'references')?.value;

      return NextResponse.json({ 
        message: { 
          bodyHtml: html,
          messageIdHeader,
          referencesHeader
        } 
      });
    }

    // List fetching from local DB
    const category = searchParams.get("tab") || searchParams.get("category") || "inbox";
    const view = searchParams.get("view"); // 'threads' or 'messages'
    const threadId = searchParams.get("threadId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "50");
    const search = searchParams.get("search") || "";
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
    const labelId = LABEL_MAP[category] || category;

    // Single thread detail fetch
    if (threadId) {
      // ... (existing thread logic)
    }

    let emailsPromise: Promise<any>;
    let countPromise: Promise<any>;

    if (search) {
      const searchPattern = `%${search}%`;
      if (view === 'threads') {
        emailsPromise = db.query(`
          SELECT 
            gmail_thread_id as id,
            gmail_thread_id as thread_id,
            COUNT(*) as message_count,
            MAX(received_at) as date,
            (array_agg(subject ORDER BY received_at DESC))[1] as subject,
            (array_agg(from_email ORDER BY received_at DESC))[1] as "from",
            (array_agg(from_name ORDER BY received_at DESC))[1] as from_name,
            (array_agg(snippet ORDER BY received_at DESC))[1] as snippet,
            (array_agg(gmail_message_id ORDER BY received_at DESC))[1] as latest_message_id,
            bool_or(NOT is_read) as "hasUnread",
            bool_or(is_starred) as "isStarred",
            array_agg(DISTINCT from_name) as participants,
            array_agg(DISTINCT l) as labels
          FROM gmail_messages, unnest(label_ids) l
          WHERE user_email = $1
            AND (subject ILIKE $2 OR from_email ILIKE $2 OR to_emails @> ARRAY[$3] OR body_text ILIKE $2 OR snippet ILIKE $2)
          GROUP BY gmail_thread_id
          ORDER BY date DESC
          LIMIT $4 OFFSET $5
        `, [userEmail, searchPattern, search, limit, offset]);

        countPromise = db.query(`
          SELECT COUNT(DISTINCT gmail_thread_id) as total_count, 0 as unread_count
          FROM gmail_messages
          WHERE user_email = $1
            AND (subject ILIKE $2 OR from_email ILIKE $2 OR to_emails @> ARRAY[$3] OR body_text ILIKE $2 OR snippet ILIKE $2)
        `, [userEmail, searchPattern, search]);
      } else {
        emailsPromise = db.query(`
          SELECT 
            gmail_message_id as id,
            gmail_thread_id as thread_id,
            subject,
            from_email as from,
            to_emails as "toEmails",
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
            AND (subject ILIKE $2 OR from_email ILIKE $2 OR to_emails @> ARRAY[$3] OR body_text ILIKE $2 OR snippet ILIKE $2)
          ORDER BY received_at DESC
          LIMIT $4 OFFSET $5
        `, [userEmail, searchPattern, search, limit, offset]);

        countPromise = db.query(`
          SELECT COUNT(*) as total_count, 0 as unread_count
          FROM gmail_messages
          WHERE user_email = $1
            AND (subject ILIKE $2 OR from_email ILIKE $2 OR to_emails @> ARRAY[$3] OR body_text ILIKE $2 OR snippet ILIKE $2)
        `, [userEmail, searchPattern, search]);
      }
    } else {
      countPromise = db.query(`
        SELECT total_count, unread_count 
        FROM gmail_label_counts
        WHERE user_email = $1 AND label_id = $2
      `, [userEmail, labelId]);

      if (view === 'threads') {
        emailsPromise = db.query(`
          SELECT 
            gm.gmail_thread_id as id,
            gm.gmail_thread_id as thread_id,
            COUNT(*) as message_count,
            MAX(gm.received_at) as date,
            (array_agg(gm.subject ORDER BY gm.received_at DESC))[1] as subject,
            (array_agg(gm.from_email ORDER BY gm.received_at DESC))[1] as "from",
            (array_agg(gm.from_name ORDER BY gm.received_at DESC))[1] as from_name,
            (array_agg(gm.snippet ORDER BY gm.received_at DESC))[1] as snippet,
            (array_agg(gm.gmail_message_id ORDER BY gm.received_at DESC))[1] as latest_message_id,
            bool_or(NOT gm.is_read) as "hasUnread",
            bool_or(gm.is_starred) as "isStarred",
            array_agg(DISTINCT gm.from_name) as participants,
            array_agg(DISTINCT l) as labels,
            bool_or(gm.has_attachments) as "hasAttachments",
            (SELECT COUNT(*) FROM drive_files df WHERE df.gmail_message_id = ANY(array_agg(gm.gmail_message_id))) as drive_files_count
          FROM gmail_messages gm,
          unnest(gm.label_ids) l
          WHERE gm.user_email = $1
            ${labelId === 'archive' ? 'AND NOT (gm.label_ids @> ARRAY[\'INBOX\'] OR gm.label_ids @> ARRAY[\'TRASH\'] OR gm.label_ids @> ARRAY[\'SPAM\'])' : 'AND gm.label_ids @> ARRAY[$2]'}
          GROUP BY gm.gmail_thread_id
          ORDER BY date DESC
          LIMIT $3 OFFSET $4
        `, labelId === 'archive' ? [userEmail, limit, offset] : [userEmail, labelId, limit, offset]);
      } else {
        emailsPromise = db.query(`
          SELECT 
            gm.gmail_message_id as id,
            gm.gmail_thread_id as thread_id,
            gm.subject,
            gm.from_email as from,
            gm.to_emails as "toEmails",
            gm.snippet,
            gm.received_at as date,
            gm.is_read as "isRead",
            gm.is_starred as "isStarred",
            gm.has_attachments as "hasAttachments",
            gm.label_ids as labels,
            gm.ai_intent,
            gm.ai_priority,
            gm.ai_summary,
            gm.body_text as body,
            (SELECT COUNT(*) FROM drive_files df WHERE df.gmail_message_id = gm.gmail_message_id) as drive_files_count
          FROM gmail_messages gm
          WHERE gm.user_email = $1
          ${labelId === 'archive' ? 'AND NOT (gm.label_ids @> ARRAY[\'INBOX\'] OR gm.label_ids @> ARRAY[\'TRASH\'] OR gm.label_ids @> ARRAY[\'SPAM\'])' : 'AND gm.label_ids @> ARRAY[$2]'}
          ORDER BY gm.received_at DESC
          LIMIT $3 OFFSET $4
        `, labelId === 'archive' ? [userEmail, limit, offset] : [userEmail, labelId, limit, offset]);
      }
    }

    const syncStatePromise = db.query(`
      SELECT sync_status, synced_messages, total_messages, last_full_sync
      FROM gmail_sync_state
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [userEmail]);

    const labelsPromise = (async () => {
      try {
        const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
        const token = await getValidToken(user.id, userEmail);
        if (token) {
          const gmail = await getGmailClient(token);
          const { data } = await gmail.users.labels.list({ userId: 'me' });
          const labels = data.labels || [];
          
          return labels
            .filter((l: any) => l.type === 'user' || l.id.startsWith('Label_'))
            .map((l: any) => ({
              id: l.id,
              name: l.name,
              color: l.color?.backgroundColor || undefined,
              type: l.type
            }));
        }
      } catch (e) {
        console.error("Failed to fetch labels", e);
      }
      return [];
    })();

    const dbLabelsPromise = (async () => {
      try {
        const { getLabels } = await import("@/app/actions/labels");
        const res = await getLabels();
        return res.success ? (res.data || []) : [];
      } catch (e) {
        console.error("Failed to fetch DB labels", e);
        return [];
      }
    })();

    const [countResult, emailsResult, syncStateRes, gmailLabelsRaw, dbLabels] = await Promise.all([
      countPromise,
      emailsPromise,
      syncStatePromise,
      labelsPromise,
      dbLabelsPromise
    ]);

    // Merge gmail labels with DB labels to include AI settings
    const userLabels = gmailLabelsRaw.map((gl: any) => {
      const dbl = dbLabels.find((dl: any) => dl.gmail_label_id === gl.id || dl.name === gl.name);
      return {
        ...gl,
        ai_enabled: dbl?.ai_enabled || false,
        ai_prompt: dbl?.ai_prompt || "",
        db_id: dbl?.id
      };
    });

    const totalCount = countResult.rows[0]?.total_count || 0;
    const unreadCount = countResult.rows[0]?.unread_count || 0;
    const state = syncStateRes.rows[0];

    // Lazy Trigger: If sync has never started, start it in background
    if (!state) {
      console.log(`[Gmail API] No sync state for ${userEmail}, triggering full sync for user ${user.id}...`);
      const { triggerFullSyncForUser } = await import("@/lib/gmail-sync-engine");
      await triggerFullSyncForUser(userEmail, 'INBOX', user.id); // Passing Clerk User ID
    } else if (state.sync_status === 'completed' && state.last_full_sync) {
      // If it's been more than 24 hours, maybe check if something missed? 
      // (Optional, mostly we rely on webhooks, but let's keep it robust)
      const lastSync = new Date(state.last_full_sync).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastSync < oneDayAgo) {
        const { triggerFullSyncForUser } = await import("@/lib/gmail-sync-engine");
        triggerFullSyncForUser(userEmail, 'INBOX', user.id).catch(err => console.error(err));
      }
    }

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
      sync: syncStateRes.rows[0] || { sync_status: 'pending' },
      
      // Provide dynamic stubs required by LeadsSidebar if db stats don't exist yet
      stats: {}, 
      userLabels: userLabels
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
    const { db } = await import("@/lib/db");
    const token = await getValidToken(user.id, userEmail);

    if (!token) return NextResponse.json({ error: "Not connected" }, { status: 400 });

    if (action === "emptyTrash") {
      const gmail = await getGmailClient(token);
      
      // Batch delete instead of trash.trash which might not empty it
      const trashResult = await db.query(`
        SELECT gmail_message_id 
        FROM gmail_messages
        WHERE user_email = $1
          AND label_ids @> ARRAY['TRASH']
        LIMIT 500
      `, [userEmail]);
      const ids = trashResult.rows.map((r: any) => r.gmail_message_id);

      if (ids.length) {
        await gmail.users.messages.batchDelete({
          userId: "me",
          requestBody: {
            ids
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
    const { db } = await import("@/lib/db");
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
      // Immediate local DB update for better UX
      await db.query(`
        UPDATE gmail_messages
        SET 
          is_starred = true,
          label_ids = CASE 
            WHEN NOT (label_ids @> ARRAY['STARRED'])
            THEN array_append(label_ids, 'STARRED')
            ELSE label_ids
          END,
          synced_at = NOW()
        WHERE user_email = $1 
        AND gmail_message_id = $2
      `, [userEmail, messageId]);
      
      const { refreshLabelCounts } = await import("@/lib/gmail-sync-engine");
      await refreshLabelCounts(userEmail);
    } else if (action === "unstar") {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["STARRED"],
        },
      });
      // Immediate local DB update
      await db.query(`
        UPDATE gmail_messages
        SET 
          is_starred = false,
          label_ids = array_remove(label_ids, 'STARRED'),
          synced_at = NOW()
        WHERE user_email = $1 
        AND gmail_message_id = $2
      `, [userEmail, messageId]);

      const { refreshLabelCounts } = await import("@/lib/gmail-sync-engine");
      await refreshLabelCounts(userEmail);
    }
    else if (action === "trash") {
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
      const trashResult = await db.query(`
        SELECT gmail_message_id 
        FROM gmail_messages
        WHERE user_email = $1
          AND label_ids @> ARRAY['TRASH']
        LIMIT 500
      `, [userEmail]);
      
      const ids = trashResult.rows.map((r: any) => r.gmail_message_id);
      if (ids.length > 0) {
        // PERMANENT DELETE (Batch)
        await gmail.users.messages.batchDelete({
          userId: "me",
          requestBody: {
            ids
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
  try {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { messageId, attachmentId, action, ids, labelName } = body;

    const { db } = await import("@/lib/db");
    const { getValidToken, getGmailClient } = (await import("@/lib/google")) as any;
    
    // Get user email
    const linkedToken = await db.query('SELECT user_email FROM google_tokens WHERE user_id = $1 LIMIT 1', [user.id]);
    const userEmail = linkedToken.rows[0]?.user_email || user.emailAddresses[0]?.emailAddress;
    const token = await getValidToken(user.id, userEmail);
    if (!token) return new Response("Google not connected", { status: 400 });

    const gmail = await getGmailClient(token);

    // CASE 1: BULK ACTIONS
    if (action && ids && Array.isArray(ids)) {
      const addLabelIds: string[] = [];
      const removeLabelIds: string[] = [];

      if (action === "archive") {
        removeLabelIds.push("INBOX");
      } else if (action === "trash") {
        await Promise.all(ids.map(id => gmail.users.messages.trash({ userId: "me", id })));
      } else if (action === "read") {
        removeLabelIds.push("UNREAD");
      } else if (action === "unread") {
        addLabelIds.push("UNREAD");
      } else if (action === "addLabel" && labelName) {
        addLabelIds.push(labelName);
      }

      if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
        await gmail.users.messages.batchModify({
          userId: "me",
          requestBody: { ids, addLabelIds, removeLabelIds }
        });
      }

      // Local DB Sync
      if (action === "archive") {
         await db.query(`UPDATE gmail_messages SET label_ids = array_remove(label_ids, 'INBOX') WHERE user_email = $1 AND gmail_message_id = ANY($2)`, [userEmail, ids]);
      } else if (action === "trash") {
         await db.query(`UPDATE gmail_messages SET label_ids = array_append(label_ids, 'TRASH') WHERE user_email = $1 AND gmail_message_id = ANY($2)`, [userEmail, ids]);
      } else if (action === "read") {
         await db.query(`UPDATE gmail_messages SET is_read = true, label_ids = array_remove(label_ids, 'UNREAD') WHERE user_email = $1 AND gmail_message_id = ANY($2)`, [userEmail, ids]);
      } else if (action === "unread") {
         await db.query(`UPDATE gmail_messages SET is_read = false, label_ids = array_append(label_ids, 'UNREAD') WHERE user_email = $1 AND gmail_message_id = ANY($2)`, [userEmail, ids]);
      }

      return NextResponse.json({ success: true, count: ids.length });
    }

    // CASE 2: ATTACHMENT DOWNLOAD
    if (attachmentId && messageId) {
      const attRes = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
      });

      const data = attRes.data.data;
      if (!data) throw new Error("No data");

      const safeData = data && typeof data === "string" ? data : "";
      const buffer = Buffer.from(safeData.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      return new Response(buffer);
    }

    return new Response("Invalid request", { status: 400 });
  } catch (error: any) {
    console.error("POST Error:", error);
    return new Response(error.message, { status: 500 });
  }
}
