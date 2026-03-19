import { db } from "./src/lib/db";

async function run() {
  const email = 'branislav@arcigy.group';

  console.log("=== 1. Webhook registration ===");
  const tokensRes = await db.query(`
    SELECT gmail_watch_expiry, last_gmail_history_id
    FROM google_tokens
    WHERE user_email = $1;
  `, [email]);
  console.table(tokensRes.rows);

  console.log("\n=== 4. Sync State fully ===");
  const syncStateRes = await db.query(`
    SELECT * FROM gmail_sync_state
    WHERE user_email = $1;
  `, [email]);
  console.table(syncStateRes.rows);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});