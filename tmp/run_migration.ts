import { db } from '../src/lib/db';
import * as fs from 'fs';

async function main() {
  console.log("=== RUNNING MIGRATION ===");
  const sql = fs.readFileSync('scripts/migrations/005_workspace_foundation.sql', 'utf-8');
  await db.query(sql);
  console.log("Migration executed successfully!");
  process.exit(0);
}

main().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
