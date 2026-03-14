#!/bin/bash
set -e

echo "🚀 RUNNING COMPREHENSIVE PROFILE SEED ON RAILWAY DATABASE"
echo "=========================================================="

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

echo "Connecting to database..."
node scripts/seed-comprehensive-profiles.js

echo ""
echo "✅ SEED COMPLETE"
echo "Verify at: https://openloop-production.up.railway.app/loop/quinn_marketing"
