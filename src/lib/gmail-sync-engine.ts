import { db } from "./db";
import { getValidToken, getGmailClient } from "./google";

const BATCH_SIZE = 100;        // Gmail API max per request
const DETAIL_BATCH_SIZE = 50;  // Parallel detail fetches
const RATE_LIMIT_DELAY = 250;  // ms between batch requests (increased for safety)
const MAX_RETRIES = 3;
const QUOTA_LIMIT_PER_SECOND = 100; // conservative (lowered from 200)

let quotaUsed = 0;

export interface SyncResult {
  success: boolean;
  synced: number;
  total: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function trackQuota(units: number) {
  quotaUsed += units;
  if (quotaUsed >= QUOTA_LIMIT_PER_SECOND) {
    await sleep(1000);
    quotaUsed = 0;
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || 
                          err?.code === 429 ||
                          err?.message?.includes('quota');
      
      if (isRateLimit && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[Gmail Sync] Rate limited, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function getClientForUser(userEmail: string, clerkUserId: string = "") {
  let finalUserId = clerkUserId;
  
  if (!finalUserId || finalUserId === "") {
    // Try to find the correct user_id from google_tokens table
    const userRes = await db.query(
      'SELECT user_id FROM google_tokens WHERE user_email = $1 LIMIT 1',
      [userEmail.toLowerCase()]
    );
    finalUserId = userRes.rows[0]?.user_id || "";
  }

  console.log(`[getClientForUser] Fetching token for ${userEmail} (ID: ${finalUserId})...`);
  const token = await getValidToken(finalUserId, userEmail);
  if (!token) {
    console.error(`[getClientForUser] FAILED to get token for ${userEmail}`);
    throw new Error(`No valid Google token found for ${userEmail}`);
  }
  console.log(`[getClientForUser] SUCCESS: Got token for ${userEmail}`);
  return getGmailClient(token);
}

async function updateSyncState(userEmail: string, labelId: string, data: any) {
  const fields = Object.keys(data).map((k, i) => `${k} = $${i + 3}`).join(", ");
  const values = Object.values(data);
  
  await db.query(`
    INSERT INTO gmail_sync_state (user_email, label_id, ${Object.keys(data).join(', ')})
    VALUES ($1, $2, ${values.map((_, i) => `$${i + 3}`).join(', ')})
    ON CONFLICT (user_email, label_id)
    DO UPDATE SET ${fields}
  `, [userEmail, labelId, ...values]);
}

async function getSyncState(userEmail: string, labelId: string) {
  const res = await db.query(`
    SELECT * FROM gmail_sync_state 
    WHERE user_email = $1 AND label_id = $2
  `, [userEmail, labelId]);
  return res.rows[0];
}

async function getExistingMessageIds(userEmail: string, messageIds: string[]) {
  if (!messageIds.length) return new Set<string>();
  const res = await db.query(`
    SELECT gmail_message_id FROM gmail_messages
    WHERE user_email = $1 AND gmail_message_id = ANY($2)
  `, [userEmail, messageIds]);
  return new Set<string>(res.rows.map(r => r.gmail_message_id));
}

function hasAttachments(payload: any): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0) return true;
  if (payload.parts) {
    return payload.parts.some((part: any) => hasAttachments(part));
  }
  return false;
}

function extractBody(payload: any, mimeType: string): string | null {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part, mimeType);
      if (result) return result;
    }
  }
  return null;
}

