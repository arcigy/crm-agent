const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
    const res = await client.query("SELECT user_id, user_email FROM google_tokens WHERE user_id = 'user_2mZMiZ4WORLOGcb2T9YW0xZlhHQ'");
    console.log('Result:', JSON.stringify(res.rows, null, 2));

    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
