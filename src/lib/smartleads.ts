
import { env } from 'process';

const BASE_URL = 'https://server.smartlead.ai/api/v1';

export async function getCampaigns() {
    const apiKey = process.env.SMARTLEADS_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch(`${BASE_URL}/campaigns?api_key=${apiKey}`);
        if (!res.ok) {
            console.error('SmartLeads API Error:', await res.text());
            return [];
        }
        const data = await res.json();
        return data || [];
    } catch (e) {
        console.error("Failed to fetch SmartLeads campaigns", e);
        return [];
    }
}

export async function addLeadsToCampaign(campaignId: string, leads: any[]) {
    // leads structure from SmartLeads docs (usually):
    // {
    //    "first_name": "...",
    //    "last_name": "...",
    //    "email": "...",
    //    "company_name": "...",
    //    "website": "...",
    //    "linkedin_profile": "...",
    //    "custom_fields": { ... }
    // }
    const apiKey = process.env.SMARTLEADS_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    try {
        const res = await fetch(`${BASE_URL}/campaigns/${campaignId}/leads?api_key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                leads: leads
            })
        });
        
        if (!res.ok) {
            const err = await res.text();
             console.error('SmartLeads Add Leads Error:', err);
             throw new Error(err);
        }
        return await res.json();
    } catch (e) {
         console.error("Failed to add leads to SmartLeads", e);
         throw e;
    }
}

export async function getCampaignLeads(campaignId: string) {
    const apiKey = process.env.SMARTLEADS_API_KEY;
    if (!apiKey) return [];

    try {
        // Fetch all leads for campaign. Note: limits might apply, usually paginated or defaults to 100? 
        // Docs say: GET /campaigns/:campaign_id/leads
        // We might need to handle pagination if there are many. 
        // For now, let's try to get a reasonable amount or all if possible.
        // SmartLeads API might default to 100. Let's assume we want to clean up chunk by chunk.
        
        const res = await fetch(`${BASE_URL}/campaigns/${campaignId}/leads?api_key=${apiKey}&limit=1000`, { 
            method: 'GET' 
        });
        
        if (!res.ok) {
            console.error('SmartLeads Get Leads Error:', await res.text());
            return [];
        }
        const data = await res.json();
        return data || [];
    } catch (e) {
         console.error("Failed to fetch campaign leads", e);
         return [];
    }
}

export async function deleteLeadFromCampaign(campaignId: string, leadId: string) {
    const apiKey = process.env.SMARTLEADS_API_KEY;
    if (!apiKey) return false;

    try {
        const res = await fetch(`${BASE_URL}/campaigns/${campaignId}/leads/${leadId}?api_key=${apiKey}`, {
            method: 'DELETE'
        });
        
        return res.ok;
    } catch (e) {
        console.error("Failed to delete lead from campaign", e);
        return false;
    }
}
