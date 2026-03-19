import { db } from "./src/lib/db";
import { getValidToken } from "./src/lib/google";
import { google } from "googleapis";
import { processNewEmail } from "./src/lib/gmail-processor";

async function run() {
  const userEmail = 'branislav@arcigy.group';
  console.log(`[Test] Fetching new emails for ${userEmail}...`);

  try {
    const userRes = await db.query(`SELECT user_id FROM google_tokens WHERE user_email = $1`, [userEmail]);
    const userId = userRes.rows[0]?.user_id;
    if (!userId) throw new Error("User ID not found in DB");

    const token = await getValidToken(userId, userEmail);
    if (!token) {
        console.error("No token found");
        return;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: typeof token === 'string' ? token : (token as any).access_token });
    const gmail = google.gmail({ version: 'v1', auth });
    
    const lastEmail = await db.query(`
      SELECT MAX(received_at) as last_date
      FROM gmail_messages
      WHERE user_email = $1
    `, [userEmail]);
    
    const lastDate = lastEmail.rows[0]?.last_date;
    console.log(`Last email in DB: ${lastDate}`);
    
    const afterDate = lastDate 
      ? Math.floor(new Date(lastDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400;
    
    console.log(`Querying Gmail for emails after timestamp: ${afterDate}`);

    const listResult = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterDate}`,
      maxResults: 10
    });
    
    const messages = listResult.data.messages || [];
    console.log(`Found ${messages.length} messages in Gmail`);
    
    let inserted = 0;
    for (const msg of messages) {
      if (!msg.id) continue;
      const existing = await db.query(
        'SELECT gmail_message_id FROM gmail_messages WHERE gmail_message_id = $1 AND user_email = $2',
        [msg.id, userEmail]
      );
      if (existing.rows.length > 0) {
          console.log(`Message ${msg.id} already exists, skipping`);
          continue;
      }
      
      console.log(`Processing message ${msg.id}...`);
      await processNewEmail(msg.id, userEmail, gmail);
      inserted++;
    }
    
    console.log(`Successfully processed ${inserted} new emails`);

  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

run();