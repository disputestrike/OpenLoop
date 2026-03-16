/**
 * Click-through + chaos test: hit every public page and key API.
 * Run with app running: npm run dev:openloop then node scripts/click-through-test.js
 * BASE defaults to http://localhost:3020 (OpenLoop dev port).
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE || "http://localhost:3020";

// Master-prompt coverage: all public routes + APIs + auth-required
const TESTS = [
  // ─── Public pages (expect 200 HTML) ───
  { path: "/", name: "Home", expectStatus: 200, expectHtml: true },
  { path: "/how-it-works", name: "How it works", expectStatus: 200, expectHtml: true },
  { path: "/business", name: "Business", expectStatus: 200, expectHtml: true },
  { path: "/businesses", name: "Businesses", expectStatus: 200, expectHtml: true },
  { path: "/privacy", name: "Privacy", expectStatus: 200, expectHtml: true },
  { path: "/terms", name: "Terms", expectStatus: 200, expectHtml: true },
  { path: "/claim", name: "Claim", expectStatus: 200, expectHtml: true },
  { path: "/login", name: "Login", expectStatus: 200, expectHtml: true },
  { path: "/directory", name: "Directory", expectStatus: 200, expectHtml: true },
  { path: "/marketplace", name: "Marketplace", expectStatus: 200, expectHtml: true },
  { path: "/marketplace/hire", name: "Marketplace hire", expectStatus: 200, expectHtml: true },
  { path: "/developers", name: "Developers", expectStatus: 200, expectHtml: true },
  { path: "/integrations", name: "Integrations", expectStatus: 200, expectHtml: true },
  { path: "/templates", name: "Templates", expectStatus: 200, expectHtml: true },
  { path: "/search", name: "Search", expectStatus: 200, expectHtml: true },
  { path: "/onboarding", name: "Onboarding", expectStatus: [200, 302] },
  { path: "/use-cases/travel", name: "Use case Travel", expectStatus: 200, expectHtml: true },
  { path: "/use-cases/bills", name: "Use case Bills", expectStatus: 200, expectHtml: true },
  { path: "/use-cases/business", name: "Use case Business", expectStatus: 200, expectHtml: true },
  { path: "/use-cases/health", name: "Use case Health", expectStatus: 200, expectHtml: true },
  { path: "/use-cases/legal", name: "Use case Legal", expectStatus: 200, expectHtml: true },
  { path: "/docs/protocol", name: "Docs protocol", expectStatus: 200, expectHtml: true },
  { path: "/docs/guardrails", name: "Docs guardrails", expectStatus: 200, expectHtml: true },
  { path: "/docs/trust", name: "Docs trust", expectStatus: 200, expectHtml: true },
  { path: "/docs/webhooks", name: "Docs webhooks", expectStatus: 200, expectHtml: true },
  // ─── Dashboard & Admin (200 or 302 when no session) ───
  { path: "/dashboard", name: "Dashboard", expectStatus: [200, 302] },
  { path: "/admin", name: "Admin", expectStatus: [200, 302] },
  { path: "/admin/analytics", name: "Admin analytics", expectStatus: [200, 302] },
  { path: "/admin/llm-report", name: "Admin LLM report", expectStatus: [200, 302] },
  { path: "/admin/llm-analytics", name: "Admin LLM analytics", expectStatus: [200, 302] },
  { path: "/admin/corpus", name: "Admin corpus", expectStatus: [200, 302] },
  { path: "/admin/monitoring", name: "Admin monitoring", expectStatus: [200, 302] },
  // ─── APIs (200 + JSON where applicable) ───
  { path: "/api/health", name: "API health", expectStatus: [200, 503], expectJson: true },
  { path: "/api/stats", name: "API stats", expectStatus: 200, expectJson: true },
  { path: "/api/activity", name: "API activity", expectStatus: 200, expectJson: true },
  { path: "/api/activity/categories", name: "API activity categories", expectStatus: 200, expectJson: true },
  { path: "/api/loops/list?limit=10", name: "API loops list", expectStatus: 200, expectJson: true },
  { path: "/api/marketplace", name: "API marketplace", expectStatus: 200, expectJson: true },
  { path: "/api/news", name: "API news", expectStatus: 200 },
  // ─── Auth-required APIs (expect 401 without session) ───
  { path: "/api/me", name: "API me (no session)", expectStatus: 401 },
  { path: "/api/chat/history", name: "API chat history (no session)", expectStatus: 401 },
  { path: "/api/me/audit", name: "API me audit (no session)", expectStatus: 401 },
  { path: "/api/me/export", name: "API me export (no session)", expectStatus: 401 },
];

async function fetchPath(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "manual", credentials: "include" });
  const text = await res.text();
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json") && text) {
    try {
      data = JSON.parse(text);
    } catch (_) {}
  }
  return { status: res.status, text, data, headers: Object.fromEntries(res.headers) };
}

function ok(status, expected) {
  if (Array.isArray(expected)) return expected.includes(status);
  return status === expected;
}

async function main() {
  console.log("Click-through test →", BASE, "\n");
  let passed = 0;
  let failed = 0;

  for (const t of TESTS) {
    try {
      const { status, text, data } = await fetchPath(t.path);
      const expected = t.expectStatus;
      const statusOk = ok(status, expected);

      if (t.expectHtml && statusOk && !text.includes("<!DOCTYPE") && !text.includes("<html")) {
        console.log("FAIL", t.name, t.path, "expected HTML, got", text.slice(0, 80));
        failed++;
        continue;
      }
      if (t.expectJson && statusOk && data === null && text) {
        console.log("FAIL", t.name, t.path, "expected JSON, got", text.slice(0, 80));
        failed++;
        continue;
      }
      if (t.expectJson && statusOk && data && t.path === "/api/activity" && !Array.isArray(data.activities) && !Array.isArray(data.items) && !data.activities && !data.items) {
        if (data.error) {
          console.log("FAIL", t.name, t.path, "API error", data.error);
          failed++;
          continue;
        }
      }
      if (t.path === "/api/stats" && statusOk && data && typeof data.totalLoops !== "number" && typeof data.activeLoops !== "number") {
        console.log("FAIL", t.name, "stats missing counts", Object.keys(data));
        failed++;
        continue;
      }
      if (t.path === "/api/loops/list" && statusOk && data && !Array.isArray(data.loops)) {
        console.log("FAIL", t.name, "loops list missing .loops array");
        failed++;
        continue;
      }

      if (statusOk) {
        console.log("OK", t.name, status);
        passed++;
      } else {
        console.log("FAIL", t.name, t.path, "expected", expected, "got", status, data?.error || text.slice(0, 60));
        failed++;
      }
    } catch (e) {
      console.log("FAIL", t.name, t.path, e.message);
      failed++;
    }
  }

  // Chaos: invalid activity id, invalid loop tag
  try {
    const act = await fetchPath("/activity/bad-id-12345");
    if (act.status === 200 || act.status === 404) {
      console.log("OK Activity bad id →", act.status);
      passed++;
    } else {
      console.log("FAIL Activity bad id got", act.status);
      failed++;
    }
  } catch (e) {
    console.log("FAIL Activity bad id", e.message);
    failed++;
  }
  try {
    const loop = await fetchPath("/loop/nonexistent_tag_xyz");
    if (loop.status === 200 || loop.status === 404) {
      console.log("OK Loop bad tag →", loop.status);
      passed++;
    } else {
      console.log("FAIL Loop bad tag got", loop.status);
      failed++;
    }
  } catch (e) {
    console.log("FAIL Loop bad tag", e.message);
    failed++;
  }

  // Dynamic: real /activity/[id] and /loop/[tag] if API returns data
  try {
    const actRes = await fetchPath("/api/activity?limit=5");
    if (actRes.status === 200 && actRes.data && (actRes.data.activities || actRes.data.items)) {
      const list = actRes.data.activities || actRes.data.items || [];
      const first = list.find((a) => a.id);
      if (first && first.id) {
        const page = await fetchPath("/activity/" + encodeURIComponent(first.id));
        if (page.status === 200 && (page.text.includes("<!DOCTYPE") || page.text.includes("<html"))) {
          console.log("OK Activity detail", first.id.slice(0, 8) + "…");
          passed++;
        } else {
          console.log("FAIL Activity detail page", page.status, page.text?.slice(0, 60));
          failed++;
        }
      }
    }
  } catch (e) {
    console.log("SKIP Activity detail (no data)", e.message);
  }
  try {
    const listRes = await fetchPath("/api/loops/list?limit=5");
    if (listRes.status === 200 && listRes.data && Array.isArray(listRes.data.loops) && listRes.data.loops.length > 0) {
      const tag = listRes.data.loops[0].loop_tag || listRes.data.loops[0].loopTag;
      if (tag) {
        const page = await fetchPath("/loop/" + encodeURIComponent(tag));
        if (page.status === 200 && (page.text.includes("<!DOCTYPE") || page.text.includes("<html"))) {
          console.log("OK Loop profile", tag);
          passed++;
        } else {
          console.log("FAIL Loop profile page", page.status);
          failed++;
        }
      }
    }
  } catch (e) {
    console.log("SKIP Loop profile (no data)", e.message);
  }

  console.log("\n---");
  console.log("Result:", passed, "passed", failed, "failed");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
