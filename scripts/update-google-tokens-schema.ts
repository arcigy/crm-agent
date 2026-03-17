import { createDirectus, staticToken, rest, createField } from '@directus/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load both .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-buk1-production.up.railway.app';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN is required");

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function main() {
    console.log(`🚀 Updating google_tokens at ${DIRECTUS_URL}...`);
    
    // 1. last_gmail_history_id
    try {
        await client.request(createField('google_tokens', {
            field: 'last_gmail_history_id',
            type: 'string',
            meta: { 
                interface: 'input', 
                width: 'half',
                note: 'Last processed history ID for Gmail incremental sync'
            }
        }));
        console.log('✅ Field "last_gmail_history_id" created.');
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'INVALID_PAYLOAD' || error?.message?.includes('already exists')) {
            console.log('ℹ️ Field "last_gmail_history_id" already exists.');
        } else {
            console.error('❌ Error creating "last_gmail_history_id":', error);
        }
    }

    // 2. gmail_watch_expiry
    try {
        await client.request(createField('google_tokens', {
            field: 'gmail_watch_expiry',
            type: 'timestamp',
            meta: { 
                interface: 'datetime', 
                width: 'half',
                note: 'Expiry timestamp for Gmail Pub/Sub watch'
            }
        }));
        console.log('✅ Field "gmail_watch_expiry" created.');
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'INVALID_PAYLOAD' || error?.message?.includes('already exists')) {
            console.log('ℹ️ Field "gmail_watch_expiry" already exists.');
        } else {
            console.error('❌ Error creating "gmail_watch_expiry":', error);
        }
    }

    console.log('🏁 Schema update finished.');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Execution failed:', err);
    process.exit(1);
});
