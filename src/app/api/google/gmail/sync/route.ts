import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerFullSyncForUser } from "@/lib/gmail-sync-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    let userId = session.userId;
    const clerkEmail = await getUserEmail();
    
    if (!userId && clerkEmail && (await import("@/lib/dev-mode/auth-bypass")).shouldBypassAuth()) {
       userId = (await import("@/lib/dev-mode/auth-bypass")).getDevUser().id;
    }
    
    if (!userId || !clerkEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = { id: userId, emailAddresses: [{ emailAddress: clerkEmail }] };
    
    // Get the actually linked Google email for this user
    const linkedToken = await db.query(
      'SELECT user_email FROM google_tokens WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    
    const userEmail = linkedToken.rows[0]?.user_email?.toLowerCase() || 
                      clerkEmail.toLowerCase();
                      
    if (!userEmail) return NextResponse.json({ error: "No email identified" }, { status: 400 });
  
    const body = await request.json().catch(() => ({}));

    if (body.quick) {
      // Quick sync - only fetch new emails since last sync
      // Run in background, return immediately
      const { fetchNewEmailsForUser } = await import("@/lib/gmail-sync-engine");
      fetchNewEmailsForUser(userEmail).catch(err => {
        console.error('[Gmail Sync] Quick sync background error:', err);
      });
      return NextResponse.json({ status: 'sync_started', type: 'quick' });
    }

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

    // Start full sync in background (includes multiple labels sequentially)
    triggerFullSyncForUser(userEmail, 'INBOX', user.id).catch(err => {
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
    const session = await auth();
    let userId = session.userId;
    const clerkEmail = await getUserEmail();
    
    if (!userId && clerkEmail && (await import("@/lib/dev-mode/auth-bypass")).shouldBypassAuth()) {
       userId = (await import("@/lib/dev-mode/auth-bypass")).getDevUser().id;
    }
    
    if (!userId || !clerkEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = { id: userId, emailAddresses: [{ emailAddress: clerkEmail }] };
    
    // Get the actually linked Google email for this user
    const linkedToken = await db.query(
      'SELECT user_email FROM google_tokens WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    
    const userEmail = linkedToken.rows[0]?.user_email?.toLowerCase() || 
                      clerkEmail.toLowerCase();
                      
    if (!userEmail) return NextResponse.json({ error: "No email identified" }, { status: 400 });
    
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
