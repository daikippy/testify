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
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans selection:bg-blue-100">
      {/* ナビゲーションバー */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">T</span>
            Testify
          </h1>
          <div>
            {user ? (
              <button onClick={signOut} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">サインアウト</button>
            ) : (
              <button onClick={signInWithGoogle} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-full font-semibold hover:bg-slate-800 transition shadow-sm">ログイン</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        
        {/* メインメッセージ・フォーム */}
        {user ? (
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">こんにちは、{user.user_metadata.full_name || '兄弟姉妹'}</h2>
              <p className="text-slate-500 text-sm italic">今日、霊的に学んだことや感じた証は何ですか？</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-5">
              <div className="space-y-4">
                <input 
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value)} 
                  placeholder="タイトル（例：今日の聖句から、祈りの答え）" 
                  className="w-full p-0 text-xl font-bold placeholder:text-slate-300 border-none focus:ring-0 outline-none" 
                />
                <textarea 
                  value={content} 
                  onChange={(e)=>setContent(e.target.value)} 
                  placeholder="ここに思いを書き留めてください..." 
                  rows={6} 
                  className="w-full p-0 text-slate-600 placeholder:text-slate-300 border-none focus:ring-0 outline-none resize-none leading-relaxed" 
                />
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`px-8 py-3 rounded-2xl font-bold text-white transition shadow-md ${loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                >
                  {loading ? "保存中..." : "記録を保存する"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl">🛡️</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 italic">"わたしのすべての証を、真実であることを記録する"</h2>
              <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">神様から受けた霊的な気づきを、安全に一箇所にまとめましょう。</p>
            </div>
            <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-blue-200 transition active:scale-95">
              Googleでログインして始める
            </button>
          </section>
        )}

        {/* 記録の一覧 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-400 tracking-widest uppercase">あなたの歩み</h3>
            <span className="text-xs text-slate-400">{records.length} 件の記録</span>
          </div>
          
          <div className="grid gap-6">
            {records.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400">まだ記録がありません。最初の証を残しましょう。</p>
              </div>
            ) : (
              records.map((r:any) => (
                <article key={r.id} className="group bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-50 hover:shadow-md transition duration-300">
                  <header className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-xl text-slate-900 group-hover:text-blue-700 transition">{r.title || "無題"}</h4>
                    <time className="text-[10px] font-mono text-slate-300 mt-1 uppercase tracking-wider">{new Date(r.created_at).toLocaleDateString()}</time>
                  </header>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                    {r.content}
                  </p>
                  <footer className="mt-6 pt-4 border-t border-slate-50 flex justify-end items-center gap-2">
                     <div className="text-[10px] text-slate-300 italic">Testified on {new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </footer>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="py-20 text-center">
        <p className="text-slate-300 text-xs tracking-widest uppercase">© 2026 Testify App</p>
      </footer>
    </div>
  );
}