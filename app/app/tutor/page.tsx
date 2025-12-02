"use client";
import React, { useEffect, useState, useRef } from "react";
import supabaseClient from "../../../lib/supabaseClient";

export default function TutorPage(){
  const supabase = supabaseClient;
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subject, setSubject] = useState("math");
  const [level, setLevel] = useState("highschool");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      const { data: sessionData } = await supabase.auth.getSession();
      setAccessToken(sessionData?.session?.access_token || null);
      
      // Initial leaderboard load
      const { data: lb } = await supabase.from('leaderboard').select('*').order('points', { ascending: false }).limit(10);
      setLeaderboard(lb || []);
    })();
  },[]);

  // Setup realtime leaderboard subscription
  useEffect(() => {
    if (!subscriptionRef.current) {
      subscriptionRef.current = supabase
        .channel('leaderboard-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leaderboard' },
          () => {
            (async () => {
              const { data: lb } = await supabase.from('leaderboard').select('*').order('points', { ascending: false }).limit(10);
              setLeaderboard(lb || []);
            })();
          }
        )
        .subscribe();
    }
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  async function createSession() {
    if (!accessToken) {
      alert('Not authenticated');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ subject, level, goal: `Study ${subject}` }),
    });
    const data = await res.json();
    setLoading(false);
    if (data?.sessionId) {
      setSessionId(data.sessionId);
      setMessages([]);
    } else {
      alert('Error creating session: ' + (data?.error || 'unknown'));
    }
  }

  async function createQuizAttempt(questions: any[], subj: string) {
    if (!accessToken || !sessionId || !user) return null;
    
    const { data: attempt, error: err } = await supabaseClient.from('quiz_attempts').insert([{
      user_id: user.id,
      session_id: sessionId,
      subject: subj,
      total_questions: questions.length,
      correct_answers: 0,
      score: 0,
    }]).select().single();

    if (err || !attempt) return null;

    const questionRows = questions.map((q: any) => ({
      quiz_attempt_id: attempt.id,
      question_text: q.question || q.title || 'Question',
      correct_answer: q.answer || '',
    }));
    await supabaseClient.from('quiz_questions').insert(questionRows);

    return { id: attempt.id, questions };
  }

  async function submitQuiz() {
    if (!quiz || !accessToken) return;
    setLoading(true);
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ quizAttemptId: quiz.id, answers: quizAnswers }),
    });
    const result = await res.json();
    setLoading(false);
    if (result?.score !== undefined) {
      alert(`Quiz complete! Score: ${result.score.toFixed(1)}% (${result.correctCount}/${result.totalQuestions}). +${result.pointsEarned} points!`);
      setQuiz(null);
      setQuizAnswers({});
    } else {
      alert('Error submitting quiz: ' + (result?.error || 'unknown'));
    }
  }

  async function send(){
    if(!input || !accessToken || !sessionId) {
      alert('Missing input, auth, or session');
      return;
    }
    setLoading(true);
    const newMsg = { sender: 'user', content: input, created_at: new Date().toISOString() };
    setMessages(prev=>[...prev, newMsg]);
    setInput('');

    const res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message: input, sessionId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status !== 200) {
      alert('Error: ' + (data?.error || 'unknown'));
      return;
    }
    if(data?.explanation){
      setMessages(prev=>[...prev, { sender: 'assistant', content: data.explanation, created_at: new Date().toISOString() }]);
    }
    if(data?.references) setResources(data.references);
    if(data?.practice && data.practice.length > 0) {
      const quizData = await createQuizAttempt(data.practice, data.subject);
      setQuiz(quizData);
    }
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-3 rounded bg-white p-4 shadow">
        {!sessionId ? (
          <div className="space-y-3 p-4 border rounded">
            <h3 className="font-semibold">Start a Study Session</h3>
            <select value={subject} onChange={(e)=>setSubject(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
              <option value="math">Math</option>
              <option value="science">Science</option>
              <option value="history">History</option>
              <option value="english">English</option>
              <option value="business">Business</option>
            </select>
            <select value={level} onChange={(e)=>setLevel(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
              <option value="elementary">Elementary</option>
              <option value="middle">Middle</option>
              <option value="highschool">High School</option>
              <option value="university">University</option>
            </select>
            <button className="w-full rounded bg-sky-600 px-3 py-2 text-white text-sm" onClick={createSession} disabled={loading}>
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 text-xs text-slate-600">
              Session: {sessionId?.slice(0, 8)}... | Subject: {subject} | Level: {level}
            </div>
            <div className="space-y-3 h-[50vh] overflow-auto border p-2 mb-3 rounded bg-slate-50">
              {messages.length === 0 && <div className="text-sm text-slate-500 text-center py-10">Start by asking a question...</div>}
              {messages.map((m,i)=> (
                <div key={i} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
                  <div className="inline-block rounded px-3 py-2 max-w-xs text-sm" style={{ background: m.sender === 'user' ? '#e0f2fe' : '#eef2ff' }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            {quiz && (
              <div className="space-y-3 p-3 border rounded bg-yellow-50 mb-3">
                <h4 className="font-semibold text-sm">Practice Questions</h4>
                {quiz.questions.map((q: any, i: number) => (
                  <div key={i} className="space-y-1 p-2 border rounded bg-white text-sm">
                    <p className="font-medium">{q.question || q.title || 'Question ' + (i+1)}</p>
                    <input
                      type="text"
                      className="w-full rounded border px-2 py-1 text-sm"
                      placeholder="Your answer..."
                      value={quizAnswers[i] || ''}
                      onChange={(e)=>setQuizAnswers(prev=>({...prev, [i]: e.target.value}))}
                    />
                  </div>
                ))}
                <button className="w-full rounded bg-green-600 px-3 py-2 text-white text-sm font-medium" onClick={submitQuiz} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input value={input} onChange={(e)=>setInput(e.target.value)} className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Ask a question..." />
              <button className="rounded bg-sky-600 px-3 py-2 text-white text-sm font-medium" onClick={send} disabled={loading}>
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>

      <aside className="rounded bg-white p-4 shadow">
        <h4 className="font-medium text-sm">Resources</h4>
        <ul className="mt-2 space-y-1 text-xs">
          {resources.length === 0 && <li className="text-slate-500">None yet</li>}
          {resources.map((r:any,i:number)=> (
            <li key={i}><a className="text-sky-600 break-words" href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>
          ))}
        </ul>

        <h4 className="mt-4 font-medium text-sm">Live Leaderboard</h4>
        <ol className="mt-2 space-y-1 text-xs">
          {leaderboard.slice(0, 5).length === 0 && <li className="text-slate-500">Loading...</li>}
          {leaderboard.slice(0, 5).map((lb:any,i:number)=> (
            <li key={i} className="flex items-center justify-between">
              <span className="text-slate-600">{i+1}. {lb.user_id?.slice(0,6)}...</span>
              <span className="font-semibold">{lb.points} pts</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
