const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  console.log("--- 1. Archive Label Distribution ---");
  const res1 = await client.query(`
    SELECT label_ids, COUNT(*) as count
    FROM gmail_messages
    WHERE user_email = 'branislav@arcigy.group'
    AND NOT (label_ids @> ARRAY['INBOX'::text])
    AND NOT (label_ids @> ARRAY['TRASH'::text])
    AND NOT (label_ids @> ARRAY['SPAM'::text])
    AND NOT (label_ids @> ARRAY['DRAFT'::text])
    GROUP BY label_ids
    ORDER BY count DESC
    LIMIT 20
  `);
  console.table(res1.rows);

  console.log("\n--- 2. Personal Archive Count ---");
  const res2 = await client.query(`
    SELECT COUNT(*) FROM gmail_messages
    WHERE user_email = 'branislav@arcigy.group'
    AND label_ids @> ARRAY['CATEGORY_PERSONAL'::text]
    AND NOT (label_ids @> ARRAY['INBOX'::text])
    AND NOT (label_ids @> ARRAY['TRASH'::text])
    AND NOT (label_ids @> ARRAY['SPAM'::text])
  `);
  console.table(res2.rows);

  console.log("\n--- 3. Draft Details ---");
  const res3 = await client.query(`
    SELECT gmail_message_id, subject, received_at, label_ids
    FROM gmail_messages
    WHERE user_email = 'branislav@arcigy.group'
    AND label_ids @> ARRAY['DRAFT'::text]
    ORDER BY received_at DESC
  `);
  console.table(res3.rows);

  await client.end();
}

run().catch(console.error);