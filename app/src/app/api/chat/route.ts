import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildLoopPrompt } from "@/lib/loop-prompt";
import { findBusinessLoop, runLoopToLoopNegotiation } from "@/lib/negotiation-engine";
import { checkRateLimitChat } from "@/lib/rate-limit";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 4000;

function parseIntent(message: string): {
  type: "negotiate" | "order" | "browse" | "find_loop" | "general";
  businessName?: string; subject?: string; currentValue?: string; targetValue?: string;
  orderType?: string; estimatedAmount?: number;
} {
  const lower = message.toLowerCase();

  // Order intent: "buy X", "order X", "book X", "cancel X subscription"
  const isOrder = /(?:buy|order|purchase|book|reserve|cancel|subscribe to|sign up for)\s+(?:me\s+)?(.{3,50})/i.test(message)
    || /(?:find|get)\s+(?:me\s+)?(?:the\s+)?(?:best|cheapest|lowest)\s+(?:price|deal|rate)\s+(?:for|on)\s+(.{3,40})/i.test(message);

  if (isOrder) {
    const bizMatch = message.match(/(?:on|from|at|with|via)\s+(\w+(?:\s+\w+)?)/i);
    const orderTypeMatch = /^(?:buy|order|purchase)/i.test(message) ? "purchase"
      : /^(?:book|reserve)/i.test(message) ? "booking"
      : /^cancel/i.test(message) ? "cancellation"
      : "purchase";
    const amountMatch = message.match(/\$[\d,]+(?:\.\d{2})?/);
    return {
      type: "order",
      businessName: bizMatch?.[1] || "",
      subject: message.slice(0, 80),
      orderType: orderTypeMatch,
      estimatedAmount: amountMatch ? parseFloat(amountMatch[0].replace(/[$,]/g, "")) * 100 : 0,
    };
  }

  // Browse intent: "check X", "look up X on Y", "find X price on Y"
  const isBrowse = /(?:check|look up|search|find|browse|visit|go to)\s+(?:the\s+)?(?:\w+\.com|.{3,40})\s+(?:for|and|to)/i.test(message)
    || /what(?:'s| is)\s+(?:the\s+)?(?:price|cost|rate|deal)\s+(?:of|for|on)\s+(.{3,50})/i.test(message);

  if (isBrowse) {
    const urlMatch = message.match(/(\w+\.com)/i);
    const bizMatch = message.match(/(?:on|at|from)\s+(\w+(?:\s+\w+)?)/i);
    return { type: "browse", businessName: urlMatch?.[1] || bizMatch?.[1] || "", subject: message.slice(0, 80) };
  }

  // Negotiate intent
  const isNeg = /(?:lower|reduce|negotiate|cut|decrease|get.*better.*(?:rate|deal|price)|save.*on|talk to|contact.*about)\s+(?:my\s+)?(?:.*?)(?:bill|rate|subscription|plan|payment|loop)/i.test(message)
    || /negotiate\s+(?:with\s+)?@?(\w+)/i.test(message);

  if (isNeg) {
    const biz = message.match(/(?:my\s+)?(\w+(?:cast|t&t|flix|tel|mobile|wireless|insurance|bank|energy|electric|gas|water|gym|spotify|apple|amazon|google|microsoft|comcast|netflix|hulu|verizon|tmobile|att))/i)?.[1]
      || message.match(/(?:talk to|contact|message|negotiate with)\s+@?(\w+)/i)?.[1]
      || message.match(/(\w+)\s+bill/i)?.[1] || "";
    const amounts = message.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    const subj = message.match(/(?:my\s+)?(\w+\s+(?:bill|rate|subscription|plan|service))/i)?.[1] || (biz ? `${biz} bill` : "service");
    return { type: "negotiate", businessName: biz, subject: subj, currentValue: amounts[0]||"", targetValue: amounts[1]||"" };
  }

  const findM = message.match(/(?:find|search for|look up|is)\s+@?(\w+)\s+(?:on openloop|loop)?/i) || message.match(/@(\w+)/);
  if (findM) return { type: "find_loop", businessName: findM[1] };
  return { type: "general" };
}

export async function POST(req: NextRequest) {
  if (checkRateLimitChat(req)) {
    return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
  }
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const userMessage = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : null;
  if (!userMessage) return NextResponse.json({ error: "message required" }, { status: 400 });
  const { loopId } = session;

  const [loopRes, historyRes, kbRes, memoryRes] = await Promise.all([
    query<{ loop_tag:string; persona:string; skill_tier:number; trust_score:number }>("SELECT loop_tag, persona, skill_tier, trust_score FROM loops WHERE id = $1", [loopId]),
    query<{ role:string; content:string }>("SELECT role, content FROM chat_messages WHERE loop_id = $1 ORDER BY created_at DESC LIMIT $2", [loopId, MAX_HISTORY]),
    query<{ content:string }>("SELECT content FROM loop_knowledge WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 10", [loopId]),
    query<{ memory_type:string; content:string }>("SELECT memory_type, content FROM loop_memory WHERE loop_id = $1 ORDER BY updated_at DESC LIMIT 8", [loopId]),
  ]);

  const loop = loopRes.rows[0];
  const history = historyRes.rows.reverse();
  const kb = kbRes.rows.map(r => r.content).join("\n");
  const memory = memoryRes.rows.map(r => `[${r.memory_type}] ${r.content}`).join("\n");

  await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)", [loopId, userMessage]);

  const intent = parseIntent(userMessage);

  // Loop search
  if (intent.type === "find_loop" && intent.businessName) {
    const found = await findBusinessLoop(query, intent.businessName);
    const reply = found
      ? `✅ @${found.loop_tag} is on OpenLoop (Trust: ${found.trust_score}%). I can negotiate directly with their Loop — tell me what you need.`
      : `@${intent.businessName} hasn't joined OpenLoop yet. When they do, I'll negotiate directly. Tell me what you want to negotiate and I'll give you a script.`;
    await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [loopId, reply]);
    return NextResponse.json({ reply, intent: "find_loop" });
  }

  // Order intent — three-tier: L2L → browser → script
  if (intent.type === "order" && intent.businessName && (loop?.skill_tier||0) >= 2) {
    const { parseActionIntent, executeBrowserAction, checkAuthorization } = await import("@/lib/browser-engine");
    const businessLoop = await findBusinessLoop(query, intent.businessName);

    if (businessLoop) {
      // Tier 1: Loop-to-Loop
      const negResult = await runLoopToLoopNegotiation({
        buyerLoopId: loopId, businessSearchTerm: intent.businessName,
        subject: intent.subject || `${intent.businessName} order`,
        currentValue: intent.currentValue || "", targetValue: intent.targetValue || "",
        context: kb.slice(0, 200),
      });
      const reply = `🤝 [Tier 1 — Loop-to-Loop] ${negResult.outcome === "deal" ? `Deal: ${negResult.agreedValue}` : negResult.fallbackScript || "Impasse — trying another approach"}`;
      return NextResponse.json({ reply, intent: "order", tier: 1 });
    }

    // Tier 2: Browser execution
    const browserAction = parseActionIntent(userMessage);
    if (browserAction) {
      const auth = await checkAuthorization({ loopId, estimatedCostCents: browserAction.estimatedCostCents, actionType: browserAction.type });
      if (!auth.authorized) {
        const reply = `⚠️ ${auth.reason}`;
        await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [loopId, reply]);
        return NextResponse.json({ reply, intent: "order", requiresSetup: true });
      }
      const result = await executeBrowserAction({ loopId, action: browserAction });
      const reply = result.requiresApproval
        ? `🌐 [Tier 2 — Browser] ${result.outcome}\n\nApprove in your dashboard to execute.`
        : result.success ? `🌐 [Tier 2 — Browser] ✅ ${result.outcome}` : `📋 [Tier 3 — Script] ${result.outcome}`;
      return NextResponse.json({ reply, intent: "order", tier: result.success ? 2 : 3, requiresApproval: result.requiresApproval, executionId: result.executionId });
    }

    // Tier 3: Script fallback
    const reply = `📋 [Tier 3 — Script] @${intent.businessName} isn't on OpenLoop and the browser couldn't complete this. Here's exactly what to do: ${intent.subject || userMessage}`;
    return NextResponse.json({ reply, intent: "order", tier: 3 });
  }

  // Negotiation — three-tier
  if (intent.type === "negotiate" && intent.businessName && (loop?.skill_tier||0) >= 1) {
    const negResult = await runLoopToLoopNegotiation({
      buyerLoopId: loopId,
      businessSearchTerm: intent.businessName,
      subject: intent.subject || `${intent.businessName} bill`,
      currentValue: intent.currentValue || "current rate",
      targetValue: intent.targetValue || "a better rate",
      context: kb ? `Customer context: ${kb.slice(0,200)}` : "Loyal customer seeking better rate",
    });
    const reply = negResult.outcome === "deal"
      ? `✅ Done! Negotiated with @${negResult.businessLoopTag} — got you ${negResult.agreedValue}. Saved to your Loop Wallet.`
      : negResult.outcome === "no_business_loop"
      ? `@${intent.businessName} isn't on OpenLoop yet.\n\n${negResult.fallbackScript}`
      : `Negotiated ${negResult.rounds.length} rounds with @${negResult.businessLoopTag} — hit an impasse. Want me to try a different approach?`;
    return NextResponse.json({ reply, intent: "negotiate", negotiationResult: { outcome: negResult.outcome, agreedValue: negResult.agreedValue, businessLoopTag: negResult.businessLoopTag, rounds: negResult.rounds.length } });
  }

  // General Cerebras chat
  const systemPrompt = buildLoopPrompt({ persona: loop?.persona, loopTag: loop?.loop_tag, trustScore: loop?.trust_score, skillTier: loop?.skill_tier, knowledgeBase: kb, recentMemory: memory, channel: "web" })
    + `\n\nNEGOTIATION AWARENESS: When user mentions bills or businesses, check if that business has an OpenLoop Loop. If yes, negotiate Loop-to-Loop. If no, generate a script. You can also search for any Loop by saying what business they want to deal with.`;

  // Rotate across all 5 Cerebras keys — round-robin with 429 fallback
  const _allKeys = [
    process.env.CEREBRAS_API_KEY,
    process.env.CEREBRAS_API_KEY_2,
    process.env.CEREBRAS_API_KEY_3,
    process.env.CEREBRAS_API_KEY_4,
    process.env.CEREBRAS_API_KEY_5,
  ].filter((k): k is string => !!k && k.trim().length > 0);

  let assistantContent: string;
  if (_allKeys.length) {
    let chatRes: Response | null = null;
    for (const apiKey of _allKeys) {
      try {
        chatRes = await fetch(CEREBRAS_URL, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`}, body: JSON.stringify({ model:MODEL, messages:[{role:"system",content:systemPrompt},...history.map(r=>({role:r.role,content:r.content})),{role:"user",content:userMessage}], stream:false, max_tokens:1024, temperature:0.7 }) });
        if (chatRes.status !== 429) break; // success or non-rate-limit error — stop rotating
      } catch { chatRes = null; }
    }
    if (chatRes && chatRes.ok) {
      const data = await chatRes.json() as {choices?:Array<{message?:{content?:string}}>};
      assistantContent = data.choices?.[0]?.message?.content?.trim()??"Can you rephrase that?";
    } else {
      assistantContent = "Temporary connection issue. Try again in a moment.";
    }
  } else {
    assistantContent = `I'm ${loop?.loop_tag||"your Loop"}. Add CEREBRAS_API_KEY to Railway Variables to enable AI responses.`;
  }

  const logRes = await query<{id:string}>("INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'chat', $2, $3, 'openloop_app') RETURNING id", [loopId, userMessage, assistantContent.slice(0,8000)]).catch(()=>({rows:[]}));
  const interactionId = logRes.rows[0]?.id ?? null;
  await query("INSERT INTO chat_messages (loop_id, role, content, llm_interaction_id) VALUES ($1, 'assistant', $2, $3)", [loopId, assistantContent, interactionId]);
  extractAndSaveMemory(loopId, userMessage, assistantContent).catch(()=>{});
  return NextResponse.json({ reply: assistantContent, interactionId: interactionId??undefined });
}

async function extractAndSaveMemory(loopId:string, userMsg:string, assistantMsg:string) {
  const combined = `${userMsg} ${assistantMsg}`.toLowerCase();
  const prefMatches = Array.from(combined.matchAll(/i (prefer|like|hate|want|need) (.{3,50})/gi));
  for (const m of prefMatches) {
    await query("INSERT INTO loop_memory (loop_id, memory_type, content, source) VALUES ($1, 'preference', $2, 'chat')", [loopId, m[0].slice(0,200)]).catch(()=>{});
  }
  const factMatches = Array.from(combined.matchAll(/my (\w+) (bill|payment|plan) is \$?[\d.]+/gi));
  for (const m of factMatches) {
    await query("INSERT INTO loop_memory (loop_id, memory_type, content, source) VALUES ($1, 'fact', $2, 'chat')", [loopId, m[0].slice(0,200)]).catch(()=>{});
  }
}
