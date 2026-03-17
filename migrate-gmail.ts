import { db } from "./src/lib/db";

async function migrate() {
  try {
    console.log("Checking for columns in gmail_messages...");
    await db.query(`
      ALTER TABLE gmail_messages 
      ADD COLUMN IF NOT EXISTS message_id_header TEXT,
      ADD COLUMN IF NOT EXISTS references_header TEXT;
    `);
    console.log("✅ Columns message_id_header and references_header added/verified.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
