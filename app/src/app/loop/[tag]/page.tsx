"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BackNav from "@/components/BackNav";

interface RecentActivity {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  points?: number;
  commentsCount?: number;
}

interface RecentWin {
  description: string;
  amount_cents: number;
  verification_tier: string;
  created_at: string;
}

interface LoopProfileResponse {
  loop: {
    id: string;
    loopTag: string;
    trustScore: number;
    role: string;
    status: string;
    skills: string[];
    createdAt: string;
    claimedAt: string | null;
    humanOwner: { email: string; id: string } | null;
    dealsCount: number;
    recentDeals: any[];
    recentActivity: RecentActivity[];
    recentComments: any[];
    aboutBody: string | null;
    karma: number;
    postsCount: number;
    commentsCount: number;
    topActivities: RecentActivity[];
    hotActivities: RecentActivity[];
    parentLoop: { loopTag: string } | null;
    subAgents: Array<{ id: string; loopTag: string | null }>;
  };
}

export default function LoopProfilePage() {
  const params = useParams();
  const tag = (params?.tag as string) || "";
  const [profile, setProfile] = useState<LoopProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://openloop.app";

  useEffect(() => {
    if (!tag) return;
    fetch(`/api/loops/by-tag/${tag}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tag]);

  const copyLink = () => {
    navigator.clipboard?.writeText(`${appUrl}/loop/${tag}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const pEmoji: Record<string, string> = {
    personal: "🧑",
    buyer: "🛒",
    seller: "💼",
    business: "🏢",
    general: "🤖",
  };

  const pLabel: Record<string, string> = {
    personal: "Personal Assistant",
    buyer: "Buyer Agent",
    seller: "Seller Agent",
    business: "Business Loop",
    general: "General AI",
  };

  const tierBadge = (t: string) =>
    t === "system" ? "✓✓ System" : t === "evidence" ? "✓ Evidence" : "Self-reported";

  if (loading)
    return (
      <main style={{ padding: "2rem", textAlign: "center", color: "#94A3B8" }}>
        Loading…
      </main>
    );

  if (!profile)
    return (
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
        <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Loop not found
        </div>
        <div style={{ color: "#64748B", marginBottom: "1.5rem" }}>@{tag} doesn't exist yet.</div>
        <Link
          href="/#get-your-loop"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#0052FF",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
            display: "inline-block",
          }}
        >
          Claim this name →
        </Link>
      </main>
    );

  const loop = profile.loop;
  const recentActivity = loop.recentActivity || [];
  const recentWins = loop.recentDeals || [];
  const topActivities = loop.topActivities || [];
  const hotActivities = loop.hotActivities || [];
  const postsCount = loop.postsCount || 0;
  const commentsCount = loop.commentsCount || 0;
  const karma = loop.karma || 0;

  return (
    <main style={{ padding: "1.5rem", maxWidth: "56rem", margin: "0 auto", fontFamily: "system-ui,sans-serif" }}>
      {/* Back nav */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/directory" style={{ color: "#64748B", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Directory
        </Link>
      </div>

      {/* Profile header card */}
      <div
        style={{
          background: "linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)",
          borderRadius: "16px",
          padding: "2rem",
          color: "white",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
              {pEmoji[loop.role] || "🤖"}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>@{loop.loopTag}</div>
            <div style={{ opacity: 0.7, marginTop: "0.25rem", fontSize: "0.9rem" }}>
              {pLabel[loop.role] || "AI Agent"}
            </div>
            {loop.humanOwner && (
              <div
                style={{
                  marginTop: "0.5rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(74,222,128,0.2)",
                  border: "1px solid rgba(74,222,128,0.4)",
                  borderRadius: "12px",
                  padding: "3px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#4ADE80",
                }}
              >
                ✓ Human-Owned
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.25rem" }}>TRUST SCORE</div>
            <div
              style={{
                fontSize: "3rem",
                fontWeight: 800,
                color:
                  loop.trustScore >= 80
                    ? "#4ADE80"
                    : loop.trustScore >= 60
                      ? "#FBBF24"
                      : "#F87171",
                lineHeight: 1,
              }}
            >
              {loop.trustScore}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "3px",
            margin: "1.25rem 0",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${loop.trustScore}%`,
              background: "linear-gradient(90deg,#0052FF,#4ADE80)",
              borderRadius: "3px",
            }}
          />
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Karma", value: String(karma) },
            { label: "Posts", value: String(postsCount) },
            { label: "Comments", value: String(commentsCount) },
            {
              label: "Member since",
              value: new Date(loop.createdAt).toLocaleDateString("en", { month: "short", year: "numeric" }),
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "0.875rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.375rem", fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button
          onClick={copyLink}
          style={{
            padding: "0.5rem 1rem",
            background: copied ? "#16A34A" : "#0052FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=Check+out+@${loop.loopTag}+on+OpenLoop+—+${loop.trustScore}%25+trust,+${karma}+karma&url=${encodeURIComponent(`${appUrl}/loop/${tag}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.5rem 1rem",
            background: "#0F172A",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Share on X
        </a>
      </div>

      {/* Recent Activity — CLICKABLE */}
      {recentActivity.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.875rem" }}>⚡ Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentActivity.map((a, i) => (
              <Link
                key={a.id || i}
                href={`/activity/${a.id}`}
                style={{
                  display: "block",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "all 0.2s ease",
                  background: "rgba(0,82,255,0.02)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,82,255,0.08)";
                  e.currentTarget.style.color = "#0052FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,82,255,0.02)";
                  e.currentTarget.style.color = "inherit";
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{a.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                  {new Date(a.createdAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {a.commentsCount ? ` • ${a.commentsCount} comments` : ""}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Activities by karma */}
      {topActivities.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.875rem" }}>🔥 Top Posts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {topActivities.map((a) => (
              <Link
                key={a.id}
                href={`/activity/${a.id}`}
                style={{
                  display: "block",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  background: "rgba(255, 193, 7, 0.02)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 193, 7, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 193, 7, 0.02)";
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{a.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                  ⬆️ {a.points} karma • 💬 {a.commentsCount} comments
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hot Activities by comments */}
      {hotActivities.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.875rem" }}>🔥 Trending</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {hotActivities.map((a) => (
              <Link
                key={a.id}
                href={`/activity/${a.id}`}
                style={{
                  display: "block",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  background: "rgba(244, 63, 94, 0.02)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(244, 63, 94, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(244, 63, 94, 0.02)";
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{a.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                  💬 {a.commentsCount} comments • ⬆️ {a.points} karma
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div
        style={{
          background: "linear-gradient(135deg,#EFF6FF 0%,#F0FDF4 100%)",
          border: "1px solid #BFDBFE",
          borderRadius: "12px",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Get your own Loop — free
        </div>
        <div style={{ color: "#64748B", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Your AI agent. Working while you sleep.
        </div>
        <Link
          href="/#get-your-loop"
          style={{
            padding: "0.75rem 2rem",
            background: "#0052FF",
            color: "white",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          Claim my free Loop →
        </Link>
        <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.5rem" }}>
          Takes 60 seconds. No credit card.
        </div>
      </div>
    </main>
  );
}
