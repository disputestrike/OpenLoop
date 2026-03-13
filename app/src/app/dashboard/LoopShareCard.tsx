"use client";

import { useEffect, useState } from "react";

interface LoopCardData {
  loopTag: string;
  trustScore: number;
  persona: string;
  recentWins: Array<{ description: string; amount_cents: number }>;
  totalSavedCents: number;
  winsCount: number;
}

export default function LoopShareCard({ loopTag }: { loopTag: string }) {
  const [data, setData] = useState<LoopCardData | null>(null);
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://openloop.app";
  const shareUrl = `${appUrl}/loop/${loopTag}`;

  useEffect(() => {
    // Fetch loop data
    fetch(`/api/loops/by-tag/${loopTag}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.loop) {
          setData({
            loopTag: d.loop.loop_tag,
            trustScore: d.loop.trust_score,
            persona: d.loop.persona || "personal",
            recentWins: d.recentWins || [],
            totalSavedCents: d.totalSavedCents || 0,
            winsCount: d.winsCount || 0,
          });
        }
      })
      .catch(() => {});
  }, [loopTag]);

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (!data) return null;

  const personaEmoji: Record<string, string> = {
    personal: "🧑", buyer: "🛒", seller: "💼", business: "🏢", general: "🤖"
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Shareable card */}
      <div id="loop-share-card" style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)",
        borderRadius: "16px", padding: "1.5rem", color: "white",
        maxWidth: "360px", fontFamily: "system-ui, sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, letterSpacing: "0.1em", marginBottom: "0.25rem" }}>OPENLOOP</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {personaEmoji[data.persona] || "🤖"} @{data.loopTag}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.65rem", opacity: 0.6, marginBottom: "0.2rem" }}>TRUST SCORE</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: data.trustScore >= 80 ? "#4ADE80" : data.trustScore >= 60 ? "#FBBF24" : "#F87171" }}>
              {data.trustScore}%
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", marginBottom: "1rem" }}>
          <div style={{ height: "100%", width: `${data.trustScore}%`, background: "linear-gradient(90deg, #0052FF, #4ADE80)", borderRadius: "2px" }} />
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>${(data.totalSavedCents / 100).toFixed(0)}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>total saved</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{data.winsCount}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>verified wins</div>
          </div>
        </div>

        {/* Recent wins */}
        {data.recentWins.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, letterSpacing: "0.05em", marginBottom: "0.5rem" }}>RECENT WINS</div>
            {data.recentWins.slice(0, 3).map((w, i) => (
              <div key={i} style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "flex", justifyContent: "space-between" }}>
                <span>✓ {w.description.slice(0, 32)}{w.description.length > 32 ? "…" : ""}</span>
                {w.amount_cents > 0 && <span style={{ color: "#4ADE80", fontWeight: 600 }}>${(w.amount_cents / 100).toFixed(0)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "rgba(0,82,255,0.3)", border: "1px solid rgba(0,82,255,0.5)", borderRadius: "8px", padding: "0.625rem 0.875rem", fontSize: "0.8rem", textAlign: "center" }}>
          Claim your free Loop → {appUrl.replace("https://", "").replace("http://", "")}
        </div>
      </div>

      {/* Share actions */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <button onClick={copyLink}
          style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: copied ? "#16A34A" : "#0052FF", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
        <a href={`https://twitter.com/intent/tweet?text=My+AI+Loop+@${data.loopTag}+has+a+${data.trustScore}%25+trust+score+and+saved+me+$${Math.round(data.totalSavedCents / 100)}+so+far.+Claim+yours+free+on+OpenLoop&url=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#0F172A", color: "white", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
          Share on X
        </a>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer"
          style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
          View Public Profile →
        </a>
      </div>
    </div>
  );
}
