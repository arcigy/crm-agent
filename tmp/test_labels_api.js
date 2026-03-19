const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    const userEmail = 'branislav@arcigy.group';
    console.log('Checking labels for branislav@arcigy.group...');
    
    // Simulate the query from the API route
    const res = await client.query(`
        SELECT 
          gm.gmail_message_id as id,
          gm.label_ids as raw_label_ids,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', gln.label_id,
                'name', gln.label_name
              ))
              FROM gmail_label_names gln
              WHERE gln.user_email = $1
              AND gln.label_id = ANY(gm.label_ids::text[])
            ),
            '[]'
          ) as labels
        FROM gmail_messages gm
        WHERE gm.user_email = $1
        LIMIT 5
    `, [userEmail]);
    
    console.log('Query Result:', JSON.stringify(res.rows, null, 2));
    
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
