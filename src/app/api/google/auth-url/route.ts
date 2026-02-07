import { NextResponse } from 'next/server';
import { getAuthUrl, getBaseUrl } from '@/lib/google';

export async function GET(req: Request) {
    try {
        const baseUrl = getBaseUrl();
        const redirectUri = `${baseUrl}/oauth-callback`;
        const url = getAuthUrl(undefined, redirectUri);
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
