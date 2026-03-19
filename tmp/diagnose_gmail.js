const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const userEmail = "branislav@arcigy.group";
    console.log(`Checking EXACT CASE for: '${userEmail}'`);

    const countCheck = await pool.query(`
      SELECT * FROM gmail_label_counts 
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [userEmail]);
    console.log("Count record for 'branislav@arcigy.group':", countCheck.rows[0]);

    const upperEmail = userEmail.toUpperCase();
    const countCheckUpper = await pool.query(`
      SELECT * FROM gmail_label_counts 
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [upperEmail]);
    console.log(`Count record for UPPERCASE '${upperEmail}':`, countCheckUpper.rows[0]);

    const messagesCheck = await pool.query(`
      SELECT COUNT(*) FROM gmail_messages
      WHERE user_email = $1
    `, [userEmail]);
    console.log(`Messages count for '${userEmail}':`, messagesCheck.rows[0].count);

  } catch (err) {
    console.error("Diagnosis failed:", err.message);
  } finally {
    await pool.end();
  }
}

diagnose();
