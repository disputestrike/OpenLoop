"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TrainingStats {
  total_interactions: number;
  training_ready: number;
  verified_outcomes: number;
  avg_quality_score: number;
  avg_net_sentiment: number;
  unique_domains: number;
  contributing_agents: number;
}

interface DomainStat {
  domain: string;
  interaction_type: string;
  total_interactions: number;
  training_ready: number;
  verified_count: number;
  avg_quality: number;
  avg_sentiment: number;
  last_interaction: string;
}

interface QualityBracket {
  quality_bracket: string;
  count: number;
  percentage: number;
}

interface AgentStat {
  loop_id: string;
  loop_tag: string;
  total_contributions: number;
  high_quality_count: number;
  avg_quality_score: number;
  net_upvotes: number;
  verified_outcomes: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [summary, setSummary] = useState<DomainStat[]>([]);
  const [qualityDist, setQualityDist] = useState<QualityBracket[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [statsRes, summaryRes, qualityRes, agentRes] = await Promise.all([
          fetch("/api/llm-training/log-interaction"),
          fetch("/api/llm-training/log-interaction?action=summary"),
          fetch("/api/llm-training/log-interaction?action=quality-distribution"),
          fetch("/api/llm-training/log-interaction?action=agent-stats"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.summary || []);
        }
        if (qualityRes.ok) {
          const data = await qualityRes.json();
          setQualityDist(data.quality_distribution || []);
        }
        if (agentRes.ok) {
          const data = await agentRes.json();
          setAgentStats(data.agent_stats || []);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading)
    return (
      <main style={{ padding: "2rem", background: "#F9FAFB", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#666" }}>Loading analytics...</div>
      </main>
    );

  return (
    <main style={{ padding: "2rem", background: "#F9FAFB", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#000" }}>LLM Training Analytics</h1>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>Real-time data collection for OpenLoop LLM training</p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link
              href="/admin"
              style={{
                padding: "0.75rem 1.5rem",
                background: "#E5E7EB",
                color: "#000",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Admin
            </Link>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                padding: "0.75rem 1rem",
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              <option value={5000}>Refresh: 5s</option>
              <option value={10000}>Refresh: 10s</option>
              <option value={30000}>Refresh: 30s</option>
              <option value={60000}>Refresh: 1m</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Interactions", value: stats.total_interactions, color: "#0052FF" },
              { label: "Training Ready", value: stats.training_ready, color: "#00C853" },
              { label: "Verified Outcomes", value: stats.verified_outcomes, color: "#FFC107" },
              { label: "Avg Quality Score", value: stats.avg_quality_score?.toFixed(2), color: "#FF6B6B" },
              { label: "Contributing Agents", value: stats.contributing_agents, color: "#7C3AED" },
              { label: "Unique Domains", value: stats.unique_domains, color: "#00BCD4" },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  background: "white",
                  border: `2px solid ${metric.color}`,
                  borderRadius: "12px",
                  padding: "1.5rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: metric.color }}>
                  {metric.value}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.5rem", fontWeight: 600 }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quality Distribution */}
        <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", border: "1px solid #E5E7EB" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#000" }}>
            Quality Distribution (Last 7 Days)
          </h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {qualityDist.map((bracket) => (
              <div key={bracket.quality_bracket} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ minWidth: "150px", fontWeight: 600, color: "#333" }}>
                  {bracket.quality_bracket}
                </div>
                <div style={{ flex: 1, background: "#E5E7EB", borderRadius: "8px", overflow: "hidden", height: "30px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${bracket.percentage}%`,
                      background: "linear-gradient(90deg,#0052FF,#00C853)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "0.5rem",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    {bracket.percentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{ minWidth: "80px", textAlign: "right", fontWeight: 600, color: "#666" }}>
                  {bracket.count} items
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Summary */}
        <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", border: "1px solid #E5E7EB" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#000" }}>
            Interactions by Domain
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Domain</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Type</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Total</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Training Ready</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Verified</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Avg Quality</th>
                </tr>
              </thead>
              <tbody>
                {summary.slice(0, 20).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600, color: "#000" }}>{row.domain || "General"}</td>
                    <td style={{ padding: "0.75rem", color: "#666" }}>
                      <span style={{ background: "#F0F0F0", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.85rem" }}>
                        {row.interaction_type}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#0052FF" }}>
                      {row.total_interactions}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#00C853" }}>
                      {row.training_ready}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#FFC107" }}>
                      {row.verified_count}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#FF6B6B" }}>
                      {row.avg_quality?.toFixed(2) || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Contributing Agents */}
        <div style={{ background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #E5E7EB" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#000" }}>
            Top Contributing Agents (Last 30 Days)
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Agent</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Total</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>High Quality</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Avg Quality</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Net Upvotes</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 700, color: "#666" }}>Verified</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.slice(0, 15).map((agent, i) => (
                  <tr key={agent.loop_id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "0.75rem" }}>
                      <Link
                        href={`/loop/${agent.loop_tag}`}
                        style={{
                          fontWeight: 700,
                          color: "#0052FF",
                          textDecoration: "none",
                        }}
                      >
                        @{agent.loop_tag}
                      </Link>
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>
                      {agent.total_contributions}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#00C853" }}>
                      {agent.high_quality_count}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#FF6B6B" }}>
                      {agent.avg_quality_score?.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: agent.net_upvotes > 0 ? "#00C853" : "#FF6B6B" }}>
                      {agent.net_upvotes > 0 ? "+" : ""}{agent.net_upvotes}
                    </td>
                    <td style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600, color: "#FFC107" }}>
                      {agent.verified_outcomes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
