/**
 * /admin/monitoring
 * Admin dashboard for monitoring platform health and metrics
 */

"use client";

import { useEffect, useState } from "react";

export default function AdminMonitoring() {
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [disputes, setDisputes] = useState<any>(null);
  const [verifications, setVerifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch platform analytics
        const platformRes = await fetch("/api/analytics/platform");
        const platform = await platformRes.json();
        setPlatformStats(platform);

        // Fetch leaderboard
        const leaderboardRes = await fetch("/api/analytics/leaderboard?sortBy=earnings&limit=10");
        const lb = await leaderboardRes.json();
        setLeaderboard(lb);

        // Fetch open disputes (with admin key)
        const adminKey = localStorage.getItem("admin_api_key");
        if (adminKey) {
          const disputesRes = await fetch("/api/admin/disputes", {
            headers: { Authorization: `Bearer ${adminKey}` },
          });
          if (disputesRes.ok) {
            const d = await disputesRes.json();
            setDisputes(d);
          }

          // Fetch pending verifications
          const verificationsRes = await fetch("/api/admin/verifications/pending", {
            headers: { Authorization: `Bearer ${adminKey}` },
          });
          if (verificationsRes.ok) {
            const v = await verificationsRes.json();
            setVerifications(v);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Monitoring Dashboard</h1>

      {/* Platform Metrics */}
      {platformStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-semibold">Total Users</div>
            <div className="text-3xl font-bold text-blue-900">{platformStats.totalUsers}</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="text-sm text-green-600 font-semibold">Active Agents</div>
            <div className="text-3xl font-bold text-green-900">{platformStats.totalAgents}</div>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600 font-semibold">Total Transactions</div>
            <div className="text-3xl font-bold text-purple-900">{platformStats.totalTransactions}</div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-600 font-semibold">Total Revenue</div>
            <div className="text-3xl font-bold text-yellow-900">
              ${(platformStats.totalRevenue / 100).toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-600 font-semibold">Average Rating</div>
            <div className="text-3xl font-bold text-orange-900">{platformStats.averageRating.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <div className="text-sm text-red-600 font-semibold">Open Disputes</div>
            <div className="text-3xl font-bold text-red-900">{platformStats.openDisputes}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Earners */}
        {leaderboard?.leaderboard && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Top Earners</h2>
            <div className="space-y-2">
              {leaderboard.leaderboard.slice(0, 10).map((agent: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-semibold">{idx + 1}. {agent.loopTag}</div>
                    <div className="text-sm text-gray-600">{agent.tasks} tasks • ⭐ {agent.rating.toFixed(1)}</div>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${(agent.earnings / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Disputes */}
        {disputes && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Open Disputes ({disputes.total})</h2>
            <div className="space-y-2">
              {disputes.disputes.slice(0, 5).map((dispute: any, idx: number) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="font-semibold text-red-900">{dispute.reason}</div>
                  <div className="text-sm text-red-700">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Verifications */}
      {verifications && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mt-8">
          <h2 className="text-xl font-bold mb-4">Pending Verifications ({verifications.total})</h2>
          <div className="space-y-2">
            {verifications.applications.map((app: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded">
                <div>
                  <div className="font-semibold">{app.loop_tag}</div>
                  <div className="text-sm text-gray-600">
                    Skill: {app.skill} • Applied: {new Date(app.applied_at).toLocaleDateString()}
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
