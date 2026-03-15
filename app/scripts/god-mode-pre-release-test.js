/**
 * God-mode pre-release test: comprehensive audit, chaos, auth, and stress.
 * Run with app running: BASE_URL=http://localhost:3000 node scripts/god-mode-pre-release-test.js
 * Exits 0 only if all phases pass. Tries to break everything; expects resilient responses.
 */
const BASE = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3020";

const results = { passed: 0, failed: 0, phase: [], errors: [] };

function pass(name, detail = "") {
  results.passed++;
  results.phase.push({ phase: "check", name, ok: true, detail });
  console.log("PASS", name, detail || "");
}

function fail(name, detail) {
  results.failed++;
  results.phase.push({ phase: "check", name, ok: false, detail });
  results.errors.push(`${name}: ${detail}`);
  console.log("FAIL", name, detail);
}

async function fetchPath(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "manual", credentials: "include", ...opts });
  const text = await res.text();
  let data = null;
  if ((res.headers.get("content-type") || "").includes("application/json") && text) {
    try {
      data = JSON.parse(text);
    } catch (_) {}
  }
  return { status: res.status, text, data, url };
}

async function postJson(path, body, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: opts.credentials || "omit",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  if ((res.headers.get("content-type") || "").includes("application/json") && text) {
    try {
      data = JSON.parse(text);
    } catch (_) {}
  }
  return { status: res.status, text, data };
}

function ok(status, expected) {
  if (Array.isArray(expected)) return expected.includes(status);
  return status === expected;
}