function parseGmailMessage(msg: any, userEmail: string) {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');
  const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/) || [null, fromRaw, fromRaw];

  const internalDate = parseInt(msg.internalDate);
  const isRecent = Date.now() - internalDate < 90 * 24 * 60 * 60 * 1000; // 90 days

  return {
    user_email: userEmail,
    gmail_message_id: msg.id,
    gmail_thread_id: msg.threadId,
    subject: getHeader('Subject') || '(no subject)',
    from_email: fromMatch[2]?.trim() || fromRaw,
    from_name: fromMatch[1]?.trim().replace(/"/g, '') || fromRaw,
    to_emails: getHeader('To').split(',').map((e: string) => e.trim()).filter(Boolean),
    cc_emails: getHeader('Cc').split(',').map((e: string) => e.trim()).filter(Boolean),
    snippet: msg.snippet || '',
    body_text: isRecent ? extractBody(msg.payload, 'text/plain') : null,
    body_html: null, // Never store HTML to save DB space
    received_at: new Date(internalDate).toISOString(),
    is_read: !msg.labelIds?.includes('UNREAD'),
    is_starred: msg.labelIds?.includes('STARRED') || false,
    is_important: msg.labelIds?.includes('IMPORTANT') || false,
    has_attachments: hasAttachments(msg.payload),
    label_ids: msg.labelIds || [],
    size_estimate: msg.sizeEstimate || 0,
  };
}

async function upsertMessageBatch(rows: any[]) {
  if (!rows.length) return;
  
  await db.query(`
    INSERT INTO gmail_messages (
      user_email, gmail_message_id, gmail_thread_id,
      subject, from_email, from_name, to_emails, cc_emails,
      snippet, body_text, body_html, received_at,
      is_read, is_starred, is_important, has_attachments,
      label_ids, size_estimate, synced_at
    )
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS t(
      user_email text, gmail_message_id text, gmail_thread_id text,
      subject text, from_email text, from_name text, 
      to_emails text[], cc_emails text[],
      snippet text, body_text text, body_html text, received_at timestamptz,
      is_read bool, is_starred bool, is_important bool, has_attachments bool,
      label_ids text[], size_estimate int, synced_at timestamptz
    )
    ON CONFLICT (user_email, gmail_message_id) 
    DO UPDATE SET
      is_read = EXCLUDED.is_read,
      is_starred = EXCLUDED.is_starred,
      label_ids = EXCLUDED.label_ids,
      synced_at = NOW()
  `, [JSON.stringify(rows.map(r => ({ ...r, synced_at: new Date().toISOString() })))]);
}

export async function refreshLabelCounts(userEmail: string) {
  await db.query(`
    INSERT INTO gmail_label_counts (user_email, label_id, total_count, unread_count, updated_at)
    SELECT 
      user_email,
      unnest(label_ids) as label_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE is_read = false) as unread_count,
      NOW()
    FROM gmail_messages
    WHERE user_email = $1
    GROUP BY user_email, unnest(label_ids)
    ON CONFLICT (user_email, label_id)
    DO UPDATE SET
      total_count = EXCLUDED.total_count,
      unread_count = EXCLUDED.unread_count,
      updated_at = NOW()
  `, [userEmail]);
}

export async function triggerFullSyncForUser(
  userEmail: string,
  labelId: string = 'INBOX',
  clerkUserId: string = ""
) {
  const LABELS_TO_SYNC = ['INBOX', 'SENT', 'STARRED', 'TRASH', 'SPAM', 'DRAFT'];

  // If we are triggering for INBOX (default), we want to ensure all core labels are synced
  if (labelId === 'INBOX') {
    // RUN SEQUENTIALLY to avoid hitting per-user quotas
    (async () => {
      console.log(`[Gmail Sync] Starting sequential full sync for ${userEmail}`);
      for (const lid of LABELS_TO_SYNC) {
        try {
          await updateSyncState(userEmail, lid, { 
            sync_status: 'syncing',
            last_full_sync: new Date().toISOString(),
            synced_messages: 0,
            total_messages: 0
          });
          
          await performFullSync(userEmail, lid, clerkUserId);
        } catch (err) {
          console.error(`[Gmail Sync] Sequential sync worker error for ${userEmail} (${lid}):`, err);
        }
      }
      console.log(`[Gmail Sync] Sequential full sync finished for ${userEmail}`);
    })();
  } else {
    // Single label trigger
    (async () => {
      try {
        await updateSyncState(userEmail, labelId, { 
          sync_status: 'syncing',
          last_full_sync: new Date().toISOString(),
          synced_messages: 0,
          total_messages: 0
        });

        await performFullSync(userEmail, labelId, clerkUserId);
      } catch (err) {
        console.error(`[Gmail Sync] Single sync background worker error for ${userEmail} (${labelId}):`, err);
      }
    })();
  }
}

