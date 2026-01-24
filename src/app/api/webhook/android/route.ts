import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Expected payload format from MacroDroid/Tasker:
        // {
        //   "type": "sms" | "call",
        //   "number": "+421...",
        //   "body": "Hello...", (for SMS)
        //   "duration": 60, (for calls)
        //   "direction": "incoming",
        //   "timestamp": "2023-..." (Optional)
        //   ... extra fields
        // }

        const { type, number, body, duration, direction, timestamp, ...extra } = payload;

        if (!type || !number) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Normalize phone number (remove spaces, etc.)
        const cleanNumber = number.replace(/\s/g, '');

        // 2. Try to find contact ID (Lookup in Directus or Supabase - assuming Supabase for now as per rules)
        // Note: In a real scenario, we'd check our database for a contact with this number

        // 3. Save to Supabase
        const { data, error } = await supabase
            .from('android_logs')
            .insert([{
                type,
                phone_number: cleanNumber,
                body: body || null,
                duration: duration || 0,
                direction: direction || null,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                extra_data: extra || {}
            }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Log saved' });

    } catch (error: any) {
        console.error('Android Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
