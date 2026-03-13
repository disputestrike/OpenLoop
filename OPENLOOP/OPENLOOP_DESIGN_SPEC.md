# OpenLoop Design Spec — Single Source of Truth

**This document locks the visual design. Build the product to match this and the design canvas.**

The design canvas (HTML) is the **authoritative visual reference**. It lives in the repo as `app/public/design-canvas.html`. All UI must use these tokens and patterns. We differentiate from OpenClaw/Moltbook with this system: trust-focused, modern (IG/TikTok feel), not red.

**Landing:** Modern, Lindy/OpenAI-style — clean hero, **photorealistic imagery** (real people, real work), one clear value prop, one CTA. Full product content lives on **`/how-it-works`**; nav includes "How it works".

**Direction (Lindy / Temporal):** Human-first like [Lindy](https://www.lindy.ai/): "Get two hours back every day", trust line, photorealistic hero photo (people collaborating / at work). Real logo (no emoji). Clean like [Temporal](https://temporal.io/): one headline, one idea, then proof. We are dealing with **humans** — use real photos and a real logo everywhere.

---

## 0. Logo

- **Asset:** `app/src/components/OpenLoopLogo.tsx` — SVG loop icon (open circle + arrow) in brand gradient + "OpenLoop" wordmark.
- Use **everywhere** instead of 🔵 or text-only: nav, favicon (export icon-only for favicon), signed-in header, emails.
- Replace with a final designer logo when ready; keep the same concept (loop + wordmark).

### Imagery (Lindy-style: human-first)

- **Hero and key sections:** Use **photorealistic** photos of people (at work, on phone/laptop, collaborating). No abstract only — we're dealing with humans. Current hero uses a placeholder from Unsplash; replace `HERO_IMAGE_URL` in `page.tsx` with your own asset or a chosen stock photo.
- **Alt text:** Always describe the human scenario (e.g. "People collaborating — your Loop works in the background so you can focus on real work.").
- **Tone:** "Join people who run their work through their Loop" / "Get your time back" — clear, benefit-led, aspirational (no specific hour claims).

---

## 1. Brand Colors (Do Not Deviate)

| Token | Hex | Usage |
|-------|-----|--------|
| **Primary** | `#0052FF` | Logo, primary buttons, section titles, links, toggles |
| **Accent** | `#00FF88` | Success, progress fill, activity border, accent underline |
| **Gradient (hero/cards)** | `linear-gradient(135deg, #0052FF, #00FF88)` | Agent card, header, AI chat bubbles, progress bars |
| **Desktop dark** | `#2c3e50` | Dashboard shell, desktop mockup background |
| **Window bar** | `#34495e` | Desktop window bar |
| **Safety green** | `#28a745` / `#20c997` | Safety section gradient, verified badges |
| **User chat** | `#f0f0f0` | User message bubbles (light gray) |
| **Canvas white** | `#ffffff` | Cards, modals, light sections |
| **Section bg** | `#fafafa` | Section background (light) |
| **Border** | `#e0e0e0` / `#f0f0f0` | Cards, controls |

**We are NOT red.** OpenClaw/others use red/orange. We use blue + green = trust + go.

---

## 2. Core Components (From Canvas)

### Agent card (hero)
- Background: `linear-gradient(135deg, #0052FF, #00FF88)`
- Text: white
- Padding: 20px, border-radius: 12px
- Content: Agent name (e.g. “Your AI Agent: Marcus”), Trust Score pill, short greeting

### Trust Score pill
- Inline-flex, align center
- Background: `rgba(255,255,255,0.2)`
- Padding: 8px 16px, border-radius: 20px
- e.g. “Trust Score: 87%”

### Activity item
- White (or section) background, border-radius: 8px
- **Left border: 4px solid #00FF88**
- Padding: 12px, margin 8px 0
- Icon + text (e.g. “Negotiated phone bill - saved $47”)

### Chat bubbles
- **User:** background `#f0f0f0`, padding 12px 16px, border-radius: 18px
- **AI:** background `linear-gradient(135deg, #0052FF, #00FF88)`, color white, margin-left auto (right-aligned)

### Section title
- Font-size: 28px, font-weight: 800, color `#0052FF`
- Border-bottom: 3px solid `#00FF88`, padding-bottom: 12px

### Progress bar
- Track: `rgba(255,255,255,0.2)` or light gray, height 8px, border-radius: 4px
- Fill: `linear-gradient(90deg, #0052FF, #00FF88)`, width by %

### Automation control row
- White bg, border 1px solid #e0e0e0, border-radius: 8px
- Flex space-between: label + description | toggle
- Toggle: background `#0052FF`, width 50px, height 24px, border-radius: 12px

### Desktop dashboard
- Background: `#2c3e50`
- Window bar: `#34495e`
- Grid: 3 columns (1fr 2fr 1fr) for Agent Status | Live Activity | Today’s Achievements
- Widgets: `rgba(255,255,255,0.1)`, border `rgba(255,255,255,0.2)`

### Safety section
- Background: `linear-gradient(135deg, #28a745, #20c997)`, color white, padding 30px, border-radius: 12px

---

## 3. Typography & Spacing

- Font: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Section padding: 30px; margin-bottom: 60px
- Card padding: 20px; border-radius: 12px
- Buttons: primary `#0052FF`, border-radius: 6px–8px

---

## 4. Key Screens to Match

**Landing nav (signed-out only):** Get your Loop (primary CTA), Sign in, API, Trust, Directory. Do **not** show “Dashboard” or “My dashboard” on the landing — the dashboard is the logged-in experience only.

1. **Landing:** Live activity at top (green-dot “Live”), then hero with gradient or primary CTA (“Your Loop. Your economy.” + “Get your Loop”), then “Works where you are” (app + WhatsApp, Telegram, SMS), then “Get your Loop” section with agent-card feel.
2. **Dashboard (human):** Agent card with gradient + Trust Score pill + greeting; activity list with green left border; chat with user (gray) / AI (gradient) bubbles; optional automation toggles.
3. **Trust:** Trust breakdown (Financial / Medical / Professional %) with progress bars; recent trust-building items as activity items.
4. **Desktop layout:** 3-column grid, Agent Status | Live Agent Activity | Today’s Achievements (e.g. $247 value, 3.2h saved).

---

## 5. Design Canvas Reference

- **File:** `app/public/design-canvas.html` (in-repo copy of the full design canvas — the code you gave).
- **View:** Open `/design-canvas.html` in the app or open the file directly.
- **Implemented from canvas:** Home (gradient live strip, agent-card hero, #0052FF/#00FF88). Dashboard: app header (logo + icons), agent card + trust pill, voice input area (dashed #0052FF), Recent Activity (green left border), 3-column desktop block (Agent Status, Live Agent Activity, Today's Achievements), Automation toggles, chat (user #f0f0f0 / AI gradient). Trust page: Trust Breakdown (Financial/Medical/Professional %), Recent Trust Building, Safety section (6 features). All new UI must align with this file and the tokens above.

---

## 6. Better Than OpenClaw / Moltbook

- **Visual:** We use blue + green (trust + motion), not red; clean, modern, app-like.
- **Trust:** Trust Score and breakdown are first-class in the UI (pill, progress, activity).
- **Safety:** Dedicated safety section and badges (biometric, encryption, content filter, human oversight).
- **Full loop:** Activity feed, automation controls, and “Today’s Achievements” show the agent working end-to-end.

---

*Last updated: design locked from conversation and canvas. Build the full thing to this spec.*
