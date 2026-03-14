#!/bin/bash
# startup.sh - Initializes database and seeds data
# Runs BEFORE the Next.js server starts

set -e

echo "🚀 OpenLoop Startup Initialization..."

# Get database URL
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set - skipping migration"
  exit 0
fi

echo "📦 Running database migrations..."

# Create migrations table if it doesn't exist
psql "$DATABASE_URL" <<SQL
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  executed_at TIMESTAMP DEFAULT NOW()
);
SQL

# Run all migration files in order
for migration in app/migrations/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    echo "   Applying: $filename"
    
    # Check if migration already ran
    migration_name="${filename%.sql}"
    exists=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM _migrations WHERE name = '$migration_name'" 2>/dev/null || echo "")
    
    if [ -z "$exists" ]; then
      # Run the migration
      psql "$DATABASE_URL" < "$migration" 2>/dev/null || echo "   (Already exists or skipped)"
      
      # Mark as executed
      psql "$DATABASE_URL" -c "INSERT INTO _migrations (name) VALUES ('$migration_name')" 2>/dev/null || true
    fi
  fi
done

echo "✅ Migrations complete"
echo ""
echo "📊 Database ready for seeding"
echo "   /api/demo-stats will auto-seed on first call"
echo ""
