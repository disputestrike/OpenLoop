import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const TRUST_BONUSES: Record<number, number> = {
  1: 5,   // Named Loop
  2: 5,   // Chose persona
  3: 10,  // Enabled skills
  4: 10,  // Built knowledge base
  5: 20,  // Set limits + completed
};

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { step, data } = await req.json();
  const { loopId } = session;

  try {
    switch (step) {
      case 1: {
        // Save loop tag
        const { loopTag } = data;
        if (!loopTag?.trim()) return NextResponse.json({ error: "Loop tag required" }, { status: 400 });
        const clean = loopTag.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
        // Check uniqueness
        const existing = await query("SELECT id FROM loops WHERE loop_tag = $1 AND id != $2", [clean, loopId]);
        if (existing.rows.length > 0) return NextResponse.json({ error: "That name is taken — try another" }, { status: 400 });
        await query("UPDATE loops SET loop_tag = $1, updated_at = now() WHERE id = $2", [clean, loopId]);
        break;
      }

      case 2: {
        // Save persona
        const { persona } = data;
        const valid = ["personal", "buyer", "seller", "business", "general"];
        if (!valid.includes(persona)) return NextResponse.json({ error: "Invalid persona" }, { status: 400 });
        await query(
          "UPDATE loops SET persona = $1, is_business = $2, updated_at = now() WHERE id = $3",
          [persona, persona === "business", loopId]
        );
        break;
      }

      case 3: {
        // Save skills — log each enabled skill as a permission event
        const { skills } = data;
        const tierMap: Record<string, number> = {
          chat: 0, pr: 0, negotiate: 1, research: 1, buy: 2, dispute: 2, accounts: 3, sell: 3,
        };
        const maxTier = Math.max(0, ...Object.entries(skills)
          .filter(([, v]) => v)
          .map(([k]) => tierMap[k] ?? 0));

        await query("UPDATE loops SET skill_tier = $1, updated_at = now() WHERE id = $2", [maxTier, loopId]);
        // Log consent
        await query(
          "INSERT INTO loop_permissions (loop_id, tier, consent_text) VALUES ($1, $2, $3)",
          [loopId, maxTier, `User enabled skills: ${Object.entries(skills).filter(([,v])=>v).map(([k])=>k).join(", ")}`]
        );
        break;
      }

      case 4: {
        // Save knowledge base
        const { kb } = data;
        const entries = Object.entries(kb).filter(([, v]) => typeof v === "string" && (v as string).trim());
        for (const [key, value] of entries) {
          const content = `${key}: ${(value as string).trim()}`;
          await query(
            "INSERT INTO loop_knowledge (loop_id, content, source) VALUES ($1, $2, 'onboarding')",
            [loopId, content]
          );
        }
        break;
      }

      case 5: {
        // Save limits + complete onboarding
        const { spendLimitCents, notifyEmail, notifySms } = data;
        await query(
          "UPDATE loops SET spending_limit_cents = $1, onboarding_complete = true, updated_at = now() WHERE id = $2",
          [spendLimitCents || 0, loopId]
        );
        // Save notification prefs
        for (const [channel, enabled] of [["email", notifyEmail], ["sms", notifySms]]) {
          await query(
            `INSERT INTO loop_notifications (loop_id, notification_type, channel, enabled)
             VALUES ($1, 'win', $2, $3), ($1, 'deal', $2, $3), ($1, 'alert', $2, $3)
             ON CONFLICT DO NOTHING`,
            [loopId, channel, enabled]
          ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    // Award trust bonus for this step
    const bonus = TRUST_BONUSES[step] || 0;
    if (bonus > 0) {
      const loopRes = await query<{ trust_score: number }>(
        "SELECT trust_score FROM loops WHERE id = $1", [loopId]
      );
      const prev = loopRes.rows[0]?.trust_score ?? 0;
      const newScore = Math.min(100, prev + bonus);
      await query("UPDATE loops SET trust_score = $1, onboarding_trust_bonus = onboarding_trust_bonus + $2, updated_at = now() WHERE id = $3",
        [newScore, bonus, loopId]);
      await query(
        "INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason) VALUES ($1, $2, $3, 'onboarding_step')",
        [loopId, prev, newScore]
      ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    }

    return NextResponse.json({ ok: true, step, trustBonusAwarded: bonus });

  } catch (err) {
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
