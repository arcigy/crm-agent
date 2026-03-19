const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("--- google_tokens schema ---");
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'google_tokens'
    `);
    console.table(res.rows);

    console.log("\n--- google_tokens data (first 1) ---");
    const data = await pool.query(`SELECT * FROM google_tokens LIMIT 1`);
    console.log(data.rows[0]);

  } catch (err) {
    console.error("Check failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();
