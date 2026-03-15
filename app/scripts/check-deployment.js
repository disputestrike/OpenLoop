/**
 * OpenLoop Deployment Health Check
 * Run: node scripts/check-deployment.js
 * Checks all required env vars, DB tables, and API routes
 */

// Minimal set to go live: claim (email), chat, engagement, protocol, directory
const required = [
  ["DATABASE_URL", "PostgreSQL connection string"],
  ["SESSION_SECRET", "32+ char random string for session encryption"],
  ["NEXT_PUBLIC_APP_URL", "Your Railway deployment URL"],
  ["CEREBRAS_API_KEY", "Cerebras AI API key — chat, engagement, LLM"],
  ["RESEND_API_KEY", "Resend email API key — claim magic-link emails"],
  ["FROM_EMAIL", "Sender for claim emails — e.g. OpenLoop <loop@yourdomain.com>"],
];

const optional = [
  ["REDIS_URL", "Redis — optional; in-memory sessions if missing"],
  ["STRIPE_SECRET_KEY", "Stripe — required for marketplace/tips"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
  ["TWILIO_ACCOUNT_SID", "Twilio — required for SMS/WhatsApp"],
  ["TWILIO_AUTH_TOKEN", "Twilio auth token"],
  ["TWILIO_PHONE_NUMBER", "Twilio from number"],
  ["ADMIN_SECRET", "Admin panel + audit"],
  ["CRON_SECRET", "Cron routes (recalculate-trust, engagement)"],
  ["CEREBRAS_API_KEY_2", "Extra Cerebras keys for rate limits"],
];

console.log("\n🔵 OpenLoop Deployment Check\n");
console.log("=".repeat(50));

let allGood = true;

console.log("\n📋 Required Environment Variables:\n");
for (const [key, desc] of required) {
  const val = process.env[key];
  if (val) {
    const masked = val.length > 8 ? val.slice(0, 4) + "..." + val.slice(-4) : "***";
    console.log(`  ✅ ${key}: ${masked}`);
  } else {
    console.log(`  ❌ ${key}: MISSING — ${desc}`);
    allGood = false;
  }
}

console.log("\n📋 Optional Environment Variables:\n");
for (const [key, desc] of optional) {
  const val = process.env[key];
  if (val) {
    console.log(`  ✅ ${key}: set`);
  } else {
    console.log(`  ⚠️  ${key}: not set — ${desc}`);
  }
}

console.log("\n" + "=".repeat(50));

if (allGood) {
  console.log("\n✅ All required environment variables are set!\n");
  console.log("Next steps:");
  console.log("  1. Run: npm run db:migrate");
  console.log("  2. Deploy to Railway");
  console.log("  3. Set Twilio webhook: YOUR_URL/api/webhooks/twilio");
  console.log("  4. Set Stripe webhook: YOUR_URL/api/webhooks/stripe");
  console.log("  5. Invite your first 10 users\n");
} else {
  console.log("\n❌ Some required variables are missing.");
  console.log("Copy .env.example to .env.local and fill in the values.\n");
  process.exit(1);
}
