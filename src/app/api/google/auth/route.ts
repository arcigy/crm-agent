import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Použijeme user ID ako state pre bezpečnosť
        const authUrl = getAuthUrl(user.id);

        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error('Google auth error:', error);
        return NextResponse.json(
            { error: 'Failed to generate auth URL' },
            { status: 500 }
        );
    }
}
