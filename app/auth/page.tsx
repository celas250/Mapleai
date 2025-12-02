"use client";
import React, { useState } from "react";
import supabaseClient from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const supabase = supabaseClient;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (!error && data?.user) {
      // Create profile for new user
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (token) {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: data.user.id, email }),
        });
      }
      router.push("/app/dashboard");
    }
    else alert(error?.message);
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (!error) router.push("/app/dashboard");
    else alert(error.message);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">Log in / Sign up</h2>
      <input className="w-full rounded border px-3 py-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input type="password" className="w-full rounded border px-3 py-2" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button className="rounded bg-sky-600 px-3 py-2 text-white" onClick={signIn} disabled={loading}>Sign in</button>
        <button className="rounded border px-3 py-2" onClick={signUp} disabled={loading}>Sign up</button>
      </div>
    </div>
  );
}
