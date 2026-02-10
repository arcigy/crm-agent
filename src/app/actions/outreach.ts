"use server";

import directus from "@/lib/directus";
import { createItems, readItems, updateItem, deleteItem, deleteItems } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getOutreachLeads() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const filter: any = { user_email: { _eq: userEmail } };
        
        // ADMIN FALLBACK: Allow admin to see Branislav's leads too
        if (userEmail === 'arcigyback@gmail.com') {
            filter.user_email = { _in: ['arcigyback@gmail.com', 'branislav@arcigy.group'] };
        }

        const leads = await directus.request(
            readItems("outreach_leads", {
                filter: filter,
                sort: ["-id"],
                limit: -1
            })
        );
        return { success: true, data: leads };
    } catch (error: any) {
        console.error("[Outreach] Failed to fetch leads:", error);
        return { success: false, error: error.message };
    }
}

export async function bulkCreateOutreachLeads(leads: any[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const items = leads.map(l => ({
            ...l,
            user_email: userEmail,
            status: l.status || "pending"
        }));

        const res = await directus.request(createItems("outreach_leads", items));
        revalidatePath("/dashboard/outreach/leads");
        return { success: true, data: res };
    } catch (error: any) {
        console.error("[Outreach] Bulk create failed:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteAllLeads() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        // 1. Get all IDs for this user
        const leads = await directus.request(
            readItems("outreach_leads", {
                filter: { user_email: { _eq: userEmail } },
                fields: ["id"],
                limit: -1
            })
        );

        const ids = leads.map((l: any) => l.id);
        if (ids.length === 0) return { success: true };

        // 2. Delete them
        await directus.request(deleteItems("outreach_leads", ids));
        
        revalidatePath("/dashboard/outreach/leads");
        return { success: true };
    } catch (error: any) {
        console.error("[Outreach] Delete all failed:", error);
        return { success: false, error: error.message };
    }
}

export async function getOutreachCampaigns() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const filter: any = { user_email: { _eq: userEmail } };
        
        // ADMIN FALLBACK: Allow admin to see Branislav's campaigns too
        if (userEmail === 'arcigyback@gmail.com') {
            filter.user_email = { _in: ['arcigyback@gmail.com', 'branislav@arcigy.group'] };
        }

        // SMARTLEAD SYNC: Optional, only if directus is empty or user wants "actual"
        // Let's at least try to get them to see if there are new ones
        try {
            const { smartLead } = await import("@/lib/smartlead");
            const slCampaigns = await smartLead.getCampaigns();
            
            if (slCampaigns && slCampaigns.length > 0) {
                // Check missing ones
                const currentCampaigns = await directus.request(
                    readItems("outreach_campaigns", {
                        filter: filter,
                        fields: ["smartlead_id"]
                    })
                );
                const existingSlIds = currentCampaigns.map((c: any) => c.smartlead_id);
                
                const missing = slCampaigns.filter(sl => !existingSlIds.includes(sl.id));
                
                if (missing.length > 0) {
                    const toInsert = missing.map(m => ({
                        name: m.name,
                        smartlead_id: m.id,
                        user_email: userEmail,
                        status: m.status
                    }));
                    await directus.request(createItems("outreach_campaigns", toInsert));
                }
            }
        } catch (syncErr) {
            console.error("[Outreach] Background sync failed:", syncErr);
        }

        const campaigns = await directus.request(
            readItems("outreach_campaigns", {
                filter: filter,
                sort: ["-id"]
            })
        );
        return { success: true, data: campaigns };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveOutreachCampaign(data: any) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        let res;
        const payload = { ...data, user_email: userEmail };
        
        // Helper to prepare sequences for SmartLead
        const prepareSequences = (item: any) => {
            const sequences = [];
            // Step 1: Initial Email
            sequences.push({
                seq_number: 1,
                seq_delay_details: { delay_in_days: 0 },
                variant_distribution_type: "EQUAL",
                seq_variants: [{
                    subject: item.subject,
                    email_body: item.body,
                    variant_label: "A",
                    variant_distribution_percentage: 100
                }]
            });
            
            // Step 2: Follow-up (optional)
            if (item.followup_subject && item.followup_body) {
                sequences.push({
                    seq_number: 2,
                    seq_delay_details: { delay_in_days: item.followup_days || 3 },
                    variant_distribution_type: "EQUAL",
                    seq_variants: [{
                        subject: item.followup_subject,
                        email_body: item.followup_body,
                        variant_label: "A",
                        variant_distribution_percentage: 100
                    }]
                });
            }
            return sequences;
        };
        
        if (data.id) {
            // SYNC UPDATE TO SMARTLEAD
            try {
                const existing = await directus.request(readItems("outreach_campaigns", { 
                    filter: { id: { _eq: data.id } },
                    fields: ["smartlead_id"]
                })) as any[];
                
                const slId = existing[0]?.smartlead_id;

                if (slId) {
                    const { smartLead } = await import("@/lib/smartlead");
                    console.log(`[Outreach] Syncing update to SmartLead campaign ${slId}`);
                    
                    // 1. Update Settings
                    try {
                        await smartLead.updateCampaignSettings(slId, { name: data.name });
                    } catch (err) {
                        console.error(`[Outreach] SmartLead Settings Update failed for ID ${slId}:`, err);
                        // Carry on, settings are less critical than sequences
                    }

                    // 2. Update Sequence
                    try {
                        const sequences = prepareSequences(data);
                        await smartLead.saveCampaignSequence(slId, sequences);
                    } catch (err) {
                        console.error(`[Outreach] SmartLead Sequence Update failed for ID ${slId}:`, err);
                        throw err; // Sequences are more critical
                    }
                }
            } catch (slError) {
                console.error("[Outreach] Total SmartLead Sync on update failed:", slError);
            }

            res = await directus.request(updateItem("outreach_campaigns", data.id, payload));
        } else {
            // Remove id to allow Directus to auto-generate it
            if ('id' in payload) delete payload.id;
            
            // 1. Create in SmartLead automatically
            try {
                const { smartLead } = await import("@/lib/smartlead");
                
                // A. Create Campaign
                const slRes = await smartLead.createCampaign(data.name);
                const slId = slRes?.id;
                
                if (slId) {
                    payload.smartlead_id = slId;
                    // B. Set Sequence
                    await smartLead.saveCampaignSequence(slId, prepareSequences(data));
                }
            } catch (slError) {
                console.error("[Outreach] SmartLead Sync failed:", slError);
            }

            const createdItems = await directus.request(createItems("outreach_campaigns", [payload])) as any[];
            res = createdItems[0];
        }
        
        revalidatePath("/dashboard/outreach/campaigns");
        return { success: true, data: res };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getOutreachLeadForPreview() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const filter: any = { 
            user_email: { _eq: userEmail },
            enrichment_status: { _eq: "completed" },
            list_name: { _eq: "Zoznam 1" }
        };

        const leads = await directus.request(
            readItems("outreach_leads", {
                filter: filter,
                sort: ["-id"],
                limit: 1
            })
        );
        
        return { success: true, data: leads.length > 0 ? leads[0] : null };
    } catch (error: any) {
        console.error("[Outreach] Failed to fetch preview lead:", error);
        return { success: false, error: error.message };
    }
}
