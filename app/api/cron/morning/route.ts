import { NextRequest, NextResponse } from 'next/server';
import { pushMorningSummary } from '@/lib/line';

export async function GET(request: NextRequest) {
  // Protect against unauthorized calls (Vercel sets this header automatically)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timing is controlled solely by vercel.json cron schedule (currently 09:30 JST)
  try {
    await pushMorningSummary();
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    console.error('Morning cron failed:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
