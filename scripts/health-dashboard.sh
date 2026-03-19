#!/bin/bash

###############################################################################
# OPENLOOP SYSTEM HEALTH DASHBOARD
# Real-time monitoring of OpenLoop platform health
# Run: bash scripts/health-dashboard.sh
###############################################################################

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          OPENLOOP SYSTEM HEALTH DASHBOARD                  ║"
echo "║                                                            ║"
echo "║  Real-time Monitoring & Diagnostic System                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Helper functions
check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

print_metric() {
  local name=$1
  local status=$2
  printf "  %-40s %s\n" "$name" "$status"
}

###############################################################################
# 1. BUILD STATUS
###############################################################################

echo -e "${BLUE}[1] BUILD STATUS${NC}"
echo ""

# TypeScript check
printf "  %-40s " "TypeScript compilation"
cd "$APP_DIR" && npx tsc --noEmit >/dev/null 2>&1
check_status

# Build test
printf "  %-40s " "Next.js build"
cd "$APP_DIR" && npm run build >/dev/null 2>&1
check_status

# Linting
printf "  %-40s " "Code linting"
cd "$APP_DIR" && npm run lint --if-present >/dev/null 2>&1
check_status

echo ""

###############################################################################
# 2. DEPENDENCIES
###############################################################################

echo -e "${BLUE}[2] DEPENDENCIES${NC}"
echo ""

# npm audit
printf "  %-40s " "Security audit"
cd "$APP_DIR" && npm audit --json 2>/dev/null | jq -e '.metadata.vulnerabilities.total <= 1' >/dev/null 2>&1
check_status

# npm version
npm_version=$(node -v)
printf "  %-40s %s\n" "Node.js version" "$npm_version"

# npm packages
pkg_count=$(cd "$APP_DIR" && npm list --depth=0 2>/dev/null | grep -c "@" || echo "0")
printf "  %-40s %s\n" "Installed packages" "$pkg_count"

echo ""

###############################################################################
# 3. DATABASE
###############################################################################

echo -e "${BLUE}[3] DATABASE${NC}"
echo ""

# Check for migration files
migrations=0
for migration in phase3-migrations.sql phase4-optimization.sql; do
  if [ -f "$REPO_ROOT/scripts/$migration" ]; then
    ((migrations++))
  fi
done
printf "  %-40s %s/2\n" "Migration files" "$migrations"

# Database connection (if DATABASE_URL set)
if [ -n "$DATABASE_URL" ]; then
  printf "  %-40s " "Database connectivity"
  # Try a simple connection test
  if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1
    check_status
  else
    echo -e "${YELLOW}SKIP${NC} (psql not available)"
  fi
else
  printf "  %-40s %s\n" "Database connectivity" "${YELLOW}NOT SET${NC}"
fi

echo ""

###############################################################################
# 4. API ROUTES
###############################################################################

echo -e "${BLUE}[4] API ROUTES${NC}"
echo ""

# Count route files
route_count=$(find "$APP_DIR/src/app/api" -name "route.ts" -o -name "route.tsx" 2>/dev/null | wc -l)
printf "  %-40s %s\n" "API endpoints defined" "$route_count"

# Check for invalid exports
invalid_count=$(
  find "$APP_DIR/src/app/api" -name "route.ts" 2>/dev/null | while read f; do
    grep "export async function" "$f" 2>/dev/null | grep -v "GET\|POST\|PUT\|DELETE\|PATCH\|HEAD\|OPTIONS" | wc -l
  done | awk '{s+=$1} END {print s}'
)
invalid_count=${invalid_count:-0}

printf "  %-40s " "Invalid route exports"
if [ "$invalid_count" -eq 0 ]; then
  echo -e "${GREEN}0${NC}"
else
  echo -e "${RED}$invalid_count${NC}"
fi

# Check for duplicate variables
duplicate_count=$(
  find "$APP_DIR/src/app/api" -name "*.ts" 2>/dev/null | while read f; do
    grep -c "const sort = " "$f" 2>/dev/null | awk '{if ($1 > 1) print 1; else print 0}'
  done | awk '{s+=$1} END {print s}'
)
duplicate_count=${duplicate_count:-0}

printf "  %-40s " "Duplicate declarations"
if [ "$duplicate_count" -eq 0 ]; then
  echo -e "${GREEN}0${NC}"
else
  echo -e "${RED}$duplicate_count${NC}"
fi

echo ""

