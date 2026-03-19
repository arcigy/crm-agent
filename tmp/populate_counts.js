const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
    // 1. Populate/Update counts
    console.log('Populating gmail_label_counts...');
    const insertRes = await client.query(`
        INSERT INTO gmail_label_counts 
        (user_email, label_id, total_count, unread_count, updated_at)
        SELECT 
        user_email,
        unnest(label_ids) as label_id,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        NOW()
        FROM gmail_messages
        WHERE user_email = 'branislav@arcigy.group'
        GROUP BY user_email, unnest(label_ids)
        ON CONFLICT (user_email, label_id)
        DO UPDATE SET
        total_count = EXCLUDED.total_count,
        unread_count = EXCLUDED.unread_count,
        updated_at = NOW()
    `);
    console.log('Rows affected:', insertRes.rowCount);

    // 2. Verify
    console.log('Verifying counts for branislav@arcigy.group...');
    const verifyRes = await client.query(`
        SELECT label_id, total_count, unread_count 
        FROM gmail_label_counts 
        WHERE user_email = 'branislav@arcigy.group'
        ORDER BY total_count DESC
    `);
    console.log(JSON.stringify(verifyRes.rows, null, 2));

    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
