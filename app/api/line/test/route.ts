import { NextRequest, NextResponse } from 'next/server';
import { pushMorningSummary } from '@/lib/line';

// POST /api/line/test — sends a test morning summary notification immediately
// Requires Bearer CRON_SECRET for authorization (same as /api/cron/morning)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await pushMorningSummary();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
