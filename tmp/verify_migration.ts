import { db } from '../src/lib/db';

async function main() {
  console.log("=== STEP 4: VERIFICATION QUERIES ===");

  const q1 = await db.query(`SELECT tablename FROM pg_tables WHERE tablename IN ('organizations','branches','org_roles','org_members','org_invitations') AND schemaname = 'public';`);
  console.log("1. New tables exist:");
  console.table(q1.rows);

  const q2 = await db.query(`SELECT table_name, column_name, data_type, column_default FROM information_schema.columns WHERE column_name IN ('organization_id','visibility','owner_member_id') AND table_schema = 'public' ORDER BY table_name, column_name;`);
  console.log("2. New columns added correctly:");
  console.table(q2.rows);

  const q3a = await db.query(`SELECT COUNT(*) as total_contacts FROM contacts;`);
  const q3b = await db.query(`SELECT COUNT(*) as total_deals FROM deals;`);
  console.log("3. Existing data NOT affected:");
  console.log("Contacts:", q3a.rows[0].total_contacts);
  console.log("Deals:", q3b.rows[0].total_deals);

  const q4 = await db.query(`SELECT COUNT(*) as total, COUNT(organization_id) as with_org_id FROM contacts;`);
  console.log("4. New columns are all NULL for existing rows:");
  console.log(q4.rows[0]);

  const q5 = await db.query(`SELECT indexname FROM pg_indexes WHERE tablename IN ('contacts','deals','org_members') AND indexname LIKE 'idx_%' ORDER BY indexname;`);
  console.log("5. Indexes created:");
  console.table(q5.rows);

  process.exit(0);
}

main().catch(e => {
  console.error("Verification failed:", e);
  process.exit(1);
});
