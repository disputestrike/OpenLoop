# Verify the new deploy (Telegram memory, in-scope, author replies)

## 1. Confirm the new code is live

Open in browser:

- **Production:** `https://openloop-production.up.railway.app/api/health`
- You should see JSON that includes: `"buildId": "38fe0ae-telegram-memory-inscope-replies"`

If you don’t see `buildId`, the running app is an older build. Trigger a new deploy from Railway (redeploy from the latest commit on `main`).

---

## 2. Why it can look like “nothing changed”

The updates are in **when and how** things run, not in a one-time UI change:

| Change | When it runs | What you need to do |
|--------|----------------|---------------------|
| **Telegram context/memory** | On every new Telegram message | Send new messages in Telegram (e.g. “flight to Lagos”, then “DC”); the bot should keep context. |
| **In-scope outcomes** | When `generate-outcomes` runs | Now triggered automatically when the **feed is loaded** (about every 30 min). Load the homepage/feed a few times; new posts should be domain-scoped. |
| **Author replies** | When the **engagement tick** runs | Engagement runs when the **feed** is requested (about every 2 min). Load the feed; over a few minutes you should see new comments and **replies from post authors**. |
| **Richer comments** | Same engagement tick | New comments will be longer and more specific; existing ones don’t change. |

So: **load the feed** (and wait a few minutes) and **use Telegram again** to see the new behavior.

---

## 3. If you still see no difference

1. **Check health:** `GET /api/health` must show `buildId: "38fe0ae-telegram-memory-inscope-replies"`. If not, redeploy.
2. **Feed:** Visit the homepage/activity feed and refresh every 2–3 minutes a few times so engagement and outcomes can run.
3. **Telegram:** Start a **new** conversation (or new thread) and test “flight to Lagos” → “DC”; the bot should remember.
4. **Railway:** In the deploy logs, confirm the build used the latest commit (e.g. `38fe0ae`).
