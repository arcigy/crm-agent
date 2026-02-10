
import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItem, updateItems } from '@directus/sdk';
import { smartLead } from '@/lib/smartlead';
import { ColdLeadItem } from '@/app/actions/cold-leads';

export async function GET(_request: Request) {
    try {
        // 1. Fetch leads pushed more than 7 days ago that haven't responded yet
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const staleLeads = (await directus.request(readItems('cold_leads', {
            filter: { 
                smartlead_status: { _eq: 'pushed' },
                smartlead_pushed_at: { _lt: sevenDaysAgo.toISOString() },
                status: { _neq: 'replied' } // Don't cleanup if already marked as replied
            },
            limit: 50 // Limit per run to avoid timeout
        }))) as unknown as ColdLeadItem[];

        if (staleLeads.length === 0) {
            return NextResponse.json({ success: true, message: 'No stale leads to cleanup.' });
        }

        const results = {
            deleted: 0,
            replied: 0,
            skipped: 0,
            errors: 0
        };

        for (const lead of staleLeads) {
            try {
                if (!lead.email) continue;

                // 2. Check status in SmartLead
                // The global search returns a list or a single lead object
                const slLead = await smartLead.getLeadByEmail(lead.email);
                
                if (!slLead || slLead.length === 0) {
                    // Lead not found in SL (maybe manual delete?), just mark as ghosted locally
                    await directus.request(updateItem('cold_leads', lead.id as any, {
                        status: 'nezodvihol', // Using "nezodvihol" as a proxy for ghosted if not defined, or we can use a custom one
                        comment: 'Odstránené zo SmartLead (nenájdené)'
                    }));
                    results.deleted++;
                    continue;
                }

                // SmartLead returned data might be in an array or object depending on endpoint
                const leadData = Array.isArray(slLead) ? slLead[0] : slLead;
                const campaignId = lead.smartlead_campaign_id;
                const slLeadId = leadData.id;

                // Status check (REPLIED, COMPLETED, etc.)
                if (leadData.status === 'REPLIED') {
                    await directus.request(updateItem('cold_leads', lead.id as any, {
                        status: 'replied',
                        comment: 'Zistená odpoveď v SmartLead'
                    }));
                    results.replied++;
                } else {
                    // 3. Delete from SmartLead campaign if no reply
                    // We delete globally or per campaign? User wants to free up space.
                    // If we delete per campaign, it might still exist in CRM leads in SL.
                    // But if we delete from the campaign it stops counting for that campaign.
                    if (campaignId) {
                        await smartLead.deleteLeadFromCampaign(Number(campaignId), slLeadId);
                    }
                    
                    // Mark as ghosted in our CRM
                    await directus.request(updateItem('cold_leads', lead.id as any, {
                        status: 'odmietol', // Using "odmietol" (rejected/ghosted) as status
                        comment: 'Automaticky odstránené zo SmartLead po 7 dňoch bez odpovede'
                    }));
                    results.deleted++;
                }
            } catch (err) {
                console.error(`Error cleaning up lead ${lead.id}:`, err);
                results.errors++;
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Cron SmartLead Cleanup Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
