"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Page() {
  const [user, setUser] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [publicRecords, setPublicRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      fetchAll();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchAll();
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function fetchAll() {
    await fetchMyRecords();
    await fetchPublicRecords();
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMyRecords([]);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user) return alert("まずログインしてください");
    if (!title && !content) return alert("タイトルか本文を入力してください");

    setLoading(true);
    const displayName = user.user_metadata?.full_name ?? user.email ?? "匿名";

    const { error } = await supabase.from("records").insert([{
      user_id: user.id,
      title,
      content,
      is_public: isPublic,
      display_name: displayName
    }]);

    if (error) {
      console.error(error);
      alert("保存に失敗しました。");
    } else {
      setTitle(""); setContent(""); setIsPublic(false);
      await fetchAll();
    }
    setLoading(false);
  }

  async function fetchMyRecords() {
    // ログインしていない場合はスキップ
    const currentSession = await supabase.auth.getSession();
    const currentUser = currentSession.data.session?.user;
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });
    if (!error) setMyRecords(data ?? []);
  }

  async function fetchPublicRecords() {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setPublicRecords(data ?? []);
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) {
      alert("削除に失敗しました。");
    } else {
      await fetchAll();
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">T</span>
            Testify
          </h1>
          <div>
            {user ? (
              <button onClick={signOut} className="text-xs bg-slate-100 px-3 py-1 rounded-full">サインアウト</button>
            ) : (
              <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold">ログイン</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {user ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
            <h2 className="font-bold text-lg">新しい記録</h2>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="タイトル" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-100" />
            <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="今日感じた証や学び..." rows={4} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-100" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} className="rounded text-blue-600" />
                みんなに公開する
              </label>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                {loading ? "保存中..." : "保存する"}
              </button>
            </div>
          </form>
        ) : null}

        {/* 自分の投稿 */}
        {user && (
          <section className="space-y-4">
            <h3 className="font-bold text-slate-400 text-xs tracking-widest uppercase">My Testimonies</h3>
            <div className="grid gap-4">
              {myRecords.length === 0 ? <p className="text-sm text-slate-400">自分の記録はまだありません。</p> : myRecords.map(r => (
                <div key={r.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-bold">{r.title || "無題"}</p>
                    <p className="text-slate-600 text-sm">{r.content}</p>
                    <p className="text-[10px] text-slate-300 uppercase">{r.is_public ? "● 公開中" : "○ 非公開"}</p>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 transition text-xs">削除</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 公開フィード */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-400 text-xs tracking-widest uppercase">Public Feed</h3>
          <div className="grid gap-6">
            {publicRecords.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-slate-400">まだ公開された投稿はありません。</div>
            ) : publicRecords.map(r => (
              <article key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-blue-600">{r.display_name}</span>
                  <span className="text-[10px] text-slate-300">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-lg mb-2">{r.title || "無題"}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{r.content}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-slate-300 text-[10px] uppercase tracking-[0.2em]">
        © 2026 Testify App
      </footer>
    </div>
  );
}