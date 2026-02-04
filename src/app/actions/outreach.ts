"use server";

import directus from "@/lib/directus";
import { createItems, readItems, updateItem, deleteItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getOutreachLeads() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const leads = await directus.request(
            readItems("outreach_leads", {
                filter: { user_email: { _eq: userEmail } },
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

export async function getOutreachCampaigns() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const campaigns = await directus.request(
            readItems("outreach_campaigns", {
                filter: { user_email: { _eq: userEmail } },
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
            res = await directus.request(createItems("outreach_campaigns", [payload]));
        }
        
        revalidatePath("/dashboard/outreach/campaigns");
        return { success: true, data: res };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