export async function performFullSync(
  userEmail: string,
  labelId: string = 'INBOX',
  clerkUserId: string = ""
): Promise<SyncResult> {
  console.log(`[Gmail Sync] performFullSync called for ${userEmail} (ID: ${clerkUserId}) / ${labelId}`);
  
  const gmail = await getClientForUser(userEmail, clerkUserId);
  console.log(`[Gmail Sync] Got Gmail client for ${userEmail}`);
  let pageToken: string | undefined;
  let totalSynced = 0;
  let totalMessages = 0;

  try {
    do {
      await trackQuota(5);
      const listResponse = await retryWithBackoff(() =>
        gmail.users.messages.list({
          userId: 'me',
          labelIds: [labelId],
          maxResults: BATCH_SIZE,
          pageToken,
          fields: 'messages(id,threadId),nextPageToken,resultSizeEstimate'
        })
      );

      const messages = listResponse.data.messages || [];
      totalMessages = listResponse.data.resultSizeEstimate || 0;
      pageToken = listResponse.data.nextPageToken || undefined;

      console.log(`[Gmail Sync] Found ${messages.length} messages on current page. Total estimate: ${totalMessages}`);

      if (!messages.length) break;

      const messageIds = messages.map(m => m.id!);
      const existingIds = await getExistingMessageIds(userEmail, messageIds);
      const newIds = messageIds.filter(id => !existingIds.has(id));

      console.log(`[Gmail Sync] Page: ${messages.length} messages, ${newIds.length} new`);

      for (let i = 0; i < newIds.length; i += DETAIL_BATCH_SIZE) {
        const batchIds = newIds.slice(i, i + DETAIL_BATCH_SIZE);
        
        await trackQuota(5 * batchIds.length);
        const details = await Promise.allSettled(
          batchIds.map(id => 
            retryWithBackoff(() =>
              gmail.users.messages.get({
                userId: 'me',
                id,
                format: 'full',
                fields: 'id,threadId,labelIds,snippet,sizeEstimate,payload,internalDate,historyId'
              })
            )
          )
        );

        // Capture history_id from the first (most recent) message in the first batch
        if (!totalSynced && details[0]?.status === 'fulfilled') {
          const firstMsg = (details[0] as PromiseFulfilledResult<any>).value.data;
          await updateSyncState(userEmail, labelId, { history_id: firstMsg.historyId });
        }

        const rows = details
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => {
            try {
              return parseGmailMessage((r as PromiseFulfilledResult<any>).value.data, userEmail);
            } catch (e) {
              console.error(`[Gmail Sync] Failed to parse message:`, e);
              return null;
            }
          })
          .filter((r): r is any => r !== null);

        await upsertMessageBatch(rows);
        // Trigger AI categorization for newly ingested messages
        runAiLabelingForMessages(userEmail, rows).catch(e => console.error("AI tagging error (background):", e));
        totalSynced += rows.length;

        await sleep(RATE_LIMIT_DELAY);
      }

      await updateSyncState(userEmail, labelId, {
        synced_messages: totalSynced,
        total_messages: totalMessages
      });

      if (pageToken) await sleep(RATE_LIMIT_DELAY * 2);

    } while (pageToken);

    await updateSyncState(userEmail, labelId, {
      sync_status: 'completed',
      synced_messages: totalSynced,
      total_messages: totalMessages
    });

    await refreshLabelCounts(userEmail);

    console.log(`[Gmail Sync] Complete: ${totalSynced} messages synced`);
    return { success: true, synced: totalSynced, total: totalMessages };

  } catch (error) {
    await updateSyncState(userEmail, labelId, { sync_status: 'error' });
    throw error;
  }
}

