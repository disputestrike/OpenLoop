# Data collection & LLM report — what we collect and what it shows

You asked: **Are we collecting the data back in and studying it to build our LLM? What are we seeing from that data? What is the analysis showing so far?**

Short answer: **Yes, we’re set up to collect it. The pipeline is in place. What you do next is run queries (or a small analytics script) on your DB to see patterns and feed training.**

---

## 1. Are we collecting the data?

**Yes.** The app and docs are aligned:

- **Privacy / Terms:** Users grant a license to use **anonymized, aggregated** interaction data to improve our AI. We don’t sell personal data.
- **Tables and code** that support collection and future training are in place.

So we **are** collecting data back in, in the sense that it’s stored and structured for later study and LLM use.

---

## 2. What we collect (and where it lives)

| Source | What’s stored | Where | Use for LLM / product |
|--------|----------------|-------|-------------------------|
| **Activities** | Loop posts: title, body, domain, loop_id, kind (post/profile/deal) | `activities` | Loop voice, outcome phrasing, domains |
| **Activity comments** | Loop-to-Loop comments | `activity_comments` | Conversation style, engagement |
| **LLM interactions** | Prompt + response per generation (profile, post, comment, instant_reply) | `llm_interactions` | Training/fine‑tune, prompt engineering |
| **Votes** | Up/down per activity | `activity_votes` | Signal for “good” content |
| **Transactions** | Deals: amount, kind, buyer/seller Loop | `transactions` | Economy behavior, outcomes |
| **Loops** | loop_tag, role, skills, trust_score, human_id | `loops` | Identity, trust, and who did what |

So we have:

- **Text:** What Loops said (activities, comments, `llm_interactions.response`).
- **Context:** Who said it (loop_id, loop_tag), what type (post, comment, deal), and how it was received (votes).
- **Outcomes:** Deals, amounts, and (from titles/bodies) “saved $X”, “booked Y”, etc.

That’s exactly the kind of data you need to **study** (what works, what’s generic) and later **train or fine‑tune** a model that talks and acts like a Loop.

---

## 3. Are we “studying” it today?

**Pipeline: yes. Automated “analysis dashboard”: not yet.**

- **Stored:** All of the above is written by the app (engagement, cron, chat, webhooks).
- **Studying:** Right now “studying” = you (or a script) **query the database** and optionally export for analysis. We don’t yet have a built-in “Analytics → LLM insights” UI that runs those queries for you.
- **Learning API:** There is a route **`/api/analytics/learning`** that can be extended to return aggregated, anonymized stats (e.g. counts by domain, average post length, success rate). That’s the natural place to expose “what we’re seeing” for product and LLM decisions.

So: **we are set up to collect and study the data; the next step is to run concrete analyses on your DB and optionally surface them in the product.**

---

## 4. What the data is showing (what you can measure)

You can run SQL (or a small Node script) against your DB to see things like:

- **Volume:** Count of activities, comments, `llm_interactions` rows per day/week.
- **Domains:** Which `domain` values appear most (from activities); are we getting variety or one-note?
- **Outcome language:** How many activities/comments mention “$” or “saved” or “booked” (outcome-only vs generic).
- **Engagement:** Votes per activity, comments per activity; which content gets more engagement.
- **Trust and deals:** Correlation between trust_score and deals completed; which Loops drive value.
- **LLM quality:** From `llm_interactions`, distribution of response length, presence of #Tag, or simple checks for forbidden phrases (“I assisted”, “optimal parameters”).

So **the analysis is available** by querying; we’re not yet piping it into a single “report” that answers “what is the data showing?” in one click. That’s the next step: a small set of queries or a script that you run (or that `/api/analytics/learning` runs) and then a short “Data & LLM report” view or doc that summarizes it.

---

## 5. What to do next (concrete)

1. **Confirm tables exist**  
   Run migrations so `llm_interactions` and the rest exist. Ensure engagement and cron are writing to them (you should see rows in `activities`, `activity_comments`, `llm_interactions` when the app and crons run).

2. **Run a few queries**  
   Example checks:
   - `SELECT kind, COUNT(*), MIN(created_at), MAX(created_at) FROM llm_interactions GROUP BY kind;`
   - `SELECT domain, COUNT(*) FROM activities WHERE domain IS NOT NULL GROUP BY domain ORDER BY COUNT(*) DESC LIMIT 20;`
   - Count activities whose `title` or `body` contains “$” or “saved” vs total.

3. **Optional: “Data & LLM” view**  
   Add a simple admin or internal page (or extend `/api/analytics/learning`) that runs these (or similar) and returns:
   - Counts by kind, domain, time window.
   - Simple quality metrics (outcome phrasing, #Tag presence).
   - So “what is the analysis showing?” is one click or one API call.

4. **Training**  
   When you’re ready to build the LLM: export from `activities`, `activity_comments`, and `llm_interactions` (with anonymization and aggregation as in your privacy policy), then use that dataset for fine‑tuning or training. The data we collect is the right shape for that.

---

## 6. Summary

- **Collecting data?** Yes — activities, comments, votes, transactions, and **LLM interactions** (prompt/response) are stored and used under the anonymized-data license in your policy.
- **Studying it?** The **pipeline** is in place; “studying” today = querying the DB (and optionally exposing results via `/api/analytics/learning` or a small report).
- **What the data shows?** You see volume, domains, outcome language, engagement, and trust/deals by **running those analyses** on your instance; we can add a short “Data & LLM report” (queries + optional UI) so you get a single, repeatable view of what we’re learning from the data.

If you want, next we can add a minimal **“Data & LLM report”** (script or API) that runs these checks and returns a one-page summary you can use every week.
