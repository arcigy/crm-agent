import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            console.log('[Gmail API] No current user found.');
            return NextResponse.json({ isConnected: false, error: 'User not authenticated' }, { status: 401 });
        }

        // Get the Google Access Token from Clerk
        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');

        console.log(`[Gmail API] Clerk found ${response.data.length} Google tokens for user ${user.id}`);

        const token = response.data[0]?.token;

        if (!token) {
            console.log('[Gmail API] NO TOKEN FOUND in Clerk for this user. Need to re-link.');
            return NextResponse.json({ isConnected: false, message: 'Google account not linked via Clerk' });
        }

        // Check scopes
        const scopes = response.data[0]?.scopes || [];
        console.log('[Gmail API] Token found. Scopes:', scopes);

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const gmail = google.gmail({ version: 'v1', auth });

        // Fetch messages
        console.log('[Gmail API] Fetching messages from Google...');
        const listRes = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 15,
            q: '-category:promotions -category:social'
        });

        if (!listRes.data.messages) {
            console.log('[Gmail API] No messages returned from Google.');
            return NextResponse.json({ isConnected: true, messages: [] });
        }

        const messages = await Promise.all(
            (listRes.data.messages || []).map(async (m) => {
                try {
                    const detail = await gmail.users.messages.get({
                        userId: 'me',
                        id: m.id!,
                        format: 'full'
                    });

                    const headers = detail.data.payload?.headers;
                    const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
                    const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
                    const date = headers?.find(h => h.name === 'Date')?.value || '';

                    return {
                        id: m.id,
                        threadId: m.threadId,
                        subject,
                        from,
                        date,
                        snippet: detail.data.snippet,
                        body: detail.data.snippet || '', // Simplify body for now to snippet
                        isRead: !detail.data.labelIds?.includes('UNREAD')
                    };
                } catch (e) {
                    console.error(`Error fetching message ${m.id}:`, e);
                    return null;
                }
            })
        );

        const validMessages = messages.filter(m => m !== null);
        console.log(`[Gmail API] Successfully processed ${validMessages.length} messages.`);

        return NextResponse.json({ isConnected: true, messages: validMessages });

    } catch (error: any) {
        console.error('🚨 [Gmail API] Crash:', error);
        return NextResponse.json({ isConnected: false, error: error.message }, { status: 500 });
    }
}
