'use server';

import { createClient } from '@/lib/supabase-server';
import { getGmailClient, getCalendarClient, refreshAccessToken } from '@/lib/google';
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. CRM ACTIONS (Supabase)
// ==========================================

export async function agentCreateContact(data: { name: string; email: string; company?: string; phone?: string }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        // Split name
        const parts = data.name.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || '';

        // Check duplicates
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', data.email)
            .single();

        if (existing) {
            return { success: false, error: 'Contact already exists', contactId: existing.id };
        }

        const { data: stringData, error } = await supabase
            .from('contacts')
            .insert({
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                company: data.company || null,
                phone: data.phone || null,
                status: 'lead', // Default status
                user_id: user.id // Assuming RBAC needs user_id
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/contacts');
        return { success: true, contact: stringData };

    } catch (error: any) {
        console.error('Agent CreateContact Error:', error);
        return { success: false, error: error.message };
    }
}

export async function agentCreateDeal(data: { name: string; value: number; stage: string; contact_email?: string }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        let contactId = null;

        // Try to find contact if email provided
        if (data.contact_email) {
            const { data: contact } = await supabase
                .from('contacts')
                .select('id')
                .eq('email', data.contact_email)
                .single();

            if (contact) contactId = contact.id;
        }

        // Map Agent "stage" to DB "stage"
        // Agent uses: "new" | "negotiation" (from prompt example)
        // DB uses: 'planning', 'in_progress', 'review', etc.
        let dbStage = 'planning';
        if (data.stage === 'negotiation') dbStage = 'in_progress';
        if (data.stage === 'won' || data.stage === 'closed') dbStage = 'completed';

        // Insert into PROJECTS table (acting as Deals)
        const { data: project, error } = await supabase
            .from('projects')
            .insert({
                project_type: data.name, // Mapping name to type as it's a string
                stage: dbStage,
                contact_id: contactId,
                status: 'active',
                user_id: user.id
                // Note: 'value' is ignored as per current knowledge of schema, 
                // but could be added to comments if needed.
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/projects');
        return { success: true, deal: project };

    } catch (error: any) {
        console.error('Agent CreateDeal Error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 2. CALENDAR ACTIONS (Google)
// ==========================================

export async function agentCheckAvailability(timeRange: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        // Helper to get tokens
        const { data: tokens } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        if (!tokens) return { success: false, error: 'Google Calendar not connected' };

        // Refresh if needed
        let accessToken = tokens.access_token;
        if (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60000 && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token!;
        }

        const calendar = getCalendarClient(accessToken);

        // Parse "tomorrow afternoon" or "next monday" - simpler to fetch a range
        // For now, fetch next 7 days if vague, or parse precise if possible.
        // The Agent Prompt sends "time_range" string. 
        // We'll perform a broad check: Now to +5 days.
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Simplified availability logic: Return list of busy slots
        const busySlots = response.data.items?.map(e => ({
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            summary: e.summary
        }));

        return { success: true, busySlots };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function agentScheduleEvent(data: { title: string; start_time: string; duration_min: number }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const { data: tokens } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        if (!tokens) return { success: false, error: 'Google Calendar not connected' };

        let accessToken = tokens.access_token;
        if (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60000 && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token!;
        }

        const calendar = getCalendarClient(accessToken);

        const start = new Date(data.start_time);
        const end = new Date(start.getTime() + data.duration_min * 60000);

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: data.title,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            },
        });

        return { success: true, eventLink: response.data.htmlLink };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 3. EMAIL ACTIONS (Gmail)
// ==========================================

export async function agentSendEmail(data: { recipient: string; subject: string; body_html: string; threadId?: string }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const { data: tokens } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        if (!tokens) return { success: false, error: 'Gmail not connected' };

        let accessToken = tokens.access_token;
        if (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60000 && tokens.refresh_token) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            accessToken = newTokens.access_token!;
        }

        const gmail = getGmailClient(accessToken);

        // Construct MIME Message
        const utf8Subject = `=?utf-8?B?${Buffer.from(data.subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${data.recipient}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            data.body_html || ' '
        ];

        // Add references if replying
        if (data.threadId) {
            // We ideally need the specific Message-ID to reply properly, but threadId helps grouping.
            // For simple sending, we just omit explicit references unless we have them.
        }

        const rawMessage = messageParts.join('\n');
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
                threadId: data.threadId || undefined
            },
        });

        return { success: true, messageId: response.data.id };

    } catch (error: any) {
        console.error('Agent SendEmail Error:', error);
        return { success: false, error: error.message };
    }
}
