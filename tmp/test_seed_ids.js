const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    const res = await client.query("SELECT gmail_message_id FROM gmail_messages WHERE gmail_message_id LIKE 'seed_%' LIMIT 5");
    console.log(res.rows);
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
