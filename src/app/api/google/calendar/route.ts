import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userEmail = user.emailAddresses[0]?.emailAddress;
        const { getValidToken, getCalendarClient } = await import("@/lib/google");
        const token = await getValidToken(user.id, userEmail);

        if (!token) return NextResponse.json({ isConnected: false, error: 'Google account not linked or token expired' });

        let googleEvents: any[] = [];
        let isConnected = !!token;

        if (token) {
            const calendar = await getCalendarClient(token);

            const now = new Date();
            const timeMax = new Date();
            timeMax.setMonth(now.getMonth() + 3);

            try {
                const listRes = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: now.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 250
                });

                googleEvents = (listRes.data.items || []).map((e: any) => ({
                    id: e.id,
                    title: e.summary || '(Bez názvu)',
                    start: e.start?.dateTime || e.start?.date,
                    end: e.end?.dateTime || e.end?.date,
                    description: e.description || '',
                    location: e.location || '',
                    allDay: !e.start?.dateTime,
                    color: 'google',
                    type: 'google'
                }));
            } catch (err) {
                console.error('Calendar Fetch Failed:', err);
                isConnected = false;
            }
        }

        let projectEvents: any[] = [];
        try {
            const projects = await directus.request(readItems('projects', {
                filter: { deleted_at: { _null: true } },
                fields: ['*', 'contact_id.*'] as any,
                limit: 100
            }));

            if (projects) {
                projectEvents = (projects as any[]).map(p => ({
                    id: `p-${p.id}`,
                    title: `📦 ${p.name || p.project_type}`,
                    start: p.end_date || p.date_created,
                    end: p.end_date || p.date_created,
                    allDay: true,
                    color: 'project',
                    description: `Klient: ${p.contact_id?.first_name || p.contact_name || 'Neznámy'} ${p.contact_id?.last_name || ''}\nStatus: ${p.stage}\nTyp: ${p.project_type}`,
                    type: 'project',
                    contact: p.contact_id
                }));
            }
        } catch (e) {
            console.error('Directus project fetch failed:', e);
        }

        return NextResponse.json({
            isConnected,
            events: [...googleEvents, ...projectEvents]
        });

    } catch (error: any) {
        return NextResponse.json({ isConnected: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userEmail = user.emailAddresses[0]?.emailAddress;
        const { getValidToken, getCalendarClient } = await import("@/lib/google");
        const token = await getValidToken(user.id, userEmail);

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        const { action, eventData } = await req.json();
        const calendar = await getCalendarClient(token);

        if (action === 'create') {
            const result = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: eventData.summary,
                    description: eventData.description,
                    location: eventData.location,
                    start: { dateTime: eventData.start },
                    end: { dateTime: eventData.end },
                },
            });
            return NextResponse.json({ success: true, event: result.data });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
