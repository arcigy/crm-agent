import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, updateItems } from "@directus/sdk";
import { ColdLeadItem, getColdLeadLists } from "@/app/actions/cold-leads";
import { identifyIndustry, classifyLeadCategory } from "@/lib/enrichment";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: Request) {
    try {
        const BATCH_SIZE = 10;
        
        // 1. Fetch pending industry tasks
        const pendingLeads = await directus.request(readItems("cold_leads", {
            filter: {
                industry_status: { _eq: "pending" }
            },
            limit: BATCH_SIZE,
            fields: ["id", "title", "ai_first_sentence", "abstract", "category", "list_name", "user_email"]
        })) as unknown as ColdLeadItem[];

        if (!pendingLeads || pendingLeads.length === 0) {
            console.log("[INDUSTRY CRON] No pending leads. Job done.");
            return NextResponse.json({ message: "No pending leads", count: 0 });
        }

        console.log(`[INDUSTRY CRON] Processing ${pendingLeads.length} leads...`);

        // 2. Mark as processing
        const ids = pendingLeads.map(l => l.id);
        await directus.request(updateItems("cold_leads", ids as any, { 
            industry_status: "processing" 
        }));

        // 3. Pre-fetch lists once to avoid redundant calls
        const listsRes = await getColdLeadLists();
        const availableLists = listsRes.success ? listsRes.data : [];

        // 4. Process items sequentially with small delay to prevent Gemini rate limits (429)
        const results = [];
        for (const lead of pendingLeads) {
            try {
                console.log(`[INDUSTRY CRON] Processing ID ${lead.id}...`);
                
                // Use fallback text if ai_first_sentence is missing
                const contextText = lead.abstract || lead.category || lead.title || "";
                
                // AI call 1: Identify Industry
                const industryDesc = await identifyIndustry(lead.ai_first_sentence || "", contextText);
                
                const updates: any = {
                    industry_description: industryDesc,
                    industry_status: "completed",
                    industry_error: null
                };

                // AI call 2: Auto-sort if we have categories
                if (availableLists && availableLists.length > 0) {
                    const bestCategory = await classifyLeadCategory(industryDesc, availableLists);
                    
                    if (bestCategory && bestCategory !== "Všeobecné" && bestCategory !== lead.list_name) {
                        updates.list_name = bestCategory;
                        console.log(`[INDUSTRY CRON] Lead ${lead.id} auto-sorted to: ${bestCategory}`);
                    }
                }

                await directus.request(updateItem("cold_leads", lead.id, updates));
                results.push({ id: lead.id, success: true });

                // Small delay between leads to respect rate limits
                await sleep(800); 

            } catch (e: any) {
                console.error(`[INDUSTRY CRON] Error for ${lead.id}:`, e);
                const isRateLimit = String(e).includes("429") || String(e).includes("quota");
                
                await directus.request(updateItem("cold_leads", lead.id, {
                    industry_status: isRateLimit ? "pending" : "failed", // Retry if rate limit
                    industry_error: e.message
                }));
                results.push({ id: lead.id, success: false, error: e.message });
            }
        }

        // 5. Recursive trigger (fire and forget)
        if (pendingLeads.length === BATCH_SIZE) {
            const proto = request.headers.get("x-forwarded-proto") || "https";
            const host = request.headers.get("host") || "crm.arcigy.cloud";
            const nextUrl = `${proto}://${host}/api/cron/industry-classifier`;
            
            // Wait slightly before next batch trigger
            setTimeout(() => {
                fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
            }, 2000);
        }

        return NextResponse.json({ success: true, processed: results.length, results });

    } catch (error: any) {
        console.error("[INDUSTRY CRON] Fatal Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
