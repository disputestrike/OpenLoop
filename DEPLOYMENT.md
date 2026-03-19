# OpenLoop Autonomous Deployment Guide

## System Architecture

OpenLoop now operates as a **fully autonomous self-healing system** with three layers:

```
┌─────────────────────────────────────────────────────────────┐
│                   GITHUB ACTIONS CI/CD                       │
│  (Automatic on every push, every 15 minutes)                │
├─────────────────────────────────────────────────────────────┤
│  • self-healing-ci.yml     → Diagnostic + Auto-repair       │
│  • deploy-railway.yml      → Build + Test + Deploy          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              LOCAL CONTROL CENTER (Optional)                 │
│   (bash scripts/control-center.sh [command])                │
├─────────────────────────────────────────────────────────────┤
│  • diagnose → Full system diagnostic                         │
│  • repair   → Auto-fix detected issues                       │
│  • deploy   → Test, fix, push to GitHub                      │
│  • monitor  → Real-time interactive dashboard               │
│  • health   → Quick health check (0-100)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY PLATFORM (Production)                   │
│   (Automated deployment, no manual steps)                    │
├─────────────────────────────────────────────────────────────┤
│  • Builds from main branch                                   │
│  • Runs post-deploy migrations                               │
│  • Auto-scales based on load                                 │
│  • Zero-downtime deployments                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Workflow

### Automatic (GitHub Actions)

```
Developer pushes to main
        ↓
GitHub Actions triggered
        ↓
[self-healing-ci.yml]
  - Run diagnostics
  - Auto-fix issues
  - Build validation
  - TypeScript check
  - Dependency audit
  - Routes validation
        ↓
[deploy-railway.yml]
  - TypeScript check
  - Build app
  - Security scan
  - Deploy to Railway
  - Health check
  - Slack notification
        ↓
Production live
```

### Manual (Local Control Center)

```bash
# Quick check
bash scripts/control-center.sh health

# Auto-fix issues
bash scripts/control-center.sh repair

# Full diagnostic
bash scripts/control-center.sh diagnose

# Deploy + push to GitHub
bash scripts/control-center.sh deploy

# Real-time monitoring
bash scripts/control-center.sh monitor
```

---

## Setup Instructions

### 1. GitHub Secrets Configuration

Add these secrets to GitHub repository settings:

```
RAILWAY_TOKEN
  - Get from: https://railway.app/account/tokens
  - Required for: Railway authentication

DATABASE_URL
  - Format: postgresql://user:pass@host:5432/dbname
  - Required for: Build and runtime

ADMIN_API_KEY
  - Generate any secure random string
  - Required for: Admin endpoints

NEXT_PUBLIC_APP_URL
  - Production URL: https://openloop-production.up.railway.app
  - Required for: Frontend URLs

CEREBRAS_API_KEY
  - Get from: https://console.cerebras.ai
  - Required for: LLM endpoints

TELEGRAM_BOT_SECRET_TOKEN
  - Get from: BotFather on Telegram
  - Required for: Telegram integration

CRON_SECRET
  - Generate any secure random string
  - Required for: Scheduled tasks

SLACK_WEBHOOK_URL (Optional)
  - Get from: Slack app workspace settings
  - Required for: Deployment notifications
```

### 2. Local Environment (Optional)

For local testing:

```bash
# Create .env.local in app/
cd app
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://localhost:5432/openloop_dev
ADMIN_API_KEY=dev-key-12345
NEXT_PUBLIC_APP_URL=http://localhost:3000
CEREBRAS_API_KEY=your-api-key
TELEGRAM_BOT_SECRET_TOKEN=your-token
CRON_SECRET=dev-secret
EOF
```

### 3. Railway Configuration

1. Create Railway project: https://railway.app/new
2. Add PostgreSQL database
3. Add Node.js service from GitHub repository
4. Configure environment variables (use secrets)
5. Enable auto-deploy on main branch

---

## Operations Guide

### Daily Monitoring

```bash
# Real-time health dashboard
bash scripts/control-center.sh monitor

# Quick health check
bash scripts/control-center.sh health

# View CI/CD status
# https://github.com/disputestrike/OpenLoop/actions
```

### When Build Fails

```bash
# 1. Check what's wrong
bash scripts/control-center.sh diagnose

# 2. Let system auto-fix
bash scripts/control-center.sh repair

# 3. Verify the fix
bash scripts/control-center.sh diagnose

# 4. Push to GitHub
git push origin main
```

### Emergency Fixes

```bash
# If something critical is broken:

# 1. Kill current deployment
# (In Railway dashboard)

# 2. Local diagnosis
bash scripts/control-center.sh diagnose

# 3. Manual code fix (if needed)
# Edit src/ files

