import { NextResponse } from 'next/server';
import { classifyAgent, resourceAgent, pedagogyAgent, assessmentAgent } from '../../../lib/agents';
import supabaseAdmin from '../../../lib/supabaseServer';

export async function POST(req: Request){
  try {
    // Require Authorization header with Bearer token
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization Bearer token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Validate token and get user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token as string);
    const user = (userData as any)?.user || null;
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = user.id as string;

    const body = await req.json();
    const { message, sessionId } = body;
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    // If sessionId is provided, ensure the session belongs to the authenticated user
    if (sessionId) {
      const { data: sessionRow, error: sessionErr } = await supabaseAdmin.from('study_sessions').select('id, user_id').eq('id', sessionId).maybeSingle();
      if (sessionErr) return NextResponse.json({ error: 'Error checking session' }, { status: 500 });
      if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      if (sessionRow.user_id !== userId) return NextResponse.json({ error: 'Forbidden - session does not belong to user' }, { status: 403 });
    }

    // Agent 1
    const cls = await classifyAgent(message, { userId });
    const subject = cls.subject || 'other';
    const level = cls.level || 'highschool';
    const intent = cls.intent || 'explanation';

    // Agent 2: resources
    const resources = await resourceAgent(message);

    // Agent 3: explanation
    const explanation = await pedagogyAgent(message, subject, level, intent, resources.curated_context);

    // Agent 4: practice
    let practice = [];
    if (intent === 'practice' || intent === 'review' || subject === 'math') {
      practice = await assessmentAgent(message, subject);
    }

    // Persist messages (server-side, authenticated)
    try {
      await supabaseAdmin.from('messages').insert([{ session_id: sessionId, user_id: userId, sender: 'user', content: message }]);
      await supabaseAdmin.from('messages').insert([{ session_id: sessionId, user_id: userId, sender: 'assistant', content: explanation }]);
    } catch (e) {
      // Log or handle persistence errors if needed
    }

    return NextResponse.json({ explanation, practice, references: resources.references, subject, level, intent });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
