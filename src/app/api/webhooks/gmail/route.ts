import { NextResponse } from "next/server";
import { applyAILabelToGmail } from "@/app/actions/labels";

export const dynamic = "force-dynamic";

/**
 * Handle Google Pub/Sub notifications for Gmail
 * Returns 200 immediately to avoid Pub/Sub retries
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const pubsubToken = process.env.GOOGLE_PUBSUB_TOKEN;
  
  if (!pubsubToken || authHeader !== `Bearer ${pubsubToken}`) {
    console.warn("[Gmail Webhook] Unauthorized access attempt");
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    
    if (!body.message?.data) {
      return NextResponse.json({ error: "No data" }, { status: 400 });
    }

    // Return 200 immediately to stop Pub/Sub retries
    const response = NextResponse.json({ success: true });

    // Process in background — delegate entirely to the sync engine
    (async () => {
      try {
        void applyAILabelToGmail;
        const data = JSON.parse(
          Buffer.from(body.message.data, 'base64').toString()
        );
        const { emailAddress, historyId } = data;

        if (!emailAddress || !historyId) {
          console.warn('[Gmail Webhook] Missing emailAddress or historyId');
          return;
        }

        const { performIncrementalSync } = await import('@/lib/gmail-sync-engine');
        await performIncrementalSync(emailAddress, String(historyId));

        // Note: applyAILabelToGmail is called inside gmail-processor.ts → processNewEmail()
        // after each email classification, as part of the sync/processing pipeline.
        console.log(`[Gmail Webhook] Incremental sync done for ${emailAddress} @ historyId ${historyId}`);
      } catch (err) {
        console.error('[Gmail Webhook] Background sync error:', err);
      }
    })();

    return response;
  } catch (error: any) {
    console.error("[Gmail Webhook] Parse error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
