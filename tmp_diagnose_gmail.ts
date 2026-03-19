import { db } from "./src/lib/db";

async function run() {
  const email = 'branislav@arcigy.group';

  console.log("=== 3. Incremental sync state (all columns) ===");
  const syncStateRes = await db.query(`
    SELECT *
    FROM gmail_sync_state
    WHERE user_email = $1;
  `, [email]);
  console.table(syncStateRes.rows);

  console.log("\n=== 4. New emails arriving (last 7 days) ===");
  const recentRes = await db.query(`
    SELECT COUNT(*) 
    FROM gmail_messages
    WHERE user_email = $1
    AND received_at > NOW() - INTERVAL '7 days';
  `, [email]);
  console.table(recentRes.rows);

  console.log("\n=== 5. Label counts updated_at ===");
  const labelsRes = await db.query(`
    SELECT label_id, total_count, updated_at
    FROM gmail_label_counts
    WHERE user_email = $1
    AND label_id = 'INBOX';
  `, [email]);
  console.table(labelsRes.rows);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});