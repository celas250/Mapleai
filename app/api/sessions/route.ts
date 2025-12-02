import { NextResponse } from 'next/server';
import supabaseAdmin from '../../../lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization Bearer token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token as string);
    const user = (userData as any)?.user || null;
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = user.id as string;

    const body = await req.json();
    const { subject, level, goal } = body;
    if (!subject || !level) {
      return NextResponse.json({ error: 'subject and level required' }, { status: 400 });
    }

    // Create a new study session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('study_sessions')
      .insert([{ user_id: userId, subject, level, goal: goal || `Study ${subject}` }])
      .select('id')
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
