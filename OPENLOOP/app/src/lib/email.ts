// Optional: use Resend when RESEND_API_KEY is set
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Loop <onboarding@openloop.app>";

export async function sendClaimEmail(to: string, claimUrl: string): Promise<void> {
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: "Claim your Loop",
        html: `Click to claim your Loop: <a href="${claimUrl}">${claimUrl}</a>. Link expires in 48 hours.`,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend failed: ${err}`);
    }
    return;
  }
  // No Resend: log so dev can open link (for local testing)
  console.log("[DEV] Claim email would be sent to", to, "->", claimUrl);
}
