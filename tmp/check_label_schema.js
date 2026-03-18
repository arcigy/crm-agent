const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function runChecks() {
  try {
    const structRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'gmail_label_names'
    `);
    console.log("gmail_label_names columns:");
    structRes.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
  } catch (err) { console.error(err); } finally { await pool.end(); }
}
runChecks();
