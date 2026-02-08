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
        
        if (data.id) {
            res = await directus.request(updateItem("outreach_campaigns", data.id, payload));
        } else {
            // Remove id to allow Directus to auto-generate it
            if ('id' in payload) delete payload.id;
            
            // 1. Create in SmartLead automatically
            try {
                const { smartLead } = await import("@/lib/smartlead");
                // SmartLead create API expects { name: string }
                // and returns the campaign object
                const slRes = await smartLead.createCampaign(data.name);
                if (slRes && slRes.id) {
                    payload.smartlead_id = slRes.id;
                }
            } catch (slError) {
                console.error("[Outreach] SmartLead auto-create failed:", slError);
                // We continue saving to CRM even if SmartLead fails, 
                // but you might want to handle this differently in production.
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
