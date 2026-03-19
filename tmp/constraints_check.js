const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
    // Check constraints
    const constraintsRes = await client.query("SELECT * FROM information_schema.table_constraints WHERE table_name = 'gmail_label_counts'");
    console.log('Constraints:', JSON.stringify(constraintsRes.rows, null, 2));

    // Check unique indexes
    const indexesRes = await client.query("SELECT * FROM pg_indexes WHERE tablename = 'gmail_label_counts'");
    console.log('Indexes:', JSON.stringify(indexesRes.rows, null, 2));

    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
