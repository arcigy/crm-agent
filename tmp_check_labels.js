
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLabels() {
  try {
    const res = await pool.query(`
      SELECT l, COUNT(*) 
      FROM gmail_messages, unnest(label_ids) l
      WHERE user_email = (SELECT user_email FROM google_tokens LIMIT 1)
      GROUP BY l
      ORDER BY COUNT(*) DESC
    `);
    console.log('Label Counts for primary user:');
    console.table(res.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkLabels();
