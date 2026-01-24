import { NextResponse } from 'next/server';
import { getCalendarClient, refreshAccessToken } from '@/lib/google';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Získame tokeny z DB
        const { data: tokenData, error: tokenError } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Not connected', isConnected: false }, { status: 200 });
        }

        // Vytvoríme kalendár klienta
        let accessToken = tokenData.access_token;
        const expiryDate = tokenData.expiry_date;

        // Ak je token expirovaný, refreshneme ho
        if (expiryDate && expiryDate < Date.now() && tokenData.refresh_token) {
            const newTokens = await refreshAccessToken(tokenData.refresh_token);
            accessToken = newTokens.access_token!;

            // Update v DB
            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expiry_date: newTokens.expiry_date,
                updated_at: new Date().toISOString()
            }).eq('user_id', user.id);
        }

        const calendar = getCalendarClient(accessToken, tokenData.refresh_token);

        // Získame udalosti (napr. na posledných 30 dní a nasledujúcich 60 dní)
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);

        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 60);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items?.map(event => ({
            id: event.id,
            title: event.summary,
            description: event.description || '',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
            location: event.location || '',
            googleEventId: event.id,
        })) || [];

        return NextResponse.json({ events, isConnected: true });
    } catch (error) {
        console.error('Fetch calendar events error:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { title, description, start, end, location } = body;

        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokenData) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

        const calendar = getCalendarClient(tokenData.access_token, tokenData.refresh_token);

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: title,
                description,
                start: { dateTime: start },
                end: { dateTime: end },
                location,
            },
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Create event error:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { eventId, title, description, start, end, location } = body;

        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokenData) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

        const calendar = getCalendarClient(tokenData.access_token, tokenData.refresh_token);

        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            requestBody: {
                summary: title,
                description,
                start: { dateTime: start },
                end: { dateTime: end },
                location,
            },
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Update event error:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokenData) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

        const calendar = getCalendarClient(tokenData.access_token, tokenData.refresh_token);

        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete event error:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
