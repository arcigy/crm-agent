import { db } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  console.log("🚀 Starting Gmail Labels Migration...");
  
  const migrationPath = path.join(__dirname, "migrations", "002_gmail_labels.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  try {
    await db.query(sql);
    console.log("✅ Migration 002_gmail_labels.sql applied successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
