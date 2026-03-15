import { NextResponse } from 'next/server';
import { backupDatabase } from '@/lib/backup';
import { db } from '@/lib/db';

/**
 * Endpoint for automated database backups via Vercel Crons
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  try {
    const result = await backupDatabase();
    const duration = Date.now() - start;

    // Log the backup event to database if possible
    try {
      // Assuming a table exists or we can log it somewhere
      // For now, we'll just log to console and return
      console.log(`[Cron Backup] Completed in ${duration}ms. Success: ${result.success}`);
    } catch (logErr) {
      console.error('[Cron Backup] Failed to log backup event:', logErr);
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // DB Size & Stats Monitoring
    try {
      const dbStats = await db.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as total_size,
          (SELECT COUNT(*) FROM activities) as activities_count,
          (SELECT COUNT(*) FROM android_logs) as android_logs_count,
          (SELECT COUNT(*) FROM cold_leads WHERE deleted_at IS NULL) as leads_count,
          (SELECT COUNT(*) FROM ai_audit_logs) as ai_logs_count
      `);

      const sizeBytesRes = await db.query(
        `SELECT pg_database_size(current_database()) as bytes`
      );
      const sizeBytes = sizeBytesRes.rows[0].bytes;

      const RAILWAY_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1GB limit for free/starter tier
      const usagePercent = (sizeBytes / RAILWAY_LIMIT_BYTES) * 100;

      const stats = {
        ...dbStats.rows[0],
        usage_percent: usagePercent,
        backup_duration_ms: duration
      };

      console.log('[DB Stats]', stats);

      if (usagePercent > 80) {
        console.error(`⚠️ DB at ${usagePercent.toFixed(1)}% capacity!`);
      }

      // Store in automation_logs
      await db.query(`
        INSERT INTO automation_logs (automation_name, status, result, created_at)
        VALUES ('db_size_check', 'completed', $1, NOW())
      `, [JSON.stringify(stats)]);

      // Combine result
      return NextResponse.json({
        ...result,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        stats
      });
    } catch (statsErr) {
      console.error('[Cron Backup] Failed to collect DB stats:', statsErr);
      return NextResponse.json({
        ...result,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('[Cron Backup] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - start
    }, { status: 500 });
  }
}
