import { db } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  console.log("🚀 Starting Gmail Background Sync Migration...");
  
  const migrationPath = path.join(__dirname, "migrations", "003_gmail_background_sync.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  try {
    // We run it as a single block. 
    // Add COLUMN IF NOT EXISTS handled inside the SQL
    await db.query(sql);
    console.log("✅ Migration 003_gmail_background_sync.sql applied successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
