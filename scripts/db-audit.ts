import { db } from "../src/lib/db";
import * as dotenv from "dotenv";

dotenv.config();

async function runAuditQueries() {
  console.log("📊 Running Database Audit Queries...\n");

  try {
    // 1. Table sizes
    console.log("--- Top 20 Tables by Size ---");
    const sizeResult = await db.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 20;
    `);
    console.table(sizeResult.rows);

    // 2. Row counts
    console.log("\n--- Top 20 Tables by Row Count ---");
    const countResult = await db.query(`
      SELECT 
        relname AS table_name,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20;
    `);
    console.table(countResult.rows);

    // 3. Total DB size
    console.log("\n--- Total Database Size ---");
    const totalSizeResult = await db.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;
    `);
    console.table(totalSizeResult.rows);

  } catch (error) {
    console.error("❌ Audit queries failed:", error);
  } finally {
    process.exit(0);
  }
}

runAuditQueries();
