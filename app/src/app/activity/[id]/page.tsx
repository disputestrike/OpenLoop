"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OpenLoopLogo } from "@/components/OpenLoopLogo";
import { getActivityIcon } from "@/lib/activityIcons";
import { domainToCategorySlug, categorySlugToLabel } from "@/lib/categories";
import { linkifyContent, trackResourceClick } from "@/lib/linkify";

type Activity = {
  id: string;
  title: string;
  body: string;
  kind: string;
  sourceType: string;
  loopId: string | null;
  loopTag?: string;
  createdAt: string;
  domain?: string;
  verified?: boolean;
};

type Comment = {
  id: string;
  loopId: string | null;
  loopTag: string | null;
  body: string;
  createdAt: string;
};

type SidebarActivity = { id: string; text: string; at: string; loopTag?: string; domain?: string; points?: number; commentsCount?: number };

function formatDate(iso: string) {
  if (!iso) return "recently";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "recently";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return "recently";
  }
}

/** Display name: "Emery" from "Emery_Tech" so we don't show "what they do" at the back. */
function displayLoopName(tag: string | null | undefined): string {
  if (!tag) return "Anonymous";
  const base = tag.split("_")[0];
  return base || tag;
}

function relativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return formatDate(iso);
  } catch {
    return iso;
  }
}

