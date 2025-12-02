import { NextResponse } from 'next/server';
import supabaseAdmin from '../../../lib/supabaseServer';
import { callLLM } from '../../../lib/openrouter';

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
    const { quizAttemptId, answers } = body; // answers: { [questionIndex]: answer }
    if (!quizAttemptId || !answers) {
      return NextResponse.json({ error: 'quizAttemptId and answers required' }, { status: 400 });
    }

    // Fetch the quiz attempt and its questions
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', quizAttemptId)
      .eq('user_id', userId)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found or access denied' }, { status: 404 });
    }

    const { data: questions, error: questionsErr } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('quiz_attempt_id', quizAttemptId)
      .order('id');

    if (questionsErr) {
      return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
    }

    // Grade answers
    let correctCount = 0;
    const gradedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAnswer = answers[i] || '';
      
      // Simple exact match grading (or you could use LLM for semantic matching)
      const isCorrect = userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
      if (isCorrect) correctCount++;
      
      gradedQuestions.push({
        id: q.id,
        question_text: q.question_text,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
      });
    }

    const score = (correctCount / questions.length) * 100;

    // Update quiz attempt with score
    await supabaseAdmin
      .from('quiz_attempts')
      .update({ correct_answers: correctCount, score })
      .eq('id', quizAttemptId);

    // Update quiz_questions with user answers and correctness
    for (let i = 0; i < questions.length; i++) {
      await supabaseAdmin
        .from('quiz_questions')
        .update({
          user_answer: answers[i] || '',
          is_correct: gradedQuestions[i].is_correct,
        })
        .eq('id', questions[i].id);
    }

    // Award points: correctCount * 10 points per correct answer
    const pointsEarned = correctCount * 10;
    const { data: leaderboardRow } = await supabaseAdmin
      .from('leaderboard')
      .select('points')
      .eq('user_id', userId)
      .eq('subject', attempt.subject || 'global')
      .single();

    const currentPoints = leaderboardRow?.points || 0;
    await supabaseAdmin
      .from('leaderboard')
      .upsert(
        { user_id: userId, subject: attempt.subject || 'global', points: currentPoints + pointsEarned, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,subject' }
      );

    return NextResponse.json({
      score,
      correctCount,
      totalQuestions: questions.length,
      pointsEarned,
      gradedQuestions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
