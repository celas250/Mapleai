"use client";
import React, { useEffect, useState, useRef } from "react";
import supabaseClient from "../../lib/supabaseClient";
import Link from "next/link";

export default function DashboardPage(){
  const supabase = supabaseClient;
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      const { data: lb } = await supabase.from('leaderboard').select('*').order('points',{ascending:false}).limit(5);
      setLeaderboard(lb || []);
    })();
  },[]);

  // Setup realtime leaderboard subscription
  useEffect(() => {
    if (!subscriptionRef.current) {
      subscriptionRef.current = supabase
        .channel('leaderboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
          (async () => {
            const { data: lb } = await supabase.from('leaderboard').select('*').order('points', { ascending: false }).limit(5);
            setLeaderboard(lb || []);
          })();
        })
        .subscribe();
    }
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <div className="col-span-2 rounded bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h3>
          <button onClick={logout} className="text-sm text-slate-600 hover:text-slate-900">Log out</button>
        </div>
        <p className="mt-2 text-slate-600">Start a study session to learn with AI tutoring and compete on the leaderboard.</p>
        <div className="mt-4">
          <Link href="/app/tutor" className="inline-block rounded bg-sky-600 px-4 py-2 text-white font-medium">
            Start New Session
          </Link>
        </div>
      </div>

      <aside className="rounded bg-white p-4 shadow">
        <h4 className="font-medium">Live Leaderboard</h4>
        <ol className="mt-3 space-y-2 text-sm">
          {leaderboard.length === 0 && <li className="text-slate-500 text-xs">No scores yet</li>}
          {leaderboard.map((r:any,i:number)=> (
            <li key={i} className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{i+1}. {r.user_id?.slice(0,6)}...</span>
              <span className="text-sm font-semibold">{r.points}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
