import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { pushChangeNotification } from '@/lib/line';
import type { Member } from '@/types';

// GET /api/schedules?month=YYYY-MM
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = new Date(year, mon, 0).toISOString().split('T')[0]; // last day of month

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('dinner_schedule')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/schedules  body: { member_id, date }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { member_id, date } = body;

  if (!member_id || !date) {
    return NextResponse.json({ error: 'member_id and date are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('dinner_schedule')
    .upsert(
      { member_id, date, status: 'absent', updated_by: member_id },
      { onConflict: 'member_id,date' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: member } = await supabase.from('members').select('*').eq('id', member_id).single();
  if (member) {
    const m = member as Member;
    await pushChangeNotification(m.name, m.icon, date, 'absent').catch(console.error);
  }

  return NextResponse.json(data, { status: 201 });
}
