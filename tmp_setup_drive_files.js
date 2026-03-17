
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drive_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        gmail_message_id varchar(255) NOT NULL,
        file_id varchar(255),
        filename text,
        drive_path text,
        description text,
        file_url text,
        uploaded_by varchar(255),
        date_uploaded timestamptz DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS drive_files_gmail_id_idx ON drive_files(gmail_message_id);
    `);
    console.log('✅ drive_files table and index ensured');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to setup table:', err);
    process.exit(1);
  }
}

setupTable();
