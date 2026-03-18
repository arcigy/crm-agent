const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function runChecks() {
  try {
    const structRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'google_tokens'
    `);
    console.log("google_tokens columns:");
    structRes.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
  } catch (err) { console.error(err); } finally { await pool.end(); }
}
runChecks();
