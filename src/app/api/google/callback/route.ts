import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem } from '@directus/sdk';
import { google } from 'googleapis';

// FORCE DYNAMIC - Critical for Railway deployment to recognize this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Determine base URL safely at the very beginning
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

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

        if (error) {
            return redirectError('Google Error Received', error);
        }

        if (!code) {
            return redirectError('No authorization code received.');
        }

        console.log('🔄 Exchanging code for tokens...');

        let tokens;
        try {
            tokens = await getTokensFromCode(code);
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
            console.error('No email in user profile');
            return redirectError('Could not retrieve email from Google Profile.');
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
            console.log('🔄 Updating existing token entry...');
            if (!tokenData.refresh_token) {
                delete tokenData.refresh_token;
            }
            // @ts-ignore
            await directus.request(updateItem('google_tokens', existingTokens[0].id, tokenData));
        } else {
            console.log('✨ Creating new token entry...');
            if (!tokenData.refresh_token) {
                console.warn('⚠️ Warning: No refresh token received for new user.');
            }
            // @ts-ignore
            await directus.request(createItem('google_tokens', tokenData));
        }

        console.log('✅ Google Auth complete. Redirecting...');

        const redirectPath = decodeURIComponent(state);
        const finalPath = redirectPath.startsWith('/') ? redirectPath : '/dashboard';

        return NextResponse.redirect(`${baseUrl}${finalPath}?google_connected=true`);

    } catch (error: any) {
        console.error('🚨 Google Callback Crash:', error);
        return redirectError('Authentication Crashed', error.message || String(error));
    }
}
