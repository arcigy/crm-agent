import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { google } from "googleapis";
import { getValidToken } from "@/lib/google";
import { processNewEmail, checkActivityExists } from "@/lib/gmail-processor";

export const dynamic = "force-dynamic";

/**
 * Fallback Cron: Runs every 30 minutes to classify emails missed by the webhook.
 */
export async function GET(request: Request) {
  // 1. Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Gmail Cron] Starting fallback classification...');
  
  try {
    // 2. Get all users with Google tokens
    const allUsers = await directus.request(
      readItems('google_tokens', {
        filter: { 
          _and: [
            { refresh_token: { _nnull: true } },
            { email: { _nnull: true } }
          ]
        },
        fields: ['email', 'user_id', 'last_gmail_history_id']
      })
    ) as any[];

    const results = { processed: 0, failed: 0, skipped: 0 };

    for (const user of allUsers) {
      try {
        // Check if there are emails newer than last full sync
        // that haven't been added to gmail_messages yet
        const { db } = await import("@/lib/db");
        const { performIncrementalSync } = await import("@/lib/gmail-sync-engine");
        
        // Get sync state for this user
        const syncState = await db.query(`
          SELECT history_id FROM gmail_sync_state
          WHERE user_email = $1 AND label_id = 'INBOX'
        `, [user.email]);
        
        if (syncState.rows[0]?.history_id) {
          // Fetch new messages since last known historyId
          await performIncrementalSync(user.email, syncState.rows[0].history_id);
        }
      } catch (err) {
        console.error(`[Classify Cron] Sync error for ${user.email}:`, err);
        // Continue to next user
      }

      try {
        await processUnclassifiedEmailsForUser(user.email, results);
      } catch (err) {
        console.error(`[Gmail Cron] Failed for user ${user.email}:`, err);
        results.failed++;
      }
    }

    console.log('[Gmail Cron] Complete:', results);
    return NextResponse.json({ success: true, ...results });

  } catch (err) {
    console.error('[Gmail Cron] Fatal error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function processUnclassifiedEmailsForUser(
  userEmail: string,
  results: any
) {
  console.log(`[Gmail Cron] Checking for ${userEmail}...`);
  
  const token = await getValidToken("", userEmail); // userId empty will use email to find in DB
  if (!token || typeof token === "string") {
    console.warn(`[Gmail Cron] Auth failed for ${userEmail}`);
    return;
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials(token);
  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch last 50 emails from inbox to check for misses
  const messages = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults: 50
  });

  if (!messages.data.messages?.length) return;

  for (const msg of messages.data.messages) {
    if (!msg.id) continue;

    // Check if already processed
    const existing = await checkActivityExists(msg.id);
    if (existing) {
      results.skipped++;
      continue;
    }

    // Process unclassified email
    await processNewEmail(msg.id, userEmail, gmail);
    results.processed++;

    // Small delay between AI calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
