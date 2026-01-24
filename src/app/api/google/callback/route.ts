import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Toto je user_id, ktoré sme poslali

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=no_code`);
    }

    try {
        const supabase = await createClient();

        // Získame tokeny od Google
        const tokens = await getTokensFromCode(code);

        // Uložíme tokeny do Supabase pre daného používateľa
        const { error } = await supabase
            .from('google_tokens')
            .upsert({
                user_id: state,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
                deleted_at: null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Supabase store token error:', error);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=db_error`);
        }

        // Presmerujeme používateľa späť na kalendár
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?success=connected`);
    } catch (error) {
        console.error('Google callback error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=auth_failed`);
    }
}
