/**
 * OpenLoop Loop-to-Loop Negotiation Engine
 * 
 * This is the heart of the agent economy.
 * 
 * When Ben's Loop wants to lower his Comcast bill:
 * 1. Ben's Loop searches directory for @Comcast
 * 2. If found: opens a negotiation contract, sends offer
 * 3. Comcast's Loop receives, processes against its KB, counters or accepts
 * 4. Loops negotiate autonomously until deal or impasse
 * 5. Stripe settles the transaction
 * 6. Both trust scores update
 * 
 * If business Loop NOT found: fallback to script generation
 */

import { query } from "./db";
import { buildLoopPrompt } from "./loop-prompt";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const MAX_NEGOTIATION_ROUNDS = 5;

export interface NegotiationOffer {
  fromLoopId: string;
  toLoopId: string;
  subject: string;
  currentValue: string;   // e.g. "$127/month cable bill"
  targetValue: string;    // e.g. "$89/month"
  context: string;        // e.g. "5-year customer, never missed payment"
  contractId?: string;
}

export interface NegotiationResult {
  outcome: "deal" | "impasse" | "pending" | "no_business_loop";
  agreedValue?: string;
  contractId?: string;
  businessLoopTag?: string;
  fallbackScript?: string;
  rounds: NegotiationMessage[];
}

export interface NegotiationMessage {
  fromLoopId: string;
  fromTag: string;
  content: string;
  isOffer: boolean;
  timestamp: string;
}

// ── Find a business Loop by name or tag ──────────────────
export async function findBusinessLoop(query_: typeof query, searchTerm: string): Promise<{
  id: string;
  loop_tag: string;
  trust_score: number;
  persona: string;
} | null> {
  const clean = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Exact match first
  const exact = await query_<{ id: string; loop_tag: string; trust_score: number; persona: string }>(
    `SELECT id, loop_tag, trust_score, persona FROM loops 
     WHERE (lower(loop_tag) = $1 OR lower(loop_tag) = $2)
       AND is_business = true AND status = 'active' LIMIT 1`,
    [clean, searchTerm.toLowerCase()]
  ).catch(() => ({ rows: [] }));
  
  if (exact.rows.length > 0) return exact.rows[0];
  
  // Fuzzy match
  const fuzzy = await query_<{ id: string; loop_tag: string; trust_score: number; persona: string }>(
    `SELECT id, loop_tag, trust_score, persona FROM loops
     WHERE lower(loop_tag) LIKE $1
       AND is_business = true AND status = 'active'
     ORDER BY trust_score DESC LIMIT 1`,
    [`%${clean}%`]
  ).catch(() => ({ rows: [] }));
  
  return fuzzy.rows[0] || null;
}

// ── Generate a negotiation message using Cerebras ────────
async function generateNegotiationMessage(params: {
  role: "buyer" | "seller";
  loopTag: string;
  knowledgeBase: string;
  persona: string;
  trustScore: number;
  conversationHistory: NegotiationMessage[];
  subject: string;
  currentValue: string;
  targetValue: string;
  context: string;
  round: number;
}): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return params.role === "buyer" 
    ? `I represent ${params.loopTag}. We'd like to discuss ${params.subject}. Current rate: ${params.currentValue}. We're looking for ${params.targetValue}.`
    : `Thank you for reaching out about ${params.subject}. Let me review what we can offer.`;

  const systemPrompt = params.role === "buyer"
    ? `You are ${params.loopTag}, an AI agent negotiating on behalf of your owner.
You are negotiating: ${params.subject}
Current value: ${params.currentValue}
Target value: ${params.targetValue}
Context: ${params.context}

NEGOTIATION RULES:
- Be firm but professional. You represent your owner's best interests.
- Cite specific reasons for your ask (loyalty, market rates, competitor offers)
- If the other Loop makes a reasonable counter-offer, consider accepting
- After ${MAX_NEGOTIATION_ROUNDS} rounds, accept the best offer on the table
- Keep messages concise — 2-3 sentences max
- Always include a specific dollar amount or concrete ask in each message
- Round ${params.round} of ${MAX_NEGOTIATION_ROUNDS}`
    : `You are ${params.loopTag}, a Business Loop representing your company.
Your knowledge base: ${params.knowledgeBase || "Standard business policies apply."}
You are responding to a negotiation about: ${params.subject}

BUSINESS LOOP RULES:
- Respond professionally on behalf of your business
- You have authority to offer discounts within your knowledge base guidelines
- If no specific discount guidance exists, you can offer 10-20% for loyal customers
- Be helpful but protect your business interests
- Keep messages concise — 2-3 sentences max
- Always make a concrete counter-offer or acceptance
- Round ${params.round} of ${MAX_NEGOTIATION_ROUNDS}`;

  const history = params.conversationHistory.map(m => ({
    role: m.fromLoopId === "buyer" ? "user" : "assistant",
    content: `${m.fromTag}: ${m.content}`
  }));

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: params.role === "buyer" 
            ? `Continue negotiating. Round ${params.round}.`
            : `Respond to this negotiation. Round ${params.round}.` }
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || "I need to review this with my team.";
  } catch {
    return "Let me review this request and get back to you shortly.";
  }
}

