const { Pool } = require('pg');
require('dotenv').config();

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT NOW()');
    console.log("Connection success:", res.rows[0]);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();
