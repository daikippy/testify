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
    // ログイン状態を確認
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      fetchRecords();
    });

    // ログイン状態の変化を監視
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchRecords();
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    // Googleログインを実行
    await supabase.auth.signInWithOAuth({ 
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
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
      alert("保存に失敗しました。Supabaseのテーブル設定（SQL）を確認してください。");
    } else {
      setTitle(""); 
      setContent("");
      fetchRecords(); // 新しいリストを取得
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
                <button onClick={signOut} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded-full transition">サインアウト</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition">ログイン</button>
            )}
          </div>
        </header>

        {user ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-none space-y-4">
            <h2 className="text-xl font-bold text-slate-800">今日の証や学びを記録</h2>
            <input 
              value={title} 
              onChange={(e)=>setTitle(e.target.value)} 
              placeholder="タイトル（例：今日の聖句から）" 
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border-none text-lg" 
            />
            <textarea 
              value={content} 
              onChange={(e)=>setContent(e.target.value)} 
              placeholder="心に感じたこと、霊的な気づき..." 
              rows={5} 
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border-none resize-none text-lg" 
            />
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition active:scale-95 shadow-md">
              {loading ? "保存中..." : "記録を保存する"}
            </button>
          </form>
        ) : (
          <div className="bg-blue-50 p-12 rounded-3xl border border-blue-100 text-center space-y-4">
            <p className="text-blue-800 font-medium text-lg italic">"わたしの証を記録する"</p>
            <p className="text-blue-600 text-sm">ログインして、あなたの大切な歩みを書き留めましょう。</p>
          </div>
        )}

        <div className="space-y-6 pt-6">
          <h3 className="text-slate-400 font-bold px-2 tracking-widest text-xs uppercase">Recent Records</h3>
          {records.length === 0 ? (
            <p className="text-center text-slate-400 py-10">まだ記録がありません。</p>
          ) : (
            records.map((r) => (
              <div key={r.id} className="bg-white p-6 rounded-2xl border-none shadow-sm hover:shadow-md transition animate-in fade-in slide-in-from-bottom-2">
                <h4 className="font-bold text-xl mb-2 text-slate-800">{r.title || "無題"}</h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                <div className="text-[10px] text-slate-300 mt-4 font-mono uppercase tracking-tighter">
                  {new Date(r.created_at).toLocaleString('ja-JP')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}