import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'alive',
        message: 'Google integration endpoint is reachable',
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
        has_client_id: !!process.env.GOOGLE_CLIENT_ID,
        has_client_secret: !!process.env.GOOGLE_CLIENT_SECRET
    });
}
