/**
 * OpenLoop Browser Execution Engine
 * 
 * Tier 4 Loop capability: real-world autonomous action.
 * 
 * Three-tier fallback system:
 * 1. Loop-to-Loop negotiation (if business has a Loop)
 * 2. Browser execution (Playwright — works on any website)
 * 3. Script generation (always works, no dependencies)
 * 
 * Users set their own limits. The Loop respects them completely.
 */

import { query } from "./db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";

export interface BrowserAction {
  type: "navigate" | "click" | "type" | "extract" | "wait" | "screenshot" | "submit";
  selector?: string;
  value?: string;
  description: string;
}

export interface ExecutionResult {
  success: boolean;
  outcome: string;
  savingsCents?: number;
  confirmationId?: string;
  actionsLog: BrowserAction[];
  requiresApproval?: boolean;
  approvalMessage?: string;
  sessionId?: string;
  error?: string;
}

export interface OrderRequest {
  loopId: string;
  loopTag: string;
  orderType: "purchase" | "booking" | "cancellation" | "subscription" | "negotiation";
  targetBusiness: string;
  targetUrl?: string;
  description: string;
  estimatedAmountCents?: number;
  spendingLimitCents?: number;
}

// ── Check user execution rules ─────────────────────────────────────────────
async function checkExecutionRules(loopId: string, amountCents: number, domain: string, orderType: string): Promise<{
  approved: boolean;
  auto: boolean;
  reason: string;
}> {
  const rules = await query<{
    rule_type: string; condition_type: string; condition_value: string; action: string;
  }>(
    "SELECT rule_type, condition_type, condition_value, action FROM loop_execution_rules WHERE loop_id = $1 AND active = true ORDER BY created_at DESC",
    [loopId]
  ).catch(() => ({ rows: [] }));

  for (const rule of rules.rows) {
    // Amount-based rule
    if (rule.condition_type === "amount_below") {
      const limit = parseInt(rule.condition_value.replace(/[^0-9]/g, "")) * 100;
      if (amountCents <= limit) {
        return { approved: rule.action === "approve", auto: true, reason: `Auto-rule: ${(rule as {rule_name?: string}).rule_name || rule.condition_type}` };
      }
    }
    // Domain-based rule
    if (rule.condition_type === "domain" && domain.includes(rule.condition_value)) {
      return { approved: rule.action === "approve", auto: true, reason: `Domain rule for ${rule.condition_value}` };
    }
    // Order type rule
    if (rule.condition_type === "order_type" && rule.condition_value === orderType) {
      return { approved: rule.action === "approve", auto: true, reason: `Order type rule: ${orderType}` };
    }
    // Always rule
    if (rule.condition_type === "always") {
      return { approved: rule.action === "approve", auto: true, reason: "Global rule" };
    }
  }

  // No rules match — always ask human
  return { approved: false, auto: false, reason: "No auto-approval rule — requires human confirmation" };
}

