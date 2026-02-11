import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized (No Clerk User)' }, { status: 401 });

        const userEmail = user.emailAddresses[0]?.emailAddress;
        const { getValidToken } = await import("@/lib/google");
        
        console.log(`[Diagnostic] Starting for ${user.id} (${userEmail})`);

        // Check Directus DB
        const dbTokens = await directus.request(readItems('google_tokens', {
            filter: { user_id: { _eq: user.id } },
            limit: 1
        })) as any[];

        const dbStatus = dbTokens && dbTokens.length > 0 ? {
            found: true,
            hasRefreshToken: !!dbTokens[0].refresh_token,
            expiryDate: dbTokens[0].expiry_date,
            isExpired: dbTokens[0].expiry_date ? new Date(dbTokens[0].expiry_date) < new Date() : true
        } : { found: false };

        // Check getValidToken
        const token = await getValidToken(user.id, userEmail);

        // Check Environment Variables (masked)
        const env = {
            clientId: process.env.GOOGLE_CLIENT_ID ? "PRESENT (ends with " + process.env.GOOGLE_CLIENT_ID.slice(-5) + ")" : "MISSING",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "PRESENT (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "MISSING",
            appUrl: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
            nodeEnv: process.env.NODE_ENV
        };

        return NextResponse.json({
            success: true,
            userId: user.id,
            userEmail,
            dbStatus,
            hasTokenReturned: !!token,
            tokenType: typeof token,
            env,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Diagnostic] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}
