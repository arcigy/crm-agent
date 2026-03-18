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
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', gln.label_id,
                  'name', gln.label_name,
                  'colorBg', gln.color_bg,
                  'colorText', gln.color_text,
                  'type', gln.label_type
                ))
                FROM gmail_label_names gln
                WHERE gln.user_email = gm.user_email
                AND gln.label_id = ANY(array_agg(DISTINCT l))
              ),
              '[]'
            ) as labels,
            bool_or(gm.has_attachments) as "hasAttachments"
          FROM gmail_messages gm, unnest(gm.label_ids) l
          WHERE gm.user_email = $1
            AND (gm.subject ILIKE $2 OR gm.from_email ILIKE $2 OR gm.to_emails @> ARRAY[$3] OR gm.body_text ILIKE $2 OR gm.snippet ILIKE $2)
          GROUP BY gm.gmail_thread_id
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
            gm.ai_intent,
            gm.ai_priority,
            gm.ai_summary,
            gm.body_text as body,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', gln.label_id,
                  'name', gln.label_name,
                  'colorBg', gln.color_bg,
                  'colorText', gln.color_text,
                  'type', gln.label_type
                ))
                FROM gmail_label_names gln
                WHERE gln.user_email = gm.user_email
                AND gln.label_id = ANY(gm.label_ids)
              ),
              '[]'
            ) as labels
          FROM gmail_messages gm
          WHERE gm.user_email = $1
            AND (gm.subject ILIKE $2 OR gm.from_email ILIKE $2 OR gm.to_emails @> ARRAY[$3] OR gm.body_text ILIKE $2 OR gm.snippet ILIKE $2)
          ORDER BY gm.received_at DESC
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
            bool_or(gm.has_attachments) as "hasAttachments",
            (SELECT COUNT(*) FROM drive_files df WHERE df.gmail_message_id = ANY(array_agg(gm.gmail_message_id))) as drive_files_count,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', gln.label_id,
                  'name', gln.label_name,
                  'colorBg', gln.color_bg,
                  'colorText', gln.color_text,
                  'type', gln.label_type
                ))
                FROM gmail_label_names gln
                WHERE gln.user_email = gm.user_email
                AND gln.label_id = ANY(array_agg(DISTINCT l))
              ),
              '[]'
            ) as labels
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
            gm.ai_intent,
            gm.ai_priority,
            gm.ai_summary,
            gm.body_text as body,
            (SELECT COUNT(*) FROM drive_files df WHERE df.gmail_message_id = gm.gmail_message_id) as drive_files_count,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', gln.label_id,
                  'name', gln.label_name,
                  'colorBg', gln.color_bg,
                  'colorText', gln.color_text,
                  'type', gln.label_type
                ))
                FROM gmail_label_names gln
                WHERE gln.user_email = gm.user_email
                AND gln.label_id = ANY(gm.label_ids)
              ),
              '[]'
            ) as labels
          FROM gmail_messages gm
          WHERE gm.user_email = $1
          ${labelId === 'archive' ? 'AND NOT (gm.label_ids @> ARRAY[\'INBOX\'] OR gm.label_ids @> ARRAY[\'TRASH\'] OR gm.label_ids @> ARRAY[\'SPAM\'])' : 'AND gm.label_ids @> ARRAY[$2]'}
          ORDER BY gm.received_at DESC
          LIMIT $3 OFFSET $4
        `, labelId === 'archive' ? [userEmail, limit, offset] : [userEmail, labelId, limit, offset]);
      }
    }

    // NEW: Labels Endpoint for Sidebar
    if (searchParams.get("action") === "getLabels") {
      const { syncGmailLabels, ensureLabelTable } = await import("@/lib/gmail-labels");
      await ensureLabelTable();
      
      const res = await db.query(`
        SELECT label_id as id, label_name as name, color_bg, color_text, label_type as type
        FROM gmail_label_names
        WHERE user_email = $1
        ORDER BY label_type ASC, label_name ASC
      `, [userEmail]);

      if (res.rows.length === 0) {
        // First sync
        await syncGmailLabels(userEmail, user.id).catch(e => console.error(e));
        const res2 = await db.query(`
          SELECT label_id as id, label_name as name, color_bg, color_text, label_type as type
          FROM gmail_label_names
          WHERE user_email = $1
          ORDER BY label_type ASC, label_name ASC
        `, [userEmail]);
        return NextResponse.json({ labels: res2.rows });
      }

      return NextResponse.json({ labels: res.rows });
    }

    const syncStatePromise = db.query(`
      SELECT sync_status, synced_messages, total_messages, last_full_sync
      FROM gmail_sync_state
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [userEmail]);

    // Read labels from DB
    const labelsPromise = db.query(`
      SELECT label_id as id, label_name as name, color_bg as color, label_type as type
      FROM gmail_label_names
      WHERE user_email = $1
        AND label_type = 'user'
      ORDER BY label_name
    `, [userEmail]).catch(() => ({ rows: [] }));

    // Run parallel queries
    const [countResult, emailsResult, syncStateRes, labelRows] = await Promise.all([
      countPromise,
      emailsPromise,
      syncStatePromise,
      labelsPromise
    ]);

    // Build userLabels from DB rows
    const userLabels = (labelRows.rows || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      color: l.color || undefined,
      type: l.type || 'user'
    }));

    const totalCount = countResult.rows[0]?.total_count || 0;
    const unreadCount = countResult.rows[0]?.unread_count || 0;
    const state = syncStateRes.rows[0];

    // Lazy Trigger: fire-and-forget — NEVER block the response
    if (!state) {
      console.log(`[Gmail API] No sync state for ${userEmail}, triggering background sync...`);
      import("@/lib/gmail-sync-engine").then(({ triggerFullSyncForUser }) => {
        triggerFullSyncForUser(userEmail, 'INBOX', user.id).catch(err => console.error(err));
      });
    } else if (state.sync_status === 'completed' && state.last_full_sync) {
      const lastSync = new Date(state.last_full_sync).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastSync < oneDayAgo) {
        import("@/lib/gmail-sync-engine").then(({ triggerFullSyncForUser }) => {
          triggerFullSyncForUser(userEmail, 'INBOX', user.id).catch(err => console.error(err));
        });
      }
    }

    // Format for existing Frontend component compatibility
    const formattedEmails = emailsResult.rows.map((row: any) => {
      // Handle isRead for both views:
      // - Thread view: SQL returns `hasUnread` (bool_or(NOT is_read)), so isRead = !hasUnread
      // - Message view: SQL returns `is_read as "isRead"`, but pg driver may return lowercase `isread`
      let isRead: boolean;
      if ('hasUnread' in row) {
        // Thread view
        isRead = !row.hasUnread;
      } else {
        // Message view — handle both camelCase and lowercase from pg driver
        const rawIsRead = row.isRead ?? row.isread ?? row.is_read;
        isRead = rawIsRead === true || rawIsRead === 't' || rawIsRead === 'true';
      }

      return {
        ...row,
        isRead,
        googleLabels: row.labels,
        to: row.to_emails?.join(', ') || '',
        classification: row.ai_intent ? {
          intent: row.ai_intent,
          priority: row.ai_priority,
          summary: row.ai_summary
        } : undefined
      };
    });

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
