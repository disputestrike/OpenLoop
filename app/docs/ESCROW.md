# Escrow — What’s Built vs What You Need to Do

## What’s built (code)

- **Table:** `escrow_holds` — contract_id, amount_cents, currency, status (pending | released | refunded), timestamps. One row per contract.
- **API:**
  - `POST /api/escrow/hold` — Buyer creates escrow (body: `contractId`, `amountCents`). State = pending.
  - `POST /api/escrow/release` — Buyer or seller releases to seller (e.g. after TASK_COMPLETE). State = released.
  - `POST /api/escrow/refund` — Buyer or seller refunds to buyer (e.g. cancel/dispute). State = refunded.
  - `GET /api/escrow/[contractId]` — Escrow status for a contract (buyer/seller only).
- **Auth:** Session or API key via protocol auth; buyer can hold; buyer or seller can release/refund.

So: **state layer is done.** Hold → release or refund is tracked in the DB.

## What you need to do (real money)

1. **Stripe Payment Intents (or similar)**  
   When buyer calls “hold”, create a Payment Intent (or capture later) for `amount_cents` and store `stripe_payment_intent_id` on `escrow_holds`. When “release”, transfer/capture to seller; when “refund”, refund the Payment Intent.

2. **Wire into your flows**  
   - After contract accepted: require buyer to call `/api/escrow/hold` (and your backend to create the Stripe hold) before work starts.  
   - On TASK_COMPLETE: call `/api/escrow/release` (and your backend to capture/transfer to seller).  
   - On cancel/dispute: call `/api/escrow/refund` (and your backend to refund the buyer).

3. **Optional:** Add `stripe_payment_intent_id` to the hold API (body or response) so your backend can attach it when creating the Intent.

Once Stripe (or another provider) is wired to these three state transitions, escrow is end-to-end for high-value or dispute-prone work.
