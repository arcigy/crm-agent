const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    const userEmail = 'branislav@arcigy.group';
    const res = await client.query(`
        SELECT label_ids
        FROM gmail_messages 
        WHERE user_email = $1 
        AND label_ids @> ARRAY['INBOX'::text]
        LIMIT 1
    `, [userEmail]);
    
    console.log('Result:', JSON.stringify(res.rows, null, 2));
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
