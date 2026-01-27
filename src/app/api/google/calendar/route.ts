import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ isConnected: false, error: 'User not authenticated' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        let googleEvents: any[] = [];
        let isConnected = !!token;

        if (token) {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: token });
            const calendar = google.calendar({ version: 'v3', auth });

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
                    start: e.start.dateTime || e.start.date,
                    end: e.end.dateTime || e.end.date,
                    description: e.description || '',
                    location: e.location || '',
                    allDay: !e.start.dateTime,
                    color: 'google',
                    type: 'google'
                }));
            } catch (err) {
                console.error('Clerk Token maybe expired or missing scopes:', err);
                isConnected = false;
            }
        }

        // 2. Fetch CRM Projects (The "CRM Calendar")
        let projectEvents: any[] = [];
        try {
            const withTimeout = (promise: Promise<any>, timeoutMs: number) =>
                Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
                ]);

            // @ts-ignore
            const projects = await withTimeout(directus.request(readItems('projects', {
                filter: { deleted_at: { _null: true } },
                limit: 100
            })), 3000);

            if (projects) {
                // @ts-ignore
                projectEvents = (projects as any[]).map(p => ({
                    id: `project-${p.id}`,
                    title: `📦 ${p.project_type}: ${p.contact_name || 'Projekt'}`,
                    start: p.end_date || p.date_created,
                    end: p.end_date || p.date_created,
                    allDay: true,
                    color: 'project',
                    description: `Stav: ${p.stage}`,
                    type: 'project'
                }));
            }
        } catch (e) {
            console.error('Directus project fetch failed or timed out:', e);
            // Non-blocking: continue with google events even if CRM fails
        }

        return NextResponse.json({
            isConnected,
            events: [...googleEvents, ...projectEvents]
        });

    } catch (error: any) {
        return NextResponse.json({ isConnected: false, error: error.message }, { status: 500 });
    }
}

// ACTION: Sync CRM Projects TO Google Calendar
export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        const { action, eventData } = await req.json();

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });
        const calendar = google.calendar({ version: 'v3', auth });

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

        if (action === 'sync_projects') {
            // Logic to push CRM projects to Google if they aren't there
            // For now, we manually trigger a "Sync to Google" per project or full list
            return NextResponse.json({ success: true, message: 'Sync triggered' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
