const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'gmail_messages' AND column_name LIKE '%_header'");
    console.log(res.rows);
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
