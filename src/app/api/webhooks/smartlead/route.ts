
import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItems } from '@directus/sdk';

/**
 * SMARTLEAD WEBHOOK HANDLER
 * This endpoint receives real-time updates from SmartLead AI.
 * Recommended Event: Email Replied
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        console.log("[SmartLead Webhook] Received payload:", payload);

        // SmartLead Webhook payload typically contains:
        // event_type: "email_replied"
        // lead_email: "client@example.com"
        // campaign_id: 12345
        
        const eventType = payload.event_type;
        const email = payload.lead_email || payload.email;

        if (!email) {
            return NextResponse.json({ success: false, message: "No email found in payload" }, { status: 400 });
        }

        if (eventType === 'email_replied' || eventType === 'REPLY_RECEIVED') {
            console.log(`[SmartLead Webhook] Marking ${email} as replied.`);
            
            // 1. Find the lead in our CRM
            const leads = await directus.request(readItems('cold_leads', {
                filter: { email: { _eq: email } },
                limit: 1
            })) as any[];

            if (leads.length > 0) {
                // 2. Update status to 'replied'
                await directus.request(updateItems('cold_leads', [leads[0].id], {
                    status: 'replied',
                    comment: `Automaticky označené cez SmartLead Webhook (${new Date().toLocaleString()})`
                }));
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[SmartLead Webhook] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
