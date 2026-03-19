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
            { user_email: { _nnull: true } }
          ]
        },
        fields: ['user_email', 'user_id', 'last_gmail_history_id']
      })
    ) as any[];

    const results = { processed: 0, failed: 0, skipped: 0 };

    for (const user of allUsers) {
      const userEmail = user.user_email || user.email;
      try {
        await fetchNewEmailsForUser(userEmail, results);
      } catch (err) {
        console.error(`[Classify Cron] Sync error for ${userEmail}:`, err);
      }

      try {
        await processUnclassifiedEmailsForUser(userEmail, results);
      } catch (err) {
        console.error(`[Gmail Cron] Failed for user ${userEmail}:`, err);
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

async function fetchNewEmailsForUser(userEmail: string, results: any) {
  try {
    const { db } = await import("@/lib/db");
    const token = await getValidToken("", userEmail);
    if (!token || typeof token === "string") return;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: 'v1', auth });
    
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
    if (!messages.length) return;
    
    console.log(`[Classify Cron] Found ${messages.length} new messages for ${userEmail}`);
    
    for (const msg of messages) {
      if (!msg.id) continue;
      const existing = await db.query(
        'SELECT gmail_message_id FROM gmail_messages WHERE gmail_message_id = $1 AND user_email = $2',
        [msg.id, userEmail]
      );
      if (existing.rows.length > 0) continue;
      
      await processNewEmail(msg.id, userEmail, gmail);
      results.processed++;
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (err) {
    console.error(`[Classify Cron] fetchNewEmails error for ${userEmail}:`, err);
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