async function main() {
  console.log("\n=== GOD-MODE PRE-RELEASE TEST ===\n");
  console.log("BASE_URL:", BASE, "\n");

  // --- Phase 1: System audit — public pages ---
  console.log("--- Phase 1: Public pages ---");
  const pages = [
    "/",
    "/directory",
    "/integrations",
    "/claim",
    "/how-it-works",
    "/privacy",
    "/terms",
    "/search",
    "/businesses",
    "/onboarding",
    "/docs/protocol",
    "/templates",
    "/developers",
    "/marketplace",
    "/login",
    "/business",
    "/integrations",
    "/how-it-works",
  ];
  for (const path of [...new Set(pages)]) {
    try {
      const r = await fetchPath(path);
      if (r.status === 200 && (r.text.includes("<!DOCTYPE") || r.text.includes("<html"))) {
        pass(`GET ${path} (HTML)`);
      } else if (r.status === 200) {
        pass(`GET ${path} (200)`);
      } else {
        fail(`GET ${path}`, `expected 200 got ${r.status}`);
      }
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // --- Phase 2: Public APIs (must return 200, no crash) ---
  console.log("\n--- Phase 2: Public APIs ---");
  const apis = [
    ["/api/health", [200, 503], (d) => d && (d.ok === true || d.ok === false)],
    ["/api/stats", 200, (d) => d && (typeof d.activeLoops === "number" || typeof d.totalLoops === "number")],
    ["/api/activity", 200, () => true],
    ["/api/activity/categories", 200, () => true],
    ["/api/loops/list", 200, (d) => d && Array.isArray(d.loops)],
    ["/api/news", 200, () => true],
    ["/api/network/stats", 200, (d) => d && (typeof d.agentsRegistered === "number" || d.error === undefined)],
  ];
  for (const [path, expectStatus, validate] of apis) {
    try {
      const r = await fetchPath(path);
      if (ok(r.status, expectStatus)) {
        if (r.data && !validate(r.data)) {
          fail(`GET ${path}`, "response shape invalid");
        } else {
          pass(`GET ${path}`);
        }
      } else {
        fail(`GET ${path}`, `expected ${Array.isArray(expectStatus) ? expectStatus.join("/") : expectStatus} got ${r.status}`);
      }
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // --- Phase 3: Auth-required — must return 401 without session ---
  console.log("\n--- Phase 3: Auth-required (expect 401) ---");
  const authRoutes = [
    "/api/me",
    "/api/chat/history",
    "/api/me/audit",
    "/api/me/export",
    "/api/me/protocol/inbox",
    "/api/me/persistent-memory",
    "/api/integrations",
  ];
  for (const path of authRoutes) {
    try {
      const r = await fetchPath(path);
      if (r.status === 401) {
        pass(`${path} → 401`);
      } else {
        fail(`${path}`, `expected 401 got ${r.status}`);
      }
    } catch (e) {
      fail(path, e.message);
    }
  }

  // --- Phase 4: Protocol gateway — no auth → 401; invalid body → 400 ---
  console.log("\n--- Phase 4: Protocol chaos (try to break) ---");
  try {
    const noAuth = await postJson("/api/protocol/send", { type: "TASK_REQUEST", task: "x" });
    if (noAuth.status === 401) pass("POST /api/protocol/send no auth → 401");
    else fail("POST /api/protocol/send no auth", `expected 401 got ${noAuth.status}`);
  } catch (e) {
    fail("POST /api/protocol/send no auth", e.message);
  }
  try {
    const empty = await postJson("/api/protocol/send", {});
    if (empty.status === 400 || empty.status === 401) pass("POST /api/protocol/send empty type → 4xx");
    else fail("POST /api/protocol/send empty", `expected 400/401 got ${empty.status}`);
  } catch (e) {
    fail("POST /api/protocol/send empty", e.message);
  }
  try {
    const invalidType = await postJson("/api/protocol/send", { type: "INVALID_MESSAGE_TYPE" });
    if (invalidType.status === 400 || invalidType.status === 401) pass("POST /api/protocol/send invalid type → 4xx");
    else fail("POST /api/protocol/send invalid type", `expected 400/401 got ${invalidType.status}`);
  } catch (e) {
    fail("POST /api/protocol/send invalid type", e.message);
  }
  try {
    const malformed = await postJson("/api/protocol/send", "not json", {
      headers: { "Content-Type": "application/json" },
    });
    if (malformed.status === 400 || malformed.status === 401) pass("POST /api/protocol/send malformed body → 4xx");
    else fail("POST /api/protocol/send malformed", `expected 4xx got ${malformed.status}`);
  } catch (e) {
    fail("POST /api/protocol/send malformed", e.message);
  }

  // --- Phase 5: Escrow / flow — no auth → 401 ---
  console.log("\n--- Phase 5: Escrow & flow auth ---");
  try {
    const escrowHold = await postJson("/api/escrow/hold", { contractId: "00000000-0000-0000-0000-000000000000", amountCents: 100 });
    if (escrowHold.status === 401) pass("POST /api/escrow/hold no auth → 401");
    else fail("POST /api/escrow/hold", `expected 401 got ${escrowHold.status}`);
  } catch (e) {
    fail("POST /api/escrow/hold", e.message);
  }
  try {
    const flowStep = await postJson("/api/flow/step", { message: "test" });
    if (flowStep.status === 401) pass("POST /api/flow/step no auth → 401");
    else fail("POST /api/flow/step", `expected 401 got ${flowStep.status}`);
  } catch (e) {
    fail("POST /api/flow/step", e.message);
  }
  try {
    const agentsReg = await postJson("/api/agents/register", { capabilities: ["test"] });
    if (agentsReg.status === 401) pass("POST /api/agents/register no auth → 401");
    else fail("POST /api/agents/register", `expected 401 got ${agentsReg.status}`);
  } catch (e) {
    fail("POST /api/agents/register", e.message);
  }
  try {
    const escrowGet = await fetchPath("/api/escrow/00000000-0000-0000-0000-000000000000");
    if (escrowGet.status === 401) pass("GET /api/escrow/[id] no auth → 401");
    else fail("GET /api/escrow/[id]", `expected 401 got ${escrowGet.status}`);
  } catch (e) {
    fail("GET /api/escrow/[id]", e.message);
  }

  // --- Phase 6: Dashboard / admin — 200 or 302 ---
  console.log("\n--- Phase 6: Dashboard & admin ---");
  try {
    const dash = await fetchPath("/dashboard");
    if (ok(dash.status, [200, 302])) pass("GET /dashboard");
    else fail("GET /dashboard", `got ${dash.status}`);
  } catch (e) {
    fail("GET /dashboard", e.message);
  }
  try {
    const admin = await fetchPath("/admin");
    if (ok(admin.status, [200, 302])) pass("GET /admin");
    else fail("GET /admin", `got ${admin.status}`);
  } catch (e) {
    fail("GET /admin", e.message);
  }

  // --- Phase 7: Chaos — bad activity id, bad loop tag (must not 500) ---
  console.log("\n--- Phase 7: Chaos (bad ids) ---");
  try {
    const badAct = await fetchPath("/activity/bad-id-xyz");
    if (badAct.status === 200 || badAct.status === 404) pass("GET /activity/bad-id → 2xx/404");
    else fail("GET /activity/bad-id", `expected 2xx/404 got ${badAct.status}`);
  } catch (e) {
    fail("GET /activity/bad-id", e.message);
  }
  try {
    const badLoop = await fetchPath("/loop/nonexistent_tag_xyz_123");
    if (badLoop.status === 200 || badLoop.status === 404) pass("GET /loop/bad-tag → 2xx/404");
    else fail("GET /loop/bad-tag", `got ${badLoop.status}`);
  } catch (e) {
    fail("GET /loop/bad-tag", e.message);
  }

  // --- Phase 8: Stress — concurrent health checks (server must not crash) ---
  console.log("\n--- Phase 8: Stress (concurrent) ---");
  try {
    const concurrency = 30;
    const promises = Array.from({ length: concurrency }, () => fetchPath("/api/health"));
    const settled = await Promise.allSettled(promises);
    const okCount = settled.filter((s) => s.status === "fulfilled" && (s.value.status === 200 || s.value.status === 503)).length;
    if (okCount >= concurrency * 0.8) {
      pass(`Concurrent ${concurrency} GET /api/health`, `${okCount}/${concurrency} 200/503`);
    } else {
      fail("Concurrent health", `${okCount}/${concurrency} succeeded`);
    }
  } catch (e) {
    fail("Concurrent health", e.message);
  }

  // --- Phase 9: Categories list (public API) ---
  try {
    const cat = await fetchPath("/api/categories/list");
    if (cat.status === 200) pass("GET /api/categories/list");
    else fail("GET /api/categories/list", `got ${cat.status}`);
  } catch (e) {
    fail("GET /api/categories/list", e.message);
  }

  // --- Summary ---
  console.log("\n=== SUMMARY ===");
  console.log("PASSED:", results.passed);
  console.log("FAILED:", results.failed);
  if (results.errors.length) {
    console.log("\nErrors:");
    results.errors.forEach((e) => console.log(" -", e));
  }
  console.log("\n" + (results.failed === 0 ? "ALL GREEN." : "SOME FAILURES — fix before release."));
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
