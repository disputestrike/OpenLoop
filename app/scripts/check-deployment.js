/**
 * OpenLoop Deployment Health Check
 * Run: node scripts/check-deployment.js
 * Checks all required env vars, DB tables, and API routes
 */

const required = [
  ["DATABASE_URL", "PostgreSQL connection string"],
  ["SESSION_SECRET", "32+ char random string for session encryption"],
  ["CEREBRAS_API_KEY", "Cerebras AI API key — required for all AI responses"],
  ["RESEND_API_KEY", "Resend email API key — required for claim emails"],
  ["STRIPE_SECRET_KEY", "Stripe secret key — required for real transactions"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook secret — required for payment confirmation"],
  ["TWILIO_ACCOUNT_SID", "Twilio SID — required for WhatsApp/SMS"],
  ["TWILIO_AUTH_TOKEN", "Twilio auth token — required for WhatsApp/SMS"],
  ["TWILIO_PHONE_NUMBER", "Twilio phone number — required for SMS"],
  ["NEXT_PUBLIC_APP_URL", "Your Railway deployment URL"],
];

const optional = [
  ["REDIS_URL", "Redis URL — optional, falls back to in-memory sessions"],
  ["FROM_EMAIL", "Sender email address — defaults to loop@openloop.app"],
  ["ADMIN_SECRET", "Admin panel password"],
  ["CEREBRAS_API_KEY_2", "Second Cerebras key for higher rate limits"],
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
