import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem } from '@directus/sdk';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // 1. HEALTH CHECK MODE
    if (!code && !error) {
        return NextResponse.json({
            status: 'alive',
            mode: 'status_check',
            timestamp: new Date().toISOString(),
            env_check: {
                app_url: process.env.NEXT_PUBLIC_APP_URL || 'missing',
                google_id_set: !!process.env.GOOGLE_CLIENT_ID
            }
        });
    }

    // 2. AUTH CALLBACK MODE
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectError = (msg: string, details?: string) => {
        const errParam = encodeURIComponent(msg);
        const detailParam = details ? `&details=${encodeURIComponent(details)}` : '';
        return NextResponse.redirect(`${baseUrl}/dashboard?error=${errParam}${detailParam}`);
    };

    if (error) {
        return redirectError('Google Error Received', error);
    }

    try {
        console.log('🔄 [Status Route] Handling Auth Callback...');

        let tokens;
        try {
            // This will use the NEW redirect URI (.../api/google/status)
            tokens = await getTokensFromCode(code as string);
        } catch (tokenErr: any) {
            console.error('Token Exchange Failed:', tokenErr);
            return redirectError('Token Exchange Failed', tokenErr.message);
        }

        console.log('✅ Tokens received.');

        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth });
        const userInfo = await oauth2.userinfo.get();

        if (!userInfo.data.email) {
            return redirectError('Could not retrieve email form Google Profile.');
        }

        const userEmail = userInfo.data.email;
        console.log(`👤 Identifying user: ${userEmail}`);

        // @ts-ignore
        const existingTokens = await directus.request(readItems('google_tokens', {
            filter: { user_email: { _eq: userEmail } },
            limit: 1
        }));

        const tokenData = {
            user_email: userEmail,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: typeof tokens.scope === 'string' ? tokens.scope : JSON.stringify(tokens.scope),
            expiry_date: tokens.expiry_date,
            date_updated: new Date().toISOString()
        };

        if (existingTokens && existingTokens.length > 0) {
            if (!tokenData.refresh_token) delete tokenData.refresh_token;
            // @ts-ignore
            await directus.request(updateItem('google_tokens', existingTokens[0].id, tokenData));
        } else {
            // @ts-ignore
            await directus.request(createItem('google_tokens', tokenData));
        }

        console.log('✅ Google Auth complete. Redirecting...');

        return NextResponse.redirect(`${baseUrl}/dashboard?google_connected=true`);

    } catch (error: any) {
        console.error('🚨 Auth Crash:', error);
        return redirectError('Authentication Crashed', error.message);
    }
}
