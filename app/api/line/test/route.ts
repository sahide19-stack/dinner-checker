import { NextResponse } from 'next/server';
import { pushMorningSummary } from '@/lib/line';

// POST /api/line/test — sends a test morning summary notification immediately
export async function POST() {
  try {
    await pushMorningSummary();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
