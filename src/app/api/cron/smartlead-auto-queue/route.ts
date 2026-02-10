
import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItems } from '@directus/sdk';

export async function GET(_request: Request) {
    try {
        // 1. Find campaigns with auto-sync enabled
        const activeCampaigns = await directus.request(readItems('outreach_campaigns', {
            filter: {
                auto_sync: { _eq: true },
                smartlead_id: { _nnull: true },
                selected_list: { _nnull: true }
            }
        }));

        if (!activeCampaigns || activeCampaigns.length === 0) {
            return NextResponse.json({ success: true, message: 'No campaigns with auto-sync found.' });
        }

        const stats = {
            campaigns_checked: activeCampaigns.length,
            leads_queued: 0
        };

        for (const campaign of activeCampaigns) {
            // 2. Find leads in this list that are ready but not queued
            const readyLeads = (await directus.request(readItems('cold_leads', {
                filter: {
                    _and: [
                        { list_name: { _eq: campaign.selected_list } },
                        { email: { _nnull: true } },
                        { ai_first_sentence: { _nnull: true } },
                        { smartlead_status: { _null: true } }
                    ]
                },
                fields: ['id'],
                limit: 100 // Process in chunks
            }))) as any[];

            if (readyLeads.length > 0) {
                const ids = readyLeads.map(l => l.id);
                
                // 3. Mark them as queued for this campaign
                await directus.request(updateItems('cold_leads', ids, {
                    smartlead_campaign_id: String(campaign.smartlead_id),
                    smartlead_status: 'queued'
                }));
                
                stats.leads_queued += readyLeads.length;
            }
        }

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error("Cron SmartLead Auto-Queue Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
