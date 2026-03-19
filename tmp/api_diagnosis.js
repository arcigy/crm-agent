const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

async function diagnose() {
    await client.connect();
    const userEmail = 'branislav@arcigy.group';
    const labelId = 'INBOX';
    const limit = 50;
    const offset = 0;

    console.log('--- Diagnosis for', userEmail, 'label', labelId, '---');

    // 1. Thread count
    const countRes = await client.query(`
        SELECT total_count, unread_count 
        FROM gmail_label_counts
        WHERE user_email = $1 AND label_id = $2
      `, [userEmail, labelId]);
    console.log('1. Counts from gmail_label_counts:', countRes.rows);

    // 2. Emails query (simplified)
    const emailsRes = await client.query(`
          SELECT 
            gm.gmail_thread_id as id,
            COUNT(*) as message_count,
            MAX(gm.received_at) as date,
            (array_agg(gm.subject ORDER BY gm.received_at DESC))[1] as subject
          FROM gmail_messages gm
          WHERE gm.user_email = $1
            AND gm.label_ids @> ARRAY[$2::text]
          GROUP BY gm.gmail_thread_id, gm.user_email
          ORDER BY date DESC
          LIMIT $3 OFFSET $4
    `, [userEmail, labelId, limit, offset]);

    console.log('2. Number of threads found:', emailsRes.rows.length);
    if (emailsRes.rows.length > 0) {
        console.log('   First thread:', emailsRes.rows[0]);
    }

    // 3. Label check
    const labelNames = await client.query(`
        SELECT label_id, label_name FROM gmail_label_names WHERE user_email = $1
    `, [userEmail]);
    console.log('3. Label names in DB for user:', labelNames.rows.length);

    await client.end();
}

diagnose().catch(console.error);
