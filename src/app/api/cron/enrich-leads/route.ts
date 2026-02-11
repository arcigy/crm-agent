import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { ColdLeadItem } from "@/app/actions/cold-leads";
import { enrichColdLead } from "@/app/actions/cold-leads";

// This endpoint is designed to be called by a CRON job (e.g., every minute)
// or recursively by itself until the queue is empty.
export async function GET(request: Request) {
    try {
        // 1. Fetch larger batch for efficiency
        const BATCH_SIZE = 10; 
        
        const pendingLeads = await directus.request(readItems("cold_leads", {
            filter: {
                enrichment_status: { _eq: "pending" }
            },
            limit: BATCH_SIZE,
            fields: ["id", "website", "title", "user_email"]
        })) as unknown as ColdLeadItem[];

        if (!pendingLeads || pendingLeads.length === 0) {
            console.log("[ENRICHMENT CRON] No pending leads found. Sleeping.");
            return NextResponse.json({ message: "No pending leads found", count: 0 });
        }

        console.log(`[ENRICHMENT CRON] Starting batch of ${pendingLeads.length} leads...`);

        // 2. Mark as processing
        await Promise.all(pendingLeads.map(lead => 
            directus.request(updateItem("cold_leads", lead.id, { 
                enrichment_status: "processing" 
            }))
        ));

        // 3. Process with timeout wrapper to prevent one slow item from hanging everything indefinitely
        const processItem = async (lead: ColdLeadItem) => {
            try {
                // 45s timeout limit per item to ensure we stay within serverless limits
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout (45s)")), 45000)
                );

                const result: any = await Promise.race([
                    enrichColdLead(lead.id, lead.user_email),
                    timeoutPromise
                ]);
                
                // Update final status
                await directus.request(updateItem("cold_leads", lead.id, { 
                    enrichment_status: result.success ? "completed" : "failed",
                    enrichment_error: result.error || null
                }));

                return { id: lead.id, success: result.success, error: result.error };
            } catch (e: any) {
                console.error(`Error processing lead ${lead.id}:`, e);
                await directus.request(updateItem("cold_leads", lead.id, { 
                    enrichment_status: "failed",
                    enrichment_error: e.message
                }));
                return { id: lead.id, success: false, error: e.message };
            }
        };

        // Execute all in parallel
        const results = await Promise.all(pendingLeads.map(lead => processItem(lead)));

        const successCount = results.filter(r => r.success).length;

        // 4. Recursive Call (Turbo Boost)
        if (pendingLeads.length === BATCH_SIZE) {
            const proto = request.headers.get("x-forwarded-proto") || "https";
            const host = request.headers.get("host") || "crm.arcigy.cloud";
            const nextUrl = `${proto}://${host}/api/cron/enrich-leads`;
            
            console.log(`[ENRICHMENT CRON] 🚀 Triggering next batch: ${nextUrl}`);
            
            // Fire and forget
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(e => console.error("[ENRICHMENT CRON] Failed to trigger next batch:", e));
        }

        return NextResponse.json({ 
            success: true, 
            processed: results.length, 
            successful: successCount,
            results 
        });

    } catch (error: any) {
        console.error("[CRON] Fatal error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
