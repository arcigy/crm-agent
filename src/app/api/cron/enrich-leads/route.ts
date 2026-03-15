import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichColdLead } from "@/app/actions/cold-leads";
import crypto from "crypto";

// This endpoint is designed to be called by a CRON job (e.g., every minute)
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const runId = crypto.randomUUID();
        
        // 0. Safety cleanup: release leads stuck in 'processing' for > 30 mins
        await db.query(`
          UPDATE cold_leads 
          SET enrichment_status = 'pending', processing_run_id = NULL
          WHERE enrichment_status = 'processing' 
          AND date_updated < NOW() - INTERVAL '30 minutes'
        `);

        // 1. Atomically claim leads
        const BATCH_SIZE = 50; 
        const claimed = await db.query(`
          UPDATE cold_leads
          SET enrichment_status = 'processing', processing_run_id = $1, date_updated = NOW()
          WHERE id IN (
            SELECT id FROM cold_leads
            WHERE enrichment_status = 'pending'
            ORDER BY date_created ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
          )
          RETURNING id, website, title, user_email
        `, [runId, BATCH_SIZE]);

        const leadsToProcess = claimed.rows;

        if (!leadsToProcess || leadsToProcess.length === 0) {
            console.log("[ENRICHMENT CRON] No pending leads found.");
            return NextResponse.json({ message: "No pending leads found", count: 0 });
        }

        console.log(`[ENRICHMENT CRON] Claimed ${leadsToProcess.length} leads with RunId: ${runId}`);

        // 2. Process the claimed leads
        const results = await Promise.all(leadsToProcess.map(async (lead) => {
            try {
                // 45s timeout limit per item to stay within serverless limits
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout (45s)")), 45000)
                );

                const result: any = await Promise.race([
                    enrichColdLead(lead.id, lead.user_email),
                    timeoutPromise
                ]);
                
                // Update final status and clear run ID
                await db.query(`
                    UPDATE cold_leads 
                    SET enrichment_status = $1, 
                        enrichment_error = $2, 
                        processing_run_id = NULL,
                        date_updated = NOW()
                    WHERE id = $3
                `, [result.success ? "completed" : "failed", result.error || null, lead.id]);

                return { id: lead.id, success: result.success, error: result.error };
            } catch (e: any) {
                console.error(`Error processing lead ${lead.id}:`, e);
                await db.query(`
                    UPDATE cold_leads 
                    SET enrichment_status = 'failed', 
                        enrichment_error = $1, 
                        processing_run_id = NULL,
                        date_updated = NOW()
                    WHERE id = $2
                `, [e.message, lead.id]);
                return { id: lead.id, success: false, error: e.message };
            }
        }));

        const successCount = results.filter(r => r.success).length;

        // 3. Recursive Call if more items might be waiting
        if (leadsToProcess.length === BATCH_SIZE) {
            const proto = request.headers.get("x-forwarded-proto") || "https";
            const host = request.headers.get("host") || "crm.arcigy.cloud";
            const nextUrl = `${proto}://${host}/api/cron/enrich-leads`;
            
            console.log(`[ENRICHMENT CRON] 🚀 Triggering next batch: ${nextUrl}`);
            fetch(nextUrl, { headers: { 
                'Cache-Control': 'no-cache',
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }}).catch(e => console.error("[ENRICHMENT CRON] Failed to trigger next batch:", e));
        }

        return NextResponse.json({ 
            success: true, 
            run_id: runId,
            processed: results.length, 
            successful: successCount,
            results 
        });

    } catch (error: any) {
        console.error("[CRON] Fatal error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