export async function performIncrementalSync(
  userEmail: string,
  historyId: string
): Promise<void> {
  const gmail = await getClientForUser(userEmail);
  
  const syncState = await db.query(`
    SELECT history_id FROM gmail_sync_state
    WHERE user_email = $1 AND label_id = 'INBOX'
  `, [userEmail]);
  
  const startHistoryId = syncState.rows[0]?.history_id;
  if (!startHistoryId) return;
  
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: startHistoryId,
    historyTypes: [
      'messageAdded',
      'messageDeleted',
      'labelAdded',
      'labelRemoved'
    ]
  });
  
  const history = historyRes.data.history || [];
  
  for (const record of history) {
    
    // NEW EMAILS
    if (record.messagesAdded) {
      const { processNewEmail } = await import("./gmail-processor");
      for (const item of record.messagesAdded) {
        const msgId = item.message?.id;
        if (!msgId) continue;
        const existing = await db.query(
          'SELECT id FROM gmail_messages WHERE gmail_message_id = $1',
          [msgId]
        );
        if (existing.rows.length > 0) continue;
        await processNewEmail(msgId, userEmail, gmail);
      }
    }
    
    // DELETED EMAILS
    if (record.messagesDeleted) {
      for (const item of record.messagesDeleted) {
        const msgId = item.message?.id;
        if (!msgId) continue;
        await db.query(`
          DELETE FROM gmail_messages
          WHERE gmail_message_id = $1 AND user_email = $2
        `, [msgId, userEmail]);
      }
    }
    
    // LABELS ADDED
    if (record.labelsAdded) {
      for (const item of record.labelsAdded) {
        const msgId = item.message?.id;
        const addedLabels = item.labelIds || [];
        if (!msgId || !addedLabels.length) continue;
        await db.query(`
          UPDATE gmail_messages
          SET 
            label_ids = (
              SELECT array_agg(DISTINCT elem)
              FROM unnest(label_ids || $1::text[]) elem
            ),
            is_read = CASE 
              WHEN $1::text[] @> ARRAY['UNREAD'] THEN false
              ELSE is_read
            END,
            is_starred = CASE
              WHEN $1::text[] @> ARRAY['STARRED'] THEN true
              ELSE is_starred
            END,
            synced_at = NOW()
          WHERE gmail_message_id = $2 AND user_email = $3
        `, [addedLabels, msgId, userEmail]);
      }
    }
    
    // LABELS REMOVED
    if (record.labelsRemoved) {
      for (const item of record.labelsRemoved) {
        const msgId = item.message?.id;
        const removedLabels = item.labelIds || [];
        if (!msgId || !removedLabels.length) continue;
        await db.query(`
          UPDATE gmail_messages
          SET 
            label_ids = (
              SELECT array_agg(elem)
              FROM unnest(label_ids) elem
              WHERE elem != ALL($1::text[])
            ),
            is_read = CASE
              WHEN $1::text[] @> ARRAY['UNREAD'] THEN true
              ELSE is_read
            END,
            is_starred = CASE
              WHEN $1::text[] @> ARRAY['STARRED'] THEN false
              ELSE is_starred
            END,
            synced_at = NOW()
          WHERE gmail_message_id = $2 AND user_email = $3
        `, [removedLabels, msgId, userEmail]);
      }
    }
  }
  
  // Update history_id
  await db.query(`
    UPDATE gmail_sync_state
    SET history_id = $1, last_incremental = NOW()
    WHERE user_email = $2
  `, [historyId, userEmail]);
  
  // Refresh label counts
  await db.query(`
    INSERT INTO gmail_label_counts 
      (user_email, label_id, total_count, unread_count, updated_at)
    SELECT 
      user_email,
      unnest(label_ids) as label_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE is_read = false) as unread_count,
      NOW()
    FROM gmail_messages
    WHERE user_email = $1
    GROUP BY user_email, unnest(label_ids)
    ON CONFLICT (user_email, label_id)
    DO UPDATE SET
      total_count = EXCLUDED.total_count,
      unread_count = EXCLUDED.unread_count,
      updated_at = NOW()
  `, [userEmail]);
  
  console.log(`[Gmail Webhook] Incremental sync done for ${userEmail} @ historyId ${historyId}`);
}

