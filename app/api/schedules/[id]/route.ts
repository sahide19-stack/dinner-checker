import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { pushChangeNotification } from '@/lib/line';
import type { Member, DinnerSchedule } from '@/types';

// DELETE /api/schedules/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch the record before deleting so we can notify
  const { data: record } = await supabase
    .from('dinner_schedule')
    .select('*, members(*)')
    .eq('id', numId)
    .single();

  const { error } = await supabase
    .from('dinner_schedule')
    .delete()
    .eq('id', numId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (record) {
    const s = record as DinnerSchedule & { members: Member };
    await pushChangeNotification(s.members.name, s.members.icon, s.date, 'present').catch(
      console.error
    );
  }

  return new NextResponse(null, { status: 204 });
}
