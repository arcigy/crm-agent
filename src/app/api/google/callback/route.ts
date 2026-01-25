import { NextResponse } from 'next/server';
import { getTokensFromCode, oauth2Client } from '@/lib/google';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem } from '@directus/sdk';
import { google } from 'googleapis';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '/dashboard';

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        // 1. Exchange code for tokens
        const tokens = await getTokensFromCode(code);

        // 2. Get User Info (Email) to identify the user
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        if (!userInfo.data.email) {
            throw new Error('No email found in Google Profile');
        }

        const userEmail = userInfo.data.email;

        // 3. Save/Update tokens in Directus
        // Check if token entry exists for this email
        // @ts-ignore
        const existingTokens = await directus.request(readItems('google_tokens', {
            filter: { user_email: { _eq: userEmail } },
            limit: 1
        }));

        const tokenData = {
            user_email: userEmail,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token, // Might be undefined if re-auth without prompt, but we force prompt='consent'
            scope: tokens.scope,
            expiry_date: tokens.expiry_date, // Timestamp
            date_updated: new Date().toISOString()
        };

        if (existingTokens && existingTokens.length > 0) {
            // Update
            // If refresh_token is missing in new response (it happens on re-auth), keep the old one
            if (!tokenData.refresh_token) {
                delete tokenData.refresh_token;
            }
            // @ts-ignore
            await directus.request(updateItem('google_tokens', existingTokens[0].id, tokenData));
        } else {
            // Create
            if (!tokenData.refresh_token) {
                console.warn('Warning: No refresh token received for new user. Future refreshes will fail.');
            }
            // @ts-ignore
            await directus.request(createItem('google_tokens', tokenData));
        }

        // 4. Redirect back to app
        const redirectUrl = decodeURIComponent(state);
        // Ensure successful redirect
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        const finalUrl = `${baseUrl}${redirectUrl.startsWith('/') ? redirectUrl : '/dashboard'}`;

        return NextResponse.redirect(`${finalUrl}?google_connected=true`);

    } catch (error: any) {
        console.error('Google Callback Error:', error);
        return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
    }
}
