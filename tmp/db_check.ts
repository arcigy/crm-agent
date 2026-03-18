import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

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

    // Check for org tables
    const orgTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('organizations', 'org_members')
    `);
    console.log("\n3. Organization tables presence:");
    if (orgTables.rows.length === 0) {
      console.log("   - NONE (Correct for this setup)");
    } else {
      orgTables.rows.forEach(row => console.log(`   - Found: ${row.table_name}`));
    }

  } catch (err) {
    console.error("FAILED DB CHECK:", err);
  } finally {
    await pool.end();
  }
}

runChecks();
