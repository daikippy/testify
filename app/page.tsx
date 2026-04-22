"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RecordItem = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  is_public: boolean | null;
  display_name: string | null;
};

export default function Page() {
  const [user, setUser] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [myRecords, setMyRecords] = useState<RecordItem[]>([]);
  const [publicRecords, setPublicRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 初回セッション取得
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
    if (!user) {
      setMyRecords([]);
      return;
    }
    const { data, error } = await supabase
      .from<RecordItem>("records")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setMyRecords(data ?? []);
  }

  async function fetchPublicRecords() {
    // 公開されているものを取得（誰でも見られる）
    const { data, error } = await supabase
      .from<RecordItem>("records")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setPublicRecords(data ?? []);
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？（復元できません）")) return;
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("削除に失敗しました。");
    } else {
      await fetchAll();
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans selection:bg-blue-100">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">T</span>
            Testify
          </h1>
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
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* 投稿フォーム（ログイン時） */}
        {user ? (
          <section className="space-y-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow space-y-4">
              <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="タイトル" className="w-full p-3 border rounded" />
              <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="本文" rows={4} className="w-full p-3 border rounded" />
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} />
                  公開する（みんなに見える）
                </label>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
                  {loading ? "保存中..." : "保存する"}
                </button>
              </div>
            </form>

            {/* マイ投稿 */}
            <div>
              <h3 className="text-lg font-bold">あなたの記録</h3>
              <div className="mt-3 space-y-3">
                {myRecords.length === 0 ? (
                  <div className="text-slate-500">まだ投稿がありません。</div>
                ) : myRecords.map(r => (
                  <div key={r.id} className="bg-white p-4 rounded shadow flex justify-between items-start">
                    <div>
                      <div className="font-bold">{r.title || "無題"}</div>
                      <div className="text-sm text-slate-600 whitespace-pre-wrap">{r.content}</div>
                      <div className="text-xs text-slate-400 mt-2">{new Date(r.created_at || "").toLocaleString()}</div>
                      <div className="text-xs mt-1">{r.is_public ? "公開中" : "非公開"}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 text-sm">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-white p-8 rounded shadow text-center">
            <h2 className="text-xl font-bold">ログインして記録を始めましょう</h2>
            <p className="text-slate-500 mt-2">公開したいものは「公開する」にチェックしてください。</p>
            <div className="mt-4">
              <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-4 py-2 rounded">Googleでログイン</button>
            </div>
          </section>
        )}

        {/* 公開フィード */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">公開フィード</h3>
            <span className="text-sm text-slate-400">{publicRecords.length} 件</span>
          </div>
          <div className="mt-4 space-y-4">
            {publicRecords.length === 0 ? (
              <div className="text-slate-500">まだ公開された記録はありません。</div>
            ) : publicRecords.map(r => (
              <article key={r.id} className="bg-white p-4 rounded shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{r.title || "無題"}</div>
                    <div className="text-xs text-slate-400">{r.display_name ?? "投稿者不明"}</div>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(r.created_at || "").toLocaleDateString()}</div>
                </div>
                <p className="mt-3 text-slate-600 whitespace-pre-wrap">{r.content}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-slate-400">
        © 2026 Testify
      </footer>
    </div>
  );
}