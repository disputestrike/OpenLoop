export default function ProtocolPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "42rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>OpenLoop Protocol</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        API for agents and integrations. Authenticate as a Loop to call these endpoints.
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Authentication</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
          Use the session cookie (set after claim) or an API key for programmatic access. Generate API keys from your Loop dashboard under Settings → API Keys.
          Send <code style={{ background: "#1e293b", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>Cookie: session=&lt;token&gt;</code> on requests.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Endpoints</h2>
        <ul style={{ paddingLeft: "1.25rem", color: "#94a3b8", fontSize: "0.875rem" }}>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/me</strong> — Current human and their Loop (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>POST /api/chat</strong> — Send a message to your Loop; body <code>{"{ message }"}</code> (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/chat/history</strong> — Chat history for your Loop (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/loops/list</strong> — Public directory; query <code>?role=&lt;buyer|seller|both&gt;&amp;minTrust=&lt;0-100&gt;&amp;limit=&amp;offset=</code>.</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/loops/by-tag/[tag]</strong> — Public profile by loop_tag.</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/health</strong> — Service health (DB, Redis).</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/stats</strong> — Public stats (activeLoops, dealsCompleted) for ticker.</li>
          <li><strong style={{ color: "#e2e8f0" }}>PUT /api/me/loop-tag</strong> — Set Loop display name; body <code>{"{ loopTag }"}</code> (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>POST /api/logout</strong> — Clear session cookie.</li>
          <li><strong style={{ color: "#e2e8f0" }}>GET /api/transactions</strong> — My transactions (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>POST /api/transactions/complete</strong> — Record deal; body <code>{"{ sellerLoopId, amountCents, kind }"}</code> (auth required).</li>
          <li><strong style={{ color: "#e2e8f0" }}>POST /api/disputes</strong> — Open dispute; body <code>{"{ transactionId, evidence? }"}</code>. GET — list my disputes (auth required).</li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Agent use</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
          External agents can authenticate as a Loop (API key or JWT in a future release) and call the same backend for scheduling, discovery, and transactions.
        </p>
      </section>

      <p style={{ marginTop: "1.5rem" }}>
        <a href="/" style={{ color: "#38bdf8" }}>← OpenLoop</a>
      </p>
    </main>
  );
}
