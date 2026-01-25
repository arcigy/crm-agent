'use server';


import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import directus from '@/lib/directus';
import { createItem } from '@directus/sdk';

export async function createContact(data: any) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Unauthorized');

        if (!data.first_name) {
            throw new Error('First name is required');
        }

        // 1. SAVE TO DIRECTUS (Black Box Primary)
        let directusId = null;
        try {
            // @ts-ignore
            const drContact = await directus.request(createItem('contacts', {
                first_name: data.first_name,
                last_name: data.last_name || '',
                email: data.email || '',
                phone: data.phone || '',
                company: data.company || '',
                status: data.status || 'published',
                activities: [],
                deals: []
            }));
            directusId = (drContact as any).id;
        } catch (de: any) {
            console.error('Directus save error:', de.message);
        }

        // 2. SAVE TO SUPABASE (Sync Mirror)
        const { data: newContact, error: insertError } = await supabase
            .from('contacts')
            .insert({
                first_name: data.first_name,
                last_name: data.last_name || '',
                email: data.email || null,
                phone: data.phone || null,
                company: data.company || '',
                status: data.status || 'published',
                owner_id: user.id,
                activities: []
            })
            .select()
            .single();

        if (insertError && !directusId) throw insertError;

        // --- TRIGGER GOOGLE SYNC (EMAILS) ---
        try {
            if (user && newContact) {
                const { data: tokens } = await supabase
                    .from('google_tokens')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (tokens) {
                    const { getGmailClient, refreshAccessToken } = await import('@/lib/google');

                    let accessToken = tokens.access_token;
                    if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
                        const newTokens = await refreshAccessToken(tokens.refresh_token);
                        accessToken = newTokens.access_token;
                        await supabase.from('google_tokens').update({
                            access_token: accessToken,
                            expiry_date: newTokens.expiry_date
                        }).eq('user_id', user.id);
                    }

                    const gmail = getGmailClient(accessToken, tokens.refresh_token);
                    const q = `from:${data.email} OR to:${data.email}`;
                    const response = await gmail.users.messages.list({
                        userId: 'me',
                        q,
                        maxResults: 10
                    });

                    const messages = response.data.messages || [];
                    const activities: any[] = [];

                    if (messages.length > 0) {
                        for (const msg of messages) {
                            if (!msg.id) continue;
                            const details = await gmail.users.messages.get({
                                userId: 'me',
                                id: msg.id,
                                format: 'metadata',
                                metadataHeaders: ['Subject', 'Date', 'From']
                            });

                            const headers = details.data.payload?.headers || [];
                            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                            const dateStr = headers.find(h => h.name === 'Date')?.value;
                            const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

                            activities.push({
                                type: 'email',
                                date: date,
                                subject: subject,
                                content: `Email interaction: ${subject}`,
                                duration: '0m'
                            });
                        }

                        if (activities.length > 0) {
                            await supabase
                                .from('contacts')
                                .update({ activities: activities })
                                .eq('id', newContact.id);
                        }
                    }
                }
            }
        } catch (syncError) {
            console.error('Auto-sync failed:', syncError);
        }

        // Trigger Google Create
        try {
            createGoogleContact(newContact.id, data, user.id);
        } catch (e) { }

        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to create contact:', error);
        return { success: false, error: error.message || 'Failed to create contact' };
    }
}

async function createGoogleContact(contactId: string, contactData: any, userId: string) {
    try {
        const supabase = await createClient();
        const { data: tokens } = await supabase.from('google_tokens').select('*').eq('user_id', userId).single();
        if (!tokens) return;
        const { getPeopleClient, refreshAccessToken } = await import('@/lib/google');
        let accessToken = tokens.access_token;
        if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token;
        }
        const people = getPeopleClient(accessToken, tokens.refresh_token);
        await people.people.createContact({
            requestBody: {
                names: [{ givenName: contactData.first_name, familyName: contactData.last_name }],
                emailAddresses: contactData.email ? [{ value: contactData.email }] : [],
                phoneNumbers: contactData.phone ? [{ value: contactData.phone }] : [],
                organizations: contactData.company ? [{ name: contactData.company }] : []
            }
        });
    } catch (e) {
        console.error('Failed to sync new contact to Google:', e);
    }
}

export async function updateContactComments(id: number, comments: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('contacts').update({ comments: comments }).eq('id', id);
        if (error) throw error;
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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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

            // Save to Directus
            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName || '',
                    email: email || '',
                    phone: phone || '',
                    company: org || '',
                    status: 'published'
                }));
            } catch (e) { }

            const { error } = await supabase.from('contacts').insert({
                first_name: firstName,
                last_name: lastName || '',
                company: org || '',
                email: email || null,
                phone: phone || null,
                status: 'published',
                source: 'import',
                owner_id: user?.id
            });
            if (!error) successCount++;
        }

        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkCreateContacts(contacts: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let successCount = 0;
        for (const contact of contacts) {
            const nameParts = (contact.name || 'Unknown').split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : '';
            const firstName = nameParts.join(' ');

            // Save to Directus
            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName || '',
                    email: contact.email || '',
                    phone: contact.phone || '',
                    company: contact.company || '',
                    status: 'published'
                }));
            } catch (e) { }

            const { error } = await supabase.from('contacts').insert({
                first_name: firstName,
                last_name: lastName || '',
                company: contact.company || '',
                email: contact.email || null,
                phone: contact.phone || null,
                status: 'published',
                owner_id: user?.id
            });
            if (!error) successCount++;
        }
        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function importGoogleContacts() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');
        const { data: tokens } = await supabase.from('google_tokens').select('*').eq('user_id', user.id).single();
        if (!tokens) return { success: false, error: 'no_tokens' };

        const { getPeopleClient, refreshAccessToken } = await import('@/lib/google');
        let accessToken = tokens.access_token;
        if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token;
            await supabase.from('google_tokens').update({ access_token: accessToken, expiry_date: newTokens.expiry_date }).eq('user_id', user.id);
        }

        const people = getPeopleClient(accessToken, tokens.refresh_token);
        const connections = await people.people.connections.list({ resourceName: 'people/me', pageSize: 100, personFields: 'names,emailAddresses,phoneNumbers' });
        const googleContacts = connections.data.connections || [];
        let successCount = 0;

        for (const person of googleContacts) {
            const firstName = person.names?.[0]?.givenName || 'Google';
            const lastName = person.names?.[0]?.familyName || 'Import';
            const email = person.emailAddresses?.[0]?.value;
            const phone = person.phoneNumbers?.[0]?.value;

            // Save to Directus
            try {
                // @ts-ignore
                await directus.request(createItem('contacts', {
                    first_name: firstName,
                    last_name: lastName,
                    email: email || '',
                    phone: phone || '',
                    status: 'published'
                }));
            } catch (e) { }

            const { error } = await supabase.from('contacts').insert({
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                phone: phone || null,
                status: 'published',
                source: 'google'
            });
            if (!error) successCount++;
        }
        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function syncGoogleContacts() {
    return await importGoogleContacts();
}
