const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env first
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}
// Override with .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runChecks() {
  console.log("--- DATABASE DIAGNOSTICS ---");
  try {
    const startCount = Date.now();
    const countRes = await pool.query('SELECT COUNT(*) FROM gmail_messages');
    console.log(`1. gmail_messages count: ${countRes.rows[0].count} (Fetch time: ${Date.now() - startCount}ms)`);

    console.log("\n2. gmail_messages table structure:");
    const structRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'gmail_messages'
      ORDER BY ordinal_position
    `);
    structRes.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check for google_tokens
    console.log("\n3. google_tokens table structure:");
    const tokensRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'google_tokens'
      ORDER BY ordinal_position
    `);
    tokensRes.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error("FAILED DB CHECK:", err);
  } finally {
    await pool.end();
  }
}

runChecks();
