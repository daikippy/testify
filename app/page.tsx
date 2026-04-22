"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Record {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_public: boolean;
  display_name: string;
  reactions: string[];
  created_at: string;
}

type Tab = "feed" | "mine";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "今";
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type: "success" | "error"; }
function Toast({ message, type }: ToastProps) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${type === "error" ? "bg-red-500 text-white" : "bg-slate-900 text-white"}`}>
      {type === "error" ? "⚠️ " : "✓ "}{message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-2 bg-slate-100 rounded w-20" />
        <div className="h-2 bg-slate-100 rounded w-12" />
      </div>
      <div className="h-5 bg-slate-100 rounded w-3/4 mt-2" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-5/6" />
      <div className="h-8 bg-slate-100 rounded-full w-24 mt-2" />
    </div>
  );
}

// ─── Record Card ──────────────────────────────────────────────────────────────
interface RecordCardProps {
  r: Record;
  currentUserId?: string;
  onAmen: (r: Record) => void;
  onEdit: (r: Record) => void;
  onDelete: (id: string) => void;
}
function RecordCard({ r, currentUserId, onAmen, onEdit, onDelete }: RecordCardProps) {
  const hasAmen = r.reactions?.includes(currentUserId ?? "");
  return (
    <article className="bg-white p-6 rounded-[2rem] shadow-sm border border-transparent hover:border-blue-100 transition-all duration-200 group">
      <div className="flex justify-between items-center mb-4 text-[10px] font-bold text-slate-300 tracking-tighter uppercase">
        <span className="truncate max-w-[60%]">{r.display_name}</span>
        <span title={new Date(r.created_at).toLocaleString("ja-JP")}>{timeAgo(r.created_at)}</span>
      </div>
      {r.title && <h4 className="font-black text-xl mb-2 leading-tight">{r.title}</h4>}
      <p className="text-slate-500 leading-relaxed text-sm mb-6 whitespace-pre-wrap">{r.content}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onAmen(r)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
            hasAmen
              ? "bg-blue-600 text-white border-blue-600 scale-105"
              : "bg-white text-slate-400 border-slate-100 hover:border-blue-200 hover:text-blue-400"
          }`}
        >
          🙏 {r.reactions?.length ?? 0} Amen
        </button>
        {currentUserId === r.user_id && (
          <div className="flex gap-3 text-[10px] font-bold text-slate-300 ml-auto uppercase tracking-widest">
            <button onClick={() => onEdit(r)} className="hover:text-blue-500 transition-colors">Edit</button>
            <button onClick={() => onDelete(r.id)} className="hover:text-red-500 transition-colors">Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [user, setUser] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [myRecords, setMyRecords] = useState<Record[]>([]);
  const [publicRecords, setPublicRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<ToastProps | null>(null);

  const MAX_CONTENT = 600;

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastProps["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Auth & initial fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      fetchPublicRecords();
      if (sessionUser) fetchMyRecords(sessionUser.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchPublicRecords();
      if (sessionUser) {
        fetchMyRecords(sessionUser.id);
      } else {
        setMyRecords([]);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchMyRecords(userId?: string) {
    const uid = userId ?? user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error) setMyRecords(data ?? []);
  }

  async function fetchPublicRecords() {
    setFeedLoading(true);
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setPublicRecords(data ?? []);
    setFeedLoading(false);
  }

  async function refreshAll() {
    await Promise.all([fetchPublicRecords(), fetchMyRecords()]);
  }

  // ── Auth actions ─────────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMyRecords([]);
    setActiveTab("feed");
    showToast("サインアウトしました");
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user) return showToast("まずログインしてください", "error");
    if (!title.trim() && !content.trim()) return showToast("内容を入力してください", "error");

    setLoading(true);
    const displayName = user.user_metadata?.full_name ?? user.email ?? "匿名";

    if (editingId) {
      const { error } = await supabase
        .from("records")
        .update({ title, content, is_public: isPublic })
        .eq("id", editingId);
      if (error) {
        showToast("更新に失敗しました", "error");
      } else {
        showToast("更新しました ✓");
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("records").insert([{
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        is_public: isPublic,
        display_name: displayName,
        reactions: [],
      }]);
      if (error) {
        showToast("保存に失敗しました", "error");
      } else {
        showToast("投稿しました 🙏");
      }
    }

    setTitle("");
    setContent("");
    setIsPublic(false);
    await refreshAll();
    setLoading(false);
  }

  // ── Amen (optimistic) ────────────────────────────────────────────────────────
  async function handleAmen(record: Record) {
    if (!user) return showToast("ログインしてアーメンしましょう！", "error");

    const currentReactions = record.reactions ?? [];
    const hasReacted = currentReactions.includes(user.id);
    const newReactions = hasReacted
      ? currentReactions.filter((id: string) => id !== user.id)
      : [...currentReactions, user.id];

    // Optimistic update
    const patch = (prev: Record[]) =>
      prev.map((r) => r.id === record.id ? { ...r, reactions: newReactions } : r);
    setPublicRecords(patch);
    setMyRecords(patch);

    const { error } = await supabase
      .from("records")
      .update({ reactions: newReactions })
      .eq("id", record.id);

    if (error) {
      // Revert on failure
      refreshAll();
      showToast("更新に失敗しました", "error");
    }
  }

  // ── Edit / Delete ─────────────────────────────────────────────────────────────
  function handleEdit(r: Record) {
    setEditingId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setIsPublic(r.is_public);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) {
      showToast("削除に失敗しました", "error");
    } else {
      showToast("削除しました");
      refreshAll();
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const filteredPublic = searchQuery.trim()
    ? publicRecords.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publicRecords;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Nav */}
      <nav className="bg-white px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-black text-blue-600 italic tracking-tighter">Testify+</h1>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[140px]">
              {user.user_metadata?.full_name ?? user.email}
            </span>
            <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              SignOut
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        )}
      </nav>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {/* Post Form */}
        {user && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-3xl shadow-sm border-2 border-white space-y-4"
          >
            <h2 className="font-bold text-sm text-slate-400 uppercase tracking-widest">
              {editingId ? "✏️ 編集モード" : "今の気持ちを記録"}
            </h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              maxLength={80}
              className="w-full bg-slate-50 p-3 rounded-2xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition"
            />
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
                placeholder="霊的な学びや証をここに..."
                rows={4}
                className="w-full bg-slate-50 p-3 rounded-2xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition resize-none"
              />
              <span className={`absolute bottom-3 right-3 text-[10px] font-mono ${content.length >= MAX_CONTENT ? "text-red-400" : "text-slate-300"}`}>
                {content.length}/{MAX_CONTENT}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs bg-slate-100 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-200 transition select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                公開フィードに流す
              </label>
              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setTitle(""); setContent(""); setIsPublic(false); }}
                    className="text-xs px-4 py-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    キャンセル
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || (!title.trim() && !content.trim())}
                  className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-bold shadow-lg shadow-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? "..." : editingId ? "更新" : "投稿"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "feed" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Public Feed
            {publicRecords.length > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "feed" ? "bg-blue-500" : "bg-slate-100"}`}>
                {publicRecords.length}
              </span>
            )}
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "mine" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              My Posts
              {myRecords.length > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "mine" ? "bg-blue-500" : "bg-slate-100"}`}>
                  {myRecords.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Public Feed Tab */}
        {activeTab === "feed" && (
          <section className="space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="証を検索..."
                className="w-full bg-white pl-9 pr-4 py-3 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-blue-100 transition shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {feedLoading ? (
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : filteredPublic.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-4xl">{searchQuery ? "🔍" : "🙏"}</p>
                <p className="text-slate-400 font-bold">
                  {searchQuery ? "該当する証が見つかりませんでした" : "まだ公開された証がありません"}
                </p>
                {!searchQuery && user && (
                  <p className="text-slate-300 text-sm">最初の証を投稿しましょう！</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {searchQuery && (
                  <p className="text-xs text-slate-400 px-1">{filteredPublic.length}件の結果</p>
                )}
                {filteredPublic.map((r) => (
                  <RecordCard
                    key={r.id}
                    r={r}
                    currentUserId={user?.id}
                    onAmen={handleAmen}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* My Posts Tab */}
        {activeTab === "mine" && user && (
          <section className="space-y-4">
            {myRecords.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-4xl">📖</p>
                <p className="text-slate-400 font-bold">まだ記録がありません</p>
                <p className="text-slate-300 text-sm">上のフォームから最初の証を記録しましょう</p>
              </div>
            ) : (
              myRecords.map((r) => (
                <article key={r.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-transparent hover:border-blue-100 transition-all duration-200">
                  <div className="flex justify-between items-center mb-3 text-[10px] font-bold text-slate-300 tracking-tighter uppercase">
                    <span className={`px-2 py-0.5 rounded-full ${r.is_public ? "bg-blue-50 text-blue-400" : "bg-slate-100 text-slate-400"}`}>
                      {r.is_public ? "🌐 公開" : "🔒 非公開"}
                    </span>
                    <span title={new Date(r.created_at).toLocaleString("ja-JP")}>{timeAgo(r.created_at)}</span>
                  </div>
                  {r.title && <h4 className="font-black text-xl mb-2 leading-tight">{r.title}</h4>}
                  <p className="text-slate-500 leading-relaxed text-sm mb-5 whitespace-pre-wrap">{r.content}</p>
                  <div className="flex items-center justify-between">
                    {r.is_public && (
                      <span className="text-[11px] text-slate-300">🙏 {r.reactions?.length ?? 0} Amen</span>
                    )}
                    <div className="flex gap-3 text-[10px] font-bold text-slate-300 ml-auto uppercase tracking-widest">
                      <button onClick={() => handleEdit(r)} className="hover:text-blue-500 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="hover:text-red-500 transition-colors">Delete</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