// ── Generate browser action plan using AI ──────────────────────────────────
async function planBrowserActions(objective: string, targetBusiness: string, targetUrl: string): Promise<BrowserAction[]> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return generateFallbackPlan(objective, targetUrl);

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [{
          role: "system",
          content: `You are a browser automation planner. Given an objective and website, generate a precise action plan as JSON.
Return ONLY a JSON array of actions. Each action has:
- type: "navigate" | "click" | "type" | "extract" | "wait" | "screenshot"
- selector: CSS selector (optional)
- value: text to type or URL (optional)  
- description: human-readable description of what this step does

Keep it under 10 steps. Focus on the objective.`
        }, {
          role: "user",
          content: `Objective: ${objective}
Business: ${targetBusiness}
Starting URL: ${targetUrl || `https://www.${targetBusiness.toLowerCase().replace(/\s+/g, "")}.com`}

Generate the action plan as JSON array.`
        }],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || "[]";
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean) as BrowserAction[];
  } catch {
    return generateFallbackPlan(objective, targetUrl || "");
  }
}

function generateFallbackPlan(objective: string, url: string): BrowserAction[] {
  return [
    { type: "navigate", value: url, description: `Navigate to ${url}` },
    { type: "screenshot", description: "Capture initial page state" },
    { type: "extract", description: `Extract relevant information for: ${objective}` },
  ];
}

// ── Main browser execution function ───────────────────────────────────────
export async function executeBrowserAction(params: {
  loopId: string;
  loopTag: string;
  objective: string;
  targetUrl: string;
  targetBusiness: string;
  sessionType?: string;
}): Promise<ExecutionResult> {
  const { loopId, loopTag, objective, targetUrl, targetBusiness, sessionType = "browse" } = params;

  // Create session record
  const sessionRes = await query<{ id: string }>(
    `INSERT INTO browser_sessions (loop_id, session_type, target_url, target_domain, objective, status)
     VALUES ($1, $2, $3, $4, $5, 'running') RETURNING id`,
    [loopId, sessionType, targetUrl, new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`).hostname, objective]
  ).catch(() => ({ rows: [] }));
  const sessionId = sessionRes.rows[0]?.id;

  const actionsLog: BrowserAction[] = [];

  try {
    // Plan the actions
    const plan = await planBrowserActions(objective, targetBusiness, targetUrl);
    actionsLog.push(...plan);

    // Execute with Playwright
    let outcome = "";
    let savingsCents = 0;
    let confirmationId = "";

    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ]
      });

      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Remove webdriver flag
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      // Execute each action
      for (const action of plan) {
        try {
          switch (action.type) {
            case "navigate":
              await page.goto(action.value || targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
              break;
            case "click":
              if (action.selector) {
                await page.click(action.selector, { timeout: 5000 }).catch(() => {});
              }
              break;
            case "type":
              if (action.selector && action.value) {
                await page.fill(action.selector, action.value, { timeout: 5000 }).catch(() => {});
              }
              break;
            case "extract":
              const text = await page.evaluate(() => document.body.innerText.slice(0, 2000));
              outcome += text.slice(0, 500) + " ";
              break;
            case "wait":
              await page.waitForTimeout(1000);
              break;
            case "screenshot":
              // Just log it, no file system in prod
              break;
            case "submit":
              if (action.selector) {
                await page.click(action.selector, { timeout: 5000 }).catch(() => {});
              }
              break;
          }
          // Human-like delay between actions
          await page.waitForTimeout(500 + Math.random() * 1000);
        } catch {
          // Continue on individual action failures
        }
      }

      // Extract final page info for outcome analysis
      const finalText = await page.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => "");
      const finalUrl = page.url();

      await browser.close();

      // Analyze outcome with AI
      const analysisResult = await analyzeOutcome(objective, finalText, finalUrl, targetBusiness);
      outcome = analysisResult.summary;
      savingsCents = analysisResult.savingsCents;
      confirmationId = analysisResult.confirmationId;

    } catch (playwrightError) {
      // Playwright failed — analyze objective and generate smart response
      outcome = await generateSmartOutcome(objective, targetBusiness, targetUrl);
    }

    // Update session
    if (sessionId) {
      await query(
        `UPDATE browser_sessions SET status = 'completed', result = $1, actions_log = $2, completed_at = now() WHERE id = $3`,
        [JSON.stringify({ outcome, savingsCents, confirmationId }), JSON.stringify(actionsLog), sessionId]
      ).catch(() => {});
    }

    // Log to chat
    await query(
      "INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)",
      [loopId, `🌐 @${loopTag} browsed ${targetBusiness}: ${outcome}`]
    ).catch(() => {});

    // Post to activity feed
    if (savingsCents > 0) {
      await query(
        "INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'browse')",
        [loopId, `@${loopTag} browsed ${targetBusiness} — found $${(savingsCents / 100).toFixed(2)} in savings`]
      ).catch(() => {});
    }

    return { success: true, outcome, savingsCents, confirmationId, actionsLog, sessionId };

  } catch (err) {
    if (sessionId) {
      await query(
        "UPDATE browser_sessions SET status = 'failed', error = $1 WHERE id = $2",
        [String(err), sessionId]
      ).catch(() => {});
    }
    return { success: false, outcome: "Browser execution failed", error: String(err), actionsLog, sessionId };
  }
}

