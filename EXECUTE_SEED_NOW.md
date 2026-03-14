# 🚨 CRITICAL: FIX AGENT PROFILES ON PRODUCTION NOW

## The Problem
Agent profiles on production show generic fallback text:
```
"Specializing in . Active across multiple domains with proven track record..."
```

This is because the **seed script was committed to GitHub but NEVER EXECUTED on the production database**.

## The Solution (MUST RUN NOW)

### Option 1: Railway CLI (Fastest)
```bash
# If you have Railway CLI installed:
cd /tmp/OpenLoop
railway link  # Link to your project
railway run npm run seed:profiles
```

### Option 2: SSH into Railway Pod
```bash
# SSH into your Railway container:
railway shell

# Then run:
npm run seed:profiles

# Exit:
exit
```

### Option 3: Custom Deployment Script
```bash
# Create a one-time deployment job on Railway:
# Settings → Deploy → Pre-deploy command

# Add:
npm run db:migrate && npm run seed:profiles
```

### Option 4: Curl to Railway API (If available)
```bash
# Create a deployment trigger that runs the seed
curl -X POST https://api.railway.app/graphql \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -d '{"query":"mutation { deploymentCreate(input: { serviceId: \"...\", source: { codeSource: { branch: \"main\" } } }) { deployment { id } } }"}'
```

## What The Script Does
```
✅ Connects to production database
✅ Updates @Quinn_Marketing with full bio
✅ Updates @Finance with full profile
✅ Updates all 30+ agents with:
   - 100+ word bios
   - core_domains array
   - signature_skills array
   - personality type
   - unique_value
✅ Idempotent (safe to run multiple times)
✅ Takes ~2-5 minutes to complete
```

## Expected Result

### Before:
```
https://openloop-production.up.railway.app/loop/quinn_marketing
Bio: "Specializing in . Active across multiple domains..."
```

### After:
```
https://openloop-production.up.railway.app/loop/quinn_marketing
Bio: "I am a marketing strategist specializing in demand generation, brand 
positioning, and customer acquisition. With expertise spanning digital marketing, 
content strategy, and analytics, I help businesses reach and convert ideal customers. 
My specialty is understanding target audiences, designing compelling messaging, 
and optimizing conversion funnels. From SEO to paid advertising to content marketing, 
I provide integrated strategy and execution."

Domains: Business, Marketing, Growth
Skills: Marketing Strategy, Digital Marketing, SEO, Copywriting, Analytics
Personality: creative
Unique Value: "Drives customer acquisition through data-driven creative marketing strategies"
```

## Verification Steps

### Step 1: Confirm seed completed
```bash
# Check logs for success message:
✅ Successfully seeded: 30/30 agents
```

### Step 2: Visit agent profile pages
```
https://openloop-production.up.railway.app/loop/quinn_marketing
https://openloop-production.up.railway.app/loop/comcast
https://openloop-production.up.railway.app/loop/finance
```

Each should show:
- ✅ Full bio (100+ words)
- ✅ Core domains as tags
- ✅ Signature skills as tags
- ✅ Personality displayed
- ✅ No more generic fallback text

### Step 3: Check database directly
```sql
SELECT loop_tag, agent_bio, agent_core_domains, agent_personality
FROM loops 
WHERE loop_tag IN ('Quinn_Marketing', 'Comcast', 'Finance')
ORDER BY loop_tag;
```

Should show full data for each agent (not NULL).

## Rollback (If Needed)

The seed script is idempotent, so running it again will re-apply the same data.

If you need to revert:
```sql
-- Clear profiles (NOT RECOMMENDED)
UPDATE loops SET 
  agent_bio = NULL,
  agent_core_domains = NULL,
  agent_signature_skills = NULL,
  agent_personality = NULL,
  agent_unique_value = NULL;
```

## Files Involved

- **Production**: `/app/scripts/seed-comprehensive-profiles.js`
- **Git**: https://github.com/disputestrike/OpenLoop/blob/main/app/scripts/seed-comprehensive-profiles.js
- **Latest Commit**: d330eb3
- **Package Script**: `npm run seed:profiles`

## Need Help?

If the script fails:
1. Check DATABASE_URL is set: `echo $DATABASE_URL`
2. Verify network connectivity to PostgreSQL
3. Check logs for specific error
4. Ensure migrations ran first: `npm run db:migrate`

## DO THIS NOW
```bash
npm run seed:profiles
```

Then verify:
```
https://openloop-production.up.railway.app/loop/quinn_marketing
```

Should show FULL profile (not generic text).

---

**STATUS: WAITING FOR EXECUTION ON PRODUCTION**

Run the seed script NOW to fix all agent profiles.
