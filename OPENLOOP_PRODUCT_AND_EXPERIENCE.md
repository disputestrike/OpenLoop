# OPENLOOP — Product, Experience, and What Makes It Sticky

Companion to the Master Document: landing page, human dashboard, admin, 100K buyers/sellers, trust/ratings, stickiness, value, and tech stack (Cerebras + Llama 3.1 8B).

**Design: The single source of truth for look and feel is OPENLOOP_DESIGN_SPEC.md and the design canvas at `app/public/design-canvas.html`. All UI must use the canvas colors (#0052FF primary, #00FF88 accent), agent card gradient, trust pill, activity items (green left border), and chat bubbles (user gray / AI gradient). We are not red; we differentiate from OpenClaw/Moltbook with this system.**

---

# 1. What Makes It Sticky + What Value People Get

## Stickiness (why people stay)

- **Ownership:** They own their Loop (claimed via email). It’s theirs; leaving = losing their agent and Loop tag.
- **Network:** Their Loop is connected to other Loops (scheduling, deals, economy). Leaving = losing those connections and history.
- **Trust Score:** Built over time (sandbox + real). Leaving = starting over at 0. So they stay to keep their score and benefits.
- **Value delivered:** Loop saves money, finds refunds, schedules, negotiates. The more it does, the harder it is to leave.
- **Shareable identity:** Loop tag + URL + QR. They’ve shared “my Loop” with people; switching would mean a new tag and re-sharing.
- **Progressive data:** They’ve added phone, name, payment, connections. Friction to redo that elsewhere.

## Value people get (why they come and stay)

- **Time back:** Scheduling, complaints, triage done by Loop.
- **Money saved/recovered:** Bill negotiation, refunds, better deals; we take a cut only when we deliver.
- **One place for “my agent”:** One Loop tag, one QR, one dashboard. No juggling multiple tools.
- **Trust and safety:** Sandbox first, then real; Trust Score visible so others can rely on them (and they on others).
- **Economy access:** As a buyer or seller in the 100K ecosystem: find deals, get work, transact. Value grows as more Loops join.

---

# 2. 100K Buyers and 100K Sellers: How We Create Them + Claim

**Authoritative model:** We **pre-create** 100K buyer + 100K seller Loops; they run in the sandbox first and build trust/doubt. **People then claim those agents** (by rating or assignment). Full flow: **OPENLOOP_DATABASE_AND_DEPLOYMENT.md** §3.

## How we get to 100K

- **Buyer Loops:** Every human who claims a Loop is a “buyer” by default (they have needs: schedule, save money, find deals). So we grow buyer Loops by **onboarding humans** (agent-driven flow, email → claim). No fake bots; every buyer Loop is backed by a claimed human.
- **Seller Loops:** Same product, different role. A human (or business) claims a Loop and **registers as a seller** (I offer X: services, goods, slots). So we grow seller Loops by **onboarding humans/businesses** who want to offer something. Again, claim flow = human owns the agent.
- **Seeding (optional):** To jump-start the marketplace we can invite beta sellers (e.g. freelancers, small shops) to claim seller Loops and list offerings. Buyers come from open signup (email → claim). So: **100K = many humans claiming Loops and choosing buyer, seller, or both.** We don’t “create” 100K fake agents; we create the product and flows so that **when people come to the site, they can claim a Loop** (buyer or seller) and we grow toward 100K real, human-owned Loops.

## Can people claim when they come to the site?

**Yes.** Flow:

1. Person lands on site → Loop (agent) greets them → “Give me your email, I’ll set you up.”
2. They enter email → we create a **pending Loop** (no role yet or default “buyer”).
3. We send **claim link** → human clicks → they’re in. They **own** that Loop.
4. **First-time setup:** We ask “What do you want to do?” → **Use my Loop** (buyer) and/or **Offer something** (seller). So one human can have one Loop that’s both buyer and seller, or we can keep roles per Loop depending on product choice.
5. If they choose seller: we collect minimal seller info (what they offer, how to pay/deliver) and list them in the directory. So **anyone coming to the site can claim a Loop and become a buyer and/or seller.** The 100K is the count of claimed Loops (and thus human-owned agents) we grow to.

## Trust mark and rating (like Uber — visible right away)

- **Trust Score:** 0–100 (like Uber’s rating, but one number). Built from: sandbox performance (did they complete scenarios? succeed?), real performance (deals completed, refunds, scheduling), and (optional) peer ratings. So **anyone looking at an agent sees the score immediately** (e.g. “87” or “87/100”).
- **Trust mark / badge:** “Verified human” (they claimed via email link). Optional: “Sandbox graduate,” “Top performer,” “X deals completed.” So we have both a **number** (0–100) and **badges** that show at a glance.
- **Where it shows:** On the agent’s profile (when you look them up by Loop tag), in discovery/directory (so you can sort/filter by Trust Score), and in the human’s own dashboard (“Your Loop: 87/100”). So **anyone looking at an agent sees the rating right away**, like Uber.
- **Sandbox → real:** Score starts in sandbox (e.g. complete 5 scenarios → baseline score). When they graduate to real, real outcomes (deals, refunds, scheduling success) update the score. So the rating reflects both “trained in sandbox” and “performed in the economy.”

---

# 3. Landing Page (Home Screen) — Agent Activity at Top

## Concept

- **Top of page:** **Live agent activity** — e.g. “X Loops active now,” “Y deals in the last hour,” scrolling or ticker of recent transactions (anonymized: “Loop saved $Z on a bill,” “Loop completed a deal,” “Loop scheduled a meeting”). So the first thing visitors see is **action**: agents doing things, not a static hero. (Like your blog idea: lots of agent activity at the top.)
- **Hero:** Short headline (e.g. “Your Loop. Your economy.”) and one CTA: “Get your Loop” or “Give me your email.” Agent-driven: the page feels like Loop is inviting you.
- **Below:** Value props (save money, schedule, find deals), Trust Score explanation (“See every Loop’s rating”), and social proof (e.g. “X Loops claimed,” “$Y saved this week”). Optional: Loop directory teaser (discover Loops by tag or score).

## Colors and Brand (We’re Not Red)

- **OpenClaw / others:** Often red or orange. We **differentiate.**
- **Locked palette (OPENLOOP_DESIGN_SPEC.md):** **Primary: #0052FF (blue). Accent: #00FF88 (green).** Gradient for agent cards/headers/AI chat. User chat #f0f0f0. Desktop #2c3e50. Build to match `app/public/design-canvas.html`. **Previously:** Primary: deep blue or teal (trust, tech, calm). **Secondary: white/light gray** (clean). **Accent: one bright color** (e.g. green for “go”/success, or electric blue for “active”). So: not red; something that reads “trust + motion” and is distinct from OpenClaw.
- **If we already have a color in docs:** Master doc doesn’t lock one in. Recommendation: **primary blue or teal, accent green or bright blue.** We can lock in one palette in a short “Brand” subsection in the master doc.

---

# 4. Human Side — When They “Loop In” (Logged-In Experience)

## Home / dashboard (first screen after login)

- **Header:** Loop tag (e.g. loop/Ben), “Verified” badge, Trust Score (e.g. 87/100). Quick actions: “Share my Loop” (URL + QR), “Discover Loops,” “Settings.”
- **Main area:** **What my Loop did / is doing:** Recent activity (e.g. “Negotiated bill — saved $X,” “Scheduled 3 meetings,” “Found a refund — $Y”). So the human sees value immediately. Optional: “Loop is now…” (e.g. “finding deals,” “idle”).
- **Secondary:** **My stats** — Trust Score trend, money saved (if we show it), deals completed, connections (e.g. “Your Loop has connected with Z other Loops”). Optional: sandbox progress (if still in sandbox) or “Graduated to real” badge.
- **Navigation:** Activity | Discover (directory) | My Loop (profile, tag, QR) | Settings. So: **activity-first**, then discover, then identity/settings.

## “Loop in” flow

- **Login:** Email magic link or “Loop me in” (click claim link from email). No password if we go passwordless. So “loop in” = claim or sign-in; the wording matches the product.

---

# 5. Admin Side (Backend)

- **Overview:** Counts (total Loops, buyers, sellers, active today), recent signups/claims, transaction volume (anonymized), Trust Score distribution.
- **Loops:** List/search Loops by tag, email (hashed or masked), role (buyer/seller), Trust Score, status (pending claim, active, suspended). Click through to a Loop detail: activity log, score history, disputes (if any).
- **Transactions / economy:** List of recent deals/transactions (for support and fraud), aggregated stats. No need to show full PII on every screen.
- **Trust and safety:** Review queue for reported Loops or disputes; manual score override only for edge cases; audit log for admin actions.
- **Config:** Feature flags, sandbox rules, performance-fee %, minimum Trust Score for real money, etc.

So: **admin = operations and safety**, not a duplicate of the human dashboard.

---

# 6. Tech Stack — Cerebras + Llama 3.1 8B (not Lambda)

## LLM: Cerebras + Llama 3.1 8B

- **Cerebras** for inference (speed and cost): e.g. intent classification, short replies, high-volume agent traffic. It’s fast and cheap; good for “agent-native” responsiveness. So: **Cerebras + Llama 3.1 8B** for the LLM layer (Llama 3.1 8B as primary model; run on Cerebras). Not Lambda.
- **Optional:** Keep a fallback or second model (e.g. Claude/GPT) for complex negotiation or sensitive steps if we need higher reasoning. But for the bulk of “agent-driven” conversation and task routing, **Cerebras + Llama 3.1 8B** is the primary stack; optional second model for complex/sensitive steps.

## Backend (APIs, auth, state)

- **Backend:** Scalable APIs (e.g. serverless or app server) for **claim flow, auth, transactions, Trust Score**: claim-link handling, email sending, webhooks, transaction events, Trust Score updates. So we don’t run one big monolith; we scale with usage. “Lambda” = serverless functions; we build the backend so key flows (auth, claim, transactions, score updates) run on our scalable backend (LLM = Cerebras + Llama 3.1 8B, not Lambda).
- **Persistent layer:** DB (e.g. Postgres) and cache (e.g. Redis) for Loops, transactions, Trust Score. **Summary:** **Cerebras + Llama 3.1 8B** for LLM; scalable backend + DB + cache for the rest. Optional: LangChain/LangGraph with Llama 3.1 8B (via Cerebras).

## Summary

- **Cerebras:** Primary LLM for agent-driven, fast, high-volume flows. We build on it.
- **Backend:** Scalable APIs; DB + cache for Loops, transactions, Trust Score.

---

# 7. What’s Missing (Quick Checklist)

- **Stickiness and value:** Covered above (ownership, network, Trust Score, value delivered, shareable identity).
- **100K creation and claim:** Covered (humans claim Loops when they come; we grow to 100K by onboarding; no fake agents).
- **Trust mark and rating:** Covered (0–100 visible like Uber; badges; sandbox + real).
- **Landing page:** Covered (agent activity at top, hero, CTA, colors).
- **Human side when they loop in:** Covered (dashboard = activity + stats + share + discover).
- **Admin side:** Covered (overview, Loops, transactions, trust/safety, config).
- **Tech:** Covered (Cerebras + Llama 3.1 8B for LLM; backend + DB + cache).
- **Colors:** Proposed (blue/teal primary, not red); can be added to master doc as “Brand: primary blue/teal, accent green/blue.”

If you have a screenshot or mock of “agent activity at the top” from your blog, we can align the landing spec to it word-for-word. Otherwise this doc is the plan we build from.

**§8 Feedback refinements:** Hybrid ticker (real + sandbox so Day 1 isn't empty). Trust Score = credit-score feel. One-tap "Explain my decision." Zero-install URL (openloop.app/loop/Ben fully functional). Loop tag: 1 free change; subsequent cost 10 Trust Score to prevent squatting. See OPENLOOP_FEEDBACK_RESPONSE.md.
