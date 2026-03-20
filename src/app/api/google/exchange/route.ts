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
        console.log('[Exchange] Token keys received:', Object.keys(tokens));
        console.log('[Exchange] Has refresh_token:', !!tokens.refresh_token);
        
        const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

        // 2. Save to Directus (google_tokens table)
        // Check if exists
        const existing = await directus.request(readItems('google_tokens', {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        }));

        const tokenData: any = {
            user_id: user.id,
            user_email: userEmail,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            date_updated: new Date().toISOString()
        };

        if (tokens.refresh_token) {
            tokenData.refresh_token = tokens.refresh_token;
        }

        if (Array.isArray(existing) && existing.length > 0) {
            await directus.request(updateItem('google_tokens', existing[0].id, tokenData));
        } else {
            // @ts-expect-error - Directus SDK types
            await directus.request(createItem('google_tokens', {
                ...tokenData,
                date_created: new Date().toISOString()
            }));
        }

        // Also update PostgreSQL directly for consistency with background sync
        try {
            const { db } = await import('@/lib/db');
            const expiryMs = tokens.expiry_date; 
            if (tokens.refresh_token) {
                await db.query(`
                    UPDATE google_tokens
                    SET 
                        refresh_token = $1,
                        access_token = $2,
                        expiry_date = $3,
                        date_updated = NOW()
                    WHERE user_email = $4
                `, [tokens.refresh_token, tokens.access_token, expiryMs, userEmail]);
                console.log('[Exchange] Saved refresh_token to PostgreSQL');
            } else {
                await db.query(`
                    UPDATE google_tokens
                    SET 
                        access_token = $1,
                        expiry_date = $2,
                        date_updated = NOW()
                    WHERE user_email = $3
                `, [tokens.access_token, expiryMs, userEmail]);
            }
        } catch (dbErr) {
            console.error('[Exchange] Failed to update PostgreSQL:', dbErr);
        }

        // 3. Trigger Gmail Watch Registration
        try {
            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });
            const gmail = google.gmail({ version: 'v1', auth });
            
            console.log(`[AUTH] Registering Gmail watch for ${userEmail}...`);
            const watchRes = await gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName: process.env.GOOGLE_PUBSUB_TOPIC,
                    labelIds: ['INBOX']
                }
            });

            if (watchRes.data.expiration) {
                const expirationDate = new Date(parseInt(watchRes.data.expiration)).toISOString();
                // Update the token record with expiration
                const latestToken = await directus.request(readItems('google_tokens', {
                    filter: { user_id: { _eq: user.id } },
                    limit: 1
                }));
                if (Array.isArray(latestToken) && latestToken.length > 0) {
                    await directus.request(updateItem('google_tokens', latestToken[0].id, {
                        gmail_watch_expiry: expirationDate
                    }));
                }
                console.log(`[AUTH] Gmail watch registered. Expires: ${expirationDate}`);
            }
        } catch (watchErr) {
            console.error('[AUTH] Failed to register Gmail watch immediately:', watchErr);
            // Non-critical, cron will catch it later
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Exchange error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