/**
 * Direct polling fallback - fetches emails newer than last known email in DB
 */
export async function fetchNewEmailsForUser(userEmail: string, gmailClient?: any) {
  console.log(`[Gmail Sync] fetchNewEmailsForUser called for ${userEmail}`);
  try {
    const gmail = gmailClient || await getClientForUser(userEmail);
    
    // Get newest email we have in DB
    const lastEmail = await db.query(`
      SELECT MAX(received_at) as last_date
      FROM gmail_messages
      WHERE user_email = $1
    `, [userEmail]);
    
    const lastDate = lastEmail.rows[0]?.last_date;
    
    // Build query for emails newer than last sync
    const afterDate = lastDate 
      ? Math.floor(new Date(lastDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400; // last 24h fallback
    
    // Fetch new message IDs from Gmail
    const listResult = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterDate}`,
      maxResults: 100
    });
    
    const messages = listResult.data.messages || [];
    if (!messages.length) {
      console.log(`[Gmail Sync] No new messages found for ${userEmail} since ${lastDate || 'last 24h'}`);
      return 0;
    }
    
    console.log(`[Gmail Sync] Found ${messages.length} potential new messages for ${userEmail}`);
    
    // Process each new message
    let inserted = 0;
    const { processNewEmail } = await import("./gmail-processor");

    for (const msg of messages) {
      if (!msg.id) continue;
      const existing = await db.query(
        'SELECT gmail_message_id FROM gmail_messages WHERE gmail_message_id = $1 AND user_email = $2',
        [msg.id, userEmail]
      );
      if (existing.rows.length > 0) continue;
      
      await processNewEmail(msg.id, userEmail, gmail);
      inserted++;
      // Minimal delay to respect rate limits during polling
      await new Promise(r => setTimeout(r, 100));
    }
    
    if (inserted > 0) {
      await refreshLabelCounts(userEmail);
      await updateSyncState(userEmail, 'INBOX', {
        last_incremental: new Date().toISOString()
      });
    }

    // Always sync current drafts to ensure they are up to date
    await syncDraftsForUser(userEmail, gmail);

    console.log(`[Gmail Sync] Polling complete: ${inserted} new emails inserted for ${userEmail}`);
    return inserted;
    
  } catch (err) {
    console.error(`[Gmail Sync] fetchNewEmails error for ${userEmail}:`, err);
    throw err;
  }
}

/**
 * Specifically syncs all current drafts from Gmail
 */
export async function syncDraftsForUser(
  userEmail: string,
  gmail: any
): Promise<void> {
  console.log(`[Gmail Sync] syncDraftsForUser called for ${userEmail}`);
  try {
    // 1. Get all current draft metadata from Gmail
    const draftsResult = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: 100
    });

    const drafts = draftsResult.data.drafts || [];
    
    // 2. Fetch details to get the actual message IDs for the drafts
    const currentDraftMessageIds: string[] = [];
    for (const d of drafts) {
        if (!d.id) continue;
        const dDetail = await gmail.users.drafts.get({
            userId: 'me',
            id: d.id,
            format: 'metadata',
            fields: 'message(id)'
        });
        if (dDetail.data.message?.id) {
            currentDraftMessageIds.push(dDetail.data.message.id);
        }
    }

    // 3. Delete ALL old drafts from local DB that are no longer present in Gmail
    if (currentDraftMessageIds.length > 0) {
        await db.query(`
            DELETE FROM gmail_messages
            WHERE user_email = $1
            AND label_ids @> ARRAY['DRAFT'::text]
            AND gmail_message_id != ALL($2::text[])
        `, [userEmail, currentDraftMessageIds]);
    } else {
        // No drafts in Gmail - clear all local drafts for this user
        await db.query(`
            DELETE FROM gmail_messages
            WHERE user_email = $1
            AND label_ids @> ARRAY['DRAFT'::text]
        `, [userEmail]);
    }

    if (!drafts.length) {
      console.log(`[Gmail Sync] No drafts found in Gmail for ${userEmail}`);
      return;
    }

    console.log(`[Gmail Sync] Syncing ${drafts.length} current drafts for ${userEmail}...`);

    for (const draft of drafts) {
      if (!draft.id) continue;
      
      // Get full draft details
      const draftDetail = await gmail.users.drafts.get({
        userId: 'me',
        id: draft.id,
        format: 'full'
      });

      const message = draftDetail.data.message;
      if (!message) continue;

      // Check if already in DB
      const existing = await db.query(
        'SELECT id FROM gmail_messages WHERE gmail_message_id = $1 AND user_email = $2',
        [message.id, userEmail]
      );

      if (existing.rows.length > 0) {
        // Update existing draft (content/labels may have changed)
        await db.query(`
          UPDATE gmail_messages
          SET 
            label_ids = $1,
            synced_at = NOW()
          WHERE gmail_message_id = $2
          AND user_email = $3
        `, [message.labelIds || ['DRAFT'], message.id, userEmail]);
        continue;
      }

      // Insert new draft
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      await db.query(`
        INSERT INTO gmail_messages (
          user_email, gmail_message_id, gmail_thread_id,
          subject, from_email, snippet, received_at,
          is_read, label_ids, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (user_email, gmail_message_id) 
        DO UPDATE SET
          label_ids = EXCLUDED.label_ids,
          synced_at = NOW()
      `, [
        userEmail,
        message.id,
        message.threadId,
        getHeader('Subject') || '(no subject)',
        getHeader('From') || userEmail,
        message.snippet || '',
        new Date(parseInt(message.internalDate || '0')).toISOString(),
        true, // drafts are always "read"
        message.labelIds || ['DRAFT']
      ]);
    }

    console.log(`[Gmail Sync] Draft sync finished for ${userEmail}`);
  } catch (err) {
    console.error(`[Gmail Sync] Draft sync error for ${userEmail}:`, err);
  }
}

/**
 * Runs AI categorization for a batch of messages based on user-defined label prompts
 */
async function runAiLabelingForMessages(userEmail: string, messages: any[]) {
  try {
    const { getAiLabels } = await import("@/app/actions/labels");
    const aiLabels = await getAiLabels(userEmail);
    if (!aiLabels || aiLabels.length === 0) return;

    const { categorizeEmailByUserPrompts } = await import("@/app/actions/ai");
    const { syncMessageTagsToGmail } = await import("@/app/actions/gmail-labels");

    for (const msg of messages) {
      // Use snippet and body for analysis
      const contentToAnalyze = `${msg.subject}\n\n${msg.snippet}\n\n${msg.body_text || ""}`;
      
      const labelsToApply = await categorizeEmailByUserPrompts(
        contentToAnalyze, 
        aiLabels.map(l => ({ name: l.name, prompt: l.ai_prompt || "" }))
      );

      if (labelsToApply && labelsToApply.length > 0) {
        console.log(`[AI Labeling] Applying labels ${labelsToApply.join(", ")} to message ${msg.gmail_message_id}`);
        
        // Sync to Gmail
        await syncMessageTagsToGmail(msg.gmail_message_id, labelsToApply);
        
        // Update local DB
        await db.query(`
          UPDATE gmail_messages 
          SET label_ids = CASE 
            WHEN label_ids @> $1 THEN label_ids 
            ELSE label_ids || $1 
          END
          WHERE gmail_message_id = $2 AND user_email = $3
        `, [labelsToApply, msg.gmail_message_id, userEmail]);
      }
    }
  } catch (err) {
    console.error("[AI Labeling] Batch processing failed:", err);
  }
}

