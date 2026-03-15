import { createDirectus, staticToken, rest, createField } from '@directus/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load both .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-buk1-production.up.railway.app';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
    console.error('Error: DIRECTUS_TOKEN not found in .env or .env.local');
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function main() {
    console.log(`🚀 Updating contact_labels at ${DIRECTUS_URL}...`);
    
    // 1. gmail_label_id
    try {
        await client.request(createField('contact_labels', {
            field: 'gmail_label_id',
            type: 'string',
            meta: { 
                interface: 'input', 
                width: 'half',
                note: 'ID štítku v Gmaile (CRM/Názov)'
            }
        }));
        console.log('✅ Field "gmail_label_id" created.');
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'INVALID_PAYLOAD' || error?.message?.includes('already exists')) {
            console.log('ℹ️ Field "gmail_label_id" already exists.');
        } else {
            console.error('❌ Error creating "gmail_label_id":', error);
        }
    }

    // 2. color
    try {
        await client.request(createField('contact_labels', {
            field: 'color',
            type: 'string',
            schema: {
                default_value: '#8e63ce'
            },
            meta: { 
                interface: 'select-color', 
                width: 'half',
                note: 'Farba štítku (Violet predvolená)'
            }
        }));
        console.log('✅ Field "color" created.');
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'INVALID_PAYLOAD' || error?.message?.includes('already exists')) {
            console.log('ℹ️ Field "color" already exists.');
        } else {
            console.error('❌ Error creating "color":', error);
        }
    }

    console.log('🏁 Schema update finished.');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Execution failed:', err);
    process.exit(1);
});
