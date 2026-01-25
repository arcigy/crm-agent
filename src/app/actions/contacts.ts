'use server';


import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// NOTE: We need to import getPeopleClient dynamically or ensure it exists
// But server actions need top level imports usually. 
// We will rely on dynamic import inside the function to avoid breaking if google lib has issues


export async function createContact(data: any) {
    try {
        const supabase = await createClient();

        // Basic validation
        if (!data.first_name || !data.email) {
            throw new Error('First name and email are required');
        }

        // First check if email already exists
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', data.email)
            .single();

        if (existing) {
            return { success: false, error: 'A contact with this email already exists.' };
        }

        const { data: newContact, error: insertError } = await supabase
            .from('contacts')
            .insert({
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                company: data.company,
                status: data.status,
                activities: [] // Initialize empty activities
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // --- TRIGGER GOOGLE SYNC (EMAILS) ---
        // We do this in the background (or await it if fast enough)
        // Ideally checking for user's connected Google Account
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && newContact) {
                // Fetch tokens
                const { data: tokens } = await supabase
                    .from('google_tokens')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (tokens) {
                    // We have google tokens, let's sync!
                    // Dynamic import to avoid circular dep issues if any, though likely safe
                    const { getGmailClient, refreshAccessToken } = await import('@/lib/google'); // Safer import

                    let accessToken = tokens.access_token;
                    if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
                        const newTokens = await refreshAccessToken(tokens.refresh_token);
                        accessToken = newTokens.access_token;
                        // Update tokens silently
                        await supabase.from('google_tokens').update({
                            access_token: accessToken,
                            expiry_date: newTokens.expiry_date
                        }).eq('user_id', user.id);
                    }

                    const gmail = getGmailClient(accessToken, tokens.refresh_token);

                    // Search for emails FROM or TO this contact
                    const q = `from:${data.email} OR to:${data.email}`;
                    const response = await gmail.users.messages.list({
                        userId: 'me',
                        q,
                        maxResults: 10 // Start with latest 10 to be fast
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
                            const from = headers.find(h => h.name === 'From')?.value || '';
                            const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

                            const type = from.includes(data.email) ? 'email' : 'email'; // Can distinguish in/out if needed

                            activities.push({
                                type: 'email',
                                date: date,
                                subject: subject,
                                content: `Email interaction: ${subject}`, // We store simple summary for now
                                duration: '0m'
                            });
                        }

                        // Update the contact with these activities
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
            // Don't fail the creation just because sync failed
        }

        // Revalidate dashboard to show new data
        revalidatePath('/dashboard/contacts');

        return { success: true };
    } catch (error: any) {
        console.error('Failed to create contact:', error);
        // Better error message for unique constraint
        if (error?.message?.includes('duplicate key')) {
            return { success: false, error: 'A contact with this email already exists.' };
        }
        return { success: false, error: error.message || 'Failed to create contact' };
    }
}

export async function updateContactComments(id: number, comments: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('contacts')
            .update({ comments: comments })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update comments:', error);
        return { success: false, error: error.message };
    }
}


export async function uploadVCard(vcardContent: string) {
    try {
        const supabase = await createClient();

        // Normalize newlines to \n to simplify regex
        const content = vcardContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Split multiple vCards. 
        // Real vCards might have comments or other stuff, but finding BEGIN:VCARD is robust.
        // We use split slightly differently to ensuring we catch the begin tag.
        const cardsRaw = content.split('BEGIN:VCARD');
        const cards = cardsRaw.filter(c => c.includes('END:VCARD'));

        let successCount = 0;
        let failCount = 0;

        for (const rawCard of cards) {
            // Re-assemble a partial string to search against
            const card = 'BEGIN:VCARD' + rawCard;

            // Regex parsing with support for parameters (e.g. TEL;type=CELL:...)
            // (^|\n) ensures we match start of line.
            const fnMatch = card.match(/(?:^|\n)FN(?:;.*)?:(.*)/i);
            const nMatch = card.match(/(?:^|\n)N(?:;.*)?:(.*)/i);
            const emailMatch = card.match(/(?:^|\n)EMAIL(?:;.*)?:(.*)/i);
            const telMatch = card.match(/(?:^|\n)TEL(?:;.*)?:(.*)/i);
            const orgMatch = card.match(/(?:^|\n)ORG(?:;.*)?:(.*)/i);

            // Clean function to remove charset info if visible or whitespace
            const clean = (s: string | undefined): string => s ? s.trim() : '';

            let fullName = clean(fnMatch ? fnMatch[1] : '');

            // Fallback for Name if FN missing
            if (!fullName && nMatch) {
                // N:Family;Given;Middle;Prefix;Suffix
                const parts = nMatch[1].split(';');
                const family = parts[0] || '';
                const given = parts[1] || '';
                fullName = (given + ' ' + family).trim();
            }

            if (!fullName) fullName = 'Unknown Import';

            const email = clean(emailMatch ? emailMatch[1] : undefined);
            const phone = clean(telMatch ? telMatch[1] : undefined);
            const company = clean(orgMatch ? orgMatch[1].trim().split(';')[0] : undefined);

            // If essential info missing (e.g. empty card), skip
            if (fullName === 'Unknown Import' && !email && !phone) continue;

            const nameParts = fullName.split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : '';
            const firstName = nameParts.join(' ');

            const payload: any = {
                first_name: firstName,
                last_name: lastName || '',
                company: company || '',
                status: 'published',
                source: 'import'
            };

            if (email) payload.email = email;
            if (phone) payload.phone = phone;

            // Upsert by email or phone or insert
            let error = null;
            if (email) {
                const { error: err } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' });
                error = err;
            } else {
                // Without email to dedup, we just insert. 
                const { error: err } = await supabase.from('contacts').insert(payload);
                error = err;
            }

            if (error) {
                console.error('Import error for ' + fullName, error);
                failCount++;
            } else {
                successCount++;
            }
        }

        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount, failed: failCount };

    } catch (error: any) {
        console.error('VCard import failed:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkCreateContacts(contacts: any[]) {
    try {
        const supabase = await createClient();
        let successCount = 0;
        let failCount = 0;

        for (const contact of contacts) {
            const nameParts = (contact.name || 'Unknown').split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : '';
            const firstName = nameParts.join(' ');

            const email = contact.email?.[0] || undefined; // Contacts API returns arrays
            const phone = contact.tel?.[0] || undefined;

            // If completely empty skip
            if (!firstName && !email && !phone) continue;

            const payload: any = {
                first_name: firstName,
                last_name: lastName || '',
                company: '', // Native picker often doesn't give Org easily on all platforms
                status: 'published',
                source: 'native_import'
            };

            if (email) payload.email = email;
            if (phone) payload.phone = phone;

            // Attempt upsert
            let error = null;
            if (email) {
                const { error: err } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' });
                error = err;
            } else {
                const { error: err } = await supabase.from('contacts').insert(payload);
                error = err;
            }

            if (error) {
                // Ignore duplicates if we decide so, but counting as fail for now to be safe
                console.warn('Bulk import warning:', error);
                failCount++;
            } else {
                successCount++;
            }
        }

        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount, failed: failCount };
    } catch (e: any) {
        console.error('Bulk Create Error', e);
        return { success: false, error: e.message };
    }
}

export async function importGoogleContacts() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Unauthorized');

        // Fetch tokens
        const { data: tokens } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokens) {
            return { success: false, error: 'no_tokens' };
        }

        const { getPeopleClient, refreshAccessToken } = await import('@/lib/google');

        let accessToken = tokens.access_token;
        if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token;
            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expiry_date: newTokens.expiry_date
            }).eq('user_id', user.id);
        }

        const people = getPeopleClient(accessToken, tokens.refresh_token);

        // Fetch connections
        const connections = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 1000,
            personFields: 'names,emailAddresses,phoneNumbers,organizations',
        });

        const contacts = connections.data.connections || [];
        let successCount = 0;
        let failCount = 0;

        for (const person of contacts) {
            const name = person.names?.[0]?.displayName || 'Unknown';
            const firstName = person.names?.[0]?.givenName || name.split(' ')[0];
            const lastName = person.names?.[0]?.familyName || name.split(' ').slice(1).join(' ');
            const email = person.emailAddresses?.[0]?.value;
            const phone = person.phoneNumbers?.[0]?.value;
            const company = person.organizations?.[0]?.name;

            if (!email && !phone && name === 'Unknown') continue;

            const payload: any = {
                first_name: firstName,
                last_name: lastName || '',
                company: company || '',
                status: 'published',
                source: 'google_import'
            };

            if (email) payload.email = email;
            if (phone) payload.phone = phone;

            // Upsert
            let error = null;
            if (email) {
                const { error: err } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' });
                error = err;
            } else {
                const { error: err } = await supabase.from('contacts').insert(payload);
                error = err;
            }

            if (error) failCount++;
            else successCount++;
        }

        revalidatePath('/dashboard/contacts');
        return { success: true, count: successCount, failed: failCount };

    } catch (e: any) {
        console.error('Google Import Error', e);
        if (e.message?.includes('insufficient authentication scopes') || e.code === 403) {
            return { success: false, error: 'scope_missing' };
        }
        return { success: false, error: e.message };
    }
}
