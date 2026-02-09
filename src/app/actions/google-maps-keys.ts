'use server';

import directus from '@/lib/directus';
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk';
import { encrypt, decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

const COLLECTION = 'google_maps_keys';
const APP_PATH = '/dashboard/outreach/google-maps';

export interface ApiKey {
    id: string;
    key: string;
    label: string;
    status: 'active' | 'error' | 'limit_reached' | 'validating';
    usageMonth: number;
    usageToday: number;
    usageLimit: number;
    ownerEmail?: string;
    lastUsed?: string;
    errorMessage?: string;
}

export async function getApiKeys(): Promise<ApiKey[]> {
    try {
        const user = await currentUser();
        let email = user?.emailAddresses[0]?.emailAddress;

        // DEV BYPASS: If on localhost, allow dev email fallback
        const headerList = await headers();
        const host = headerList.get('host');
        const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');

        if (!email && isLocal) {
            email = 'dev@arcigy.sk';
            console.log("DEV MODE (getApiKeys): Using fallback email dev@arcigy.sk");
        }

        if (!email) {
            console.log("No user email found in Clerk");
            return [];
        }

        console.log(`Fetching keys for: ${email}`);

        const items = await directus.request(readItems(COLLECTION, {
            fields: ['*'],
            filter: {
                owner_email: { _eq: email }
            }
        }));

        console.log(`Found ${items?.length || 0} keys in DB`);

        if (!items || items.length === 0) return [];

        return items.map((item: any) => {
            let decryptedKey = '';
            try {
                decryptedKey = decrypt(item.encrypted_key);
            } catch (e) {
                decryptedKey = 'INVALID_ENCRYPTION';
            }

            return {
                id: item.id,
                key: decryptedKey,
                label: item.label,
                status: item.status,
                usageMonth: item.usage_month || 0,
                usageToday: item.usage_today || 0,
                usageLimit: item.usage_limit || 5000,
                ownerEmail: item.owner_email,
                lastUsed: item.last_used,
                errorMessage: item.error_message
            };
        });
    } catch (error: any) {
        console.error("Error fetching API keys:", error);
        return [];
    }
}

export async function saveApiKey(keyData: Partial<ApiKey>) {
    try {
        const user = await currentUser();
        let email = user?.emailAddresses[0]?.emailAddress;
        
        // DEV BYPASS: If on localhost, allow dev email fallback
        const headerList = await headers();
        const host = headerList.get('host');
        const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');

        if (!email && isLocal) {
            email = 'dev@arcigy.sk';
            console.log("DEV MODE (saveApiKey): Saving as dev@arcigy.sk");
        }

        if (!email) throw new Error("Musíte byť prihlásený.");
        if (!keyData.key) throw new Error("Kľúč je povinný.");

        const encryptedKey = encrypt(keyData.key);
        const payload = {
            encrypted_key: encryptedKey,
            label: keyData.label || 'Google Maps Key',
            status: keyData.status || 'validating',
            usage_month: keyData.usageMonth || 0,
            usage_today: keyData.usageToday || 0,
            usage_limit: keyData.usageLimit || 300,
            owner_email: email, 
            last_used: new Date().toISOString(),
            error_message: keyData.errorMessage || ''
        };

        console.log("Saving new key to Directus...", { label: payload.label, email });

        await directus.request(createItem(COLLECTION, payload));

        revalidatePath(APP_PATH);
        return { success: true };
    } catch (error: any) {
        console.error("Error saving API key:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteApiKey(id: string) {
    try {
        await directus.request(deleteItem(COLLECTION, id));
        revalidatePath(APP_PATH);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting API key:", error);
        return { success: false, error: error.message };
    }
}

export async function updateApiKeyUsage(id: string, updates: Partial<ApiKey>) {
    try {
        const payload: any = {};
        if (updates.usageMonth !== undefined) payload.usage_month = updates.usageMonth;
        if (updates.usageToday !== undefined) payload.usage_today = updates.usageToday;
        if (updates.lastUsed !== undefined) payload.last_used = updates.lastUsed;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage;

        await directus.request(updateItem(COLLECTION, id, payload));
        revalidatePath(APP_PATH);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating API key usage:", error);
        return { success: false, error: error.message };
    }
}
// Internal function for background worker (ignores user session)
export async function getSystemApiKeys(): Promise<ApiKey[]> {
    try {
        const items = await directus.request(readItems(COLLECTION, {
            fields: ['*'],
            filter: {
                status: { _eq: 'active' }
            }
        }));

        if (!items || items.length === 0) return [];

        return items.map((item: any) => ({
            id: item.id,
            key: decrypt(item.encrypted_key),
            label: item.label,
            status: item.status,
            usageMonth: item.usage_month || 0,
            usageToday: item.usage_today || 0,
            usageLimit: item.usage_limit || 300,
            ownerEmail: item.owner_email,
            lastUsed: item.last_used,
            errorMessage: item.error_message
        }));
    } catch (error) {
        console.error("System Keys Fetch Failed", error);
        return [];
    }
}
