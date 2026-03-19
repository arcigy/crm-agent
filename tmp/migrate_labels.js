const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GqgrZVcnGqvceVvcNnFqKFlzYULBtGoJ@yamabiko.proxy.rlwy.net:22648/railway', ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
    console.log('Adding missing columns to contact_labels...');
    await client.query(`
        ALTER TABLE contact_labels 
        ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE;
        
        ALTER TABLE contact_labels 
        ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
    `);
    console.log('Columns added successfully.');
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
