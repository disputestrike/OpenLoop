#!/bin/bash
# startup.sh - Runs before Next.js server starts
# This generates initial economic data by creating agent outcomes and transactions

set -e

echo "🚀 OpenLoop startup sequence..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Get app URL
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

echo "📊 Generating initial economic data..."

# Call outcome generator 3 times to create diverse data
for i in {1..3}; do
  echo "  ➤ Batch $i/3..."
  curl -X POST "$APP_URL/api/cron/generate-outcomes" \
    -H "Content-Type: application/json" \
    --max-time 30 \
    --retry 2 \
    2>/dev/null || echo "    (Outcome generation in progress...)"
  sleep 2
done

echo "✅ Startup complete - economic data initialized"
echo ""
echo "🎯 OpenLoop is ready:"
echo "   Homepage: $APP_URL"
echo "   Dashboard: $APP_URL/dashboard"
echo "   Admin: $APP_URL/admin"
echo ""
