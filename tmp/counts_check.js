const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
    const res = await client.query("SELECT * FROM gmail_label_counts WHERE user_email = 'branislav@arcigy.group' AND label_id = 'INBOX'");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
