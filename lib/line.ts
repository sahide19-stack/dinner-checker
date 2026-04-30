import { messagingApi, validateSignature } from '@line/bot-sdk';
import { getSupabase } from './supabase';
import type { Member, DinnerSchedule, Settings } from '@/types';

function getLineClient() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
}

export function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;
  return validateSignature(body, secret, signature);
}

// -------- Settings --------

async function fetchSettings(): Promise<Settings | null> {
  try {
    const { data } = await getSupabase().from('settings').select('*').eq('id', 1).single();
    return data as Settings | null;
  } catch {
    return null;
  }
}

/** Resolve notify target: DB setting takes priority over env var */
async function resolveNotifyUserId(): Promise<string | null> {
  const settings = await fetchSettings();
  return settings?.notify_user_id ?? process.env.LINE_NOTIFY_USER_ID ?? null;
}

// -------- Helpers --------

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

async function fetchMembersAndSchedulesForDate(dateStr: string): Promise<{
  members: Member[];
  present: Member[];
  absent: Member[];
}> {
  const supabase = getSupabase();
  const [{ data: members }, { data: schedules }] = await Promise.all([
    supabase.from('members').select('*').order('sort_order'),
    supabase.from('dinner_schedule').select('*').eq('date', dateStr),
  ]);
  const absentIds = new Set((schedules as DinnerSchedule[]).map((s) => s.member_id));
  const all = (members as Member[]) ?? [];
  return {
    members: all,
    present: all.filter((m) => !absentIds.has(m.id)),
    absent: all.filter((m) => absentIds.has(m.id)),
  };
}

/** Fetch all schedules for a date range in as few queries as possible */
async function fetchSchedulesForRange(
  startStr: string,
  endStr: string
): Promise<DinnerSchedule[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('dinner_schedule')
    .select('*')
    .gte('date', startStr)
    .lte('date', endStr);
  return (data as DinnerSchedule[]) ?? [];
}

function buildSummaryText(dateStr: string, present: Member[], absent: Member[]): string {
  const presentLine =
    present.length > 0
      ? `🍚 いる: ${present.map((m) => m.name).join('、')}（${present.length}人分）`
      : '🍚 いる: なし';
  const absentLine =
    absent.length > 0
      ? `✗ いらない: ${absent.map((m) => m.name).join('、')}`
      : '✗ いらない: なし';
  return `🍽 晩ごはん（${formatDateLabel(dateStr)}）\n\n${presentLine}\n${absentLine}`;
}

// -------- Push notifications --------

export async function pushChangeNotification(
  changedMemberName: string,
  changedMemberIcon: string,
  dateStr: string,
  newStatus: 'absent' | 'present'
): Promise<void> {
  const notifyUserId = await resolveNotifyUserId();
  if (!notifyUserId) return;

  const { present, absent } = await fetchMembersAndSchedulesForDate(dateStr);
  const statusLabel = newStatus === 'absent' ? '✗ いらない' : '🍚 いる';
  const presentLine =
    present.length > 0
      ? `🍚 いる: ${present.map((m) => m.name).join('、')}（${present.length}人分）`
      : '🍚 いる: なし';
  const absentLine =
    absent.length > 0
      ? `✗ いらない: ${absent.map((m) => m.name).join('、')}`
      : '✗ いらない: なし';

  const text =
    `📝 晩ごはん予定が変わりました\n\n` +
    `${changedMemberIcon} ${changedMemberName}: ${formatDateLabel(dateStr)} → ${statusLabel}\n\n` +
    `【今日の状況】\n${presentLine}\n${absentLine}`;

  await getLineClient().pushMessage({
    to: notifyUserId,
    messages: [{ type: 'text', text }],
  });
}

export async function pushMorningSummary(): Promise<void> {
  const notifyUserId = await resolveNotifyUserId();
  if (!notifyUserId) return;

  const todayStr = toDateStr(new Date());
  const { present, absent } = await fetchMembersAndSchedulesForDate(todayStr);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const text =
    buildSummaryText(todayStr, present, absent) +
    (appUrl ? `\n\n📅 カレンダー → ${appUrl}` : '');

  await getLineClient().pushMessage({
    to: notifyUserId,
    messages: [{ type: 'text', text }],
  });
}

/**
 * Check if it is time to send the morning notification.
 *
 * Strategy: Vercel Hobby plan only supports daily crons.
 * The cron in vercel.json is fixed at a UTC time (default 23:00 UTC = 08:00 JST).
 * This function compares the DB-configured hour against the current JST hour so that
 * on Pro plans (hourly cron), the right hour fires. On Hobby (daily cron), the cron
 * fires once per day and this check always passes since the schedule matches the default time.
 *
 * If you change morning_notify_time in the app AND you are on the Hobby plan, also update
 * the cron schedule in vercel.json accordingly.
 */
export async function isMorningNotifyTime(): Promise<boolean> {
  const settings = await fetchSettings();
  const timeStr = settings?.morning_notify_time ?? '08:00';

  // Current time in JST (UTC+9)
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentHourJst = nowJst.getUTCHours();

  const [targetH] = timeStr.split(':').map(Number);
  return currentHourJst === targetH;
}

// -------- Reply to LINE messages --------

export async function buildReplyText(keyword: string): Promise<string | null> {
  const today = new Date();
  const todayStr = toDateStr(today);

  if (keyword.includes('今日')) {
    const { present, absent } = await fetchMembersAndSchedulesForDate(todayStr);
    return buildSummaryText(todayStr, present, absent);
  }

  if (keyword.includes('明日')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);
    const { present, absent } = await fetchMembersAndSchedulesForDate(tomorrowStr);
    return buildSummaryText(tomorrowStr, present, absent);
  }

  if (keyword.includes('今週')) {
    // Fetch all 7 days in 1-2 queries (by month)
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    const startStr = todayStr;
    const endStr = toDateStr(weekEnd);

    const [{ data: allMembers }, schedules] = await Promise.all([
      getSupabase().from('members').select('*').order('sort_order'),
      fetchSchedulesForRange(startStr, endStr),
    ]);
    const members = (allMembers as Member[]) ?? [];

    const absentByDate: Record<string, Set<string>> = {};
    for (const s of schedules) {
      if (!absentByDate[s.date]) absentByDate[s.date] = new Set();
      absentByDate[s.date].add(s.member_id);
    }

    const lines: string[] = ['📅 今週の晩ごはん\n'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toDateStr(d);
      const absentIds = absentByDate[dateStr] ?? new Set();
      const present = members.filter((m) => !absentIds.has(m.id));
      const absent = members.filter((m) => absentIds.has(m.id));
      const presentNames = present.map((m) => m.name).join('・') || 'なし';
      const absentNames = absent.map((m) => m.name).join('・');
      lines.push(
        `${formatDateLabel(dateStr)} 🍚${presentNames}` +
          (absentNames ? ` ✗${absentNames}` : '')
      );
    }
    return lines.join('\n');
  }

  return null;
}

export async function replyMessage(replyToken: string, text: string): Promise<void> {
  await getLineClient().replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}
