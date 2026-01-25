import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    // Encode redirect URL into state so we can redirect back after success
    // Format: "redirect_url|random_string" (could be more complex state)
    const state = encodeURIComponent(redirectUrl);

    const url = getAuthUrl(state);

    // If it's an AJAX call expecting JSON
    if (request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json({ authUrl: url });
    }

    // Otherwise redirect directly
    return NextResponse.redirect(url);
}
