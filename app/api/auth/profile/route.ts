import { NextResponse } from 'next/server';
import supabaseAdmin from '../../../../lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email required' }, { status: 400 });
    }

    // Create profile for new user
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: userId,
        full_name: email.split('@')[0],
        role: 'student',
        grade_level: 'Grade 10',
        preferred_subjects: ['math', 'science'],
      }])
      .select()
      .single();

    if (profileErr && !profileErr.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Initialize leaderboard entry
    await supabaseAdmin
      .from('leaderboard')
      .upsert([
        { user_id: userId, subject: 'global', points: 0, updated_at: new Date().toISOString() },
      ], { onConflict: 'user_id,subject' });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
