import { createDirectus, rest, readItems, readCollections } from '@directus/sdk';
import 'dotenv/config';

const url = 'https://directus-buk1-production.up.railway.app';
const token = process.env.DIRECTUS_TOKEN || '3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE';

async function diagnose() {
    const client = createDirectus(url).with(rest({
        headers: { Authorization: `Bearer ${token}` }
    }));

    try {
        console.log('--- Directus Schema Diagnosis ---');
        
        // 1. Check Collections
        const collections = await client.request(readCollections());
        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));
        console.log('Available App Collections:', appCollections.map(c => c.collection).join(', '));

        // 2. Inspect 'contacts' fields specifically
        const contactsSchema = appCollections.find(c => c.collection === 'contacts');
        if (contactsSchema) {
            console.log('\n--- Contacts Collection Details ---');
            // We can't see full field types easily via readCollections without permissions for system collections, 
            // but we can try to fetch one item and check its structure.
            const sample = await client.request(readItems('contacts', { limit: 1 }));
            if (sample && sample.length > 0) {
                console.log('Sample Contact Keys:', Object.keys(sample[0]));
                console.log('Activities Type:', typeof sample[0].activities);
                console.log('Deals Type:', typeof sample[0].deals);
            } else {
                console.log('No contacts found to sample.');
            }
        }

        // 3. Check for specific tables from setup script
        const required = ['contacts', 'projects', 'deals', 'activities', 'google_tokens'];
        required.forEach(req => {
            const found = appCollections.some(c => c.collection === req);
            console.log(`Collection '${req}': ${found ? '✅ Found' : '❌ NOT FOUND'}`);
        });

    } catch (error) {
        console.error('Diagnosis Failed:', error);
    }
}

diagnose();
