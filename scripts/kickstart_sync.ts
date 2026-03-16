
import { loadEnvConfig } from '@next/env';
import { resolve } from 'path';

// Load env before importing
loadEnvConfig(resolve(process.cwd()));

async function kickstartSync() {
  const { db } = await import('../src/lib/db');
  const { triggerFullSyncForUser } = await import('../src/lib/gmail-sync-engine');
  
  try {
    // Get the user from google_tokens
    const tokens = await db.query('SELECT user_email FROM google_tokens LIMIT 1');
    if (tokens.rows.length === 0) {
      console.error('❌ No user connected to Google found in google_tokens table.');
      process.exit(1);
    }
    
    const userEmail = tokens.rows[0].user_email;
    console.log(`🚀 Manually triggering full sync for ${userEmail}...`);
    
    // We await it here so we can see the result in console for debugging
    const { performFullSync } = await import('../src/lib/gmail-sync-engine');
    const result = await performFullSync(userEmail, 'INBOX');
    
    console.log('✅ Sync result:', result);
  } catch (err) {
    console.error('❌ Sync failed:', err);
  } finally {
    process.exit();
  }
}

kickstartSync();
