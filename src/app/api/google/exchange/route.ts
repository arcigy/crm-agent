import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem } from '@directus/sdk';
import { getTokensFromCode } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { code } = await req.json();
        if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

        // 1. Exchange code for tokens (using unified redirect URI internally)
        const tokens = await getTokensFromCode(code);
        
        const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

        // 2. Save to Directus (google_tokens table)
        // Check if exists
        const existing = await directus.request(readItems('google_tokens', {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        }));

        const tokenData = {
            user_id: user.id,
            user_email: userEmail,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            date_updated: new Date().toISOString()
        };

        if (Array.isArray(existing) && existing.length > 0) {
            await directus.request(updateItem('google_tokens', existing[0].id, tokenData));
        } else {
            // @ts-expect-error - Directus SDK types
            await directus.request(createItem('google_tokens', {
                ...tokenData,
                date_created: new Date().toISOString()
            }));
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Exchange error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
