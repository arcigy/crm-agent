import { db } from "@/lib/db";
import { syncFullLabels, refreshLabelCounts } from "@/lib/gmail-sync-engine";

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const users = await db.query('SELECT DISTINCT user_email FROM google_tokens');
    
    for (const row of users.rows) {
      const email = row.user_email;
      console.log(`[Cron] Syncing full labels for ${email}...`);
      await syncFullLabels(email);
      await refreshLabelCounts(email);
    }

    return Response.json({ success: true, message: 'Gmail integrity sync completed.' });
  } catch (err: any) {
    console.error('[Cron] Gmail integrity sync failed:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
