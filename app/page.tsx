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

function getInitials(name: string): string {
  return name
    .split(/[\s@._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type: "success" | "error"; }
function Toast({ message, type }: ToastProps) {
  return (
    <div style={{
      position: "fixed",
      bottom: "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 999,
      padding: "0.75rem 1.5rem",
      borderRadius: "9999px",
      fontSize: "13px",
      fontWeight: 600,
      letterSpacing: "0.03em",
      background: type === "error" ? "#2a0a0a" : "#1a1a1a",
      color: type === "error" ? "#fca5a5" : "#d4a853",
      border: `1px solid ${type === "error" ? "#7f1d1d" : "#d4a85366"}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      whiteSpace: "nowrap",
    }}>
      {type === "error" ? "✕  " : "✦  "}{message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{
      background: "#141414",
      border: "1px solid #222",
      borderRadius: "1.25rem",
      padding: "1.75rem",
      animation: "shimmer 1.6s ease-in-out infinite",
    }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#222" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, width: 90, background: "#222", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 8, width: 55, background: "#1a1a1a", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 18, width: "60%", background: "#222", borderRadius: 4, marginBottom: 10 }} />
      <div style={{ height: 11, width: "100%", background: "#1a1a1a", borderRadius: 4, marginBottom: 5 }} />
      <div style={{ height: 11, width: "75%", background: "#1a1a1a", borderRadius: 4, marginBottom: 20 }} />
      <div style={{ height: 30, width: 96, background: "#1e1e1e", borderRadius: 9999 }} />
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#1e1608",
      border: "1px solid #d4a85340",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(size * 0.36),
      fontWeight: 700,
      color: "#c8a84b",
      letterSpacing: "0.03em",
      flexShrink: 0,
    }}>
      {getInitials(name) || "?"}
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
  showVisibility?: boolean;
}

function RecordCard({ r, currentUserId, onAmen, onEdit, onDelete, showVisibility }: RecordCardProps) {
  const hasAmen = r.reactions?.includes(currentUserId ?? "");
  const [hovered, setHovered] = React.useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#181818" : "#141414",
        border: `1px solid ${hovered ? "#3a2e14" : "#222"}`,
        borderRadius: "1.25rem",
        padding: "1.75rem",
        transition: "all 0.22s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* gold shimmer on hover */}
      <div style={{
        position: "absolute",
        top: 0, left: "15%", right: "15%",
        height: 1,
        background: hovered ? "linear-gradient(90deg, transparent, #d4a85330, transparent)" : "transparent",
        transition: "all 0.3s ease",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.2rem" }}>
        <Avatar name={r.display_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#c8a84b", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.display_name}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {timeAgo(r.created_at)}
          </p>
        </div>
        {showVisibility && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "3px 10px", borderRadius: 9999,
            background: r.is_public ? "#0f1f0f" : "#0f0f1f",
            color: r.is_public ? "#4ade80" : "#818cf8",
            border: `1px solid ${r.is_public ? "#14532d" : "#312e81"}`,
          }}>
            {r.is_public ? "公開" : "非公開"}
          </span>
        )}
      </div>

      {/* Title */}
      {r.title && (
        <h4 style={{
          margin: "0 0 0.55rem",
          fontSize: "1.15rem",
          fontWeight: 700,
          color: "#f0e8d0",
          lineHeight: 1.35,
          fontFamily: "'Georgia', 'Times New Roman', serif",
          letterSpacing: "-0.01em",
        }}>
          {r.title}
        </h4>
      )}

      {/* Body */}
      <p style={{
        margin: "0 0 1.5rem",
        fontSize: "0.875rem",
        color: "#777",
        lineHeight: 1.85,
        whiteSpace: "pre-wrap",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}>
        {r.content}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={() => onAmen(r)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0.38rem 1rem", borderRadius: 9999,
            border: `1px solid ${hasAmen ? "#d4a853" : "#2e2e2e"}`,
            background: hasAmen ? "#1e1608" : "transparent",
            color: hasAmen ? "#d4a853" : "#4a4a4a",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { if (!hasAmen) { e.currentTarget.style.borderColor = "#d4a85366"; e.currentTarget.style.color = "#d4a85388"; }}}
          onMouseLeave={(e) => { if (!hasAmen) { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.color = "#4a4a4a"; }}}
        >
          🙏 {r.reactions?.length ?? 0} Amen
        </button>

        {currentUserId === r.user_id && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
            {[
              { label: "Edit", action: () => onEdit(r), hoverColor: "#d4a853" },
              { label: "Delete", action: () => onDelete(r.id), hoverColor: "#f87171" },
            ].map(({ label, action, hoverColor }) => (
              <button
                key={label}
                onClick={action}
                style={{ background: "none", border: "none", color: "#444", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────
const baseInput: React.CSSProperties = {
  width: "100%",
  background: "#0d0d0d",
  border: "1px solid #252525",
  borderRadius: "0.75rem",
  padding: "0.85rem 1rem",
  color: "#f0e8d0",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

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

  const showToast = useCallback((message: string, type: ToastProps["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      fetchPublicRecords();
      if (u) fetchMyRecords(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      fetchPublicRecords();
      if (u) fetchMyRecords(u.id);
      else setMyRecords([]);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function fetchMyRecords(userId?: string) {
    const uid = userId ?? user?.id;
    if (!uid) return;
    const { data, error } = await supabase.from("records").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    if (!error) setMyRecords(data ?? []);
  }

  async function fetchPublicRecords() {
    setFeedLoading(true);
    const { data, error } = await supabase.from("records").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50);
    if (!error) setPublicRecords(data ?? []);
    setFeedLoading(false);
  }

  async function refreshAll() {
    await Promise.all([fetchPublicRecords(), fetchMyRecords()]);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setMyRecords([]); setActiveTab("feed");
    showToast("サインアウトしました");
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user) return showToast("まずログインしてください", "error");
    if (!title.trim() && !content.trim()) return showToast("内容を入力してください", "error");
    setLoading(true);
    const displayName = user.user_metadata?.full_name ?? user.email ?? "匿名";

    if (editingId) {
      const { error } = await supabase.from("records").update({ title, content, is_public: isPublic }).eq("id", editingId);
      if (error) showToast("更新に失敗しました", "error");
      else { showToast("更新しました"); setEditingId(null); }
    } else {
      const { error } = await supabase.from("records").insert([{
        user_id: user.id, title: title.trim(), content: content.trim(),
        is_public: isPublic, display_name: displayName, reactions: [],
      }]);
      if (error) showToast("保存に失敗しました", "error");
      else showToast("投稿しました");
    }
    setTitle(""); setContent(""); setIsPublic(false);
    await refreshAll();
    setLoading(false);
  }

  async function handleAmen(record: Record) {
    if (!user) return showToast("ログインしてアーメンしましょう！", "error");
    const cur = record.reactions ?? [];
    const hasReacted = cur.includes(user.id);
    const next = hasReacted ? cur.filter((id: string) => id !== user.id) : [...cur, user.id];
    const patch = (prev: Record[]) => prev.map((r) => r.id === record.id ? { ...r, reactions: next } : r);
    setPublicRecords(patch); setMyRecords(patch);
    const { error } = await supabase.from("records").update({ reactions: next }).eq("id", record.id);
    if (error) { refreshAll(); showToast("更新に失敗しました", "error"); }
  }

  function handleEdit(r: Record) {
    setEditingId(r.id); setTitle(r.title); setContent(r.content); setIsPublic(r.is_public);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) showToast("削除に失敗しました", "error");
    else { showToast("削除しました"); refreshAll(); }
  }

  const filteredPublic = searchQuery.trim()
    ? publicRecords.filter((r) =>
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publicRecords;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#e0d8c8", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", paddingBottom: "6rem" }}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(12,12,12,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1c1c1c",
        padding: "0 1.25rem", height: "3.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            fontSize: "1.15rem", fontWeight: 900, fontStyle: "italic",
            background: "linear-gradient(135deg, #c8a44a 0%, #f0d080 50%, #c8a44a 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.03em",
          }}>
            Testify+
          </span>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4a853", opacity: 0.6 }} />
        </div>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Avatar name={user.user_metadata?.full_name ?? user.email ?? "?"} size={28} />
            <button
              onClick={signOut}
              style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 9999, color: "#555", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0.3rem 0.85rem", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d4a85355"; e.currentTarget.style.color = "#d4a853"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#555"; }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            style={{ background: "#1e1608", border: "1px solid #d4a85355", borderRadius: 9999, color: "#d4a853", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.45rem 1.1rem", cursor: "pointer", transition: "border-color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d4a853")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d4a85355")}
          >
            Login
          </button>
        )}
      </nav>

      {/* ── Hero (logged-out state) ──────────────────────────────────────────── */}
      {!user && (
        <div style={{ textAlign: "center", padding: "5rem 1.5rem 3rem", borderBottom: "1px solid #161616" }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "#d4a853", marginBottom: "1.25rem", opacity: 0.8 }}>
            ✦ &nbsp; Your Spiritual Journal &nbsp; ✦
          </p>
          <h2 style={{
            margin: "0 0 1rem", fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800,
            color: "#f0e8d0", fontFamily: "'Georgia', serif", lineHeight: 1.2, letterSpacing: "-0.02em",
          }}>
            証を記録し、分かち合おう
          </h2>
          <p style={{ color: "#4a4a4a", fontSize: "0.9rem", lineHeight: 1.8, maxWidth: 360, margin: "0 auto 2.5rem" }}>
            神様との歩みを言葉にして残す、あなただけの霊的な記録帳。
          </p>
          <button
            onClick={signInWithGoogle}
            style={{ background: "#1e1608", border: "1px solid #d4a853", borderRadius: 9999, color: "#d4a853", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0.8rem 2.2rem", cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a1f0a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1e1608")}
          >
            Google でログイン
          </button>
        </div>
      )}

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── Post Form ─────────────────────────────────────────────────────── */}
        {user && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#141414",
              border: `1px solid ${editingId ? "#d4a85344" : "#1e1e1e"}`,
              borderRadius: "1.25rem",
              padding: "1.75rem",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: editingId ? "#d4a853" : "#333" }}>
              ✦ &nbsp; {editingId ? "編集モード" : "今の気持ちを記録"}
            </p>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              maxLength={80}
              style={baseInput}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#d4a85355")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
            />

            <div style={{ position: "relative" }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
                placeholder="霊的な学びや証をここに…"
                rows={5}
                style={{ ...baseInput, resize: "none", fontFamily: "'Georgia', serif", lineHeight: 1.8, paddingBottom: "2rem" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#d4a85355")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
              />
              <span style={{
                position: "absolute", bottom: "0.65rem", right: "0.9rem",
                fontSize: 10, fontFamily: "monospace",
                color: content.length >= MAX_CONTENT ? "#f87171" : "#333",
              }}>
                {content.length}/{MAX_CONTENT}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                <div
                  onClick={() => setIsPublic(!isPublic)}
                  style={{
                    width: 38, height: 21, borderRadius: 9999, position: "relative",
                    background: isPublic ? "#1e1608" : "#181818",
                    border: `1px solid ${isPublic ? "#d4a853" : "#2a2a2a"}`,
                    transition: "all 0.22s ease", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: isPublic ? 18 : 3,
                    width: 13, height: 13, borderRadius: "50%",
                    background: isPublic ? "#d4a853" : "#333",
                    transition: "all 0.22s ease",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: isPublic ? "#c8a84b" : "#444", letterSpacing: "0.03em", transition: "color 0.2s" }}>
                  公開フィードに流す
                </span>
              </label>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setTitle(""); setContent(""); setIsPublic(false); }}
                    style={{ background: "none", border: "none", color: "#444", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", padding: "0.5rem 0.75rem" }}
                  >
                    キャンセル
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || (!title.trim() && !content.trim())}
                  style={{
                    background: loading || (!title.trim() && !content.trim()) ? "#181818" : "#1e1608",
                    border: `1px solid ${loading || (!title.trim() && !content.trim()) ? "#252525" : "#d4a853"}`,
                    borderRadius: "0.625rem",
                    color: loading || (!title.trim() && !content.trim()) ? "#333" : "#d4a853",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                    padding: "0.6rem 1.5rem", cursor: loading || (!title.trim() && !content.trim()) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "…" : editingId ? "更新" : "投稿"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 0,
          background: "#111", border: "1px solid #1c1c1c",
          borderRadius: "0.875rem", padding: "4px",
        }}>
          {(["feed", ...(user ? ["mine"] : [])] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "0.6rem 1rem", borderRadius: "0.625rem", border: "none",
                  background: active ? "#1e1a0e" : "transparent",
                  color: active ? "#d4a853" : "#444",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.2s",
                  outline: active ? "1px solid #d4a85322" : "none",
                }}
              >
                {tab === "feed"
                  ? `Public Feed${publicRecords.length ? `  ·  ${publicRecords.length}` : ""}`
                  : `My Posts${myRecords.length ? `  ·  ${myRecords.length}` : ""}`}
              </button>
            );
          })}
        </div>

        {/* ── Public Feed ─────────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#383838", fontSize: 14, pointerEvents: "none" }}>⌕</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="証を検索…"
                style={{ ...baseInput, paddingLeft: "2.5rem", paddingRight: searchQuery ? "2.5rem" : "1rem" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#d4a85355")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12 }}>
                  ✕
                </button>
              )}
            </div>

            {feedLoading ? (
              <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
            ) : filteredPublic.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <p style={{ fontSize: 24, marginBottom: "1rem", opacity: 0.3 }}>✦</p>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#383838" }}>
                  {searchQuery ? "該当する証が見つかりませんでした" : "まだ公開された証がありません"}
                </p>
                {!searchQuery && user && (
                  <p style={{ fontSize: "0.75rem", color: "#2e2e2e", marginTop: "0.5rem" }}>最初の証を投稿しましょう</p>
                )}
              </div>
            ) : (
              <>
                {searchQuery && <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>{filteredPublic.length}件の結果</p>}
                {filteredPublic.map((r) => (
                  <RecordCard key={r.id} r={r} currentUserId={user?.id} onAmen={handleAmen} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </>
            )}
          </section>
        )}

        {/* ── My Posts ────────────────────────────────────────────────────────── */}
        {activeTab === "mine" && user && (
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {myRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <p style={{ fontSize: 24, marginBottom: "1rem", opacity: 0.3 }}>✦</p>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#383838" }}>まだ記録がありません</p>
                <p style={{ fontSize: "0.75rem", color: "#2e2e2e", marginTop: "0.5rem" }}>上のフォームから最初の証を記録しましょう</p>
              </div>
            ) : (
              myRecords.map((r) => (
                <RecordCard key={r.id} r={r} currentUserId={user?.id} onAmen={handleAmen} onEdit={handleEdit} onDelete={handleDelete} showVisibility />
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
