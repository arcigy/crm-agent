import { NextResponse } from 'next/server';
import { classifyEmail } from '@/app/actions/ai';
import directus from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Flexible payload structure to support various forwarders
        const user_email = payload.user_email || payload.to || payload.recipient;
        const content = payload.content || payload.body || payload.text || payload.html;
        const sender = payload.sender || payload.from;
        const subject = payload.subject || 'No Subject';
        const message_id = payload.message_id || payload.id;

        console.log(`[Webhook] Incoming Email Analysis Request for: ${user_email}`);

        if (!user_email || !content) {
            return NextResponse.json({ error: 'Missing required fields (user_email/account, content)' }, { status: 400 });
        }

        // 1. Analyze using the shared action (which handles User System Prompts)
        const classification = await classifyEmail(content, user_email, sender, subject);

        if (!classification) {
            return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
        }

        // 2. Persist Result to Directus
        // First, attempt to find a relevant contact to link this activity to
        let contactId = null;
        try {
            // @ts-ignore
            const contacts = await directus.request(readItems('contacts', {
                filter: { email: { _eq: sender } },
                limit: 1
            }));
            if (contacts && contacts.length > 0) contactId = contacts[0].id;
        } catch (e) {
            console.warn('[Webhook] Contact lookup failed or no contact found:', e);
        }

        // Save to Activities table
        try {
            // @ts-ignore
            await directus.request(createItem('activities', {
                type: 'ai_analysis', // Special type for these logs
                subject: `AI Analysis: ${subject.substring(0, 100)}`,
                content: `
Classification:
${JSON.stringify(classification, null, 2)}

Original Message ID: ${message_id}
Sender: ${sender}
                `.trim(),
                contact_id: contactId,
                activity_date: new Date().toISOString(),
            }));
            console.log('[Webhook] Analysis persisted to Directus Activities');
        } catch (e) {
            console.error('[Webhook] Failed to save activity to Directus:', e);
            // We return success anyway because the analysis itself worked, but warn about storage
            return NextResponse.json({ success: true, classification, warning: 'Failed to persist to DB' });
        }

        return NextResponse.json({ success: true, classification });

    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
