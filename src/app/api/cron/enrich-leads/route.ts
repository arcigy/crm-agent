import { NextResponse } from "next/server";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { ColdLeadItem } from "@/app/actions/cold-leads";
import { enrichColdLead } from "@/app/actions/cold-leads";

// This endpoint is designed to be called by a CRON job (e.g., every minute)
// or recursively by itself until the queue is empty.
export async function GET(request: Request) {
    try {
        // 1. Fetch PENDING leads (Batch of 5 to 50)
        // Adjust batch size based on execution time limits (Vercel has 10s-60s limit)
        const BATCH_SIZE = 5; 
        
        const pendingLeads = await directus.request(readItems("cold_leads", {
            filter: {
                enrichment_status: { _eq: "pending" }
            },
            limit: BATCH_SIZE,
            fields: ["id", "website", "title"]
        })) as unknown as ColdLeadItem[];

        if (!pendingLeads || pendingLeads.length === 0) {
            return NextResponse.json({ message: "No pending leads found", count: 0 });
        }

        console.log(`[CRON] Processing batch of ${pendingLeads.length} leads...`);

        // 2. Mark them as PROCESSING immediately to prevent other runs from picking them up
        await Promise.all(pendingLeads.map(lead => 
            directus.request(updateItem("cold_leads", lead.id, { 
                enrichment_status: "processing" 
            }))
        ));

        // 3. Process the batch in PARALLEL
        const results = await Promise.all(pendingLeads.map(async (lead) => {
            try {
                // Call the existing logic
                const result = await enrichColdLead(lead.id);
                
                // Update final status based on result
                await directus.request(updateItem("cold_leads", lead.id, { 
                    enrichment_status: result.success ? "completed" : "failed",
                    enrichment_error: result.error || null
                }));

                return { id: lead.id, success: result.success, error: result.error };
            } catch (e: any) {
                // Catastrophic failure for this item
                await directus.request(updateItem("cold_leads", lead.id, { 
                    enrichment_status: "failed",
                    enrichment_error: e.message
                }));
                return { id: lead.id, success: false, error: e.message };
            }
        }));

        const successCount = results.filter(r => r.success).length;

        // 4. Recursive Call (Turbo Boost)
        // If we filled the batch, there might be more. Trigger the next run immediately.
        if (pendingLeads.length === BATCH_SIZE) {
            const proto = request.headers.get("x-forwarded-proto") || "http";
            const host = request.headers.get("host");
            const nextUrl = `${proto}://${host}/api/cron/enrich-leads`;
            
            // Fire and forget (don't await)
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(console.error);
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
