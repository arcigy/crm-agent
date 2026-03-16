
import { loadEnvConfig } from '@next/env';
import { resolve } from 'path';

// Load env before importing db
loadEnvConfig(resolve(process.cwd()));

async function debugSync() {
  const { db } = await import('../src/lib/db');
  const { default: directus } = await import('../src/lib/directus');
  
  console.log('Directus URL in use:', directus.url);
  
  try {
    const messagesCount = await db.query('SELECT count(*) FROM gmail_messages');
    const syncState = await db.query('SELECT * FROM gmail_sync_state');
    const labelCounts = await db.query('SELECT * FROM gmail_label_counts');
    const googleTokens = await db.query('SELECT user_id, user_email FROM google_tokens');
    
    console.log('--- SYNC STATUS ---');
    console.log('Google Tokens in DB:', JSON.stringify(googleTokens.rows, null, 2));
    console.log('Total messages in DB:', messagesCount.rows[0].count);
    console.log('Sync States:', JSON.stringify(syncState.rows, null, 2));
    console.log('Label Counts:', JSON.stringify(labelCounts.rows, null, 2));

    if (syncState.rows.length === 0) {
      console.log('⚠️ No sync state found. Sync has never started.');
    }
  } catch (err) {
    console.error('Error debugging sync:', err);
  } finally {
    process.exit();
  }
}

debugSync();
