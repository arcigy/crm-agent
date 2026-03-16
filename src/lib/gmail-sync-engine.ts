import { db } from "./db";
import { getValidToken, getGmailClient } from "./google";
import { classifyEmail } from "@/app/actions/ai";
import { applyAILabelToGmail } from "@/lib/gmail-processor";

const BATCH_SIZE = 100;        // Gmail API max per request
const DETAIL_BATCH_SIZE = 50;  // Parallel detail fetches
const RATE_LIMIT_DELAY = 100;  // ms between batch requests
const MAX_RETRIES = 3;
const QUOTA_LIMIT_PER_SECOND = 200; // conservative

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

async function getClientForUser(userEmail: string) {
  const token = await getValidToken("", userEmail);
  if (!token) throw new Error(`No valid Google token found for ${userEmail}`);
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

async function refreshLabelCounts(userEmail: string) {
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

export async function triggerFullSyncForUser(userEmail: string, labelId: string = 'INBOX') {
  // 1. Initialize sync state synchronously to ensure it exists
  await updateSyncState(userEmail, labelId, { 
    sync_status: 'syncing',
    last_full_sync: new Date().toISOString(),
    synced_messages: 0,
    total_messages: 0
  });

  // 2. Run the actual work in background
  performFullSync(userEmail, labelId).catch(err => {
    console.error(`[Gmail Sync] Full sync background worker error for ${userEmail}:`, err);
  });
}

export async function performFullSync(
  userEmail: string,
  labelId: string = 'INBOX'
): Promise<SyncResult> {
  console.log(`[Gmail Sync] performFullSync called for ${userEmail} / ${labelId}`);
  
  const gmail = await getClientForUser(userEmail);
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
  const syncState = await getSyncState(userEmail, 'INBOX');
  
  if (!syncState?.history_id) {
    await triggerFullSyncForUser(userEmail);
    return;
  }

  try {
    await trackQuota(2);
    const history = await retryWithBackoff(() =>
      gmail.users.history.list({
        userId: 'me',
        startHistoryId: syncState.history_id!,
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved']
      })
    );

    if (!history.data.history?.length) {
      await updateSyncState(userEmail, 'INBOX', { 
        history_id: historyId,
        last_incremental: new Date().toISOString()
      });
      return;
    }

    for (const event of history.data.history) {
      if (event.messagesAdded) {
        const newIds = event.messagesAdded
          .map(m => m.message?.id)
          .filter(Boolean) as string[];
          
        await trackQuota(5 * newIds.length);
        const details = await Promise.allSettled(
          newIds.map(id => gmail.users.messages.get({
            userId: 'me', id, format: 'full'
          }))
        );
        
        const rows = details
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => parseGmailMessage((r as PromiseFulfilledResult<any>).value.data, userEmail));
          
        await upsertMessageBatch(rows);
      }

      if (event.messagesDeleted) {
        const deletedIds = event.messagesDeleted
          .map(m => m.message?.id)
          .filter(Boolean);
          
        if (deletedIds.length) {
          await db.query(`
            DELETE FROM gmail_messages
            WHERE user_email = $1 
            AND gmail_message_id = ANY($2)
          `, [userEmail, deletedIds]);
        }
      }

      if (event.labelsAdded || event.labelsRemoved) {
        const allChanges = [
          ...(event.labelsAdded || []),
          ...(event.labelsRemoved || [])
        ];
        
        for (const change of allChanges) {
          if (!change.message?.id) continue;
          
          await trackQuota(5);
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: change.message.id,
            fields: 'id,labelIds'
          });
          
          await db.query(`
            UPDATE gmail_messages
            SET 
              label_ids = $1,
              is_read = NOT ($1::text[] @> ARRAY['UNREAD']),
              is_starred = ($1::text[] @> ARRAY['STARRED']),
              synced_at = NOW()
            WHERE user_email = $2 
            AND gmail_message_id = $3
          `, [msg.data.labelIds || [], userEmail, change.message.id]);
        }
      }
    }

    await updateSyncState(userEmail, 'INBOX', {
      history_id: historyId,
      last_incremental: new Date().toISOString()
    });
    
    await refreshLabelCounts(userEmail);

  } catch (err: any) {
    if (err?.status === 410 || err?.code === 410) {
      console.warn('[Gmail Sync] historyId expired, triggering full resync');
      await triggerFullSyncForUser(userEmail);
    } else {
      throw err;
    }
  }
}
