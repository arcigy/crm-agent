import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ isConnected: false, error: 'User not authenticated' }, { status: 401 });
        }

        // 1. Get Google Events via Clerk
        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        let googleEvents: any[] = [];
        let isConnected = false;

        if (token) {
            isConnected = true;
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: token });
            const calendar = google.calendar({ version: 'v3', auth });

            const now = new Date();
            const threeMonthsLater = new Date();
            threeMonthsLater.setMonth(now.getMonth() + 3);

            try {
                const listRes = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: now.toISOString(),
                    timeMax: threeMonthsLater.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 100
                });

                googleEvents = (listRes.data.items || []).map((e: any) => ({
                    id: e.id,
                    title: e.summary || '(Bez názvu)',
                    start: e.start.dateTime || e.start.date,
                    end: e.end.dateTime || e.end.date,
                    description: e.description || '',
                    location: e.location || '',
                    allDay: !e.start.dateTime,
                    color: 'bg-blue-50 text-blue-700 border-blue-200',
                    type: 'google'
                }));
            } catch (err) {
                console.error('Error fetching from Google Calendar:', err);
                // We keep going, maybe user revoked access but Clerk still has the token
            }
        }

        // 2. Get CRM Project events from Directus
        let projectEvents: any[] = [];
        try {
            // @ts-ignore
            const projectData = await directus.request(readItems('projects', {
                filter: { deleted_at: { _null: true } },
            }));

            if (projectData) {
                // @ts-ignore
                for (const p of projectData) {
                    projectEvents.push({
                        id: `p-start-${p.id}`,
                        title: `🚀 Start: ${p.project_type}`,
                        description: `Nový projekt.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                        start: p.date_created,
                        end: new Date(new Date(p.date_created).getTime() + 60 * 60 * 1000).toISOString(),
                        allDay: false,
                        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        location: 'CRM Projects',
                        type: 'project'
                    });

                    if (p.end_date) {
                        projectEvents.push({
                            id: `p-end-${p.id}`,
                            title: `🏁 Deadline: ${p.project_type}`,
                            description: `Deadline projektu.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                            start: p.end_date,
                            end: new Date(new Date(p.end_date).getTime() + 60 * 60 * 1000).toISOString(),
                            allDay: true,
                            color: 'bg-amber-50 text-amber-700 border-amber-200',
                            location: 'CRM Projects',
                            type: 'project'
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching projects for calendar:', err);
        }

        return NextResponse.json({
            isConnected,
            events: [...googleEvents, ...projectEvents]
        });

    } catch (error: any) {
        console.error('Calendar API Crash:', error);
        return NextResponse.json({ isConnected: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });

        const body = await req.json();

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });
        const calendar = google.calendar({ version: 'v3', auth });

        const result = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: body.summary,
                description: body.description,
                location: body.location,
                start: { dateTime: body.start },
                end: { dateTime: body.end },
            },
        });

        return NextResponse.json({ success: true, event: result.data });

    } catch (error: any) {
        console.error('Calendar Create Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
