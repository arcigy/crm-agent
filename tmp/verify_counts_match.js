const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
    // 1. Direct unread count
    const res = await client.query("SELECT COUNT(*) FROM gmail_messages WHERE user_email = 'branislav@arcigy.group' AND 'INBOX' = ANY(label_ids) AND is_read = false");
    console.log('Actual unread count:', res.rows[0]);

    // 2. Check a few rows
    const res2 = await client.query("SELECT is_read FROM gmail_messages WHERE user_email = 'branislav@arcigy.group' AND 'INBOX' = ANY(label_ids) LIMIT 10");
    console.log('is_read sample:', JSON.stringify(res2.rows, null, 2));

    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
