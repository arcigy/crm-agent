import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(req: Request) {
    try {
        const { origin } = new URL(req.url);
        const redirectUri = `${origin}/oauth-callback`;
        const url = getAuthUrl(undefined, redirectUri);
        return NextResponse.json({ url, debug_redirect_uri: redirectUri });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
