
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
