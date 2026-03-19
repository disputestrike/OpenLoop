# GitHub Secrets Configuration

This file documents all required secrets for OpenLoop autonomous deployment.

## How to Add Secrets to GitHub

1. Go to: **GitHub Repository → Settings → Secrets and variables → Actions**
2. Click: **New repository secret**
3. Add each secret below

---

## Required Secrets (7 Total)

### 1. RAILWAY_TOKEN

**Purpose**: Authenticate with Railway for automated deployments

**How to get**:
1. Go to https://railway.app/account/tokens
2. Create new token
3. Copy the token value

**Value format**: `rly_...` (starts with `rly_`)

**Required**: ✅ YES (deployment will fail without this)

---

### 2. DATABASE_URL

**Purpose**: PostgreSQL connection string for build-time and runtime

**How to get**:
1. Create Railway PostgreSQL database
2. Go to database service → Variables
3. Find `DATABASE_URL` variable
4. Copy the full connection string

**Value format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Example**:
```
postgresql://postgres:abc123@railway.internal:5432/openloop
```

**Required**: ✅ YES (required for build and runtime)

---

### 3. ADMIN_API_KEY

**Purpose**: Authentication for admin endpoints

**How to get**: Generate any secure random string

**How to generate**:
```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Option 3: OpenSSL
openssl rand -hex 32
```

**Value format**: 64-character hexadecimal string (32 bytes)

**Example**:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e
```

**Required**: ✅ YES (required for admin endpoints)

---

### 4. NEXT_PUBLIC_APP_URL

**Purpose**: Public URL for frontend (used in links, redirects, etc)

**How to get**: Use your Railway public domain

**Value format**: Full HTTPS URL without trailing slash

**Examples**:
- Production: `https://openloop-production.up.railway.app`
- Custom domain: `https://app.openloop.ai`

**Required**: ✅ YES (required for frontend configuration)

---

### 5. CEREBRAS_API_KEY

**Purpose**: LLM API authentication for AI agent processing

**How to get**:
1. Go to https://console.cerebras.ai
2. Create API key
3. Copy the key

**Value format**: Bearer token (format varies by Cerebras)

**Required**: ✅ YES (required for agent message processing)

---

### 6. TELEGRAM_BOT_SECRET_TOKEN

**Purpose**: Telegram bot webhook authentication

**How to get**:
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Follow prompts
4. Copy the token: `123456:ABC-DEF...`

**Value format**: Token provided by BotFather (contains colon and alphanumeric)

**Example**:
```
123456:ABCDefGHIJKlmnoPQRstUVwxyz1234567890
```

**Required**: ✅ YES (required for Telegram integration)

---

### 7. CRON_SECRET

**Purpose**: Authentication for scheduled tasks and webhooks

**How to generate**: Same as ADMIN_API_KEY

```bash
openssl rand -hex 32
```

**Value format**: 64-character hexadecimal string

**Required**: ✅ YES (required for scheduled task security)

---

## Optional Secrets

### SLACK_WEBHOOK_URL

**Purpose**: Send deployment notifications to Slack

**How to get**:
1. Go to your Slack workspace → Apps
2. Search for "Incoming Webhooks"
3. Click "Add to Slack"
4. Choose channel and confirm
5. Copy Webhook URL

**Value format**: `https://hooks.slack.com/services/...`

**Required**: ❌ NO (optional, for notifications only)

---

## Setup Checklist

### Step 1: Gather Values

```
[ ] RAILWAY_TOKEN = ___________________________
[ ] DATABASE_URL = ___________________________
[ ] ADMIN_API_KEY = ___________________________
[ ] NEXT_PUBLIC_APP_URL = ___________________________
[ ] CEREBRAS_API_KEY = ___________________________
[ ] TELEGRAM_BOT_SECRET_TOKEN = ___________________________
[ ] CRON_SECRET = ___________________________
[ ] SLACK_WEBHOOK_URL (optional) = ___________________________
```

### Step 2: Add to GitHub

