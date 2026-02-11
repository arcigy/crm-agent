"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, deleteItem, updateItem, deleteItems, updateItems, createItems } from "@directus/sdk";
import { getUserEmail, getAuthorizedEmails } from "@/lib/auth";
import { scrapeWebsite, generatePersonalization, classifyLeadCategory } from "@/lib/enrichment";

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
  status?: "new" | "contacted" | "replied" | "rejected" | "nevolal" | "volal" | "odmietol" | "chce_email" | "nezodvihol";
  comment?: string;
  list_name?: string;
  user_email?: string;
  date_created?: string;
  date_updated?: string;
  fallback_url?: string;
  google_maps_url?: string;
  enrichment_status?: "pending" | "processing" | "completed" | "failed";
  enrichment_error?: string;
  smartlead_campaign_id?: string;
  smartlead_status?: "queued" | "pushed" | "failed" | null;
  smartlead_pushed_at?: string;
  source_city?: string;
  source_keyword?: string;
}

export interface ColdLeadList {
  id: number;
  name: string;
}

export async function getColdLeads(listName?: string) {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    const filter: any = {
      user_email: { _in: authEmails },
    };
    
    if (listName && listName.startsWith("SL_")) {
        const status = listName.toLowerCase().replace("sl_", "");
        if (["queued", "pushed", "failed"].includes(status)) {
             filter.smartlead_status = { _eq: status };
        }
    } else if (listName) {
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
    
    // 1. Fetch existing leads to check for duplicates
    // We check against email and website to avoid duplicates
    const existingLeads = await directus.request(readItems("cold_leads", {
        filter: {
            user_email: { _eq: userEmail }
        },
        fields: ["email", "website", "title"],
        limit: -1
    })) as unknown as ColdLeadItem[];

    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingWebsites = new Set(existingLeads.map(l => l.website).filter(Boolean));

    const uniqueLeads: Partial<ColdLeadItem>[] = [];
    let duplicatesCount = 0;

    for (const lead of leads) {
        const isDuplicateEmail = lead.email && existingEmails.has(lead.email);
        const isDuplicateWebsite = lead.website && existingWebsites.has(lead.website);
        
        if (isDuplicateEmail || isDuplicateWebsite) {
            duplicatesCount++;
            continue;
        }

        // Add to unique list
        const hasWeb = !!lead.website;
        uniqueLeads.push({
            ...lead,
            user_email: userEmail,
            status: "new",
            list_name: hasWeb ? (lead.list_name || "Všeobecné") : "Cold Call",
            enrichment_status: hasWeb ? "pending" : "completed"
        });

        // Add to validation sets to prevent duplicates within the upload itself
        if (lead.email) existingEmails.add(lead.email);
        if (lead.website) existingWebsites.add(lead.website);
    }

    if (uniqueLeads.length === 0) {
        return { success: true, count: 0, duplicates: duplicatesCount, items: [] };
    }
    
    // 2. Bulk Create
    const createdItems = await directus.request(createItems("cold_leads", uniqueLeads));

    revalidatePath("/dashboard/cold-outreach");
    
    // Return format compatible with Import Modal
    return { 
        success: true, 
        count: uniqueLeads.length, 
        duplicates: duplicatesCount, 
        items: createdItems as unknown as ColdLeadItem[] 
    };

  } catch (e: any) {
    console.error("Failed to bulk create leads:", e);
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
        
        await directus.request(deleteItems("cold_leads", ids as any));
        
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
        
        await directus.request(updateItems("cold_leads", ids as any, data));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk update failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function enrichColdLead(id: string | number, overrideEmail?: string) {
    try {
        const userEmail = overrideEmail || await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const items = await directus.request(readItems("cold_leads", { filter: { id: { _eq: id }}}));
        if (!items || items.length === 0) throw new Error("Lead not found");
        
        const lead = items[0] as unknown as ColdLeadItem;
        
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

        const urlToScrape = lead.website || lead.fallback_url;
        let scrapeResult = null;
        let scrapedText = null;

        if (urlToScrape) {
            debugInfo.urlUsed = urlToScrape;
            console.log(`[ENRICHMENT-ACTION] Scraping ${urlToScrape} for Lead ${id}...`);
            
            scrapeResult = await scrapeWebsite(urlToScrape);
            
            if (scrapeResult) {
                scrapedText = scrapeResult.text;
                debugInfo.scraped = true;
                debugInfo.scrapedLength = scrapedText?.length || 0;
                debugInfo.emailFound = scrapeResult.email || null;
                
                if (scrapeResult.error) {
                    debugInfo.error = scrapeResult.error;
                    console.warn(`[ENRICHMENT-ACTION] Scraping warning for ${id}: ${scrapeResult.error}`);
                }
            } else {
                 debugInfo.error = "Scraper returned null (Unknown error)";
            }
        }

        const shouldPersonalize = !!urlToScrape && !debugInfo.error?.includes("unreachable"); // Don't AI if site is dead
        const updateData: any = {};

        if (shouldPersonalize) {
            console.log(`[ENRICHMENT-ACTION] Generating AI Personalization for Lead ${id}...`);
            const aiResult = await generatePersonalization(lead, scrapedText);
            if (aiResult && aiResult.sentence) {
                updateData.company_name_reworked = aiResult.name;
                updateData.ai_first_sentence = aiResult.sentence;
                debugInfo.aiGenerated = true;

                // --- AI SEPARATOR ---
                try {
                    console.log(`[ENRICHMENT-ACTION] Running AI Separator for Lead ${id}...`);
                    const listsRes = await getColdLeadLists();
                    if (listsRes.success && listsRes.data) {
                        const categoryNames = listsRes.data.map(l => l.name);
                        const bestCategory = await classifyLeadCategory(
                            aiResult.sentence || "", 
                            scrapedText || "", 
                            categoryNames
                        );
                        
                        // Only update if it's different and not "Všeobecné" unless it's already there
                        if (bestCategory && bestCategory !== lead.list_name) {
                            updateData.list_name = bestCategory;
                            console.log(`[ENRICHMENT-ACTION] Lead ${id} moved to: ${bestCategory}`);
                        }
                    }
                } catch (sepError) {
                    console.error("[ENRICHMENT-ACTION] AI Separator failed:", sepError);
                }
                // ---------------------
            } else if (aiResult && aiResult.error) {
                debugInfo.error = `AI Error: ${aiResult.error}`;
                updateData.enrichment_error = aiResult.error;
            }
        } else if (!urlToScrape) {
            updateData.list_name = "Cold Call";
            updateData.enrichment_status = "completed"; 
            updateData.enrichment_error = "Moved to Cold Call (No Website)";
            debugInfo.error = "No Website -> Moved to Cold Call";

            try {
                const existingLists = await directus.request(readItems("cold_leads_lists", { filter: { name: { _eq: "Cold Call" }}}));
                if (!existingLists || (existingLists as any[]).length === 0) {
                    await directus.request(createItem("cold_leads_lists", { name: "Cold Call" }));
                }
            } catch (listError) {
                console.error("Failed to ensure Cold Call list exists:", listError);
            }
        }

        if (scrapeResult?.email && !lead.email) {
            updateData.email = scrapeResult.email;
        }
        
        // Propagate Scraper Error to DB if critical
        if (debugInfo.error) {
             updateData.enrichment_error = debugInfo.error;
             if (!updateData.enrichment_status) updateData.enrichment_status = "failed"; // Or keep as completed with error? Usually failed if no email/intro.
        }

        if (Object.keys(updateData).length > 0) {
            await directus.request(updateItem("cold_leads", id, updateData));
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

        const items = await directus.request(readItems("cold_leads", { filter: { id: { _eq: id }}}));
        if (!items || items.length === 0) throw new Error("Lead not found");
        const lead = items[0] as unknown as ColdLeadItem;

        if (!lead.email) throw new Error("Lead has no email address");

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

        await sendEmail({
            accessToken: token,
            to: lead.email,
            subject: subject,
            body: body
        });

        await directus.request(updateItem("cold_leads", id, { status: "contacted" }));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };

    } catch (e: any) {
        console.error("Failed to send cold email:", e);
        return { success: false, error: e.message || String(e) };
    }
}

export async function getSmartLeadCampaigns() {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const { smartLead } = await import("@/lib/smartlead");
        const campaigns = await smartLead.getCampaigns();
        return { success: true, data: campaigns };
    } catch (e: any) {
        console.error("Failed to get campaigns:", e);
        return { success: false, error: e.message };
    }
}

export async function syncLeadsToSmartLead(ids: (string | number)[], campaignId: string) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const leads = (await directus.request(readItems("cold_leads", {
            filter: { id: { _in: ids } },
            limit: -1
        }))) as unknown as ColdLeadItem[];

        if (!leads || leads.length === 0) throw new Error("No leads found");

        const validLeads = leads.filter(l => l.email && l.email.includes("@"));
        if (validLeads.length === 0) throw new Error("No valid emails found in selection");

        const smartLeadsPayload = validLeads.map(l => ({
            email: l.email,
            first_name: "", 
            last_name: "",
            company_name: l.company_name_reworked || l.title,
            website: l.website,
            phone_number: l.phone,
            custom_fields: {
                city: l.city || "",
                category: l.category || "",
                ai_intro: l.ai_first_sentence || ""
            }
        }));

        const { smartLead } = await import("@/lib/smartlead");
        await smartLead.addLeadsToCampaign({
            campaign_id: Number(campaignId),
            leads: smartLeadsPayload as any
        });

        await directus.request(updateItems("cold_leads", ids as any, { status: "contacted" }));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true, count: smartLeadsPayload.length };

    } catch (e: any) {
        console.error("Sync to SmartLeads failed:", e);
        return { success: false, error: e.message || String(e) };
    }
}

