import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItems, updateItem } from "@directus/sdk";
import { getValidToken } from "@/lib/google";
import { google } from "googleapis";
import { processNewEmail } from "@/lib/gmail-processor";

export const dynamic = "force-dynamic";

/**
 * Handle Google Pub/Sub notifications for Gmail
 * Returns 200 immediately to avoid Pub/Sub retries
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const pubsubToken = process.env.GOOGLE_PUBSUB_TOKEN;
  
  if (!pubsubToken || authHeader !== `Bearer ${pubsubToken}`) {
    console.warn("[Gmail Webhook] Unauthorized access attempt");
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    
    if (!body.message?.data) {
      return NextResponse.json({ error: "No data" }, { status: 400 });
    }

    // Return 200 immediately
    const response = NextResponse.json({ success: true });

    // Process in background
    processGmailNotification(body).catch(err => {
      console.error("[Gmail Webhook] Background error:", err);
    });

    return response;
  } catch (error: any) {
    console.error("[Gmail Webhook] Initialization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processGmailNotification(payload: any) {
  try {
    // 1. Decode Pub/Sub message
    const data = JSON.parse(
      Buffer.from(payload.message.data, 'base64').toString()
    );
    const { emailAddress, historyId } = data;

    if (!emailAddress || !historyId) {
      console.warn('[Gmail Webhook] Missing emailAddress or historyId');
      return;
    }

    // 2. Get user from DB by email
    const userTokens = await getUserTokensByEmail(emailAddress);
    if (!userTokens) {
      console.warn(`[Gmail Webhook] No token found for: ${emailAddress}`);
      return;
    }

    // 3. Get last processed historyId from DB
    const lastHistoryId = userTokens.last_gmail_history_id;

    // 4. Fetch incremental history
    const gmail = await getGmailClient(emailAddress);
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId || historyId,
      historyTypes: ['messageAdded']
    });

    // 5. Update historyId even if no "messageAdded" (prevents duplicate work)
    await updateLastHistoryId(emailAddress, historyId);

    if (!history.data.history?.length) {
      return;
    }

    // 6. Process each new message
    const messageIds = history.data.history
      .flatMap(h => h.messagesAdded || [])
      .map(m => m.message?.id)
      .filter((id): id is string => Boolean(id));

    // Dedup IDs in this batch
    const uniqueIds = [...new Set(messageIds)];

    for (const messageId of uniqueIds) {
      await processNewEmail(messageId, emailAddress, gmail);
    }

  } catch (err) {
    console.error('[Gmail Webhook] processGmailNotification error:', err);
  }
}

async function getUserTokensByEmail(email: string) {
  const tokens = await directus.request(
    readItems('google_tokens', {
      filter: { email: { _eq: email } },
      fields: ['*'],
      limit: 1
    })
  ) as any[];
  return tokens[0] || null;
}

async function updateLastHistoryId(userEmail: string, historyId: string) {
  const user = await getUserTokensByEmail(userEmail);
  if (user?.id) {
    await directus.request(
      updateItem('google_tokens', user.id, { last_gmail_history_id: historyId })
    );
  }
}

async function getGmailClient(email: string) {
  const userTokens = await getUserTokensByEmail(email);
  if (!userTokens) throw new Error(`Tokens not found for ${email}`);
  
  const token = await getValidToken(userTokens.user_id, email);
  if (!token || typeof token === "string") throw new Error(`Auth failed for ${email}`);

  const auth = new google.auth.OAuth2();
  auth.setCredentials(token);
  return google.gmail({ version: 'v1', auth });
}
