/**
 * Edge-case and integration tests. Run after: npm run dev (and migrations + seed).
 * Set DATABASE_URL and optionally NEXT_PUBLIC_APP_URL=http://localhost:3000.
 */
const { Pool } = require("pg");

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function fetchJson(path, opts = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, credentials: "include" });
  } catch (e) {
    throw new Error(`Fetch failed (is app running at ${BASE}?): ${e.message}`);
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

async function testClaimInvalidToken() {
  const { status, data } = await fetchJson("/api/claim?token=invalid-token-12345");
  if (status !== 400) {
    console.error("Expected 400 for invalid claim token, got", status, data);
    return false;
  }
  console.log("OK claim invalid token -> 400");
  return true;
}

async function testClaimEmptyToken() {
  const { status } = await fetchJson("/api/claim");
  if (status !== 400) {
    console.error("Expected 400 for missing claim token, got", status);
    return false;
  }
  console.log("OK claim empty token -> 400");
  return true;
}

async function testCreateLoopNoEmail() {
  const { status } = await fetchJson("/api/loops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (status !== 400) {
    console.error("Expected 400 for create loop without email, got", status);
    return false;
  }
  console.log("OK create loop no email -> 400");
  return true;
}

async function testMatchReturnsLoopOr404() {
  const { status, data } = await fetchJson("/api/loops/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", intent: "Bills" }),
  });
  if (status !== 200 && status !== 404) {
    console.error("Expected 200 or 404 for match, got", status, data);
    return false;
  }
  if (status === 200 && (!data.loop || !data.loop.id)) {
    console.error("Match 200 but no loop in response", data);
    return false;
  }
  console.log("OK match -> 200 with loop or 404");
  return true;
}

async function testChatUnauthorized() {
  const { status } = await fetchJson("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hi" }),
  });
  if (status !== 401) {
    console.error("Expected 401 for chat without session, got", status);
    return false;
  }
  console.log("OK chat unauthorized -> 401");
  return true;
}

async function testAdminForbiddenWithoutSecret() {
  const { status } = await fetchJson("/api/admin");
  if (status !== 403) {
    console.error("Expected 403 for admin without secret, got", status);
    return false;
  }
  console.log("OK admin no secret -> 403");
  return true;
}

async function testPublicDirectory() {
  const { status, data } = await fetchJson("/api/loops/list");
  if (status !== 200) {
    console.error("Directory list failed", status, data);
    return false;
  }
  if (!Array.isArray(data.loops)) {
    console.error("Directory should return loops array", data);
    return false;
  }
  console.log("OK directory list -> 200, loops length =", data.loops.length);
  return true;
}

async function testLogout() {
  const { status, data } = await fetchJson("/api/logout", { method: "POST" });
  if (status !== 200) {
    console.error("Logout failed", status, data);
    return false;
  }
  console.log("OK logout -> 200");
  return true;
}

async function testStatsPublic() {
  const { status, data } = await fetchJson("/api/stats");
  if (status !== 200 || typeof data.activeLoops !== "number") {
    console.error("Stats failed", status, data);
    return false;
  }
  console.log("OK stats -> 200", data);
  return true;
}

async function testLoopTagUnauthorized() {
  const { status } = await fetchJson("/api/me/loop-tag", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loopTag: "TestLoop" }),
  });
  if (status !== 401) {
    console.error("Expected 401 for loop-tag without session, got", status);
    return false;
  }
  console.log("OK loop-tag unauthorized -> 401");
  return true;
}

async function testTransactionCompleteUnauthorized() {
  const { status } = await fetchJson("/api/transactions/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sellerLoopId: "00000000-0000-0000-0000-000000000000", amountCents: 100, kind: "sandbox" }),
  });
  if (status !== 401) {
    console.error("Expected 401 for transaction/complete without session, got", status);
    return false;
  }
  console.log("OK transaction/complete unauthorized -> 401");
  return true;
}

async function testDisputeUnauthorized() {
  const { status } = await fetchJson("/api/disputes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId: "00000000-0000-0000-0000-000000000000" }),
  });
  if (status !== 401) {
    console.error("Expected 401 for dispute without session, got", status);
    return false;
  }
  console.log("OK dispute unauthorized -> 401");
  return true;
}

async function testTransactionCompleteNegativeAmount() {
  const { status, data } = await fetchJson("/api/transactions/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sellerLoopId: "00000000-0000-0000-0000-000000000000", amountCents: -100, kind: "sandbox" }),
  });
  if (status !== 401 && status !== 400) {
    console.error("Expected 401 or 400 for transaction/complete with negative amount, got", status, data);
    return false;
  }
  console.log("OK transaction negative amount ->", status);
  return true;
}

async function testByTagNotFound() {
  const { status } = await fetchJson("/api/loops/by-tag/ThisTagDoesNotExist12345");
  if (status !== 404) {
    console.error("Expected 404 for unknown loop tag, got", status);
    return false;
  }
  console.log("OK by-tag not found -> 404");
  return true;
}

async function main() {
  const tests = [
    testClaimInvalidToken,
    testClaimEmptyToken,
    testCreateLoopNoEmail,
    testMatchReturnsLoopOr404,
    testChatUnauthorized,
    testAdminForbiddenWithoutSecret,
    testPublicDirectory,
    testLogout,
    testStatsPublic,
    testLoopTagUnauthorized,
    testTransactionCompleteUnauthorized,
    testDisputeUnauthorized,
    testTransactionCompleteNegativeAmount,
    testByTagNotFound,
  ];
  let passed = 0;
  for (const t of tests) {
    try {
      if (await t()) passed++;
    } catch (e) {
      console.error("Test error:", e.message);
    }
  }
  console.log("\nEdge cases:", passed, "/", tests.length);
  process.exit(passed === tests.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