export async function bulkQueueForSmartLead(ids: (string | number)[], campaignId: string) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const leads = (await directus.request(readItems("cold_leads", {
            filter: { id: { _in: ids } },
            fields: ["id", "email"],
            limit: -1
        }))) as unknown as ColdLeadItem[];

        if (!leads || leads.length === 0) throw new Error("No leads found");

        const validIds = leads.filter(l => l.email && l.email.includes("@")).map(l => l.id);
        
        if (validIds.length === 0) throw new Error("No leads with valid email found.");

        await directus.request(updateItems("cold_leads", validIds as any, { 
            smartlead_campaign_id: campaignId,
            smartlead_status: "queued"
        }));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true, count: validIds.length };

    } catch (e: any) {
        console.error("Queue for SmartLeads failed:", e);
        return { success: false, error: e.message || String(e) };
    }
}

export async function bulkReEnrichLeads(ids: (string | number)[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        // Reset enrichment status to pending to trigger re-scraping
        await directus.request(updateItems("cold_leads", ids as any, { 
            enrichment_status: "pending",
            enrichment_error: null,
            // We keep ai_first_sentence to avoid empty fields during processing, 
            // the worker will overwrite it.
        }));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk re-enrich failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function bulkSortLeads(ids: (string | number)[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        const leads = (await directus.request(readItems("cold_leads", {
            filter: { id: { _in: ids } },
            limit: -1
        }))) as unknown as ColdLeadItem[];
        
        for (const lead of leads) {
            const hasWeb = !!lead.website;
            const updates: Partial<ColdLeadItem> = {
                list_name: hasWeb ? (lead.list_name === "Cold Call" || !lead.list_name ? "Všeobecné" : lead.list_name) : "Cold Call",
                enrichment_status: hasWeb ? (lead.ai_first_sentence ? "completed" : "pending") : "completed"
            };
            
            await directus.request(updateItem("cold_leads", lead.id, updates));
        }
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk sort failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function cleanupDuplicates(listName?: string) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");

        const filter: any = {
            user_email: { _eq: userEmail }
        };

        if (listName && listName !== "All") {
            filter.list_name = { _eq: listName };
        }

        const leads = (await directus.request(readItems("cold_leads", {
            filter,
            limit: -1,
            sort: ["id"], // Oldest first
            fields: ["id", "website", "google_maps_url", "email", "title"]
        }))) as unknown as ColdLeadItem[];

        if (!leads || leads.length === 0) return { success: true, count: 0 };

        const seenWebsites = new Set<string>();
        const seenMapsUrls = new Set<string>();
        const seenEmails = new Set<string>();
        
        const idsToDelete: (string | number)[] = [];

        for (const lead of leads) {
            let isDuplicate = false;

            // Check Website
            if (lead.website) {
                // Normalize website (remove protocol, www, trailing slash)
                const normalizedWeb = lead.website.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
                if (seenWebsites.has(normalizedWeb)) {
                    isDuplicate = true;
                } else {
                    seenWebsites.add(normalizedWeb);
                }
            }

            // Check Google Maps URL
            if (lead.google_maps_url) {
                if (seenMapsUrls.has(lead.google_maps_url)) {
                    isDuplicate = true;
                } else {
                    seenMapsUrls.add(lead.google_maps_url);
                }
            }

            // Check Email
            if (lead.email) {
                 if (seenEmails.has(lead.email.toLowerCase())) {
                     isDuplicate = true;
                 } else {
                     seenEmails.add(lead.email.toLowerCase());
                 }
            }

            if (isDuplicate) {
                idsToDelete.push(lead.id);
            }
        }

        if (idsToDelete.length > 0) {
            // Delete in chunks of 100 to avoid limits
            const chunkSize = 100;
            for (let i = 0; i < idsToDelete.length; i += chunkSize) {
                const chunk = idsToDelete.slice(i, i + chunkSize);
                await directus.request(deleteItems("cold_leads", chunk as any));
            }
        }

        revalidatePath("/dashboard/cold-outreach");
        return { success: true, count: idsToDelete.length };

    } catch (e: any) {
        console.error("Cleanup duplicates failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function getPreviewLead(listName: string) {
    try {
        const authEmails = await getAuthorizedEmails();
        if (authEmails.length === 0) throw new Error("Unauthorized");

        const filter: any = {
            user_email: { _in: authEmails }
        };

        if (listName) {
            filter.list_name = { _eq: listName };
        }

        // Try to get an enriched lead first for better preview
        const leads = (await directus.request(
            readItems("cold_leads", {
                filter: { ...filter, enrichment_status: { _eq: "completed" } },
                sort: ["-date_created"],
                limit: 1,
            }),
        )) as unknown as ColdLeadItem[];

        if (leads.length > 0) {
            return { success: true, data: leads[0] };
        }

        // Fallback to any lead if no enriched ones
        const fallbackLeads = (await directus.request(
            readItems("cold_leads", {
                filter,
                sort: ["-date_created"],
                limit: 1,
            }),
        )) as unknown as ColdLeadItem[];

        return { success: true, data: fallbackLeads.length > 0 ? fallbackLeads[0] : null };
    } catch (error) {
        console.error("Failed to fetch preview lead:", error);
        return { success: false, error: String(error) };
    }
}

export async function bulkClassifyLeads(ids: (string | number)[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        const leads = (await directus.request(readItems("cold_leads", {
            filter: { id: { _in: ids } },
            limit: -1
        }))) as unknown as ColdLeadItem[];
        
        if (!leads || leads.length === 0) throw new Error("No leads found");

        const listsRes = await getColdLeadLists();
        if (!listsRes.success || !listsRes.data) throw new Error("Failed to load lists");
        const categoryNames = listsRes.data.map(l => l.name).filter(n => n !== "Cold Call" && n !== "Všeobecné");

        if (categoryNames.length === 0) {
            throw new Error("Nemáte vytvorené žiadne cieľové kategórie okrem 'Všeobecné'. Vytvorte si najprv zoznamy (napr. Statik, Architekt).");
        }

        console.log(`[BULK-AI-SEPARATOR] Starting classification for ${leads.length} leads...`);

        for (const lead of leads) {
            // We need either a website scrape or at least the personalization to classify
            if (!lead.ai_first_sentence && !lead.website) continue;

            // Re-scrape if needed to get better context, or use existing info
            // For bulk classification, we use a lighter version avoiding full re-scrape unless necessary
            const bestCategory = await classifyLeadCategory(
                lead.ai_first_sentence || "", 
                lead.abstract || lead.category || lead.title || "", // Context
                categoryNames
            );

            if (bestCategory && bestCategory !== lead.list_name && bestCategory !== "Všeobecné") {
                await directus.request(updateItem("cold_leads", lead.id, { 
                    list_name: bestCategory 
                }));
                console.log(`[BULK-AI-SEPARATOR] Lead ${lead.id} moved to: ${bestCategory}`);
            }
        }
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk classify failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

