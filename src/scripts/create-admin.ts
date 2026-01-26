import directus from '../lib/directus'; // Adjustment for relative path if running via tsx
import { createItem, readItems } from '@directus/sdk';

// Polyfill required for directus sdk in standalone script sometimes
import 'dotenv/config';

// We need to redefine this because we are outside next.js context mostly
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-production-fd17.up.railway.app';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || 'btH0JAXIC6e8rlUR-hLmSXf0-_vgdTnk';

async function main() {
    console.log('🚀 Creating Admin User...');
    const email = 'arcigyback@gmail.com';

    try {
        // Direct fetch to avoid lib issues in script
        const searchRes = await fetch(`${DIRECTUS_URL}/items/crm_users?filter[email][_eq]=${email}`, {
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
        });
        const searchData = await searchRes.json();

        if (searchData.data && searchData.data.length > 0) {
            console.log('⚠️ User already exists. ID:', searchData.data[0].id);
            // Reset password hash to allow onboarding
            const updateRes = await fetch(`${DIRECTUS_URL}/items/crm_users/${searchData.data[0].id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password_hash: null, status: 'active' })
            });
            console.log('✅ Reset user for onboarding (password_hash = null).');
            return;
        }

        // Create
        const createRes = await fetch(`${DIRECTUS_URL}/items/crm_users`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                status: 'active',
                password_hash: "" // Important for "First Time" flow (bypass not null check)
            })
        });

        const result = await createRes.json();

        if (result.errors) {
            console.error('❌ Error creating user:', JSON.stringify(result.errors, null, 2));
        } else {
            console.log('✅ User created successfully! ID:', result.data.id);
        }

    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

main();
