import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        let token = response.data[0]?.token;

        // Fallback to Directus
        if (!token) {
            const { default: directus } = await import('@/lib/directus');
            const { readItems } = await import('@directus/sdk');
            const dbTokens = await directus.request(readItems('google_tokens', {
                filter: { user_id: { _eq: user.id } },
                limit: 1
            })) as any[];
            if (dbTokens && dbTokens[0]) {
                token = dbTokens[0].access_token;
            }
        }

        if (!token) return NextResponse.json({ isConnected: false });

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const people = google.people({ version: 'v1', auth });

        const res = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 100,
            personFields: 'names,emailAddresses,phoneNumbers,organizations',
        });

        const contacts = (res.data.connections || []).map(person => {
            const name = person.names?.[0]?.displayName || 'Unknown';
            const email = person.emailAddresses?.[0]?.value || '';
            const phone = person.phoneNumbers?.[0]?.value || '';
            const company = person.organizations?.[0]?.name || '';

            return { name, email, phone, company };
        });

        return NextResponse.json({ isConnected: true, contacts });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