// ── Detect if a deal was reached ─────────────────────────
function detectDealReached(messages: NegotiationMessage[]): { reached: boolean; agreedValue?: string } {
  const last = messages[messages.length - 1]?.content.toLowerCase() || "";
  const dealWords = ["accept", "agreed", "deal", "confirmed", "done", "approved", "yes", "happy to offer", "we can do"];
  const reached = dealWords.some(w => last.includes(w));
  
  if (reached) {
    // Extract dollar amount from the message
    const amounts = last.match(/\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:dollars|per month|\/mo|\/month)/gi);
    return { reached: true, agreedValue: amounts?.[0] || "agreed terms" };
  }
  return { reached: false };
}

// ── Main negotiation orchestrator ─────────────────────────
export async function runLoopToLoopNegotiation(params: {
  buyerLoopId: string;
  businessSearchTerm: string;
  subject: string;
  currentValue: string;
  targetValue: string;
  context: string;
}): Promise<NegotiationResult> {
  const { buyerLoopId, businessSearchTerm, subject, currentValue, targetValue, context } = params;

  // 1. Get buyer Loop info
  const buyerRes = await query<{ loop_tag: string; trust_score: number; persona: string }>(
    "SELECT loop_tag, trust_score, persona FROM loops WHERE id = $1", [buyerLoopId]
  );
  const buyer = buyerRes.rows[0];
  if (!buyer) return { outcome: "impasse", rounds: [], fallbackScript: "Buyer Loop not found." };

  // 2. Find the business Loop
  const businessLoop = await findBusinessLoop(query, businessSearchTerm);
  
  // 3. No business Loop found — generate fallback script
  if (!businessLoop) {
    const script = await generateFallbackScript({
      buyerTag: buyer.loop_tag,
      businessName: businessSearchTerm,
      subject,
      currentValue,
      targetValue,
      context,
    });
    return {
      outcome: "no_business_loop",
      rounds: [],
      fallbackScript: script,
    };
  }

  // 4. Get business Loop knowledge base
  const kbRes = await query<{ content: string }>(
    "SELECT content FROM loop_knowledge WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 10",
    [businessLoop.id]
  ).catch(() => ({ rows: [] }));
  const kb = kbRes.rows.map(r => r.content).join("\n");

  // 5. Create negotiation contract
  const contractRes = await query<{ id: string }>(
    `INSERT INTO loop_contracts 
       (buyer_loop_id, seller_loop_id, task, inputs, expected_output, reward_amount_cents, status)
     VALUES ($1, $2, $3, $4, $5, 0, 'negotiating') RETURNING id`,
    [
      buyerLoopId,
      businessLoop.id,
      `Negotiation: ${subject}`,
      JSON.stringify({ currentValue, targetValue, context }),
      `Agreement on ${subject} at ${targetValue}`,
    ]
  ).catch(() => ({ rows: [] }));
  const contractId = contractRes.rows[0]?.id;

  // 6. Log the initiation
  await query(
    `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
    [buyerLoopId, `🤝 Opening negotiation with @${businessLoop.loop_tag} about ${subject}. Current: ${currentValue} → Target: ${targetValue}`]
  ).catch(() => {});

  // 7. Run negotiation rounds
  const rounds: NegotiationMessage[] = [];
  let dealReached = false;
  let agreedValue = "";

  for (let round = 1; round <= MAX_NEGOTIATION_ROUNDS; round++) {
    // Buyer Loop speaks
    const buyerMessage = await generateNegotiationMessage({
      role: "buyer",
      loopTag: buyer.loop_tag,
      knowledgeBase: "",
      persona: buyer.persona,
      trustScore: buyer.trust_score,
      conversationHistory: rounds,
      subject, currentValue, targetValue, context,
      round,
    });

    rounds.push({
      fromLoopId: buyerLoopId,
      fromTag: `@${buyer.loop_tag}`,
      content: buyerMessage,
      isOffer: true,
      timestamp: new Date().toISOString(),
    });

    // Log buyer message
    await query(
      `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)`,
      [buyerLoopId, `[To @${businessLoop.loop_tag}] ${buyerMessage}`]
    ).catch(() => {});

    // Check if buyer accepted
    const buyerDeal = detectDealReached(rounds);
    if (buyerDeal.reached && round > 1) {
      dealReached = true;
      agreedValue = buyerDeal.agreedValue || targetValue;
      break;
    }

    // Business Loop responds
    const sellerMessage = await generateNegotiationMessage({
      role: "seller",
      loopTag: businessLoop.loop_tag,
      knowledgeBase: kb,
      persona: businessLoop.persona,
      trustScore: businessLoop.trust_score,
      conversationHistory: rounds,
      subject, currentValue, targetValue, context,
      round,
    });

    rounds.push({
      fromLoopId: businessLoop.id,
      fromTag: `@${businessLoop.loop_tag}`,
      content: sellerMessage,
      isOffer: false,
      timestamp: new Date().toISOString(),
    });

    // Log seller response to buyer's dashboard
    await query(
      `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
      [buyerLoopId, `[@${businessLoop.loop_tag} says] ${sellerMessage}`]
    ).catch(() => {});

    // Check if seller accepted / made a deal
    const sellerDeal = detectDealReached(rounds);
    if (sellerDeal.reached) {
      dealReached = true;
      agreedValue = sellerDeal.agreedValue || targetValue;
      break;
    }

    // Small delay between rounds
    await new Promise(r => setTimeout(r, 500));
  }

  // 8. Update contract status
  const finalStatus = dealReached ? "delivered" : "disputed";
  await query(
    `UPDATE loop_contracts SET status = $1, actual_output = $2, updated_at = now() WHERE id = $3`,
    [finalStatus, JSON.stringify({ rounds, agreedValue, dealReached }), contractId]
  ).catch(() => {});

  // 9. If deal reached — update trust scores and post to feed
  if (dealReached) {
    for (const loopId of [buyerLoopId, businessLoop.id]) {
      const lr = await query<{ trust_score: number }>("SELECT trust_score FROM loops WHERE id = $1", [loopId]);
      const prev = lr.rows[0]?.trust_score || 0;
      const newScore = Math.min(100, prev + 2);
      await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [newScore, loopId]);
    }
    await query(
      `INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'deal')`,
      [buyerLoopId, `@${buyer.loop_tag} negotiated with @${businessLoop.loop_tag} — ${subject}: ${currentValue} → ${agreedValue} ✓`]
    ).catch(() => {});

    // Notify buyer in chat
    await query(
      `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
      [buyerLoopId, `✅ Deal reached with @${businessLoop.loop_tag}! ${subject} agreed at ${agreedValue}. Your trust score has been updated. The deal has been logged to your Loop Wallet.`]
    ).catch(() => {});
  } else {
    await query(
      `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
      [buyerLoopId, `@${businessLoop.loop_tag} and I couldn't reach a deal after ${MAX_NEGOTIATION_ROUNDS} rounds. I'll try a different approach. Want me to escalate or try a different offer?`]
    ).catch(() => {});
  }

  return {
    outcome: dealReached ? "deal" : "impasse",
    agreedValue: dealReached ? agreedValue : undefined,
    contractId,
    businessLoopTag: businessLoop.loop_tag,
    rounds,
  };
}

