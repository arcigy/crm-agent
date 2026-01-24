import { createDirectus, staticToken, rest, createCollection, createField, createItem } from '@directus/sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
    console.error('Error: DIRECTUS_TOKEN not found in .env.local');
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function customCreateCollection(collection: string) {
    try {
        await client.request(createCollection({
            collection: collection,
            schema: {},
            meta: {
                hidden: false,
                icon: 'group',
                note: 'Leads from CRM'
            }
        }));
        console.log(`Collection '${collection}' created.`);
    } catch (error: any) {
        if (error?.errors?.[0]?.extensions?.code === 'RLS_COLLECTION_ALREADY_EXISTS' || error?.message?.includes('already exists')) {
            console.log(`Collection '${collection}' already exists.`);
        } else {
            console.error(`Error creating collection '${collection}':`, error);
        }
    }
}

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
        // Directus returns different errors for existing fields depending on version/context, generally safe to ignore if it exists
        if (error?.errors?.[0]?.extensions?.code === 'RLS_FIELD_ALREADY_EXISTS' || error?.message?.includes('already exists')) {
            console.log(`Field '${field}' already exists in '${collection}'.`);
        } else {
            console.error(`Error creating field '${field}' in '${collection}':`, error);
        }
    }
}

async function main() {
    console.log('Initializing Directus contacts collection...');

    const collectionName = 'contacts';

    // 1. Create Collection
    // await customCreateCollection(collectionName);

    // 2. Create Fields
    // await customCreateField(collectionName, 'first_name', 'string', {}, { interface: 'input', display: 'raw', required: false });
    // await customCreateField(collectionName, 'last_name', 'string', {}, { interface: 'input', display: 'raw', required: false });
    // await customCreateField(collectionName, 'email', 'string', {}, { interface: 'input', display: 'raw', required: true });
    // await customCreateField(collectionName, 'phone', 'string', {}, { interface: 'input' });
    // await customCreateField(collectionName, 'company', 'string', {}, { interface: 'input' });
    // await customCreateField(collectionName, 'activities', 'json', {}, { interface: 'list' });
    // await customCreateField(collectionName, 'deals', 'json', {}, { interface: 'list' });
    // await customCreateField(collectionName, 'status', 'string', { default_value: 'draft' }, { interface: 'select-dropdown', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Published', value: 'published' }, { text: 'Archived', value: 'archived' }] }, display: 'labels' });

    // 3. Seed Data
    try {
        await client.request(createItem(collectionName, {
            first_name: 'Jan',
            last_name: 'Novak',
            email: 'jan.novak@firma.sk',
            status: 'published',
            phone: '+421905123456',
            company: 'Tech Solutions s.r.o.',
            activities: [
                {
                    type: 'call',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    subject: 'Discussed Cloud Pricing & Migration',
                    content: 'AI SUMMARY: Jan is highly interested in migrating to the Enterprise plan but cited budget constraints for Q1. He confirmed that the current system is reaching max capacity. We agreed to a follow-up demo next Tuesday at 14:00. Key items: scalability and data integrity.'
                },
                {
                    type: 'email',
                    date: new Date(Date.now() - 172800000).toISOString(),
                    subject: 'Follow-up regarding technical specs',
                    content: 'Hi Jan,\n\nFollowing our discussion, I am sending the technical specifications for the API integration and the draft contract. Please let me know if you have any questions.\n\nBest regards,\nCRM Team'
                },
                {
                    type: 'call',
                    date: new Date(Date.now() - 345600000).toISOString(),
                    subject: 'Initial Discovery Call',
                    content: 'AI SUMMARY: Client identified three primary pain points: slow database response times, lack of automated reporting, and manual data entry. Peter expressed a preference for a cloud-native solution with strong security features.'
                },
            ],
            deals: [
                {
                    name: 'Cloud Migration',
                    value: 12500,
                    paid: true,
                    invoiceDate: new Date(Date.now() - 86400000 * 30).toISOString(),
                    description: 'Full migration of on-premise infrastructure to AWS cloud. Includes data migration, testing, and 3-month support.'
                },
                {
                    name: 'Security Audit',
                    value: 3000,
                    paid: false,
                    invoiceDate: new Date(Date.now() - 86400000 * 7).toISOString(),
                    description: 'Comprehensive security audit covering network, application, and data layer vulnerabilities.'
                }
            ],
            comments: 'High potential for upgrade. Interest in Enterprise.'
        }));
        await client.request(createItem(collectionName, {
            first_name: 'Peter',
            last_name: 'Svoboda',
            email: 'peter.svoboda@enterprise.cz',
            status: 'published',
            phone: '+420777001002',
            company: 'Enterprise Corp',
            activities: [
                {
                    type: 'email',
                    date: new Date(Date.now() - 86400000 * 3).toISOString(),
                    subject: 'Contract Renewal Notice',
                    content: 'Dear Peter,\n\nThis is a reminder that your Enterprise license is set to expire in 90 days. We would love to discuss a renewal plan that includes the new bulk export features you requested.\n\nRegards,\nSales Dept'
                },
                {
                    type: 'call',
                    date: new Date(Date.now() - 86400000 * 5).toISOString(),
                    subject: 'Feature Request Discussion',
                    content: 'AI SUMMARY: Peter requested bulk export functionality for the dashboard. He mentioned that their finance team spends 5 hours a week manually extracting data. Discussed the technical feasibility and timeline for this feature.'
                },
            ],
            deals: [
                {
                    name: 'License Renewal',
                    value: 4500,
                    paid: false,
                    invoiceDate: new Date(Date.now() - 86400000 * 14).toISOString(),
                    description: 'Enterprise license renewal with additional bulk export features and priority support addon.'
                }
            ],
            comments: 'Requested bulk export. Checking technical feasibility.'
        }));
        console.log('Seeded sample data.');
    } catch (e) {
        console.log('Seed step skipped (data potentially exists):', e);
    }

    console.log('Directus initialization complete.');
}

main().catch(console.error);
