import { createDirectus, staticToken, rest, createField } from '@directus/sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DIRECTUS_URL = 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
    console.error('Error: DIRECTUS_TOKEN not found in .env.local');
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function customCreateField(collection: string, field: string, type: string, schema: any = {}, meta: any = {}) {
    try {
        await client.request(createField(collection, {
            field: field,
            type: type,
            schema: schema,
            meta: meta
        }));
        console.log(`Field '${field}' created in '${collection}'.`);
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'RLS_FIELD_ALREADY_EXISTS' || error?.message?.includes('already exists')) {
            console.log(`Field '${field}' already exists in '${collection}'.`);
        } else {
            console.error(`Error creating field '${field}' in '${collection}':`, error);
        }
    }
}

async function main() {
    console.log('Updating Directus schema for Leads...');

    const collectionName = 'leads';

    // 1. Phone
    await customCreateField(collectionName, 'phone', 'string', {}, { interface: 'input', display: 'raw', width: 'half' });

    // 2. Company (Simple string for now, could be a relation later)
    await customCreateField(collectionName, 'company', 'string', {}, { interface: 'input', display: 'raw', width: 'half' });

    // 3. Activities (JSON to store array of events: { type: 'call' | 'email', date: string })
    await customCreateField(collectionName, 'activities', 'json', {}, { interface: 'json', display: 'raw', width: 'full' });

    // 4. Deals (JSON to store simple array of deals: { name: 'Deal 1', value: 1000 })
    // In a real relation this would be O2M, but keeping it simple for UI demo
    await customCreateField(collectionName, 'deals', 'json', {}, { interface: 'json', display: 'raw', width: 'full' });

    console.log('Schema update complete.');
}

main().catch(console.error);
