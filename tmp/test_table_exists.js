const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    const res = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'gmail_label_names'
        )
    `);
    console.log('gmail_label_names exists:', res.rows[0].exists);
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
