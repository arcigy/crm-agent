import { createDirectus, staticToken, rest, createCollection, createField } from '@directus/sdk';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
    console.error('Error: NEXT_PUBLIC_DIRECTUS_URL or DIRECTUS_TOKEN not found in .env.local');
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function setup() {
    console.log(`🚀 Starting Directus Setup at ${DIRECTUS_URL}...`);

    const collections = ['contacts', 'activities', 'projects', 'deals'];

    for (const col of collections) {
        try {
            await client.request(createCollection({
                collection: col,
                meta: { icon: getIcon(col), note: `Managed by CRM Agent` }
            }));
            console.log(`✅ Collection '${col}' created.`);
        } catch (e: any) {
            console.log(`ℹ️ Collection '${col}' already exists or failed.`);
        }
    }

    // --- CONTACTS FIELDS ---
    const contactFields = [
        { name: 'first_name', type: 'string', meta: { interface: 'input' } },
        { name: 'last_name', type: 'string', meta: { interface: 'input' } },
        { name: 'email', type: 'string', meta: { interface: 'input' } },
        { name: 'phone', type: 'string', meta: { interface: 'input' } },
        { name: 'company', type: 'string', meta: { interface: 'input' } },
        { name: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Lead', value: 'lead' }, { text: 'Customer', value: 'customer' }] } } },
        { name: 'owner_id', type: 'uuid', meta: { hidden: true } },
        { name: 'activities', type: 'json', meta: { interface: 'list' } },
        { name: 'deals', type: 'json', meta: { interface: 'list' } },
        { name: 'comments', type: 'text', meta: { interface: 'wysiwyg' } },
    ];

    for (const f of contactFields) {
        try {
            await client.request(createField('contacts', {
                field: f.name,
                type: f.type,
                meta: f.meta as any
            }));
            console.log(`   Field 'contacts.${f.name}' created.`);
        } catch (e) {
            // Field probably exists
        }
    }

    // --- PROJECTS FIELDS ---
    const projectFields = [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'text' },
        { name: 'status', type: 'string' },
        { name: 'contact_id', type: 'integer' }, // Simple link
        { name: 'owner_id', type: 'uuid' }
    ];

    for (const f of projectFields) {
        try {
            await client.request(createField('projects', {
                field: f.name,
                type: f.type as any
            }));
        } catch (e) { }
    }

    console.log('✨ Directus Database Setup Complete!');
}

function getIcon(col: string) {
    if (col === 'contacts') return 'person';
    if (col === 'activities') return 'history';
    if (col === 'projects') return 'work';
    if (col === 'deals') return 'attach_money';
    return 'circle';
}

setup().catch(console.error);
