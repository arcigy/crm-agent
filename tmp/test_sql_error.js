const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testSql() {
  const userEmail = 'branislav@arcigy.group'; // Example
  const query = `
          SELECT 
            gm.gmail_thread_id as id,
            COUNT(*) as message_count,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', gln.label_id,
                  'name', gln.label_name
                ))
                FROM gmail_label_names gln
                WHERE gln.user_email = $1
                AND gln.label_id = ANY(array_agg(DISTINCT l))
              ),
              '[]'
            ) as labels
          FROM gmail_messages gm, unnest(gm.label_ids) l
          WHERE gm.user_email = $1
          GROUP BY gm.gmail_thread_id, gm.user_email
          LIMIT 1
  `;
  try {
    console.log("Testing suspected broken SQL...");
    const res = await pool.query(query, [userEmail]);
    console.log("SQL SUCCESS (Unexpected):", res.rowCount);
  } catch (err) {
    console.log("SQL FAILED (Expected):", err.message);
  } finally {
    await pool.end();
  }
}
testSql();
