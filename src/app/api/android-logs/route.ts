import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('android_logs')
            .select('*')
            .is('deleted_at', null)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({ success: true, logs: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
