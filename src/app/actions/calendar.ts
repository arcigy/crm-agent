'use server';

import { createClient } from '@/lib/supabase-server';
import { getCalendarClient, refreshAccessToken } from '@/lib/google';

export async function getCalendarConnectionStatus() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { isConnected: false };

        const { data: tokens, error } = await supabase
            .from('google_tokens')
            .select('user_id')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        return { isConnected: !!tokens && !error };
    } catch (error) {
        return { isConnected: false };
    }
}

export async function getCalendarEvents(timeMin?: string, timeMax?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'Unauthorized' };

        // 1. Fetch Projects from Supabase to show them in calendar
        const { data: projectData } = await supabase
            .from('projects')
            .select(`
                *,
                contacts:contact_id (
                    first_name,
                    last_name
                )
            `)
            .is('deleted_at', null);

        const projectEvents: any[] = [];
        if (projectData) {
            projectData.forEach(p => {
                const contactName = p.contacts ? `${p.contacts.first_name} ${p.contacts.last_name}` : 'N/A';

                // Add creation date event
                projectEvents.push({
                    id: `p-start-${p.id}`,
                    title: `🚀 Start: ${p.project_type} (${contactName})`,
                    description: `Nový projekt pre ${contactName}.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                    start: new Date(p.date_created),
                    end: new Date(new Date(p.date_created).getTime() + 60 * 60 * 1000), // 1h duration
                    allDay: false,
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    location: 'CRM Projects',
                    type: 'project'
                });

                // Add end date event if exists
                if (p.end_date) {
                    projectEvents.push({
                        id: `p-end-${p.id}`,
                        title: `🏁 Deadline: ${p.project_type} (${contactName})`,
                        description: `Deadline projektu pre ${contactName}.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                        start: new Date(p.end_date),
                        end: new Date(new Date(p.end_date).getTime() + 60 * 60 * 1000),
                        allDay: true,
                        color: 'bg-amber-50 text-amber-700 border-amber-200',
                        location: 'CRM Projects',
                        type: 'project'
                    });
                }
            });
        }

        // 2. Fetch Google Calendar Tokens
        const { data: tokens, error } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        let googleEvents: any[] = [];
        if (tokens && !error) {
            let accessToken = tokens.access_token;
            if (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60000) {
                if (tokens.refresh_token) {
                    const newTokens = await refreshAccessToken(tokens.refresh_token);
                    accessToken = newTokens.access_token!;
                    await supabase.from('google_tokens').update({
                        access_token: accessToken,
                        expiry_date: newTokens.expiry_date,
                        updated_at: new Date().toISOString()
                    }).eq('user_id', user.id);
                }
            }

            const calendar = getCalendarClient(accessToken);
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin || new Date().toISOString(),
                timeMax: timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });

            googleEvents = response.data.items?.map(e => ({
                id: e.id,
                title: e.summary,
                description: e.description,
                start: new Date(e.start?.dateTime || e.start?.date!),
                end: new Date(e.end?.dateTime || e.end?.date!),
                allDay: !e.start?.dateTime,
                color: 'bg-blue-50 text-blue-700 border-blue-200',
                location: e.location,
                googleEventId: e.id,
                type: 'google'
            })) || [];
        }

        return {
            success: true,
            events: [...googleEvents, ...projectEvents],
            isConnected: !!tokens
        };
    } catch (error: any) {
        console.error('Calendar Fetch Error:', error);
        return { success: false, error: error.message };
    }
}

export async function disconnectGoogle() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false };

        await supabase.from('google_tokens').update({ deleted_at: new Date().toISOString() }).eq('user_id', user.id);
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function createCalendarEvent(eventData: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'Unauthorized' };

        // Fetch tokens
        const { data: tokens, error } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

        if (error || !tokens) {
            return { success: false, error: 'Google Calendar not connected' };
        }

        let accessToken = tokens.access_token;
        // Refresh check
        if (tokens.expiry_date && Date.now() > Number(tokens.expiry_date) - 60000) {
            if (tokens.refresh_token) {
                const newTokens = await refreshAccessToken(tokens.refresh_token);
                accessToken = newTokens.access_token!;
                await supabase.from('google_tokens').update({
                    access_token: accessToken,
                    expiry_date: newTokens.expiry_date,
                    updated_at: new Date().toISOString()
                }).eq('user_id', user.id);
            }
        }

        const calendar = getCalendarClient(accessToken);
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: eventData.summary,
                description: eventData.description,
                start: { dateTime: eventData.start },
                end: { dateTime: eventData.end },
                location: eventData.location,
            },
        });

        return { success: true, event: response.data };
    } catch (error: any) {
        console.error('Calendar Create Error:', error);
        return { success: false, error: error.message };
    }
}
