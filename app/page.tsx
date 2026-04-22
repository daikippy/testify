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
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!title && !content) return alert("内容を入力してください");

    setLoading(true);
    const displayName = user.user_metadata?.full_name ?? user.email ?? "匿名";

    if (editingId) {
      // 編集（更新）
      const { error } = await supabase.from("records").update({
        title, content, is_public: isPublic
      }).eq("id", editingId);
      if (error) alert("更新に失敗しました。");
      setEditingId(null);
    } else {
      // 新規作成
      const { error } = await supabase.from("records").insert([{
        user_id: user.id, title, content, is_public: isPublic, display_name: displayName, reactions: []
      }]);
      if (error) alert("保存に失敗しました。");
    }

    setTitle(""); setContent(""); setIsPublic(false);
    await fetchAll();
    setLoading(false);
  }

  async function fetchMyRecords() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase.from("records").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    setMyRecords(data ?? []);
  }

  async function fetchPublicRecords() {
    const { data } = await supabase.from("records").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50);
    setPublicRecords(data ?? []);
  }

  async function handleAmen(record: any) {
    if (!user) return alert("ログインしてアーメンしましょう！");
    const currentReactions = record.reactions || [];
    const newReactions = currentReactions.includes(user.id) 
      ? currentReactions.filter((id: string) => id !== user.id) 
      : [...currentReactions, user.id];
    
    await supabase.from("records").update({ reactions: newReactions }).eq("id", record.id);
    fetchAll();
  }

  async function handleEdit(r: any) {
    setEditingId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setIsPublic(r.is_public);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？")) return;
    await supabase.from("records").delete().eq("id", id);
    fetchAll();
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 pb-20">
      <nav className="bg-white px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-black text-blue-600 italic tracking-tighter">Testify+</h1>
        {user ? (
          <button onClick={signOut} className="text-xs text-slate-400">SignOut</button>
        ) : (
          <button onClick={signInWithGoogle} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold">Login</button>
        )}
      </nav>

      <main className="max-w-xl mx-auto p-4 space-y-8">
        {user && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border-2 border-white space-y-4">
            <h2 className="font-bold text-sm text-slate-400 uppercase tracking-widest">{editingId ? "編集モード" : "今の気持ちを記録"}</h2>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="タイトル" className="w-full bg-slate-50 p-3 rounded-2xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition" />
            <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="霊的な学びや証をここに..." rows={3} className="w-full bg-slate-50 p-3 rounded-2xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition resize-none" />
            <div className="flex items-center justify-between">
              <label className="text-xs bg-slate-100 px-3 py-1 rounded-full cursor-pointer hover:bg-slate-200 transition">
                <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} className="mr-2" />
                公開フィードに流す
              </label>
              <div className="flex gap-2">
                {editingId && <button type="button" onClick={()=>{setEditingId(null); setTitle(""); setContent("");}} className="text-xs px-4 py-2">キャンセル</button>}
                <button type="submit" disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-bold shadow-lg shadow-slate-200">{loading ? "..." : (editingId ? "更新" : "投稿")}</button>
              </div>
            </div>
          </form>
        )}

        <section className="space-y-6">
          <h3 className="font-black text-2xl px-2">Public Feed</h3>
          {publicRecords.map(r => (
            <article key={r.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-white hover:border-blue-100 transition">
              <div className="flex justify-between items-center mb-4 text-[10px] font-bold text-slate-300 tracking-tighter uppercase">
                <span>{r.display_name}</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-black text-xl mb-2">{r.title || "Untitled"}</h4>
              <p className="text-slate-500 leading-relaxed text-sm mb-6">{r.content}</p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleAmen(r)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition ${r.reactions?.includes(user?.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
                >
                  🙏 {r.reactions?.length || 0} Amen
                </button>
                {user?.id === r.user_id && (
                  <div className="flex gap-3 text-[10px] font-bold text-slate-300 ml-auto uppercase tracking-widest">
                    <button onClick={() => handleEdit(r)} className="hover:text-blue-500">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="hover:text-red-500">Delete</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}