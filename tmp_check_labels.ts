
import { db } from './src/lib/db';

async function checkLabels() {
  try {
    const res = await db.query(`
      SELECT l, COUNT(*) 
      FROM gmail_messages, unnest(label_ids) l
      GROUP BY l
      ORDER BY COUNT(*) DESC
    `);
    console.log('Label Counts:');
    console.table(res.rows);
    
    const users = await db.query('SELECT user_email, COUNT(*) FROM gmail_messages GROUP BY user_email');
    console.log('Users and their message counts:');
    console.table(users.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkLabels();
