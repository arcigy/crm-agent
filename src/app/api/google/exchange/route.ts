import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem } from '@directus/sdk';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        console.log('🔄 Exchange API: Swapping code for tokens...');

        let tokens;
        try {
            // NOTE: The Redirect URI in google.ts MUST match the frontend page URL
            tokens = await getTokensFromCode(code);
        } catch (tokenErr: any) {
            console.error('Token Exchange Failed:', tokenErr);
            return NextResponse.json({ error: tokenErr.message }, { status: 400 });
        }

        // Setup Auth client for User Info
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth });
        const userInfo = await oauth2.userinfo.get();

        if (!userInfo.data.email) {
            return NextResponse.json({ error: 'No email found in Google Profile' }, { status: 400 });
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
            // @ts-ignore
            await directus.request(createItem('google_tokens', tokenData));
        }

        return NextResponse.json({ success: true, email: userEmail });

    } catch (error: any) {
        console.error('🚨 POST Exchange Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