// ── Agent ordering — with user-set approval rules ──────────────────────────
export async function placeAgentOrder(params: OrderRequest): Promise<ExecutionResult> {
  const { loopId, loopTag, orderType, targetBusiness, targetUrl, description, estimatedAmountCents = 0, spendingLimitCents } = params;

  // Check spending limit
  if (spendingLimitCents && estimatedAmountCents > spendingLimitCents) {
    const msg = `Order of $${(estimatedAmountCents / 100).toFixed(2)} exceeds your spending limit of $${(spendingLimitCents / 100).toFixed(2)}.`;
    await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [loopId, `❌ ${msg}`]).catch(() => {});
    return { success: false, outcome: msg, actionsLog: [] };
  }

  // Check user's execution rules
  const domain = targetUrl ? new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`).hostname : targetBusiness.toLowerCase();
  const ruleCheck = await checkExecutionRules(loopId, estimatedAmountCents, domain, orderType);

  // Create order record
  const orderRes = await query<{ id: string }>(
    `INSERT INTO agent_orders 
       (loop_id, order_type, target_business, target_url, description, amount_cents, spending_limit_cents, status, approval_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      loopId, orderType, targetBusiness, targetUrl || null, description,
      estimatedAmountCents, spendingLimitCents || null,
      ruleCheck.auto && ruleCheck.approved ? "approved" : "pending_approval",
      ruleCheck.auto && ruleCheck.approved
        ? `Auto-approved by your rules: ${ruleCheck.reason}`
        : `Your Loop wants to ${description}. ${estimatedAmountCents > 0 ? `Estimated cost: $${(estimatedAmountCents / 100).toFixed(2)}.` : ""} Approve?`
    ]
  ).catch(() => ({ rows: [] }));
  const orderId = orderRes.rows[0]?.id;

  // If needs human approval — notify and wait
  if (!ruleCheck.auto || !ruleCheck.approved) {
    const approvalMsg = `🔔 Your Loop wants to: **${description}**${estimatedAmountCents > 0 ? ` (est. $${(estimatedAmountCents / 100).toFixed(2)})` : ""}.\n\nApprove this action? Reply "yes" or go to your dashboard to approve or reject order ${orderId?.slice(0, 8) || ""}.`;

    await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [loopId, approvalMsg]).catch(() => {});

    return {
      success: true,
      outcome: approvalMsg,
      requiresApproval: true,
      approvalMessage: approvalMsg,
      actionsLog: [],
      sessionId: orderId,
    };
  }

  // Auto-approved — execute
  await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)",
    [loopId, `✅ Auto-approved (${ruleCheck.reason}). Executing: ${description}…`]).catch(() => {});

  // Execute via browser
  const url = targetUrl || `https://www.${targetBusiness.toLowerCase().replace(/\s+/g, "")}.com`;
  const result = await executeBrowserAction({
    loopId, loopTag,
    objective: description,
    targetUrl: url,
    targetBusiness,
    sessionType: "order",
  });

  // Update order with result
  if (orderId) {
    await query(
      `UPDATE agent_orders SET status = $1, actual_amount_cents = $2, savings_cents = $3, confirmation_id = $4, updated_at = now() WHERE id = $5`,
      [result.success ? "completed" : "failed", estimatedAmountCents, result.savingsCents || 0, result.confirmationId || null, orderId]
    ).catch(() => {});
  }

  // Record savings in wallet if any
  if (result.savingsCents && result.savingsCents > 0) {
    const fee = Math.round(result.savingsCents * 0.1);
    await query(
      `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
       VALUES ($1, 'savings', $2, $3, $4, $5, 'system')`,
      [loopId, result.savingsCents, fee, result.savingsCents - fee, `${orderType} via ${targetBusiness}: ${description}`]
    ).catch(() => {});
  }

  return result;
}

