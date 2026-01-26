import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { generateAvailableSlots, AvailabilityWindow } from '@/lib/booking';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get('date'); // yyyy-MM-dd
        const slug = searchParams.get('slug'); // intro-30

        if (!dateStr || !slug) {
            return NextResponse.json({ error: 'Missing date or slug' }, { status: 400 });
        }

        // 1. Get Booking Type from Directus
        // @ts-ignore
        const bookingTypes = await directus.request(readItems('booking_types', {
            filter: { slug: { _eq: slug } },
            limit: 1
        }));

        const bookingType = bookingTypes?.[0];
        if (!bookingType) return NextResponse.json({ error: 'Booking type not found' }, { status: 404 });

        // Default availability if not defined in DB (9:00 - 17:00 Mon-Fri)
        const defaultAvailability: AvailabilityWindow[] = [1, 2, 3, 4, 5].map(day => ({
            day,
            slots: [{ start: '09:00', end: '17:00' }]
        }));

        const availability = bookingType.availability_json || defaultAvailability;
        const duration = bookingType.duration || 30;

        // 2. Get Busy Slots from Google (via Clerk)
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        let busySlots: { start: string, end: string }[] = [];
        if (token) {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: token });
            const calendar = google.calendar({ version: 'v3', auth });

            const start = new Date(dateStr);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateStr);
            end.setHours(23, 59, 59, 999);

            const freeBusyRes = await calendar.freebusy.query({
                requestBody: {
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                    items: [{ id: 'primary' }]
                }
            });

            busySlots = (freeBusyRes.data.calendars?.primary?.busy || []).map((b: any) => ({
                start: b.start,
                end: b.end
            }));
        }

        // 3. Generate Free Slots
        const targetDate = new Date(dateStr);
        const freeSlots = generateAvailableSlots(targetDate, duration, availability as AvailabilityWindow[], busySlots);

        return NextResponse.json({
            date: dateStr,
            duration,
            slots: freeSlots
        });

    } catch (error: any) {
        console.error('Booking API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
