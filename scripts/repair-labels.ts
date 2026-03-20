import { db } from "../src/lib/db";
import { getClientForUser } from "../src/lib/gmail-sync-engine";

async function repairLabels(userEmail: string) {
  const gmail = await getClientForUser(userEmail);
  
  console.log('Fetching all message IDs from DB...');
  const dbMessages = await db.query(`
    SELECT gmail_message_id 
    FROM gmail_messages
    WHERE user_email = $1
    ORDER BY received_at DESC
  `, [userEmail]);
  
  console.log(`Found ${dbMessages.rows.length} messages to check`);
  
  // Process in batches of 100
  const batchSize = 100;
  let updated = 0;
  
  for (let i = 0; i < dbMessages.rows.length; i += batchSize) {
    const batch = dbMessages.rows.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1}...`);
    
    for (const row of batch) {
      try {
        // Fetch current labels from Gmail
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: row.gmail_message_id,
          format: 'metadata',
          fields: 'labelIds'
        });
        
        const currentLabels = msg.data.labelIds || [];
        
        // Update DB with current labels
        await db.query(`
          UPDATE gmail_messages
          SET 
            label_ids = $1::text[],
            is_starred = $2,
            is_read = NOT ($3),
            synced_at = NOW()
          WHERE gmail_message_id = $4
          AND user_email = $5
        `, [
          currentLabels,
          currentLabels.includes('STARRED'),
          currentLabels.includes('UNREAD'),
          row.gmail_message_id,
          userEmail
        ]);
        
        updated++;
      } catch (err: any) {
        // Message may have been deleted in Gmail
        console.warn(`Failed to update ${row.gmail_message_id}:`, err.message);
      }
      
      // Rate limit: 10 requests/second max
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`Progress: ${Math.min(i + batchSize, dbMessages.rows.length)}/${dbMessages.rows.length} (${updated} updated)`);
  }
  
  // Refresh label counts after repair
  await db.query(`
    INSERT INTO gmail_label_counts 
      (user_email, label_id, total_count, unread_count, updated_at)
    SELECT 
      user_email,
      unnest(label_ids) as label_id,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE is_read = false) as unread_count,
      NOW()
    FROM gmail_messages
    WHERE user_email = $1
    GROUP BY user_email, unnest(label_ids)
    ON CONFLICT (user_email, label_id)
    DO UPDATE SET
      total_count = EXCLUDED.total_count,
      unread_count = EXCLUDED.unread_count,
      updated_at = NOW()
  `, [userEmail]);
  
  console.log(`✅ Repair complete. Updated ${updated} messages.`);
}

const targetEmail = process.argv[2] || 'branislav@arcigy.group';

repairLabels(targetEmail)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Repair failed:', err);
    process.exit(1);
  });