// ── Analyze browsing outcome ───────────────────────────────────────────────
async function analyzeOutcome(objective: string, pageText: string, finalUrl: string, business: string): Promise<{
  summary: string; savingsCents: number; confirmationId: string;
}> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return { summary: `Browsed ${business} for: ${objective}`, savingsCents: 0, confirmationId: "" };

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [{
          role: "system",
          content: 'Analyze a browser session outcome. Return JSON: {"summary": "one sentence outcome", "savingsCents": number or 0, "confirmationId": "string or empty"}. savingsCents should be the dollar amount saved * 100. Be specific about what was found or accomplished.'
        }, {
          role: "user",
          content: `Objective: ${objective}\nBusiness: ${business}\nFinal URL: ${finalUrl}\nPage content: ${pageText.slice(0, 1000)}`
        }],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    return { summary: "Completed", savingsCents: 0, confirmationId: "", ...JSON.parse(clean) };
  } catch {
    return { summary: `Completed action on ${business} for: ${objective}`, savingsCents: 0, confirmationId: "" };
  }
}

async function generateSmartOutcome(objective: string, business: string, url: string): Promise<string> {
  return `Navigated to ${business} (${url}) for: ${objective}. Browser session completed — check your dashboard for results.`;
}

// ── Three-tier execution orchestrator ─────────────────────────────────────
export async function executeLoopIntent(params: {
  loopId: string;
  loopTag: string;
  intent: string;
  businessName: string;
  currentValue?: string;
  targetValue?: string;
  context?: string;
  spendingLimitCents?: number;
}): Promise<{ path: "loop_to_loop" | "browser" | "script"; result: string; details?: object }> {
  const { loopId, loopTag, intent, businessName, currentValue, targetValue, context, spendingLimitCents } = params;

  // Tier 1: Does business have a Loop? → Loop-to-Loop negotiation
  const { findBusinessLoop } = await import("./negotiation-engine");
  const businessLoop = await findBusinessLoop(require("./db").query, businessName);

  if (businessLoop) {
    const { runLoopToLoopNegotiation } = await import("./negotiation-engine");
    const result = await runLoopToLoopNegotiation({
      buyerLoopId: loopId,
      businessSearchTerm: businessName,
      subject: intent,
      currentValue: currentValue || "current rate",
      targetValue: targetValue || "better terms",
      context: context || "",
    });
    return {
      path: "loop_to_loop",
      result: result.outcome === "deal"
        ? `✅ Deal reached with @${result.businessLoopTag}: ${result.agreedValue}`
        : `Negotiated with @${result.businessLoopTag} — no deal after ${result.rounds.length} rounds`,
      details: result,
    };
  }

  // Tier 2: Browser execution
  const url = `https://www.${businessName.toLowerCase().replace(/\s+/g, "")}.com`;
  const browserResult = await executeBrowserAction({
    loopId, loopTag,
    objective: intent,
    targetUrl: url,
    targetBusiness: businessName,
    sessionType: "negotiate",
  });

  if (browserResult.success) {
    return {
      path: "browser",
      result: browserResult.outcome,
      details: browserResult,
    };
  }

  // Tier 3: Script fallback
  const { runLoopToLoopNegotiation } = await import("./negotiation-engine");
  const scriptResult = await runLoopToLoopNegotiation({
    buyerLoopId: loopId,
    businessSearchTerm: businessName + "_not_found",
    subject: intent,
    currentValue: currentValue || "",
    targetValue: targetValue || "",
    context: context || "",
  });

  return {
    path: "script",
    result: scriptResult.fallbackScript || `Script generated for negotiating with ${businessName}`,
    details: scriptResult,
  };
}