###############################################################################
# 5. ENVIRONMENT VARIABLES
###############################################################################

echo -e "${BLUE}[5] ENVIRONMENT VARIABLES${NC}"
echo ""

required_vars=("DATABASE_URL" "ADMIN_API_KEY" "NEXT_PUBLIC_APP_URL" "CRON_SECRET")

for var in "${required_vars[@]}"; do
  if [ -n "${!var}" ]; then
    printf "  %-40s ${GREEN}✓ SET${NC}\n" "$var"
  else
    printf "  %-40s ${YELLOW}○ NOT SET${NC}\n" "$var"
  fi
done

echo ""

###############################################################################
# 6. CODE QUALITY
###############################################################################

echo -e "${BLUE}[6] CODE QUALITY${NC}"
echo ""

# Test files
test_count=$(find "$APP_DIR/__tests__" -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)
printf "  %-40s %s\n" "Test files" "$test_count"

# Lines of code (API routes only)
loc=$(find "$APP_DIR/src/app/api" -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
printf "  %-40s %s\n" "Lines in API routes" "$loc"

# Type coverage (if tsc output available)
printf "  %-40s " "TypeScript strict mode"
cd "$APP_DIR" && grep -q '"strict": true' tsconfig.json 2>/dev/null && echo -e "${GREEN}ENABLED${NC}" || echo -e "${YELLOW}DISABLED${NC}"

echo ""

###############################################################################
# 7. DEPLOYMENT READINESS
###############################################################################

echo -e "${BLUE}[7] DEPLOYMENT READINESS${NC}"
echo ""

readiness_score=0
max_score=100

# Build passes
cd "$APP_DIR" && npm run build >/dev/null 2>&1 && readiness_score=$((readiness_score + 25))

# No critical errors
invalid_count=${invalid_count:-0}
duplicate_count=${duplicate_count:-0}
if [ $invalid_count -eq 0 ] && [ $duplicate_count -eq 0 ]; then
  readiness_score=$((readiness_score + 25))
fi

# Migrations present
if [ "$migrations" -eq 2 ]; then
  readiness_score=$((readiness_score + 25))
fi

# Env vars set
env_set=0
for var in "${required_vars[@]}"; do
  [ -n "${!var}" ] && ((env_set++))
done
if [ "$env_set" -eq ${#required_vars[@]} ]; then
  readiness_score=$((readiness_score + 25))
fi

printf "  %-40s %s%%\n" "Readiness score" "$readiness_score"

if [ $readiness_score -eq 100 ]; then
  echo -e "  ${GREEN}Status: READY FOR DEPLOYMENT${NC}"
elif [ $readiness_score -ge 75 ]; then
  echo -e "  ${YELLOW}Status: MOSTLY READY (address issues)${NC}"
else
  echo -e "  ${RED}Status: NOT READY (critical issues)${NC}"
fi

echo ""

###############################################################################
# 8. SYSTEM SUMMARY
###############################################################################

echo -e "${BLUE}[8] SYSTEM SUMMARY${NC}"
echo ""

timestamp=$(date '+%Y-%m-%d %H:%M:%S')
printf "  %-40s %s\n" "Last check" "$timestamp"
printf "  %-40s %s\n" "Hostname" "$(hostname)"
printf "  %-40s %s\n" "Repository root" "$REPO_ROOT"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Final recommendation
if [ $readiness_score -eq 100 ]; then
  echo -e "${GREEN}✓ System is healthy and ready for deployment${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Push code to GitHub"
  echo "  2. Monitor Railway deployment"
  echo "  3. Run post-deployment tests"
elif [ $readiness_score -ge 75 ]; then
  echo -e "${YELLOW}⚠ System is mostly ready - fix remaining issues${NC}"
  echo ""
  echo "Action items:"
  if [ $invalid_count -gt 0 ]; then
    echo "  • Fix $invalid_count invalid route exports"
  fi
  if [ $duplicate_count -gt 0 ]; then
    echo "  • Fix $duplicate_count duplicate declarations"
  fi
  if [ "$migrations" -lt 2 ]; then
    echo "  • Add missing migration files"
  fi
  if [ "$env_set" -lt ${#required_vars[@]} ]; then
    echo "  • Set missing environment variables"
  fi
else
  echo -e "${RED}✗ System requires critical fixes${NC}"
  echo ""
  echo "Run auto-repair:"
  echo "  bash scripts/auto-repair.sh"
fi

echo ""
