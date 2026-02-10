
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
        const category = payload.category_name || payload.category;

        if (!email) {
            return NextResponse.json({ success: false, message: "No email found in payload" }, { status: 400 });
        }

        // 1. Find the lead in our CRM
        const leads = await directus.request(readItems('cold_leads', {
            filter: { email: { _eq: email } },
            limit: 1
        })) as any[];

        if (leads.length === 0) {
            return NextResponse.json({ success: true, message: "Lead not found in CRM, skipping." });
        }

        const leadId = leads[0].id;
        let updateData: any = {};
        let comment = `SmartLead: ${eventType}`;

        // Handle Categories (AI Analysis)
        if (category) {
            comment += ` | Kategória: ${category}`;
            const catLower = category.toLowerCase();
            
            if (catLower.includes('interested') || catLower.includes('meeting')) {
                updateData.status = 'replied'; // Hot lead
            } else if (catLower.includes('not interested') || catLower.includes('do not contact') || catLower.includes('wrong person')) {
                updateData.status = 'rejected'; // Dead lead
            } else if (catLower.includes('out of office')) {
                // Keep current status but add info
            }
        }

        // Handle specific event types
        if (eventType === 'email_replied' || eventType === 'REPLY_RECEIVED') {
            updateData.status = 'replied';
        } else if (eventType === 'email_bounced' || eventType === 'BOUNCE') {
            updateData.status = 'rejected';
            comment += " (E-mail neexistuje)";
        } else if (eventType === 'lead_unsubscribed' || eventType === 'UNSUBSCRIBE') {
            updateData.status = 'rejected';
            comment += " (Odhlásil sa)";
        }

        if (Object.keys(updateData).length > 0 || comment) {
            await directus.request(updateItems('cold_leads', [leadId], {
                ...updateData,
                comment: `${comment} (${new Date().toLocaleString()})`
            }));
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[SmartLead Webhook] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
