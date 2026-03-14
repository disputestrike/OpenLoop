/**
 * TRANSACTION GENERATOR - Creates real transactions when agents post outcomes
 * This is the MISSING PIECE that makes economic value work
 * 
 * Called by engagement worker whenever an agent posts an outcome
 * Examples:
 * - "Saved $847 on flights" → Creates $847 transaction
 * - "Negotiated bill from $99 to $52" → Creates $47/mo savings transaction
 * - "Booked 3 doctor appointments in 15 minutes" → Creates fixed value transaction
 */

import { query } from "@/lib/db";

interface OutcomeData {
  loopId: string;
  loopTag: string;
  title: string;
  domain: string;
  description: string;
}

/**
 * Extract monetary value from outcome text
 * Examples:
 * "Saved $847" → 84700 cents
 * "Found flights for $180 cheaper" → 18000 cents
 * "Bill went from $99 to $52/month" → 4700 cents
 */
function extractMonetaryValue(text: string): number | null {
  // Match patterns like $XXX, $X,XXX, X dollars, X per month
  const patterns = [
    /\$(\d+[,\d]*(?:\.\d{2})?)/g, // $123 or $1,234.56
    /(\d+)\s*(?:dollars?|usd|per month|\/mo)/gi, // 123 dollars or 47 per month
  ];

  let amounts: number[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, "");
      const amount = parseFloat(numStr) * 100; // Convert to cents
      if (amount > 0 && amount < 1000000) {
        // $0.01 to $10,000
        amounts.push(Math.round(amount));
      }
    }
  }

  if (amounts.length === 0) return null;

  // If multiple values found, try to determine which is the outcome
  // E.g., "from $99 to $52" → take the difference (47)
  if (amounts.length === 2 && amounts[0] > amounts[1]) {
    return amounts[0] - amounts[1];
  }

  // Otherwise return the first/largest amount
  return Math.max(...amounts);
}

/**
 * Determine transaction type based on outcome text
 */
function getTransactionType(
  text: string
): "savings" | "deal" | "deal_closed" | "refund" | "outcome" {
  const lower = text.toLowerCase();

  if (lower.includes("refund") || lower.includes("refunded")) return "refund";
  if (lower.includes("booked") || lower.includes("scheduled")) return "deal_closed";
  if (lower.includes("found") || lower.includes("located") || lower.includes("discovered"))
    return "deal";
  if (lower.includes("saved") || lower.includes("cheaper") || lower.includes("reduced"))
    return "savings";

  return "outcome";
}

/**
 * Create a transaction from an outcome post
 * Returns the transaction ID or null if invalid
 */
export async function createTransactionFromOutcome(data: OutcomeData): Promise<string | null> {
  try {
    const amountCents = extractMonetaryValue(data.title) || extractMonetaryValue(data.description);

    // If no monetary value found, don't create transaction
    // But still mark this as a verified/valuable outcome
    if (!amountCents) {
      console.log(`[transaction-gen] No monetary value in: "${data.title.slice(0, 50)}"`);
      return null;
    }

    const transactionType = getTransactionType(data.title);

    // Create transaction
    const result = await query(
      `INSERT INTO transactions (
        buyer_loop_id, seller_loop_id, amount_cents, kind, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        data.loopId, // buyer = agent who posted outcome
        null, // seller = platform (null = system/agent economy)
        amountCents,
        transactionType,
        "completed",
        `${data.domain}: ${data.title.slice(0, 100)}`,
      ]
    );

    const txId = result.rows[0]?.id;

    if (txId) {
      console.log(
        `[transaction-gen] Created transaction: @${data.loopTag} $${(amountCents / 100).toFixed(2)} (${transactionType})`
      );
    }

    return txId || null;
  } catch (error) {
    console.error("[transaction-gen] Error creating transaction:", error);
    return null;
  }
}

/**
 * Batch create transactions for all existing outcome activities
 * Run this once to backfill historical data
 */
export async function backfillTransactions(): Promise<number> {
  try {
    console.log("[transaction-gen] Starting backfill...");

    const activities = await query<{
      id: string;
      loop_id: string;
      title: string;
      body: string | null;
      domain: string | null;
    }>(
      `SELECT a.id, a.loop_id, a.title, a.body, a.domain FROM activities a
       WHERE a.kind IN ('outcome', 'post') 
       AND a.title NOT IN (SELECT description FROM transactions LIMIT 5000)
       ORDER BY a.created_at DESC LIMIT 100`
    );

    let count = 0;

    for (const activity of activities.rows) {
      const loopTagRes = await query<{ loop_tag: string }>(
        `SELECT loop_tag FROM loops WHERE id = $1`,
        [activity.loop_id]
      );

      const loopTag = loopTagRes.rows[0]?.loop_tag || "Unknown";

      const txId = await createTransactionFromOutcome({
        loopId: activity.loop_id,
        loopTag,
        title: activity.title,
        domain: activity.domain || "general",
        description: activity.body || "",
      });

      if (txId) count++;
    }

    console.log(`[transaction-gen] Backfilled ${count} transactions`);
    return count;
  } catch (error) {
    console.error("[transaction-gen] Backfill error:", error);
    return 0;
  }
}
