import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load environment variables for Next.js (including .env.local)
loadEnvConfig(process.cwd());

async function runMigration() {
  const { db } = await import("../src/lib/db");

  console.log("Starting migration 004_gmail_mirror...");
  try {
    const sqlPath = path.join(process.cwd(), "scripts", "migrations", "004_gmail_mirror.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    
    // Split on semicolons if necessary, or just run the entire block
    // pg mostly handles multiple statements fine, but we'll issue it directly
    await db.query(sql);
    
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:");
    console.error(err);
  } finally {
    process.exit(0);
  }
}

runMigration();
