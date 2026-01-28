'use server';

import { revalidatePath } from 'next/cache';
import directus from '@/lib/directus';
import { createItem, updateItem, readItems } from '@directus/sdk';

export async function getContacts() {
    try {
        // @ts-ignore
        const contacts = await directus.request(readItems('contacts', {
            filter: {
                deleted_at: { _null: true }
            },
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
            phone: (data.phone || '').replace(/\s/g, ''),
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

export async function updateContact(id: number | string, data: any) {
    try {
        // @ts-ignore
        await directus.request(updateItem('contacts', id, data));
        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update contact:', error);
        return { success: false, error: error.message };
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
                    phone: (phone || '').replace(/\s/g, ''),
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

        // Fetch existing emails to avoid duplicates in this batch
        // @ts-ignore
        const existingContacts = await directus.request(readItems('contacts', {
            fields: ['email'],
            limit: -1
        }));
        const existingEmails = new Set((existingContacts as any[]).map(c => c.email?.toLowerCase()).filter(Boolean));

        for (const contact of contacts) {
            const rawName = contact.name || contact.first_name || 'Neznámy';
            const nameParts = String(rawName).split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : (contact.last_name || '');
            const firstName = nameParts.join(' ');

            const email = Array.isArray(contact.email) ? contact.email[0] : (contact.email || '');
            const phone = Array.isArray(contact.phone || contact.tel) ? (contact.phone || contact.tel)[0] : (contact.phone || contact.tel || '');
            const company = contact.company || contact.org || '';

            const normalizedEmail = String(email || '').toLowerCase().trim();
            if (normalizedEmail && existingEmails.has(normalizedEmail)) {
                continue; // Skip duplicates
            }

            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName || '',
                    email: email ? String(email) : '',
                    phone: phone ? String(phone).replace(/\s/g, '') : '',
                    company: company ? String(company) : '',
                    status: contact.status || 'lead',
                    ...contact
                }));
                successCount++;
                if (normalizedEmail) existingEmails.add(normalizedEmail);
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
    try {
        const { currentUser } = await import('@clerk/nextjs/server');
        const user = await currentUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        // 1. Get tokens from Directus
        // @ts-ignore
        const tokensRes = await directus.request(readItems('google_tokens', {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        }));

        if (!tokensRes || tokensRes.length === 0) {
            return { success: false, error: 'Google account not connected or tokens missing.' };
        }

        const tokens = tokensRes[0];
        const { getPeopleClient } = await import('@/lib/google');
        const people = getPeopleClient(tokens.access_token, tokens.refresh_token);

        // 2. Fetch contacts from Google
        const response = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 1000,
            personFields: 'names,emailAddresses,phoneNumbers,organizations',
        });

        const connections = response.data.connections || [];
        const googleContacts = connections.map(person => {
            const name = person.names?.[0]?.displayName || 'Google Contact';
            const email = person.emailAddresses?.[0]?.value || '';
            const phone = person.phoneNumbers?.[0]?.value || '';
            const company = person.organizations?.[0]?.name || '';
            return { name, email, phone, company };
        }).filter(c => c.email || c.phone); // Only meaningful ones

        if (googleContacts.length === 0) {
            return { success: true, count: 0, message: 'No contacts found in Google.' };
        }

        // 3. Save to CRM
        return await bulkCreateContacts(googleContacts);

    } catch (error: any) {
        console.error('Google Import Error:', error);
        return { success: false, error: error.message };
    }
}

export async function syncGoogleContacts() {
    return await importGoogleContacts();
}
