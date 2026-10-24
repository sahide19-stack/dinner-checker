'use server';

import { pushMorningSummary } from '@/lib/line';

export async function testLineNotification(): Promise<{ ok: boolean; error?: string }> {
  try {
    await pushMorningSummary();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
