"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, deleteItem, updateItem, deleteItems, updateItems } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { scrapeWebsite, generatePersonalization } from "@/lib/enrichment";

export interface ColdLeadItem {
  id: string | number;
  title: string;
  company_name_reworked?: string;
  website?: string;
  email?: string;
  phone?: string;
  city?: string;
  category?: string;
  abstract?: string;
  ai_first_sentence?: string;
  status?: "new" | "contacted" | "replied" | "rejected";
  list_name?: string;
  user_email?: string;
  date_created?: string;
  date_updated?: string;
  fallback_url?: string;
  google_maps_url?: string;
}

export interface ColdLeadList {
  id: number;
  name: string;
}

export async function getColdLeads(listName?: string) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const filter: any = {
      user_email: { _eq: userEmail },
    };
    
    if (listName) {
        filter.list_name = { _eq: listName };
    }

    const leads = (await directus.request(
      readItems("cold_leads", {
        filter,
        sort: ["-date_created"] as string[],
        limit: -1,
      }),
    )) as unknown as ColdLeadItem[];

    return { success: true, data: leads };
  } catch (error) {
    console.error("Failed to fetch cold leads:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getColdLeadLists() {
    try {
        const lists = await directus.request(readItems("cold_leads_lists", {
            sort: ["id"],
        }));
        return { success: true, data: lists as unknown as ColdLeadList[] };
    } catch (e: any) {
        console.error("Failed to fetch lists:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function createColdLeadList(name: string) {
    try {
         await directus.request(createItem("cold_leads_lists", { name }));
         revalidatePath("/dashboard/cold-outreach");
         return { success: true };
    } catch (e: any) {
        console.error("Failed to create list:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function bulkCreateColdLeads(leads: Partial<ColdLeadItem>[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    // Deduplication Logic - Enhanced with Email and Phone
    const existing = (await directus.request(
        readItems("cold_leads", {
            fields: ["title", "website", "email", "phone"],
            limit: -1,
            filter: { user_email: { _eq: userEmail } }
        })
    )) as unknown as { title: string; website?: string; email?: string; phone?: string }[];

    const existingWebsites = new Set(existing.map(e => e.website?.toLowerCase().trim()).filter(Boolean));
    const existingEmails = new Set(existing.map(e => e.email?.toLowerCase().trim()).filter(Boolean));
    // Clean phone numbers for comparison (remove spaces/dashes)
    const cleanPhone = (p?: string) => p?.replace(/[\s\-\+\(\)]/g, "") || "";
    const existingPhones = new Set(existing.map(e => cleanPhone(e.phone)).filter(p => p.length > 5));
    const existingTitles = new Set(existing.map(e => e.title.toLowerCase().trim()));

    const uniqueLeads: Partial<ColdLeadItem>[] = [];
    let duplicatesCount = 0;

    for (const lead of leads) {
        const leadWebsite = lead.website?.toLowerCase().trim();
        const leadEmail = lead.email?.toLowerCase().trim();
        const leadPhoneClean = cleanPhone(lead.phone);
        const leadTitle = lead.title?.toLowerCase().trim();

        if (leadWebsite && existingWebsites.has(leadWebsite)) { duplicatesCount++; continue; }
        if (leadEmail && existingEmails.has(leadEmail)) { duplicatesCount++; continue; }
        if (leadPhoneClean && leadPhoneClean.length > 5 && existingPhones.has(leadPhoneClean)) { duplicatesCount++; continue; }
        if (leadTitle && existingTitles.has(leadTitle)) { duplicatesCount++; continue; }

        uniqueLeads.push(lead);
        if (leadWebsite) existingWebsites.add(leadWebsite);
        if (leadEmail) existingEmails.add(leadEmail);
        if (leadPhoneClean.length > 5) existingPhones.add(leadPhoneClean);
        if (leadTitle) existingTitles.add(leadTitle);
    }

    if (uniqueLeads.length === 0) {
        return { success: true, count: 0, duplicates: duplicatesCount, items: [] };
    }

    const formattedLeads = uniqueLeads.map(l => ({
      ...l,
      user_email: userEmail,
      status: l.status || "new",
      list_name: l.list_name || "Zoznam 1"
    }));

    const createdItems = await directus.request(createItem("cold_leads", formattedLeads));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true, count: uniqueLeads.length, duplicates: duplicatesCount, items: createdItems as unknown as ColdLeadItem[] };
  } catch (e: any) {
    console.error("Bulk create cold leads failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function deleteColdLead(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(deleteItem("cold_leads", id));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true };
  } catch (e: any) {
    console.error("Delete cold lead failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function bulkDeleteColdLeads(ids: (string | number)[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        // deleteItems takes array of keys
        await directus.request(deleteItems("cold_leads", ids));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk delete failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function updateColdLead(id: string | number, data: Partial<ColdLeadItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(updateItem("cold_leads", id, data));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true };
  } catch (e: any) {
    console.error("Update cold lead failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function bulkUpdateColdLeads(ids: (string | number)[], data: Partial<ColdLeadItem>) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        await directus.request(updateItems("cold_leads", ids, data));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk update failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function enrichColdLead(id: string | number) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const items = await directus.request(readItems("cold_leads", { filter: { id: { _eq: id }}}));
        if (!items || items.length === 0) throw new Error("Lead not found");
        
        const lead = items[0] as unknown as ColdLeadItem;
        
        // 1. Scrape (Prefer website, fallback to fallback_url)
        const urlToScrape = lead.website || lead.fallback_url;
        let scrapeResult = null;
        let scrapedText = null;

        if (urlToScrape) {
            scrapeResult = await scrapeWebsite(urlToScrape);
            if (scrapeResult) {
                scrapedText = scrapeResult.text;
            }
        }

        // 2. AI Generate
        const aiResult = await generatePersonalization(lead, scrapedText);
        
        // Prepare update data
        const updateData: any = {};
        if (aiResult) {
            updateData.company_name_reworked = aiResult.name;
            updateData.ai_first_sentence = aiResult.sentence || undefined;
        }

        // 3. Save Scraped Email if exists and lead had none
        if (scrapeResult?.email && !lead.email) {
            updateData.email = scrapeResult.email;
        }

        if (Object.keys(updateData).length > 0) {
            await directus.request(updateItem("cold_leads", id, updateData));
            return { success: true };
        }
        
        return { success: false, error: "No enrichment data generated" };

    } catch (e: any) {
        console.error("Enrichment failed:", e);
        return { success: false, error: e.message || String(e) };
    }
}
