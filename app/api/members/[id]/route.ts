import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, icon, sort_order } = body;

  if (!name || !icon) {
    return NextResponse.json({ error: 'name and icon are required' }, { status: 400 });
  }

  const payload: Record<string, unknown> = { name, icon };
  if (typeof sort_order === 'number') payload.sort_order = sort_order;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('members')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
