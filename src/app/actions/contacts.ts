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

        // One-way sync to Google (Fire and forget)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // No await, run in background
                createGoogleContact(newContact.id, data, user.id);
            }
        } catch (e) {
            console.error('Trigger Google Create Error', e);
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

async function createGoogleContact(contactId: string, contactData: any, userId: string) {
    try {
        const supabase = await createClient();
        const { data: tokens } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!tokens) return;

        const { getPeopleClient, refreshAccessToken } = await import('@/lib/google');

        let accessToken = tokens.access_token;
        if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token;
        }

        const people = getPeopleClient(accessToken, tokens.refresh_token);

        // Create Person
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

export async function uploadVCard(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error('No file provided');

        const vcardContent = await file.text();
        const supabase = await createClient();

        // Split raw cards
        // Normalize newlines first
        const contentNodes = vcardContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Robust split: handle potential empty strings
        const rawCards = contentNodes.split('BEGIN:VCARD').filter(c => c.trim().length > 0 && c.includes('END:VCARD'));

        const BATCH_SIZE = 50;
        let successCount = 0;
        let failCount = 0;

        // Process in chunks
        for (let i = 0; i < rawCards.length; i += BATCH_SIZE) {
            const chunk = rawCards.slice(i, i + BATCH_SIZE);
            const batchEmailDetails: any[] = [];
            const batchNoEmailDetails: any[] = [];

            // Process each card in the chunk
            for (const rawCard of chunk) {
                // Line-based parsing (Safer than Regex on full block)
                const lines = rawCard.split('\n');
                let fn = '';
                let n = '';
                let email = '';
                let phone = '';
                let org = '';

                // Simple parser state
                for (let line of lines) {
                    line = line.trim();
                    if (line.startsWith('FN:') || line.startsWith('FN;')) fn = line.split(':')[1];
                    else if (line.startsWith('N:') || line.startsWith('N;')) n = line.split(':')[1];
                    else if ((line.startsWith('EMAIL:') || line.startsWith('EMAIL;')) && !email) email = line.split(':')[1]; // Take first email
                    else if ((line.startsWith('TEL:') || line.startsWith('TEL;')) && !phone) phone = line.split(':')[1]; // Take first phone
                    else if ((line.startsWith('ORG:') || line.startsWith('ORG;')) && !org) org = line.split(':')[1];
                }

                // Cleanup
                const clean = (s: string) => s ? s.trim() : '';
                let fullName = clean(fn);

                // Fallback name
                if (!fullName && n) {
                    const parts = n.split(';');
                    // N:Family;Given;Middle;Prefix;Suffix
                    const family = parts[0] || '';
                    const given = parts[1] || '';
                    fullName = (given + ' ' + family).trim();
                }

                if (!fullName) fullName = 'Unknown Import';

                const finalEmail = clean(email);
                const finalPhone = clean(phone);
                const finalOrg = clean(org ? org.split(';')[0] : '');

                if (fullName === 'Unknown Import' && !finalEmail && !finalPhone) continue;

                const nameParts = fullName.split(' ');
                const lastName = nameParts.length > 1 ? nameParts.pop() : '';
                const firstName = nameParts.join(' ');

                const payload: any = {
                    first_name: firstName,
                    last_name: lastName || '',
                    company: finalOrg || '',
                    status: 'published',
                    source: 'import'
                };

                if (finalEmail) {
                    payload.email = finalEmail;
                    batchEmailDetails.push(payload);
                } else {
                    if (finalPhone) payload.phone = finalPhone;
                    batchNoEmailDetails.push(payload);
                }
            }

            // Execute Batch DB Ops
            if (batchEmailDetails.length > 0) {
                const { error } = await supabase.from('contacts').upsert(batchEmailDetails, { onConflict: 'email', ignoreDuplicates: true });
                if (error) {
                    console.error('Batch error (email)', error);
                    // Don't throw, try next batch. But count as fail? 
                    // Can't count individual fails easily in batch, so assume all failed.
                    failCount += batchEmailDetails.length;
                } else {
                    successCount += batchEmailDetails.length;
                }
            }

            if (batchNoEmailDetails.length > 0) {
                const { error } = await supabase.from('contacts').insert(batchNoEmailDetails);
                if (error) {
                    console.error('Batch error (no email)', error);
                    failCount += batchNoEmailDetails.length;
                } else {
                    successCount += batchNoEmailDetails.length;
                }
            }
        }

        revalidatePath('/dashboard/contacts');
        // If everything failed, throw error to show toast
        if (successCount === 0 && failCount > 0 && rawCards.length > 0) {
            throw new Error('Database rejected all imports. Check data format.');
        }

        return { success: true, count: successCount, failed: failCount };

    } catch (error: any) {
        console.error('VCard import failed:', error);
        // Ensure error message is string
        return { success: false, error: error.message || 'Unknown server error' };
    }
}

export async function bulkCreateContacts(contacts: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
            let data = null;

            if (email) {
                const { error: err, data: d } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' }).select().single();
                error = err;
                data = d;
            } else {
                const { error: err, data: d } = await supabase.from('contacts').insert(payload).select().single();
                error = err;
                data = d;
            }

            if (error) {
                console.warn('Bulk import warning:', error);
                failCount++;
            } else {
                successCount++;
                // Sync to Google if we have user
                if (user && data) {
                    // Fire and forget (or await if we want certainty)
                    createGoogleContact(data.id, payload, user.id);
                }
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

export async function syncGoogleContacts() {
    // Background sync version of importGoogleContacts
    // We swallow errors to not disturb UI, but log them.
    try {
        const result = await importGoogleContacts();
        console.log('Background Sync Result:', result);
        return result;
    } catch (e) {
        console.error('Background Sync Failed', e);
        return { success: false };
    }
}
