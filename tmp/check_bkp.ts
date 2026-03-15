import { db } from '../src/lib/db';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
  try {
    const size = await db.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    console.log(`Database Size: ${size.rows[0].size}`);

    const activity = await db.query(`
      SELECT 
        action,
        collection,
        COUNT(*) as count,
        MAX(timestamp) as last_activity
      FROM directus_activity
      GROUP BY action, collection
      ORDER BY last_activity DESC
      LIMIT 10
    `);
    console.log('Directus Activity:');
    console.table(activity.rows);

    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('audit_logs', 'change_history')");
    console.log('Custom Audit Tables:', tables.rows.map(t => t.table_name));

  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    process.exit(0);
  }
}

checkDb();
