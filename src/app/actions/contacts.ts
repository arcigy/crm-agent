'use server';

import { revalidatePath } from 'next/cache';
import directus from '@/lib/directus';
import { createItem, updateItem, readItems } from '@directus/sdk';

export async function getContacts() {
    try {
        // @ts-ignore
        const contacts = await directus.request(readItems('contacts', {
            sort: ['-date_created'],
            limit: 100
        }));
        return { success: true, data: contacts };
    } catch (error: any) {
        console.error('Failed to fetch contacts:', error);
        return { success: false, error: error.message };
    }
}

export async function createContact(data: any) {
    try {
        if (!data.first_name) {
            throw new Error('First name is required');
        }

        // Save to Directus
        // @ts-ignore
        const drContact = await directus.request(createItem('contacts', {
            first_name: data.first_name,
            last_name: data.last_name || '',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            status: data.status || 'lead',
            comments: data.comments || ''
        }));

        revalidatePath('/dashboard/contacts');
        return { success: true, contact: drContact };
    } catch (error: any) {
        console.error('Failed to create contact:', error);
        return { success: false, error: error.message || 'Failed to create contact' };
    }
}

export async function updateContactComments(id: number, comments: string) {
    try {
        // @ts-ignore
        await directus.request(updateItem('contacts', id, { comments: comments }));
        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update comments:', error);
        return { success: false, error: error.message };
    }
}

export async function uploadVCard(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error('No file provided');
        const vcardContent = await file.text();

        const contentNodes = vcardContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rawCards = contentNodes.split('BEGIN:VCARD').filter(c => c.trim().length > 0 && c.includes('END:VCARD'));

        let successCount = 0;
        for (const rawCard of rawCards) {
            const lines = rawCard.split('\n');
            let fn = '', email = '', phone = '', org = '';
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('FN:')) fn = line.split(':')[1];
                else if (line.startsWith('EMAIL:')) email = line.split(':')[1];
                else if (line.startsWith('TEL:')) phone = line.split(':')[1];
                else if (line.startsWith('ORG:')) org = line.split(':')[1];
            }

            const fullName = fn || 'Unknown Import';
            const nameParts = fullName.split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : '';
            const firstName = nameParts.join(' ');

            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName || '',
                    email: email || '',
                    phone: phone || '',
                    company: org || '',
                    status: 'lead'
                }));
                successCount++;
            } catch (e) {
                console.error('Import failed for one contact', e);
            }
        }

        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkCreateContacts(contacts: any[]) {
    try {
        let successCount = 0;
        for (const contact of contacts) {
            const rawName = contact.name || contact.first_name || 'Neznámy';
            const nameParts = String(rawName).split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : (contact.last_name || '');
            const firstName = nameParts.join(' ');

            const email = Array.isArray(contact.email) ? contact.email[0] : (contact.email || '');
            const phone = Array.isArray(contact.phone || contact.tel) ? (contact.phone || contact.tel)[0] : (contact.phone || contact.tel || '');
            const company = contact.company || contact.org || '';

            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName || '',
                    email: email ? String(email) : '',
                    phone: phone ? String(phone) : '',
                    company: company ? String(company) : '',
                    status: 'lead'
                }));
                successCount++;
            } catch (e) {
                console.error('Bulk item failed', e);
            }
        }
        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function importGoogleContacts() {
    // TODO: Implement Google Contacts import with Directus token storage
    return { success: false, error: 'Google Contacts integration pending Directus migration' };
}

export async function syncGoogleContacts() {
    return await importGoogleContacts();
}
