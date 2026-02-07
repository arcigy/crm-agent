import { NextResponse } from 'next/server';
import { getAuthUrl, getRedirectUrl } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const redirectUri = getRedirectUrl();
        const url = getAuthUrl(undefined, redirectUri);
        return NextResponse.json({ url, debug_redirect_uri: redirectUri });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