// ── Fallback: generate script when no business Loop exists ──
async function generateFallbackScript(params: {
  buyerTag: string;
  businessName: string;
  subject: string;
  currentValue: string;
  targetValue: string;
  context: string;
}): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  const { buyerTag, businessName, subject, currentValue, targetValue, context } = params;

  if (!apiKey) {
    return `@${businessName} doesn't have a Loop yet. Here's your script:\n\nCall ${businessName} and say: "I've been a loyal customer and I'm currently paying ${currentValue}. I've seen offers for ${targetValue} elsewhere. Can you match that to keep my business?"\n\nWhen ${businessName} joins OpenLoop, your Loop will negotiate directly — no script needed.`;
  }

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "system",
          content: `You are ${buyerTag}, a personal AI agent. ${businessName} doesn't have an OpenLoop Loop yet, so you need to give your owner a script to use themselves. Generate a specific, persuasive negotiation script. Include: opening line, key leverage points, specific ask, and how to handle pushback. Keep it under 150 words.`
        }, {
          role: "user",
          content: `Subject: ${subject}\nCurrent: ${currentValue}\nTarget: ${targetValue}\nContext: ${context}\n\nGenerate the negotiation script.`
        }],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const script = data.choices?.[0]?.message?.content?.trim() || "";
    return `@${businessName} doesn't have a Loop yet — here's your script while we wait for them to join:\n\n${script}\n\n💡 Once ${businessName} claims their Loop, your Loop will negotiate directly — no script needed.`;
  } catch {
    return `@${businessName} isn't on OpenLoop yet. Your Loop will negotiate directly the moment they join. Until then: call them and say "I've been a loyal customer paying ${currentValue}. I'd like to stay but need ${targetValue} to make it work."`;
  }
}
