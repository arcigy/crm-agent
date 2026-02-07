
import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItems } from '@directus/sdk';
import { smartLead } from '@/lib/smartlead';
import { ColdLeadItem } from '@/app/actions/cold-leads';

export async function GET(_request: Request) {
    try {
        // 1. Fetch queued leads (limit 20 per run to be safe)
        const queuedLeads = (await directus.request(readItems('cold_leads', {
            filter: { 
                smartlead_status: { _eq: 'queued' },
                smartlead_campaign_id: { _nnull: true }
            },
            limit: 20
        }))) as unknown as ColdLeadItem[];

        if (queuedLeads.length === 0) {
            return NextResponse.json({ success: true, message: 'No queued leads found.' });
        }

        // 2. Group by Campaign ID
        const campaigns: Record<string, typeof queuedLeads> = {};
        for (const lead of queuedLeads) {
            if (!lead.smartlead_campaign_id) continue;
            if (!campaigns[lead.smartlead_campaign_id]) {
                campaigns[lead.smartlead_campaign_id] = [];
            }
            campaigns[lead.smartlead_campaign_id].push(lead);
        }

        const results = [];

        // 3. Process per campaign
        for (const [campaignId, leads] of Object.entries(campaigns)) {
            const payload = leads.map(l => ({
                email: l.email || "",
                first_name: "", 
                last_name: "",
                company_name: l.company_name_reworked || l.title,
                website: l.website || "",
                custom_fields: {
                    city: l.city || "",
                    category: l.category || "",
                    ai_intro: l.ai_first_sentence || "",
                    phone: l.phone || ""
                }
            })).filter(l => l.email);

            if (payload.length > 0) {
                // ADD TO SMARTLEAD
                await smartLead.addLeadsToCampaign({
                    campaign_id: Number(campaignId),
                    leads: payload
                });

                // UPDATE STATUS LOCAL
                const ids = leads.map(l => l.id);
                // Cast to any to avoid TS error with directus SDK types in strict mode
                await directus.request(updateItems('cold_leads', ids as any, {
                    smartlead_status: 'pushed',
                    smartlead_pushed_at: new Date().toISOString()
                }));
                
                results.push({ campaignId, count: payload.length });
            }
        }

        return NextResponse.json({ success: true, processed: results });
    } catch (error: any) {
        console.error("Cron SmartLead Queue Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
