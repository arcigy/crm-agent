
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAttachments() {
  try {
    const res = await pool.query(`
      SELECT gmail_message_id, has_attachments 
      FROM gmail_messages 
      WHERE has_attachments = true 
      LIMIT 10
    `);
    console.log('Messages with attachments:');
    console.table(res.rows);
    
    const stats = await pool.query('SELECT has_attachments, COUNT(*) FROM gmail_messages GROUP BY has_attachments');
    console.log('Attachment stats:');
    console.table(stats.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAttachments();
