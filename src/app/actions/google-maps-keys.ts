'use server';

import directus from '@/lib/directus';
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk';
import { encrypt, decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';

const COLLECTION = 'google_maps_keys';

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
        const email = user?.emailAddresses[0]?.emailAddress;

        if (!email) return [];

        const items = await directus.request(readItems(COLLECTION, {
            fields: ['*'],
            filter: {
                owner_email: { _eq: email }
            }
        }));

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
        const email = user?.emailAddresses[0]?.emailAddress;
        
        if (!email) throw new Error("Musíte byť prihlásený.");
        if (!keyData.key) throw new Error("Kľúč je povinný.");

        const encryptedKey = encrypt(keyData.key);

        await directus.request(createItem(COLLECTION, {
            encrypted_key: encryptedKey,
            label: keyData.label,
            status: keyData.status || 'validating',
            usage_month: keyData.usageMonth || 0,
            usage_today: keyData.usageToday || 0,
            usage_limit: keyData.usageLimit || 5000,
            owner_email: email, 
            last_used: new Date().toISOString(),
            error_message: keyData.errorMessage
        }));

        revalidatePath('/dashboard/tool/google-maps');
        return { success: true };
    } catch (error: any) {
        console.error("Error saving API key:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteApiKey(id: string) {
    try {
        await directus.request(deleteItem(COLLECTION, id));
        revalidatePath('/dashboard/tool/google-maps');
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
        return { success: true };
    } catch (error: any) {
        console.error("Error updating API key usage:", error);
        return { success: false, error: error.message };
    }
}
