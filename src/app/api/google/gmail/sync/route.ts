import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { performFullSync } from "@/lib/gmail-sync-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return NextResponse.json({ error: "No primary email" }, { status: 400 });

    // Check if already syncing
    const stateRes = await db.query(`
      SELECT sync_status, synced_messages, total_messages 
      FROM gmail_sync_state 
      WHERE user_email = $1 AND label_id = 'INBOX'
    `, [userEmail]);
    
    const state = stateRes.rows[0];

    if (state?.sync_status === 'syncing') {
      return NextResponse.json({ 
        status: 'already_syncing',
        progress: {
          synced: state.synced_messages,
          total: state.total_messages,
          percent: state.total_messages ? Math.round((state.synced_messages / state.total_messages) * 100) : 0
        }
      });
    }

    // Start sync in background (don't await)
    performFullSync(userEmail, 'INBOX').catch(err => {
      console.error('[Gmail Sync] Full sync background error:', err);
    });

    return NextResponse.json({ 
      status: 'sync_started',
      message: 'Full sync initiated. Check /api/google/gmail/sync for progress.'
    });
  } catch (error: any) {
    console.error('[Gmail Sync POST] Error:', error);
    return NextResponse.json({ error: "Failed to trigger sync" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return NextResponse.json({ error: "No primary email" }, { status: 400 });
    
    const states = await db.query(`
      SELECT * FROM gmail_sync_state
      WHERE user_email = $1
    `, [userEmail]);

    const labelCounts = await db.query(`
      SELECT * FROM gmail_label_counts
      WHERE user_email = $1
    `, [userEmail]);

    return NextResponse.json({
      sync_states: states.rows,
      label_counts: labelCounts.rows,
      is_ready: states.rows.length > 0 && states.rows.every(s => s.sync_status === 'completed')
    });
  } catch (error: any) {
    console.error('[Gmail Sync GET] Error:', error);
    return NextResponse.json({ error: "Failed to fetch sync status" }, { status: 500 });
  }
}
