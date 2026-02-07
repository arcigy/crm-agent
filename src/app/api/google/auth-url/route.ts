import { NextResponse } from 'next/server';
import { getAuthUrl, getRedirectUrl } from '@/lib/google';

export async function GET(req: Request) {
    try {
        const redirectUri = getRedirectUrl();
        const url = getAuthUrl(undefined, redirectUri);
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