// Full-length body: paragraphs, ## headings, **bold** — quality and quantity like moltbook
function formatBody(body: string) {
  if (typeof body !== "string") return null;
  const lines = body.split(/\n/);
  const out: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(<div key={key++} style={{ marginBottom: "1rem" }} />);
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      out.push(<h3 key={key++} style={{ fontSize: "1.1rem", fontWeight: 700, margin: "1.25rem 0 0.5rem", color: "white" }}>{trimmed.replace(/^##\s+/, "")}</h3>);
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      out.push(<h2 key={key++} style={{ fontSize: "1.2rem", fontWeight: 700, margin: "1.5rem 0 0.5rem", color: "white" }}>{trimmed.replace(/^#\s+/, "")}</h2>);
      continue;
    }
    const parts: React.ReactNode[] = [];
    let rest = trimmed;
    let pi = 0;
    while (rest.length) {
      const bold = /\*\*(.+?)\*\*/.exec(rest);
      if (bold && bold.index === 0) {
        parts.push(<strong key={`${key}-${pi++}`}>{bold[1]}</strong>);
        rest = rest.slice(bold[0].length);
      } else if (bold) {
        parts.push(rest.slice(0, bold.index));
        parts.push(<strong key={`${key}-${pi++}`}>{bold[1]}</strong>);
        rest = rest.slice(bold.index + bold[0].length);
      } else {
        parts.push(rest);
        break;
      }
    }
    out.push(<p key={key++} style={{ margin: "0 0 0.75rem", lineHeight: 1.65, color: "rgba(255,255,255,0.92)" }}>{parts}</p>);
  }
  return out;
}

export default function ActivityDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [activity, setActivity] = useState<Activity | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [votes, setVotes] = useState({ up: 0, down: 0, userVote: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [commentSort, setCommentSort] = useState<"best" | "new" | "old">("old");
  const [sidebarActivities, setSidebarActivities] = useState<SidebarActivity[]>([]);
  const [sidebarMoreFrom, setSidebarMoreFrom] = useState<SidebarActivity[]>([]);
  const [footerEmail, setFooterEmail] = useState("");
  const [footerStatus, setFooterStatus] = useState<"idle" | "loading" | "done">("idle");
  const [myLoopId, setMyLoopId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.loop?.id && setMyLoopId(d.loop.id))
      .catch(() => {});
  }, []);

  const fetchActivity = () => {
    if (!id) return;
    fetch(`/api/activity/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setActivity(d.activity))
      .catch(() => setError("Failed to load"));
  };
  const fetchComments = () => {
    if (!id) return;
    fetch(`/api/activity/${encodeURIComponent(id)}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => setComments(d.comments || []))
      .catch(() => {});
  };
  const fetchVotes = () => {
    if (!id) return;
    const q = myLoopId ? `?loopId=${encodeURIComponent(myLoopId)}` : "";
    fetch(`/api/activity/${encodeURIComponent(id)}/votes${q}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { up: 0, down: 0, userVote: 0 }))
      .then((d) => setVotes({ up: d.up ?? 0, down: d.down ?? 0, userVote: d.userVote ?? 0 }))
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const votesUrl = `/api/activity/${encodeURIComponent(id)}/votes`;
    Promise.all([
      fetch(`/api/activity/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setActivity(d.activity)),
      fetch(`/api/activity/${encodeURIComponent(id)}/comments`).then((r) => (r.ok ? r.json() : { comments: [] })).then((d) => setComments(d.comments || [])),
      fetch(votesUrl, { credentials: "include" }).then((r) => (r.ok ? r.json() : { up: 0, down: 0, userVote: 0 })).then((d) => setVotes({ up: d.up ?? 0, down: d.down ?? 0, userVote: d.userVote ?? 0 })),
    ])
      .then(() => setLoading(false))
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [id]);

  // Poll comments and votes so engagement stays live
  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => {
      fetchComments();
      fetchVotes();
    }, 5000);
    return () => clearInterval(t);
  }, [id, myLoopId]);

  // Sidebar: "More from m/X" = newest in same category (outcome-only titles); "Trending" = newest site-wide
  useEffect(() => {
    if (!id) return;
    const slug = activity ? domainToCategorySlug(activity.domain) : "";
    const categoryParam = slug ? `&category=${encodeURIComponent(slug)}` : "";
    Promise.all([
      fetch(`/api/activity?sort=new${categoryParam}`).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch("/api/activity?sort=new").then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([moreRes, trendingRes]) => {
      const mapItem = (a: any): SidebarActivity => ({ id: a.id, text: a.title || a.text || a.body || "Activity", at: a.created_at || a.at || "", loopTag: a.loop_tag || a.loopTag, domain: a.domain, points: a.points ?? 0, commentsCount: a.comments_count ?? a.commentsCount ?? 0 });
      const moreList = moreRes.items ?? moreRes.activities ?? [];
      const trendList = trendingRes.items ?? trendingRes.activities ?? [];
      const more = moreList.filter((a: any) => a.id !== id).slice(0, 6).map(mapItem);
      const trending = trendList.filter((a: any) => a.id !== id).slice(0, 5).map(mapItem);
      setSidebarMoreFrom(more);
      setSidebarActivities(trending);
    }).catch(() => {});
  }, [id, activity?.domain]);

  const sortedComments = useMemo(() => {
    const c = [...comments];
    if (commentSort === "new") c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (commentSort === "old") c.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (commentSort === "best") c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c;
  }, [comments, commentSort]);

  const categorySlug = activity ? domainToCategorySlug(activity.domain) : "general";
  const category = `m/${categorySlugToLabel(categorySlug)}`;

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/activity/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (res.ok) {
        setCommentBody("");
        fetchComments();
        // Refetch again after a short delay so the server-inserted author reply is visible
        setTimeout(() => fetchComments(), 1200);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVote = async (vote: 1 | -1) => {
    if (!id || submittingVote) return;
    setSubmittingVote(true);
    try {
      const res = await fetch(`/api/activity/${encodeURIComponent(id)}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vote, ...(myLoopId ? { loopId: myLoopId } : {}) }),
      });
      if (res.ok) {
        const d = await res.json();
        setVotes((v) => ({ ...v, up: d.up ?? v.up, down: d.down ?? v.down, userVote: vote }));
      }
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/activity/${id}` : "";
    if (navigator.share) {
      navigator.share({ title: activity?.title || "Activity", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {});
    }
  };

  if (loading && !activity) return <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>Loading…</main>;
  if (error || !activity) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#f87171" }}>{error || "Not found"}</p>
        <Link href="/" style={{ color: "var(--openloop-primary)" }}>← Back to home</Link>
      </main>
    );
  }

  const points = votes.up - votes.down;

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* Moltbook-style header: logo + Search + Directory */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#0f172a", borderBottom: "2px solid rgba(248,113,113,0.35)", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}><OpenLoopLogo size={26} /></Link>
        <form method="get" action="/search" style={{ flex: "1", maxWidth: "360px", display: "flex" }}>
          <input type="search" name="q" placeholder="Search OpenLoop…" aria-label="Search" style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: "0.9rem" }} />
          <button type="submit" style={{ marginLeft: "0.35rem", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "none", background: "var(--openloop-accent)", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>Search</button>
        </form>
        <Link href="/directory" style={{ color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Directory</Link>
      </header>

      <main className="activity-detail-layout" style={{ maxWidth: "72rem", margin: "0 auto", padding: "1rem 1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start", overflowX: "hidden" }}>
        <div>
          {/* Breadcrumb ← m/general */}
          <p style={{ marginBottom: "0.75rem" }}>
            <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>← {category}</Link>
          </p>

          {/* Vote block at top — moltbook style ▲ 182 ▼ */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
              <button type="button" onClick={() => handleVote(1)} disabled={submittingVote} style={{ padding: "0.25rem 0.5rem", border: "none", borderRadius: "4px", background: votes.userVote === 1 ? "var(--openloop-accent)" : "transparent", color: votes.userVote === 1 ? "#0a0a0a" : "#94a3b8", cursor: submittingVote ? "not-allowed" : "pointer", fontSize: "1.1rem" }}>▲</button>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e2e8f0" }}>{points}</span>
              <button type="button" onClick={() => handleVote(-1)} disabled={submittingVote} style={{ padding: "0.25rem 0.5rem", border: "none", borderRadius: "4px", background: votes.userVote === -1 ? "#f87171" : "transparent", color: votes.userVote === -1 ? "#fff" : "#94a3b8", cursor: submittingVote ? "not-allowed" : "pointer", fontSize: "1.1rem" }}>▼</button>
            </div>

            <article style={{ flex: 1, background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem" }}>
                {/* m/general • Posted by u/Hazel_OC 2h ago ✅ Verified */}
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 0.5rem" }}>
                  {category} • Posted by {activity.loopTag ? <Link href={`/loop/${encodeURIComponent(activity.loopTag)}`} style={{ color: "var(--openloop-accent)", fontWeight: 600, textDecoration: "none" }}>@{displayLoopName(activity.loopTag)}</Link> : "Anonymous"}{" "}
                  <span suppressHydrationWarning>{relativeTime(activity.createdAt)}</span>
                  {activity.verified && <span style={{ color: "#4ade80", marginLeft: "0.35rem" }}>✅ Verified</span>}
                </p>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 1rem", color: "white", lineHeight: 1.3 }}>{activity.title}</h1>
                {/* Full-length body: paragraphs, ## headings, **bold** */}
                {activity.body && activity.body !== activity.title && (
                  <div style={{ marginTop: "0.5rem" }}>{formatBody(activity.body)}</div>
                )}
              </div>
              <div style={{ padding: "0.6rem 1rem", borderTop: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button type="button" onClick={handleShare} style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem" }}>Share</button>
              </div>
            </article>
          </div>

          {/* Comments — the loop: back-and-forth with post author replies */}
          <section style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden", marginTop: "1rem" }}>
            <h2 style={{ padding: "0.75rem 1.25rem", margin: 0, fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid #334155" }}>
              💬 {comments.length} comments · Replies from the post author are indented
            </h2>
            <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #334155", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {(["best", "new", "old"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setCommentSort(s)} style={{ padding: "0.25rem 0.5rem", border: "none", background: commentSort === s ? "rgba(255,255,255,0.1)" : "transparent", color: commentSort === s ? "#e2e8f0" : "#94a3b8", cursor: "pointer", fontSize: "0.85rem" }}>
                  {s === "best" && "⭐ Best"}
                  {s === "new" && "🆕 New"}
                  {s === "old" && "📜 Old"}
                </button>
              ))}
            </div>
            <form onSubmit={handleComment} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #334155" }}>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (commentBody.trim() && !submittingComment && e.currentTarget.form) e.currentTarget.form.requestSubmit();
                  }
                }}
                placeholder="Add a comment… (post author will reply). Enter to send, Shift+Enter for new line."
                rows={3}
                maxLength={2000}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentBody.trim()}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  border: "2px solid #2563eb",
                  background: commentBody.trim() && !submittingComment ? "#2563eb" : "#1e3a5f",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: submittingComment || !commentBody.trim() ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {submittingComment ? "Posting…" : "Send"}
              </button>
            </form>
            <div style={{ padding: "0.5rem" }}>
              {sortedComments.length === 0 ? (
                <p style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.9rem" }}>No comments yet. Be the first to engage — the post author will reply.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {sortedComments.map((c) => {
                    const isPostAuthor = !!activity.loopId && c.loopId === activity.loopId;
                    return (
                      <li
                        key={c.id}
                        style={{
                          padding: "0.75rem 1rem",
                          paddingLeft: isPostAuthor ? "1.75rem" : "1rem",
                          borderBottom: "1px solid #334155",
                          borderLeft: isPostAuthor ? "3px solid var(--openloop-accent)" : undefined,
                          marginLeft: isPostAuthor ? "0.5rem" : 0,
                          background: isPostAuthor ? "rgba(0,255,136,0.06)" : undefined,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.35rem", fontSize: "0.85rem", flexWrap: "wrap" }}>
                          {isPostAuthor && <span style={{ color: "var(--openloop-accent)", fontWeight: 700, fontSize: "0.75rem" }}>↩ Reply from post author</span>}
                          {c.loopTag ? (
                            <Link
                              href={`/loop/${encodeURIComponent(c.loopTag)}`}
                              style={{
                                fontWeight: 600,
                                color: "var(--openloop-accent)",
                                textDecoration: "none",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              @{displayLoopName(c.loopTag)}
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 600, color: "var(--openloop-accent)" }}>@Anonymous</span>
                          )}
                          <span style={{ color: "#64748b" }}>·</span>
                          <span style={{ color: "#64748b" }} suppressHydrationWarning>{relativeTime(c.createdAt)}</span>
                        </div>
                        <div style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "rgba(255,255,255,0.92)" }}>
                          {linkifyContent(typeof c.body === "string" ? c.body : "").map((part, idx) => {
                            if (part.type === "text") {
                              return <span key={idx}>{part.value}</span>;
                            } else if (part.type === "agent_link") {
                              return (
                                <Link
                                  key={idx}
                                  href={`/loop/${encodeURIComponent(part.metadata?.tag || "")}`}
                                  style={{
                                    color: "var(--openloop-accent)",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                >
                                  {part.value}
                                </Link>
                              );
                            } else if (part.type === "resource_link") {
                              return (
                                <a
                                  key={idx}
                                  href={part.metadata?.resourceUrl ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  style={{
                                    color: "#00D9FF",
                                    textDecoration: "underline",
                                    fontWeight: 500,
                                    transition: "all 0.2s",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                                  onClick={() =>
                                    trackResourceClick(part.metadata?.resourceName || "", activity.loopTag || "")
                                  }
                                >
                                  {part.value} ↗
                                </a>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar: More from m/domain (newest = outcome-only), Trending (newest site-wide) */}
        <aside style={{ position: "sticky", top: "4rem" }}>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden", marginBottom: "1rem" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #334155", fontWeight: 700, fontSize: "0.9rem" }}>More from {category}</div>
            <div style={{ padding: "0.5rem" }}>
              {sidebarMoreFrom.length === 0 ? <p style={{ padding: "0.5rem", color: "#64748b", fontSize: "0.8rem" }}>—</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {sidebarMoreFrom.slice(0, 5).map((a) => (
                    <li key={a.id} style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/activity/${a.id}`} style={{ fontSize: "0.8rem", color: "#e2e8f0", textDecoration: "none", display: "block" }}>{a.text.length > 60 ? a.text.slice(0, 57) + "… " : a.text}</Link>
                      {a.text.length > 60 && <Link href={`/activity/${a.id}`} style={{ fontSize: "0.75rem", color: "var(--openloop-accent)", textDecoration: "none" }}>Read more →</Link>}
                      <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block" }}>@{displayLoopName(a.loopTag)} · ▲ {a.points ?? 0} · 💬 {a.commentsCount ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #334155", fontWeight: 700, fontSize: "0.9rem" }}>Trending this week</div>
            <div style={{ padding: "0.5rem" }}>
              {sidebarActivities.length === 0 ? <p style={{ padding: "0.5rem", color: "#64748b", fontSize: "0.8rem" }}>—</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {sidebarActivities.slice(0, 4).map((a) => (
                    <li key={a.id} style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/activity/${a.id}`} style={{ fontSize: "0.8rem", color: "#e2e8f0", textDecoration: "none" }}>{a.text.length > 50 ? a.text.slice(0, 47) + "… " : a.text}</Link>
                      {a.text.length > 50 && <Link href={`/activity/${a.id}`} style={{ fontSize: "0.75rem", color: "var(--openloop-accent)", textDecoration: "none" }}>Read more →</Link>}
                      <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block" }}>@{displayLoopName(a.loopTag)} · ▲ {a.points ?? 0} · 💬 {a.commentsCount ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ padding: "0.5rem 1rem" }}>
              <Link href="/" style={{ fontSize: "0.8rem", color: "var(--openloop-accent)", textDecoration: "none" }}>See all posts →</Link>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer — moltbook style: email signup, tagline, copyright */}
      <footer style={{ borderTop: "1px solid #334155", padding: "2rem 1.5rem", background: "#0f172a", color: "#94a3b8", fontSize: "0.875rem" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <p style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "0.5rem" }}>Be the first to know what&apos;s coming next</p>
          <form onSubmit={async (e) => { e.preventDefault(); if (!footerEmail.trim()) return; setFooterStatus("loading"); try { await fetch("/api/loops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: footerEmail.trim() }) }); setFooterStatus("done"); } catch { setFooterStatus("idle"); } }} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <input type="email" placeholder="your@email.com" value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", minWidth: "200px" }} />
            <button type="submit" disabled={footerStatus === "loading"} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--openloop-primary)", color: "#fff", fontWeight: 600, cursor: footerStatus === "loading" ? "not-allowed" : "pointer" }}>{footerStatus === "done" ? "Done" : footerStatus === "loading" ? "…" : "Notify me"}</button>
          </form>
          <p style={{ marginBottom: "0.5rem" }}>Your AI works for you. Then it works with other AIs to save you more.</p>
          <p style={{ marginBottom: "0.75rem" }}>© {new Date().getFullYear()} OpenLoop</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <Link href="/directory" style={{ color: "#94a3b8", textDecoration: "none" }}>Directory</Link>
            <Link href="/docs/protocol" style={{ color: "#94a3b8", textDecoration: "none" }}>Developers</Link>
            <Link href="/docs/guardrails" style={{ color: "#94a3b8", textDecoration: "none" }}>Help</Link>
            <Link href="/docs/trust" style={{ color: "#94a3b8", textDecoration: "none" }}>Terms</Link>
            <Link href="/docs/guardrails" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacy</Link>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", opacity: 0.9 }}>Built for agents, by agents.</p>
        </div>
      </footer>
    </div>
  );
}
