const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testUnnest() {
  const userEmail = 'branislav@arcigy.group'; 
  try {
     console.log("Creating test message with NULL labels...");
     await pool.query("INSERT INTO gmail_messages (gmail_message_id, gmail_thread_id, user_email, subject, label_ids, received_at) VALUES ('test_null', 'test_thread', $1, 'Test Null Labels', NULL, NOW())", [userEmail]);
     
     console.log("Testing search query that uses unnest(gm.label_ids)...");
     const query = "SELECT gm.gmail_message_id FROM gmail_messages gm, unnest(gm.label_ids) l WHERE gm.gmail_message_id = 'test_null'";
     const res = await pool.query(query);
     console.log("Rows returned for NULL labels with unnest:", res.rowCount);
     
     await pool.query("DELETE FROM gmail_messages WHERE gmail_message_id = 'test_null'");
  } catch (err) { console.error(err); } finally { await pool.end(); }
}
testUnnest();
