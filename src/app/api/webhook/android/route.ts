import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { createItem } from '@directus/sdk';

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Expected payload format from MacroDroid/Tasker:
        const { type, number, body, duration, direction, timestamp, ...extra } = payload;

        if (!type || !number) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Normalize phone number (remove spaces, etc.)
        const cleanNumber = number.replace(/\s/g, '');

        // 2. Save to Directus
        // @ts-ignore
        await directus.request(createItem('android_logs', {
            type,
            phone_number: cleanNumber,
            body: body || null,
            duration: duration || 0,
            direction: direction || null,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            extra_data: extra || {}
        }));

        return NextResponse.json({ success: true, message: 'Log saved' });

    } catch (error: any) {
        console.error('Android Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
