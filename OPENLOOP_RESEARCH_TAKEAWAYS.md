# PART I-E — WHAT WE'RE TAKING FROM RESEARCH (Implement for Global)

What we **pick up** from Cash App, Moltbook, Lindy, and OpenClaw — and **what we implement** so we learn from them and build something global.

---

## From Cash App — Implement

| What they do | What we implement | Why it matters for global |
|-------------|-------------------|---------------------------|
| **$cashtag** = one memorable, shareable handle | **Loop tag** (e.g. loop/Ben, $loop/Ben): unique, user-chosen, 1–20 chars | People can say "my Loop is loop/Ben" in any language; no bank details, no opaque ID exposed. |
| **URL** cash.app/$tag | **URL** openloop.app/loop/Ben (or /$Ben) | One link to share; works everywhere; deep-link into app or web. |
| **QR code** = scan to pay you | **My Loop QR** = scan to open your Loop link (connect, schedule, pay) | No typing; works offline-to-online (show QR in person); same pattern globally. |
| **Rules:** unique, limited changes | **Loop tag:** unique at signup; allow **limited changes** (e.g. 1–2) so people can fix typos but can't squat-and-flip | Balance trust (stable identity) with real-world mistakes; avoid Moltbook's "never change" lock. |

**Bottom line:** We implement the full **shareable-identity** pattern: Loop tag + URL + QR. Cash App proved it for payments; we use it for "this is my Loop, interact with my Loop" (pay, schedule, connect, transact). Critical for viral and global.

---

## From Moltbook — Implement

| What they do | What we implement | Why it matters for global |
|-------------|-------------------|---------------------------|
| **"I'm a Human" / "I'm an Agent"** split at onboarding | **Clear split:** "I have a Loop" (person) vs "I'm a business / provider" (seller agent). Same product, different flows. | Global: individuals and businesses both onboard; we don't assume one type. |
| **Claim link + human verification** (e.g. tweet with code) | **Verify human owns the Loop:** claim link + verify via SMS, email, or (optional) social post. Audit trail: this Loop is tied to a real person. | Trust in the economy: counterparties know "verified human" Loops. Prevents pure bot farms. |
| **Username at signup, never change** | **Loop tag at signup;** we allow **limited changes** (see Cash App row) so we're not as rigid as Moltbook. | Global: people make typos, change names; we allow fixes without losing identity. |
| **Agent registry / directory** ("front page of the agent internet") | **Loop directory:** discoverable Loops by tag, category, or Trust Score. With our twist: **shareable Loop tag + economy** (not just "posts"). | Discovery + shareability: find Loops and connect via tag/URL/QR; then transact. |
| **Identity = verifiable credentials + karma/verification** | **Trust Score + "Verified human" badge.** Reputation (karma) = our Trust Score. Verification = we verified the human behind the Loop. | Global trust: one number (Trust Score) and one badge (verified); works in any language. |

**Bottom line:** We implement **human-verified agent identity** and a **directory** from Moltbook, but we add shareable Loop tag + URL + QR and we support **economy** (transact, pay, schedule), not just social/registry. We allow limited Loop tag changes so we're globally friendly.

---

## From Lindy — Implement

| What they do | What we implement | Why it matters for global |
|-------------|-------------------|---------------------------|
| **60-second setup, 7-day free trial** | **Fast onboarding:** 30–60 second signup; free tier (sandbox + one killer use case). No long forms. | Global: low friction in every market; mobile-first, minimal steps. |
| **Works where you are** (iMessage, chat) | **Loop reachable where people already are:** in-app first, then (when we can) WhatsApp, Telegram, SMS, etc. | Global: many users live in chat apps; we meet them there instead of forcing one app. |
| **Proactive:** "texts you before you ask" | **Loop does things while you sleep:** bills, refunds, scheduling, complaints. Proactive summaries and asks. | Same value prop globally: "your Loop fixes your shit" without you having to remember to ask. |
| **Integrations** (Gmail, Slack, calendar, etc.) | **Loop connects to life:** email, calendar, payments via APIs/Zapier so Loop can act on your behalf. | Global: same integration pattern; we add local services per region over time. |
| **No shareable public handle** | **We do better:** Loop tag + URL + QR so you can share "my Loop" with anyone. Lindy doesn't offer this. | Differentiator: "Share your Loop" like Cash App; Lindy stays private/invite-only. |

**Bottom line:** We implement **speed** (onboarding), **proactivity**, and **integrations** from Lindy, and we add **shareable Loop identity** (tag, URL, QR) so Loop is both personal and shareable globally.

---

## From OpenClaw — Implement and Avoid

