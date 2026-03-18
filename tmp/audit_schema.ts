import { db } from '../src/lib/db';
import { Pool } from 'pg';

async function main() {
  console.log("=== STEP 0: AUDIT EXISTING SCHEMA ===");

  const q1 = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`);
  console.log("1. Existing tables:", q1.rows.map(r => r.tablename));

  const tables = [
    'contacts', 'deals', 'invoices', 'activities', 'cold_leads', 
    'android_logs', 'gmail_messages', 'drive_files', 'audit_logs', 'ai_audit_logs'
  ];
  const q2 = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`, [tables]);
  console.log("2. Tables that exist from the list:", q2.rows.map(r => r.tablename));

  const q3 = await db.query(`SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'workspace_id' AND table_schema = 'public';`);
  console.log("3. workspace_id already exists in:", q3.rows);

  const q4 = await db.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name IN ('user_id', 'user_email', 'clerk_user_id', 'owner_id', 'contact_id') 
    AND table_schema = 'public'
    AND table_name = ANY($1);
  `, [tables]);
  
  const ownerCols: Record<string, string[]> = {};
  for(const row of q4.rows) {
      if(!ownerCols[row.table_name]) ownerCols[row.table_name] = [];
      ownerCols[row.table_name].push(row.column_name);
  }
  console.log("4. Owner identification columns:", ownerCols);

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