1. Go to https://github.com/disputestrike/OpenLoop/settings/secrets/actions
2. Click "New repository secret"
3. For each secret:
   - Name: Exact name from above
   - Value: Paste the value
   - Click "Add secret"
4. Verify all 7 required secrets are added

### Step 3: Verify Setup

```bash
# In repository, push a test commit
git add .
git commit -m "Test: Verify GitHub Actions setup"
git push origin main

# Go to Actions tab and watch the build
# It should succeed if all secrets are correct
```

---

## Updating Secrets

### When a Secret Expires

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Find the secret
3. Click the delete icon (trash can)
4. Click "New repository secret"
5. Enter the new value
6. Trigger a re-deployment: `git push origin main`

### When Adding New Secrets

1. Follow the same "New repository secret" process
2. Push any commit to main to trigger CI/CD
3. GitHub Actions will use the new secret

---

## Security Best Practices

### Do's ✅

- [x] Use strong, random values for API keys
- [x] Rotate secrets every 90 days
- [x] Use different values for different environments
- [x] Store this template file (NOT the actual values)
- [x] Log access to secrets

### Don'ts ❌

- [x] Never commit secrets to Git
- [x] Never share secrets in emails or Slack
- [x] Never log secret values in code
- [x] Never hardcode values in config files
- [x] Never share the GitHub secrets page

---

## Troubleshooting

### "Build failed: DATABASE_URL is required"

**Cause**: DATABASE_URL secret not set

**Fix**:
1. Go to GitHub Secrets
2. Verify DATABASE_URL exists
3. Verify it's not empty
4. Push new commit to main

### "Deployment failed: Unauthorized"

**Cause**: RAILWAY_TOKEN is invalid or expired

**Fix**:
1. Generate new token from railway.app
2. Update RAILWAY_TOKEN secret
3. Re-deploy: `git push origin main`

### "Admin endpoint returns 401"

**Cause**: ADMIN_API_KEY secret not set correctly

**Fix**:
1. Verify ADMIN_API_KEY exists in GitHub
2. Generate new key: `openssl rand -hex 32`
3. Update secret with new value
4. Restart services in Railway

### "Telegram bot not responding"

**Cause**: TELEGRAM_BOT_SECRET_TOKEN is wrong

**Fix**:
1. Verify token format (should have colon)
2. Check with @BotFather (might be expired)
3. Create new bot if needed
4. Update TELEGRAM_BOT_SECRET_TOKEN

---

## Validation Script

Run this to verify all required environment variables are set locally:

```bash
#!/bin/bash

required_vars=(
  "DATABASE_URL"
  "ADMIN_API_KEY"
  "NEXT_PUBLIC_APP_URL"
  "CEREBRAS_API_KEY"
  "TELEGRAM_BOT_SECRET_TOKEN"
  "CRON_SECRET"
  "RAILWAY_TOKEN"
)

missing=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    ((missing++))
  else
    echo "✅ Set: $var"
  fi
done

if [ $missing -eq 0 ]; then
  echo ""
  echo "✅ All required environment variables are set"
  exit 0
else
  echo ""
  echo "❌ Missing $missing environment variables"
  exit 1
fi
```

---

## Reference

### Environment Variables by Service

**GitHub Actions CI/CD** needs:
- DATABASE_URL (build-time)
- RAILROAD_TOKEN (deployment)

**Railway Services** need:
- DATABASE_URL
- ADMIN_API_KEY
- NEXT_PUBLIC_APP_URL
- CEREBRAS_API_KEY
- TELEGRAM_BOT_SECRET_TOKEN
- CRON_SECRET

**Optional** (for notifications):
- SLACK_WEBHOOK_URL

---

## Support

If you're stuck on any secret:

1. Check this document for your specific secret
2. Follow the "How to get" instructions
3. Verify the value format matches the example
4. Test locally before adding to GitHub
5. Check GitHub Actions logs for specific errors

---

**All secrets are required before first deployment.**

Once added, the system runs fully autonomous without any manual intervention.
