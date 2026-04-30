import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, buildReplyText, replyMessage } from '@/lib/line';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { events: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await handleEvents(body.events);

  return NextResponse.json({ ok: true });
}

type LineEvent = {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
  source?: { type: string; userId?: string; groupId?: string; roomId?: string };
};

async function handleEvents(events: LineEvent[]) {
  for (const event of events) {
    if (event.type !== 'message') continue;
    if (event.message?.type !== 'text') continue;
    if (!event.replyToken) continue;

    const userId = event.source?.userId ?? 'unknown';
    console.log(`[webhook] userId=${userId}`);

    const text = event.message.text ?? '';
    const replyText = await buildReplyText(text);
    if (!replyText) continue;

    try {
      await replyMessage(event.replyToken, replyText);
    } catch (e) {
      console.error('LINE reply failed:', e);
    }
  }
}
