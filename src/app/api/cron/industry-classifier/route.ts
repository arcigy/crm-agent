import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, updateItems } from "@directus/sdk";
import { ColdLeadItem, getColdLeadLists } from "@/app/actions/cold-leads";
import { identifyIndustry, classifyLeadCategory } from "@/lib/enrichment";

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

        // 3. Process each item
        const processItem = async (lead: ColdLeadItem) => {
            try {
                // Use fallback text if ai_first_sentence is missing
                const contextText = lead.abstract || lead.category || lead.title || "";
                
                // AI call
                const industryDesc = await identifyIndustry(lead.ai_first_sentence || "", contextText);
                
                const updates: any = {
                    industry_description: industryDesc,
                    industry_status: "completed",
                    industry_error: null
                };

                // Optional: Auto-sort based on industry
                const listsRes = await getColdLeadLists();
                if (listsRes.success && listsRes.data) {
                    const categoryNames = listsRes.data.map(l => l.name);
                    const bestCategory = await classifyLeadCategory(industryDesc, categoryNames);
                    
                    if (bestCategory && bestCategory !== lead.list_name) {
                        updates.list_name = bestCategory;
                        console.log(`[INDUSTRY CRON] Lead ${lead.id} auto-sorted to: ${bestCategory}`);
                    }
                }

                await directus.request(updateItem("cold_leads", lead.id, updates));
                return { id: lead.id, success: true };
            } catch (e: any) {
                console.error(`[INDUSTRY CRON] Error for ${lead.id}:`, e);
                await directus.request(updateItem("cold_leads", lead.id, {
                    industry_status: "failed",
                    industry_error: e.message
                }));
                return { id: lead.id, success: false, error: e.message };
            }
        };

        const results = await Promise.all(pendingLeads.map(lead => processItem(lead)));

        // 4. Recursive trigger (fire and forget)
        if (pendingLeads.length === BATCH_SIZE) {
            const proto = request.headers.get("x-forwarded-proto") || "https";
            const host = request.headers.get("host") || "crm.arcigy.cloud";
            const nextUrl = `${proto}://${host}/api/cron/industry-classifier`;
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        return NextResponse.json({ success: true, processed: results.length, results });

    } catch (error: any) {
        console.error("[INDUSTRY CRON] Fatal Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
