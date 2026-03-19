const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    console.log('--- Database Cleanup and Migration ---');

    console.log('Adding missing columns to gmail_messages...');
    await client.query(`
        ALTER TABLE gmail_messages 
        ADD COLUMN IF NOT EXISTS message_id_header TEXT,
        ADD COLUMN IF NOT EXISTS references_header TEXT;
    `);

    console.log('Ensuring email_templates table exists...');
    await client.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            subject TEXT,
            body TEXT,
            category TEXT,
            user_email TEXT,
            date_created TIMESTAMPTZ DEFAULT NOW(),
            date_updated TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    console.log('Deleting seed emails (starting with seed_ in gmail_message_id)...');
    const deleteRes = await client.query(`
        DELETE FROM gmail_messages 
        WHERE gmail_message_id LIKE 'seed_%'
    `);
    console.log(`Deleted ${deleteRes.rowCount} seed messages.`);

    console.log('--- All Done ---');
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