| What they do | What we implement | What we avoid | Why it matters for global |
|-------------|-------------------|----------------|---------------------------|
| **Multi-channel** (WhatsApp, Telegram, Discord, iMessage) | **Loop on multiple surfaces:** app first, then (roadmap) chat channels so people can reach their Loop where they already talk. | — | Global: huge share of users are on WhatsApp, Telegram, etc.; we don't force one app. |
| **Identity = name, emoji, avatar** (IDENTITY.md) | **Loop personality:** display name + optional avatar/emoji so "your Loop" has a face. Backend still opaque ID. | — | Human feel in every culture; name/avatar are local, ID is global and safe. |
| **Self-hosted / "your data"** | **Trust narrative:** encryption, clear data policy, optional future self-host or data residency for enterprises. | We don't require self-host for consumers; we offer cloud-first with strong security. | Global: most users need simple cloud; power users and enterprises get options. |
| **Security failures** (credentials leaked, prompt injection) | **Security by design:** no credential exposure in logs/API; opaque agent ID; human verification; input validation. | We never expose credentials or use display name as identity in the protocol. | Trust is non-negotiable for global adoption; one breach kills us. |
| **Multi-agent routing / sessions** | **Architecture:** one Loop per user in v1; design so we can support multiple agents or roles later. | We don't overcomplicate v1; we ship one Loop, one tag, one QR. | Global: simple first; expand when we have usage and demand. |

**Bottom line:** We implement **multi-channel** and **identity/personality** from OpenClaw, and we **avoid** their security mistakes so we can scale globally without a single "OpenClaw-style" breach.

---

## How OpenClaw and Moltbook make money (they don't charge users)

| Source | OpenClaw / MoltBot | Moltbook |
|--------|--------------------|----------|
| **User fees?** | **No.** Fully open source (MIT). No subscriptions, no performance fees, no cut of user savings. Users pay their own LLM API costs (OpenAI, Anthropic, or local). | **No.** Free for humans (observe) and for agents. No freemium; platform was free. |
| **How they make money** | **Sponsors / donations.** ~$10K–$20K/month; sponsors (e.g. Path founder, Ben Tossell); some support from OpenAI. Money routed to dependencies/maintainers. Creator has said donations alone are unsustainable; project is not built around taking money from users. | **Token (MOLT).** Revenue from **trading fees on token transactions** (not from charging users for the product). Token utility: premium features, agent listing, community rewards, governance, staking. **Moltbook Ventures:** VC/DAO for agent-built businesses (on-chain). **Exit:** Meta acquired Moltbook (acqui-hire). |
| **Takeaway for OpenLoop** | Don't need payment rails from users. Revenue can be **sponsors, ecosystem support, enterprise/API** — not "we take a cut of your savings." | Revenue without charging people: **platform/token fees** (if we have a token), **advertising** (brands pay us to reach Loops), **enterprise/API**, **data/insights (B2B)**. Or **acquisition** as outcome. |

**Bottom line:** Neither takes money from end users. OpenClaw relies on sponsors/donations (and ecosystem); Moltbook used token trading fees + Ventures + acquisition. For OpenLoop: we can **avoid performance fees** (no taking a cut of user savings → no payment rails, no compliance burden from user payouts). Prefer: **advertising** (brands pay), **enterprise/API** (businesses pay), **data/insights** (B2B), **sponsors**, and optionally **token/trading fees** (platform economy, not user fees).

---

## Summary: What we're implementing for global

1. **From Cash App:** Loop tag + shareable URL + My Loop QR; memorable, shareable identity; limited tag changes.
2. **From Moltbook:** Human-verified Loop (claim + verify); Loop directory/discovery; Trust Score + "Verified human"; clear Human vs Business onboarding.
3. **From Lindy:** Fast onboarding; proactive Loop (does things while you sleep); integrations (email, calendar, etc.); we add shareable Loop (tag/URL/QR).
4. **From OpenClaw:** Multi-channel (Loop where people chat); name/emoji/avatar for personality; we avoid credential leaks and use opaque ID everywhere.

**What we do that they don't (for global):**

- **Full agent + economy.** We do **everything** OpenClaw and Moltbook-style agents can do (schedule, email, find deals, check email, multi-channel, proactive, directory) **plus** our economy layer (transact, Trust Score, marketplace, sandbox to real). You come to us for full agent capability, fully automated, and the economy is the differentiator they don't have. We are not just a financial product.
- **One shareable Loop** (tag + URL + QR) for both payments and coordination (Cash App has $tag for pay only; we have Loop for pay + schedule + connect + economy).
- **Economy layer** from day one; Moltbook is registry/social; we're registry + economy.
- **Human verification + Trust Score** in one product; we combine both. **Security and opaque ID** by design.

This is what we're picking from the research and what we're implementing to build something global.
