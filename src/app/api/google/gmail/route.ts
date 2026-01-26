import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ isConnected: false, error: 'User not authenticated' }, { status: 401 });
        }

        // Get the Google Access Token from Clerk
        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');

        const token = response.data[0]?.token;

        if (!token) {
            return NextResponse.json({ isConnected: false, message: 'Google account not linked via Clerk' });
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const gmail = google.gmail({ version: 'v1', auth });

        // Fetch messages
        const listRes = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            q: '-category:promotions -category:social'
        });

        const messages = await Promise.all(
            (listRes.data.messages || []).map(async (m) => {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: m.id!,
                    format: 'full'
                });

                const headers = detail.data.payload?.headers;
                const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
                const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
                const date = headers?.find(h => h.name === 'Date')?.value || '';

                // Simple snippet/body extraction
                let body = detail.data.snippet || '';

                return {
                    id: m.id,
                    threadId: m.threadId,
                    subject,
                    from,
                    date,
                    snippet: detail.data.snippet,
                    body: body,
                    isRead: !detail.data.labelIds?.includes('UNREAD')
                };
            })
        );

        return NextResponse.json({ isConnected: true, messages });

    } catch (error: any) {
        console.error('Gmail Fetch Error:', error);
        return NextResponse.json({ isConnected: false, error: error.message }, { status: 500 });
    }
}
