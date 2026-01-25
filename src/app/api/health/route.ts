import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env_check: {
            app_url: process.env.NEXT_PUBLIC_APP_URL || 'missing',
            google_id_set: !!process.env.GOOGLE_CLIENT_ID
        }
    });
}
