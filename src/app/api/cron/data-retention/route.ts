import { db } from "@/lib/db";

/**
 * Endpoint for automated data retention and cleanup via Vercel Crons
 * Schedule: daily at 3:30 AM
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: Record<string, number> = {};

  try {
    // 1. android_logs — keep 30 days
    const androidDeleted = await db.query(`
      DELETE FROM android_logs
      WHERE date_created < NOW() - INTERVAL '30 days'
      RETURNING id
    `);
    results.android_logs = androidDeleted.rowCount || 0;

    // 2. automation_logs — keep 30 days
    // We wrapped in a try-catch for this specific one just in case the table doesn't exist yet
    try {
      const automationDeleted = await db.query(`
        DELETE FROM automation_logs  
        WHERE date_created < NOW() - INTERVAL '30 days'
        RETURNING id
      `);
      results.automation_logs = automationDeleted.rowCount || 0;
    } catch (e) {
      console.warn("[Data Retention] automation_logs cleanup failed (might not exist):", e);
      results.automation_logs = 0;
    }

    // 3. ai_audit_logs — keep 60 days
    const aiLogsDeleted = await db.query(`
      DELETE FROM ai_audit_logs
      WHERE timestamp < NOW() - INTERVAL '60 days'
      RETURNING id
    `);
    results.ai_audit_logs = aiLogsDeleted.rowCount || 0;

    // 4. activities — keep full records 90 days
    // After 90 days: keep row but strip large metadata JSON
    const activitiesCompressed = await db.query(`
      UPDATE activities
      SET metadata = jsonb_build_object(
        'archived', true,
        'intent', metadata->>'intent',
        'summary', LEFT(metadata->>'summary', 200),
        'archived_at', NOW()::text
      )
      WHERE date_created < NOW() - INTERVAL '90 days'
      AND (metadata->>'archived') IS NULL
      RETURNING id
    `);
    results.activities_compressed = activitiesCompressed.rowCount || 0;

    // 5. directus_activity — keep 60 days
    try {
      const directusDeleted = await db.query(`
        DELETE FROM directus_activity
        WHERE timestamp < NOW() - INTERVAL '60 days'
      `);
      results.directus_activity = directusDeleted.rowCount || 0;
    } catch (e) {
      results.directus_activity = 0;
    }

    // 6. gmail_messages — clear body_text after 90 days
    const gmailCompressed = await db.query(`
      UPDATE gmail_messages
      SET body_text = NULL
      WHERE received_at < NOW() - INTERVAL '90 days'
      AND body_text IS NOT NULL
      RETURNING id
    `);
    results.gmail_compressed = gmailCompressed.rowCount || 0;

    // 6. Log the cleanup results
    try {
      const { randomUUID } = await import("crypto");
      await db.query(`
        INSERT INTO automation_logs 
          (automation_name, run_id, status, result, created_at)
        VALUES 
          ('data_retention', $1, 'success', $2, NOW())
      `, [randomUUID(), JSON.stringify(results)]);
    } catch (e) {
      // Fallback if automation_logs isn't ready or has different schema
      console.warn("[Data Retention] Failed to log result to automation_logs", e);
    }

    console.log("[Data Retention] Cleanup complete:", results);

    return Response.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Data Retention] Fatal error:", error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
