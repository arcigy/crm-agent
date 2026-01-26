import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';
import directus from '@/lib/directus';
import { readItems, updateItem, createItem } from '@directus/sdk';
import { google } from 'googleapis';

// FORCE DYNAMIC - Critical
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Determine base URL safely
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    // Explicitly log into URL for easy debugging
    const redirectError = (msg: string, details?: string) => {
        const errParam = encodeURIComponent(msg);
        const detailParam = details ? `&details=${encodeURIComponent(details)}` : '';
        return NextResponse.redirect(`${baseUrl}/dashboard?error=${errParam}${detailParam}`);
    };

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state') || '/dashboard';
        const error = searchParams.get('error');

        // Check for Google-reported errors
        if (error) {
            console.error('Google returned error:', error);
            return redirectError('Google Error', error);
        }

        if (!code) {
            return redirectError('No authorization code received.');
        }

        console.log('🔄 Exchanging code for tokens (NEW ROUTE)...');

        let tokens;
        try {
            // NOTE: We need to make sure getTokensFromCode uses the correct REDIRECT URI
            // which is now .../api/oauth/google
            tokens = await getTokensFromCode(code);
        } catch (tokenErr: any) {
            console.error('Token Exchange Failed:', tokenErr);
            return redirectError('Token Exchange Failed', tokenErr.message);
        }

        console.log('✅ Tokens received.');

        // Setup Auth client for User Info
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

        // Directus Write Logic
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
            if (!tokenData.refresh_token) console.warn('⚠️ No refresh token (new user)');
            // @ts-ignore
            await directus.request(createItem('google_tokens', tokenData));
        }

        console.log('✅ Google Auth complete. Redirecting...');

        const redirectPath = decodeURIComponent(state);
        const finalPath = redirectPath.startsWith('/') ? redirectPath : '/dashboard';

        return NextResponse.redirect(`${baseUrl}${finalPath}?google_connected=true`);

    } catch (error: any) {
        console.error('🚨 Auth Crash:', error);
        return redirectError('Authentication Crashed', error.message);
    }
}
