const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT 
      (SELECT MAX(last_full_sync) FROM gmail_sync_state WHERE user_email = 'branislav@arcigy.group') as last_full_sync,
      (SELECT MIN(received_at) FROM gmail_messages WHERE user_email = 'branislav@arcigy.group' AND received_at > (SELECT MAX(last_full_sync) FROM gmail_sync_state WHERE user_email = 'branislav@arcigy.group')) as first_email_after_sync,
      (SELECT COUNT(*) FROM gmail_messages WHERE user_email = 'branislav@arcigy.group') as total_in_db
  `);
  console.log('GAP:', res.rows[0]);
  await client.end();
}

run().catch(console.error);
