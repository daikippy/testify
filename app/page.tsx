"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Page() {
  const [user, setUser] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // --- DEBUG: 環境変数の有無を確認（公開しないでください） ---
    console.log("DEBUG: NEXT_PUBLIC_SUPABASE_URL exists?", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY length:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0);
    // -----------------------------------------------------------------

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      fetchRecords();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchRecords();
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setRecords([]);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user) return alert("まずログインしてください");
    if (!title && !content) return alert("タイトルか本文を入力してください");

    setLoading(true);
    const { error } = await supabase.from("records").insert([{
      user_id: user.id,
      title,
      content,
    }]);

    if (error) {
      console.error(error);
      alert("保存に失敗しました。");
    } else {
      setTitle(""); setContent("");
      fetchRecords();
    }
    setLoading(false);
  }

  async function fetchRecords() {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRecords(data ?? []);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-6">
          <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight">Testify</h1>
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-slate-500">{user.email}</span>
                <button onClick={signOut} className="text-xs bg-slate-200 px-3 py-1 rounded-full">サインアウト</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold">ログイン</button>
            )}
          </div>
        </header>

        {user ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow space-y-4">
            <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="タイトル" className="w-full p-3 border rounded" />
            <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="本文" rows={4} className="w-full p-3 border rounded" />
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded">
              {loading ? "保存中..." : "記録を保存する"}
            </button>
          </form>
        ) : (
          <div className="bg-blue-50 p-8 rounded">ログインして記録を始めましょう</div>
        )}

        <section>
          <h3 className="text-slate-400 font-bold text-xs uppercase">Recent Records</h3>
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-slate-500">まだ記録がありません。</p>
            ) : (
              records.map((r:any) => (
                <article key={r.id} className="bg-white p-4 rounded shadow">
                  <h4 className="font-bold">{r.title || "無題"}</h4>
                  <p className="text-slate-600">{r.content}</p>
                  <time className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</time>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}