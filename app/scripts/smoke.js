/**
 * Smoke test: verify the app is running and key routes respond.
 * Run after: npm start (or deploy). No DB required for HTTP checks.
 * Usage: NEXT_PUBLIC_APP_URL=http://localhost:3000 node scripts/smoke.js
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function fetchOk(path, expectStatus = 200) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  const ok = res.status === expectStatus;
  if (!ok) {
    const text = await res.text();
    console.error(path, "expected", expectStatus, "got", res.status, text.slice(0, 200));
  }
  return ok;
}

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  const text = await res.text();
  try {
    return { status: res.status, data: text ? JSON.parse(text) : {} };
  } catch {
    return { status: res.status, data: null };
  }
}

async function main() {
  console.log("Smoke test at", BASE);
  let passed = 0;
  let failed = 0;

  try {
    const health = await fetchJson("/api/health");
    if (health.status === 200 && health.data?.ok !== false) {
      console.log("OK GET /api/health");
      passed++;
    } else {
      console.error("FAIL /api/health", health.status, health.data);
      failed++;
    }
  } catch (e) {
    console.error("FAIL /api/health", e.message);
    failed++;
  }

  try {
    const stats = await fetchJson("/api/stats");
    if (stats.status === 200 && typeof stats.data?.activeLoops === "number") {
      console.log("OK GET /api/stats");
      passed++;
    } else {
      console.error("FAIL /api/stats", stats.status, stats.data);
      failed++;
    }
  } catch (e) {
    console.error("FAIL /api/stats", e.message);
    failed++;
  }

  try {
    const me = await fetchJson("/api/me");
    if (me.status === 401) {
      console.log("OK GET /api/me -> 401 (no session)");
      passed++;
    } else {
      console.error("FAIL /api/me expected 401 got", me.status);
      failed++;
    }
  } catch (e) {
    console.error("FAIL /api/me", e.message);
    failed++;
  }

  try {
    const list = await fetchJson("/api/loops/list");
    if (list.status === 200 && Array.isArray(list.data?.loops)) {
      console.log("OK GET /api/loops/list");
      passed++;
    } else {
      console.error("FAIL /api/loops/list", list.status);
      failed++;
    }
  } catch (e) {
    console.error("FAIL /api/loops/list", e.message);
    failed++;
  }

  try {
    const logoutRes = await fetch(`${BASE}/api/logout`, { method: "POST", credentials: "include" });
    const logout = { status: logoutRes.status };
    if (logout.status === 200) {
      console.log("OK POST /api/logout");
      passed++;
    } else {
      console.error("FAIL /api/logout", logout.status);
      failed++;
    }
  } catch (e) {
    console.error("FAIL /api/logout", e.message);
    failed++;
  }

  console.log("\nSmoke:", passed, "passed", failed, "failed");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
