import { NextResponse } from 'next/server';
import { snapshotDirectus } from '@/lib/directus-backup';

/**
 * Endpoint pre automatizované snapshoty Directus schémy
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  try {
    const result = await snapshotDirectus();
    const duration = Date.now() - start;

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron Snapshot] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - start
    }, { status: 500 });
  }
}
