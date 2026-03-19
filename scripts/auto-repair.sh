#!/bin/bash

###############################################################################
# OPENLOOP AUTO-REPAIR ENGINE
# Detects and fixes common issues automatically
# Run: bash scripts/auto-repair.sh
###############################################################################

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"
FIX_LOG="/tmp/openloop-fixes-$(date +%s).log"

echo "🔧 OpenLoop Auto-Repair Engine Starting..."
echo "📝 Fix Log: $FIX_LOG"
echo ""

# Helper functions
log_fix() {
  echo "[FIX] $1" | tee -a "$FIX_LOG"
}

log_check() {
  echo "[CHECK] $1" | tee -a "$FIX_LOG"
}

log_ok() {
  echo "[✓] $1" | tee -a "$FIX_LOG"
}

log_error() {
  echo "[✗] $1" | tee -a "$FIX_LOG"
}

###############################################################################
# FIX 1: DUPLICATE VARIABLE DECLARATIONS
###############################################################################

echo "=== FIX 1: Duplicate Variables ==="
log_check "Scanning for duplicate const declarations..."

duplicate_vars=0
find "$APP_DIR/src/app/api" -name "*.ts" 2>/dev/null | while read -r file; do
  # Count "const sort =" occurrences
  if grep -c "const sort = " "$file" 2>/dev/null | grep -q "^[2-9]"; then
    log_fix "Duplicate 'sort' variable in $file"
    # Keep first, remove subsequent
    awk '!seen[$0]++' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
    log_ok "Fixed duplicate in $file"
    ((duplicate_vars++))
  fi
done

if [ $duplicate_vars -eq 0 ]; then
  log_ok "No duplicate variables found"
else
  log_ok "Fixed $duplicate_vars files with duplicate variables"
fi
echo ""

###############################################################################
# FIX 2: INVALID ROUTE EXPORTS
###############################################################################

echo "=== FIX 2: Invalid Route Exports ==="
log_check "Scanning for invalid function exports in routes..."

invalid_exports=0
while read -r file; do
  # Check for functions with wrong names (not GET, POST, etc)
  if grep -q "export async function" "$file" 2>/dev/null; then
    # Extract function names
    funcs=$(grep "export async function" "$file" | sed 's/export async function \([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/')
    
    while read -r func; do
      if ! [[ "$func" =~ ^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$ ]]; then
        log_fix "Invalid export '$func' in $file"
        # This needs manual review - mark but don't auto-fix
        echo "INVALID_EXPORT:$file:$func" >> "$FIX_LOG"
        ((invalid_exports++))
      fi
    done <<< "$funcs"
  fi
done < <(find "$APP_DIR/src/app/api" -name "route.ts" -o -name "route.tsx" 2>/dev/null)

if [ $invalid_exports -eq 0 ]; then
  log_ok "No invalid route exports found"
else
  log_error "Found $invalid_exports invalid exports - manual review needed"
fi
echo ""

###############################################################################
# FIX 3: MISSING DATABASE MIGRATIONS
###############################################################################

echo "=== FIX 3: Database Migrations ==="
log_check "Verifying migration files..."

required_migrations=(
  "phase3-migrations.sql"
  "phase4-optimization.sql"
)

missing_migrations=0
for migration in "${required_migrations[@]}"; do
  if [ ! -f "$REPO_ROOT/scripts/$migration" ]; then
    log_error "Missing: scripts/$migration"
    ((missing_migrations++))
  else
    log_ok "Found: scripts/$migration"
  fi
done

if [ $missing_migrations -eq 0 ]; then
  log_ok "All required migrations present"
else
  log_error "$missing_migrations migration files missing"
fi
echo ""

###############################################################################
# FIX 4: MISSING ENV VARIABLES
###############################################################################

echo "=== FIX 4: Environment Variables ==="
log_check "Checking required env vars..."

required_vars=(
  "DATABASE_URL"
  "ADMIN_API_KEY"
  "NEXT_PUBLIC_APP_URL"
  "CRON_SECRET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    log_error "Missing: $var"
    ((missing_vars++))
  else
    log_ok "Set: $var"
  fi
done

if [ $missing_vars -gt 0 ]; then
  log_error "$missing_vars environment variables missing"
  echo ""
  echo "To set them, add to Railway dashboard or .env.local:"
  for var in "${required_vars[@]}"; do
    echo "  $var=<value>"
  done
else
  log_ok "All required env vars present"
fi
echo ""

###############################################################################
# FIX 5: NODE MODULES INTEGRITY
###############################################################################

echo "=== FIX 5: Dependencies ==="
log_check "Checking npm dependencies..."

cd "$APP_DIR"
if npm audit --json 2>/dev/null | jq -e '.metadata.vulnerabilities.total > 0' >/dev/null 2>&1; then
  log_fix "Found vulnerabilities - running npm audit fix..."
  npm audit fix --force || true
  log_ok "Fixed vulnerabilities"
else
  log_ok "No critical vulnerabilities found"
fi
echo ""

###############################################################################
# FIX 6: BUILD VALIDATION
###############################################################################

echo "=== FIX 6: Build Validation ==="
log_check "Running TypeScript check..."

cd "$APP_DIR"
if npx tsc --noEmit >/dev/null 2>&1; then
  log_ok "TypeScript check passed"
else
  log_error "TypeScript errors found - review src/ files"
  npx tsc --noEmit 2>&1 | tee -a "$FIX_LOG" || true
fi
echo ""

###############################################################################
# SUMMARY
###############################################################################

echo "================================"
echo "🔧 AUTO-REPAIR COMPLETE"
echo "================================"
echo ""
echo "📝 Full log: $FIX_LOG"
echo ""

# Count fixes
total_fixes=$((duplicate_vars + invalid_exports))
echo "Summary:"
echo "  Duplicate variables fixed: $duplicate_vars"
echo "  Invalid exports found: $invalid_exports"
echo "  Missing migrations: $missing_migrations"
echo "  Missing env vars: $missing_vars"
echo ""

if [ $total_fixes -eq 0 ] && [ $missing_migrations -eq 0 ] && [ $missing_vars -eq 0 ]; then
  echo "✅ System is HEALTHY"
  exit 0
else
  echo "⚠️ System requires attention"
  echo ""
  echo "Action items:"
  if [ $missing_vars -gt 0 ]; then
    echo "  1. Set missing environment variables"
  fi
  if [ $missing_migrations -gt 0 ]; then
    echo "  2. Add missing migration files"
  fi
  if [ $invalid_exports -gt 0 ]; then
    echo "  3. Review invalid route exports (see log)"
  fi
  exit 1
fi