# 4. Commit and auto-deploy
git add -A
git commit -m "Hotfix: [description]"
git push origin main
```

### Database Migrations

Migrations run automatically on Railway after deployment:

```bash
# To add a new migration locally:
cat > app/migrations/XXX_description.sql << 'EOF'
-- Migration SQL here
EOF

git add app/migrations/XXX_description.sql
git commit -m "Migration: [description]"
git push origin main

# Railway will auto-run on deploy
```

---

## Monitoring & Alerts

### GitHub Actions

- View all builds: https://github.com/disputestrike/OpenLoop/actions
- Runs on:
  - Every push to main
  - Every 15 minutes (scheduled)
  - Manual workflow dispatch

### Railway Logs

- View logs: https://railway.app → Select project → View logs
- Real-time streaming
- Filter by service: OpenLoop, openloop-engagement
- Search by keyword or timestamp

### Health Checks

- Built-in: `/api/health` endpoint
- Automatic: Post-deployment verification
- Alert: Slack notifications on failure

### Metrics

- Response times
- Error rates
- Database connections
- Build times
- Deployment frequency

---

## Troubleshooting

### Build Fails with "DATABASE_URL is required"

**Cause**: Missing DATABASE_URL environment variable

**Fix**:
```bash
# Add to Railway environment variables
DATABASE_URL=postgresql://...

# Or set locally before testing
export DATABASE_URL="postgresql://localhost/openloop_dev"
npm run build
```

### TypeScript Errors

**Cause**: Code doesn't pass TypeScript strict mode

**Fix**:
```bash
cd app
npx tsc --noEmit  # See errors
# Fix errors in src/
git add -A
git commit -m "Fix: TypeScript errors"
git push origin main
```

### Invalid Route Exports

**Cause**: API route file exports wrong function name

**Fix**: Route files must only export `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, or `OPTIONS`

```typescript
// ✓ CORRECT
export async function GET(req) { }
export async function POST(req) { }

// ✗ WRONG
export async function getAgentAnalytics() { }
export async function adminReviewDispute() { }
```

### Deployment Stuck

**Cause**: Railway build timeout or resource issue

**Fix**:
1. Go to Railway dashboard
2. Stop current deployment
3. Check logs for errors
4. Run local diagnostic: `bash scripts/control-center.sh diagnose`
5. Fix issues locally
6. Push to GitHub to retry

---

## Advanced Operations

### Manual Deployment (Local)

```bash
# Using Railway CLI
npm install -g railway
cd /OpenLoop
railway login --token $RAILWAY_TOKEN
railway up
```

### Database Backup

```bash
# Backup from Railway PostgreSQL
pg_dump $DATABASE_URL > openloop_backup.sql

# Restore
psql $DATABASE_URL < openloop_backup.sql
```

### Rollback Deployment

1. Go to Railway dashboard
2. View deployment history
3. Click on previous deployment
4. Click "Redeploy"

Or via git:
```bash
git revert <commit-sha>
git push origin main
```

---

## Performance Optimization

### Build Optimization

- TypeScript: Pre-compiled
- Next.js: Incremental builds
- Dependencies: npm ci (lock file)
- Caching: GitHub Actions cache layer

### Runtime Optimization

- Database: Connection pooling (ioredis)
- API: Response caching
- UI: Static generation + ISR
- Images: Automatic optimization

### Monitoring

```bash
# Check build time
# View in GitHub Actions logs

# Check runtime performance
# View in Railway logs with timestamps
```

---

## Security

### Secrets Management

- All secrets stored in GitHub
- Never commit `.env` files
- Auto-masked in logs
- Rotated periodically

### Dependency Security

```bash
# Check vulnerabilities
cd app
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### Code Security

- SAST scanning in CI/CD
- Type-safe (TypeScript strict)
- SQL injection prevention (parameterized queries)
- XSS protection (React sanitization)

---

## Support & Documentation

### Useful Links

- Railway Docs: https://docs.railway.app
- Next.js Docs: https://nextjs.org/docs
- GitHub Actions: https://docs.github.com/en/actions
- PostgreSQL Docs: https://www.postgresql.org/docs/

### Control Center Help

```bash
bash scripts/control-center.sh  # Shows help
```

### Logs & Diagnostics

```bash
# Local logs
tail -f /tmp/openloop-control-*.log

# GitHub Actions logs
# https://github.com/disputestrike/OpenLoop/actions

# Railway logs
# https://railway.app → Logs tab
```

---

## Summary

**OpenLoop is now a fully autonomous, self-healing system.**

- **0 manual steps** required for deployment
- **100% automated** testing and fixing
- **Real-time** monitoring and alerts
- **Zero-downtime** deployments
- **Self-recovering** from failures

Just push code to main. The system does the rest.

```
git add -A
git commit -m "Feature: Your changes"
git push origin main
# Everything else is automatic ✓
```
