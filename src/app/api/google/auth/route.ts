import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const redirectUrl = searchParams.get('redirect') || '/dashboard';

        // Encode redirect URL into state so we can redirect back after success
        // Format: "redirect_url|random_string" (could be more complex state)
        const state = encodeURIComponent(redirectUrl);

        console.log('Generating Google Auth URL...');
        const url = getAuthUrl(state);
        console.log('Auth URL generated successfully');

        // If it's an AJAX call expecting JSON (which our button does)
        return NextResponse.json({ authUrl: url });

    } catch (error: any) {
        console.error('Google Auth Route Error:', error);
        return NextResponse.json({
            error: 'Failed to generate auth URL',
            details: error.message
        }, { status: 500 });
    }
}
