'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

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

        // Split multiple vCards in one file if present. 
        // VCards start with BEGIN:VCARD and end with END:VCARD
        const cards = vcardContent.split('BEGIN:VCARD').filter(c => c.trim().length > 0);

        let successCount = 0;
        let failCount = 0;

        for (const rawCard of cards) {
            const card = 'BEGIN:VCARD' + rawCard; // Re-add header if split removed it (except first might have issue if strict split, but usually ok)

            // Regex parse
            const fnMatch = card.match(/FN:(.*)/);
            const emailMatch = card.match(/EMAIL.*:(.*)/);
            const telMatch = card.match(/TEL.*:(.*)/);
            const orgMatch = card.match(/ORG:(.*)/);

            // If essential info missing (e.g. just garbage text), skip
            if (!fnMatch && !emailMatch && !telMatch) continue;

            const fullName = fnMatch ? fnMatch[1].trim() : 'Imported Contact';
            const email = emailMatch ? emailMatch[1].trim() : undefined;
            const phone = telMatch ? telMatch[1].trim() : undefined;
            const company = orgMatch ? orgMatch[1].trim().split(';')[0] : undefined;

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

            // Attempt upsert
            let error = null;
            if (email) {
                const { error: err } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' });
                error = err;
            } else {
                // If no email, just insert. Potentially duplicate if run twice. 
                // Could check phone dedupe but email is primary key usually.
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
