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
  enrichment_status?: "pending" | "processing" | "completed" | "failed";
  enrichment_error?: string;
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
        
        // Debug info accumulator
        const debugInfo = {
            id,
            name: lead.title,
            urlUsed: "",
            scraped: false,
            scrapedLength: 0,
            emailFound: null as string | null,
            aiGenerated: false,
            error: null as string | null
        };

        // 1. Scrape (Prefer website, fallback to fallback_url)
        const urlToScrape = lead.website || lead.fallback_url;
        let scrapeResult = null;
        let scrapedText = null;

        if (urlToScrape) {
            debugInfo.urlUsed = urlToScrape;
            scrapeResult = await scrapeWebsite(urlToScrape);
            if (scrapeResult) {
                scrapedText = scrapeResult.text;
                debugInfo.scraped = true;
                debugInfo.scrapedLength = scrapedText.length;
                debugInfo.emailFound = scrapeResult.email || null;
            }
        }

        // 2. Logic Decision: Outreach vs Cold Call
        // If NO website OR NO email (from scrape or already present)
        const hasEmail = lead.email || scrapeResult?.email;
        
        let shouldPersonalize = !!(urlToScrape && hasEmail);
        
        const updateData: any = {};

        if (shouldPersonalize) {
            // AI Generate only if we have both web and email
            const aiResult = await generatePersonalization(lead, scrapedText);
            if (aiResult && aiResult.sentence) {
                updateData.company_name_reworked = aiResult.name;
                updateData.ai_first_sentence = aiResult.sentence;
                debugInfo.aiGenerated = true;
            } else if (aiResult && aiResult.error) {
                debugInfo.error = `AI Error: ${aiResult.error}`;
            }
        } else {
            // Move to Cold Call list if missing criteria for Cold Outreach
            updateData.list_name = "Cold Call";
            debugInfo.error = "No Web/Email -> Moved to Cold Call";

            // Ensure the "Cold Call" list exists so it shows in sidebar
            try {
                const existingLists = await directus.request(readItems("cold_leads_lists", { filter: { name: { _eq: "Cold Call" }}}));
                if (!existingLists || (existingLists as any[]).length === 0) {
                    await directus.request(createItem("cold_leads_lists", { name: "Cold Call" }));
                }
            } catch (listError) {
                console.error("Failed to ensure Cold Call list exists:", listError);
            }
        }

        // 3. Save Scraped Email if exists and lead had none
        if (scrapeResult?.email && !lead.email) {
            updateData.email = scrapeResult.email;
        }

        if (Object.keys(updateData).length > 0) {
            await directus.request(updateItem("cold_leads", id, updateData));
            // Return success even if skipped AI, because we updated the list_name
            return { success: true, debug: debugInfo };
        }
        
        return { success: false, error: debugInfo.error || "No enrichment data generated", debug: debugInfo };

    } catch (e: any) {
        console.error("Enrichment failed:", e);
        return { success: false, error: e.message || String(e), debug: { id, error: e.message } };
    }
}

export async function sendColdLeadEmail(id: string | number) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        // 1. Get Lead Data
        const items = await directus.request(readItems("cold_leads", { filter: { id: { _eq: id }}}));
        if (!items || items.length === 0) throw new Error("Lead not found");
        const lead = items[0] as unknown as ColdLeadItem;

        if (!lead.email) throw new Error("Lead has no email address");

        // 2. Get Gmail Tokens (same logic as sync)
        const { currentUser, clerkClient } = await import("@clerk/nextjs/server");
        const user = await currentUser();
        if (!user) throw new Error("Clerk session not found");

        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
        let token = tokenResponse.data[0]?.token;

        if (!token) {
            const dbTokens = await directus.request(readItems("google_tokens", {
                filter: { user_id: { _eq: user.id } },
                limit: 1
            })) as any[];
            if (dbTokens && dbTokens[0]) token = dbTokens[0].access_token;
        }

        if (!token) throw new Error("Google account not connected. Please sync contacts first to connect.");

        // 3. Prepare Email
        const { sendEmail } = await import("@/lib/google");
        const companyName = lead.company_name_reworked || lead.title;
        const subject = `Spolupráca s ${companyName}`;
        
        let body = "";
        if (lead.ai_first_sentence) {
            body = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <p>${lead.ai_first_sentence}</p>
                    <p>Píšem Vám, pretože ma zaujali Vaše služby. Radi by sme Vám pomohli s automatizáciou a získavaním nových klientov.</p>
                    <p>Mali by ste záujem o krátky 5-minútový hovor budúci týždeň?</p>
                    <br/>
                    <p>S pozdravom,<br/>Automatizácie Tím</p>
                </div>
            `;
        } else {
             body = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <p>Dobrý deň,</p>
                    <p>Zaujali ma Vaše služby v oblasti "${lead.category || 'Vášho podnikania'}". Radi by sme Vám pomohli s automatizáciou a získavaním nových klientov.</p>
                    <p>Mali by ste záujem o krátky 5-minútový hovor budúci týždeň?</p>
                    <br/>
                    <p>S pozdravom,<br/>Automatizácie Tím</p>
                </div>
            `;
        }

        // 4. Send
        await sendEmail({
            accessToken: token,
            to: lead.email,
            subject: subject,
            body: body
        });

        // 5. Update Status
        await directus.request(updateItem("cold_leads", id, { status: "contacted" }));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };

    } catch (e: any) {
        console.error("Failed to send cold email:", e);
        return { success: false, error: e.message || String(e) };
    }
}
