# Production Demo Seeding - Complete Workflow Guide

**Last Updated:** January 20, 2026

This guide explains how to properly seed the production demo environment using Better Auth-integrated scripts.

---

## Table of Contents

1. [Deployment Targets](#deployment-targets)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Step-by-Step Workflow](#step-by-step-workflow)
5. [Cleanup & Reset](#cleanup--reset)
6. [Troubleshooting](#troubleshooting)
7. [Understanding the Scripts](#understanding-the-scripts)

---

## Deployment Targets

### Understanding Convex Deployments

Convex projects have separate **development** and **production** deployments:

- **Development (`dev`)**: Your local development environment
- **Production (`prod`)**: Your live production environment

### Targeting Development (Default)

By default, `npx convex run` commands target your **development** deployment:

```bash
# Runs against development deployment
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

### Targeting Production

To seed the **production** database, use the `--prod` flag:

```bash
# Runs against production deployment
npx convex run --prod scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

**⚠️ IMPORTANT WARNINGS:**

1. **Production seeds are permanent**: Only run production seeds when you're certain
2. **User must exist in production**: The owner email must be a real user who signed up through the production web UI
3. **Platform staff in production**: The user must be marked as platform staff in the production database
4. **Test in dev first**: Always test the seeding workflow in development before running in production
5. **Backup recommended**: Consider backing up your production database before seeding

### Checking Which Deployment You're Targeting

```bash
# Check your current Convex deployment configuration
npx convex dev --once

# This will show:
# - Development deployment URL
# - Production deployment URL (if configured)
```

### Recommended Workflow

1. **Test in Development First**:
   ```bash
   # Seed dev environment
   npx convex run scripts/seed/orchestrator:seedProductionDemo '{
     "ownerEmail": "dev-user@example.com"
   }'

   # Verify in dev
   npx convex run scripts/seed/orchestrator:verifyProductionDemo
   ```

2. **Then Seed Production** (when ready):
   ```bash
   # Seed production environment
   npx convex run --prod scripts/seed/orchestrator:seedProductionDemo '{
     "ownerEmail": "production-user@example.com"
   }'

   # Verify in production
   npx convex run --prod scripts/seed/orchestrator:verifyProductionDemo
   ```

---

## Prerequisites

### User Account Requirements

**CRITICAL:** Users MUST be created through Better Auth sign-up flow, NOT via backend scripts.

- ✅ Sign up through web UI (email/password or OAuth)
- ✅ User has authenticated successfully
- ✅ User can log in to the application
- ❌ Do NOT try to create users via backend scripts

### Platform Staff Status

The user who will own the demo organization must be platform staff:

```bash
# Development: Make user platform staff (run AFTER sign-up)
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "your-email@example.com"
}'

# Production: Add --prod flag
npx convex run --prod scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "your-email@example.com"
}'
```

### Verify Setup

```bash
# Development: Check current platform staff
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff

# Development: Verify user exists
npx convex run models/users:getUserByEmail '{
  "email": "your-email@example.com"
}'

# Production: Add --prod flag to commands above
npx convex run --prod scripts/bootstrapPlatformStaff:listPlatformStaff
npx convex run --prod models/users:getUserByEmail '{
  "email": "your-email@example.com"
}'
```

---

## Quick Start

If you have an existing user account that is platform staff:

### Development Environment

```bash
# 1. Seed demo environment (development)
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'

# 2. Verify seeding
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

### Production Environment

```bash
# 1. Seed demo environment (production)
npx convex run --prod scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'

# 2. Verify seeding
npx convex run --prod scripts/seed/orchestrator:verifyProductionDemo
```

**Note:** Always test in development first before seeding production!

---

## Step-by-Step Workflow

**Note:** The examples below show commands for development. For production, add the `--prod` flag to all `npx convex run` commands.

Example: `npx convex run --prod scripts/seed/orchestrator:seedProductionDemo ...`

### Step 1: Create User Account

**Option A: Web UI (Recommended)**

1. Navigate to your application in a web browser
2. Click "Sign Up" or "Create Account"
3. Complete sign-up with email/password or OAuth
4. Verify you can log in successfully

**Option B: OAuth**

1. Use "Sign in with Google" or "Sign in with Microsoft"
2. Complete OAuth flow
3. Verify authentication works

**What this creates:**
- ✅ User record in database
- ✅ Account record with hashed password (if email/password)
- ✅ Authentication capability
- ✅ Session tokens
- ✅ OAuth account link (if OAuth)

### Step 2: Grant Platform Staff Access

```bash
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "your-email@example.com"
}'
```

**Expected Output:**
```
{
  "success": true,
  "message": "Successfully set your-email@example.com as platform staff"
}
```

**What this does:**
- Sets `isPlatformStaff: true` on user record
- Grants cross-organization access
- Enables organization creation
- Allows access to platform admin panel

### Step 3: Seed Demo Environment

**Run the seeding script:**
```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

**What this creates:**
- ✅ Demo Club organization (via Better Auth adapter)
- ✅ You as owner with admin + coach functional roles (via Better Auth adapter)
- ✅ **You assigned as coach** to all 13 teams
- ✅ **You assigned as guardian** to all 10 players
- ✅ 13 teams across 3 sports (soccer, GAA football, rugby)
- ✅ 10 players distributed across development stages:
  - 3 beginner players (0-1 assessments)
  - 4 developing players (4-7 assessments)
  - 3 advanced players (12-18 assessments)
- ✅ ~80 skill assessments showing progression
- ✅ ~35 development goals with milestones
- ✅ 38 training session plans
- ✅ 10 medical profiles with varied health information (allergies, medications, conditions)
- ✅ ~10 injury records showing player injury history:
  - Beginners: No injuries (too new)
  - Developing: 0-1 healed injuries
  - Advanced: 1-3 injuries (mostly healed, possibly 1 recovering)

**Note:** The owner user will have full access as:
- Organization owner (full admin permissions)
- Coach for all teams (can view/manage all players)
- Guardian for all players (parent-level access)

**Expected Output:**
```
🌱 Starting production demo seed...
  Owner email: your-email@example.com

👤 Step 1: Finding user...
  ✓ Found user: Your Name
  ✓ User is platform staff

🏢 Step 2: Checking for existing demo organization...
  ⚡ Creating demo organization: Demo Club...
  ✅ Created organization: Demo Club
  ✅ Added your-email@example.com as owner

⚽ Step 3: Creating teams...
    ✅ Created team: U8 Soccer
    ✅ Created team: U10 GAA Girls
    ... (13 teams total)

👶 Step 4: Creating players...
    ✅ Created player: Liam Beginner (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 0 assessments, 2 goals
    ... (10 players total)

🏋️ Step 5: Creating session plans...
  ✅ Created 38 session plans

👥 Step 6: Assigning owner as coach and guardian...
  ✅ Assigned as coach to 13 teams
  ✅ Created guardian identity
  ✅ Created organization guardian profile
  ✅ Linked as guardian to 10 players

🏥 Step 7: Creating medical profiles...
  ✅ Created 10 medical profiles

🩹 Step 8: Creating injury records...
  ✅ Created 10 injury records

============================================================
✅ Production Demo Seed Complete!
============================================================
Teams:          13 created
Players:        10 created
Passports:      10 created
Assessments:    82 created
Goals:          36 created
Sessions:       38 created
Medical:        10 profiles created
Injuries:       10 records created
============================================================

Demo Organization: Demo Club
Slug: demo-club
Owner: your-email@example.com
URL: /orgs/k17abc123def456
============================================================
```

### Step 4: Verify Seeding

```bash
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

**Expected Output:**
```json
{
  "orgExists": true,
  "orgId": "k17abc123def456",
  "teamCount": 13,
  "playerCount": 10,
  "passportCount": 10,
  "assessmentCount": 82,
  "goalCount": 36,
  "sessionCount": 38,
  "medicalProfileCount": 10,
  "injuryCount": 10,
  "memberCount": 1,
  "stageDistribution": {
    "beginner": 3,
    "developing": 4,
    "advanced": 3
  }
}
```

### Step 5: Access Demo Environment

1. **Log in to your application**
   - Use the email/password or OAuth you signed up with

2. **Navigate to Demo Club**
   - Go to `/orgs/[orgId]` (use orgId from seeding output)
   - Or select "Demo Club" from organization switcher

3. **Verify Data Visibility**
   - See all 13 teams
   - See all 10 players
   - View player passports with assessments and goals
   - Access session plans
   - View medical profiles with emergency contacts, allergies, and medications
   - See injury records with recovery status and return-to-play protocols

4. **Test Platform Admin Access**
   - Navigate to platform admin panel
   - See "Demo Club" in organizations list
   - Verify member count shows 1

---

## Cleanup & Reset

### Remove Demo Data

Use this to completely remove all demo data from the database.

**⚠️ WARNING:** This is a destructive operation and cannot be undone!

#### Development Environment

```bash
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'
```

#### Production Environment

```bash
# Use with EXTREME CAUTION in production!
npx convex run --prod scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'
```

**What this removes:**
- ✅ All players and enrollments
- ✅ All passports, assessments, goals
- ✅ All session plans
- ✅ All medical profiles
- ✅ All injury records
- ✅ All teams
- ✅ Organization and members (via Better Auth adapter)

**What this preserves:**
- ✅ User accounts (authentication intact)
- ✅ Platform staff status

---

## Troubleshooting

**Note:** Add `--prod` flag to all commands below if troubleshooting production deployment issues.

### Problem: "User not found"

**Symptom:**
```json
{
  "success": false,
  "message": "User your-email@example.com not found. Please sign up through the web UI first..."
}
```

**Solution:**
1. Sign up through the web UI first
2. Verify you can log in
3. Then run the seeding script

### Problem: "User is not platform staff"

**Symptom:**
```json
{
  "success": false,
  "message": "User your-email@example.com is not platform staff. Run: npx convex run..."
}
```

**Solution:**
```bash
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "your-email@example.com"
}'
```

### Problem: Demo org not visible in UI

**Possible Causes:**
1. Not a member of the organization
2. Not logged in with correct account
3. Organization was deleted

**Solution:**
```bash
# 1. Verify seeding completed
npx convex run scripts/seed/orchestrator:verifyProductionDemo

# 2. If org doesn't exist, re-seed
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

### Problem: "Demo organization already exists"

**Symptom:**
```json
{
  "success": false,
  "message": "Demo organization already exists. Use resetProductionDemo first if you want to recreate it."
}
```

**Solution:**
```bash
# Reset existing demo data
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'

# Then re-seed
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

### Problem: TypeError about components.betterAuth.adapter

**Symptom:**
```
TypeError: Cannot read property 'adapter' of undefined
```

**Cause:** Missing import of `components`

**Solution:** This should be fixed in the corrected scripts. If you see this error:
1. Verify you're using the latest version of `orchestrator.ts`
2. Check that line 21 includes: `import { components, internal } from "../../_generated/api";`

---

## Understanding the Scripts

### orchestrator.ts

**Purpose:** Master seeding script that creates complete demo environment

**Key Functions:**
- `seedProductionDemo` - Main seeding function (requires ownerEmail)
- `verifyProductionDemo` - Verification query
- `resetProductionDemo` - Remove all demo data

**Better Auth Integration:**
- ✅ Uses `components.betterAuth.adapter.findOne` to find existing user
- ✅ Uses `components.betterAuth.adapter.create` to create organization
- ✅ Uses `components.betterAuth.adapter.create` to add member
- ✅ Uses `components.betterAuth.adapter.deleteOne` to remove organization

### passports.ts

**Purpose:** Generate realistic passport data for players

**Key Features:**
- Stage-based assessment generation (beginner/developing/advanced)
- Progressive skill ratings showing improvement
- Age-appropriate development goals
- Realistic milestone tracking

### helpers/playerStages.ts

**Purpose:** Stage configuration and data generation utilities

**Stage Definitions:**
- Beginner: 0-1 assessments, ratings 1-2, basic goals
- Developing: 4-7 assessments, ratings 2-4, in-progress goals
- Advanced: 12-18 assessments, ratings 3-5, completed goals

---

## Architecture Notes

### Why Better Auth Adapter?

**Wrong (Old Way):**
```typescript
await ctx.db.insert("organizations", { name: "Demo Club", ... });
await ctx.db.insert("members", { userId, organizationId, ... });
```

**Right (New Way):**
```typescript
await ctx.runMutation(components.betterAuth.adapter.create, {
  input: { model: "organization", data: { name: "Demo Club", ... } }
});
await ctx.runMutation(components.betterAuth.adapter.create, {
  input: { model: "member", data: { userId, organizationId, ... } }
});
```

**Why it matters:**
- Better Auth manages authentication state
- Queries use Better Auth filters
- UI components use Better Auth hooks
- Data must be visible through Better Auth's lens

### Role System

**Better Auth Organization Roles:**
- `owner` - Full access to organization
- `admin` - Manage teams, players, users
- `member` - View-only access

**Functional Roles (Application-Specific):**
- `coach` - Assess players, create goals, voice notes
- `parent` - View linked children only
- `admin` - User management, settings
- `player` - Self-access (18+ players)

**Platform Staff:**
- Cross-organization access
- Create organizations
- Platform-wide admin tools

---

## Testing Checklist

### Backend Verification

- [ ] User exists via `getUserByEmail`
- [ ] User has `isPlatformStaff: true`
- [ ] Organization exists via Better Auth adapter query
- [ ] User is member with "owner" role
- [ ] 13 teams exist
- [ ] 10 players exist
- [ ] ~80 assessments exist
- [ ] ~35 goals exist
- [ ] 38 session plans exist
- [ ] 10 medical profiles exist
- [ ] ~10 injury records exist

### Frontend Verification

- [ ] Can log in with seeded user email
- [ ] See "Demo Club" in organization selector
- [ ] Navigate to `/orgs/[orgId]` successfully
- [ ] See all 13 teams in teams list
- [ ] See all 10 players in players list
- [ ] Can view player passports
- [ ] See assessment history
- [ ] See development goals
- [ ] Access session plans
- [ ] View medical profiles with emergency contacts
- [ ] See injury records with status and recovery details
- [ ] Platform admin panel shows Demo Club

### Platform Admin Verification

- [ ] Navigate to platform admin panel
- [ ] See "Demo Club" in organizations list
- [ ] Member count shows correctly (1)
- [ ] Can view organization details
- [ ] Organization appears in "Join Organization" list

---

## Production Seeding Best Practices

### Pre-Production Checklist

Before seeding production, ensure:

- [ ] **Tested in development**: Run the complete seeding workflow in dev first
- [ ] **User account exists**: The production user has signed up through the production web UI
- [ ] **User can log in**: Verified the production user can authenticate successfully
- [ ] **Platform staff set**: The user is marked as platform staff in production
- [ ] **Convex dashboard access**: You have access to the production Convex dashboard to monitor execution
- [ ] **Backup plan**: You know how to run `resetProductionDemo` if needed

### Production Seeding Workflow

```bash
# 1. Verify user exists in production
npx convex run --prod models/users:getUserByEmail '{
  "email": "production-user@example.com"
}'

# 2. Ensure user is platform staff
npx convex run --prod scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "production-user@example.com"
}'

# 3. Verify platform staff status
npx convex run --prod scripts/bootstrapPlatformStaff:listPlatformStaff

# 4. Seed the production demo data
npx convex run --prod scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "production-user@example.com"
}'

# 5. Verify seeding completed successfully
npx convex run --prod scripts/seed/orchestrator:verifyProductionDemo

# 6. Log in to production UI and manually verify data visibility
```

### Monitoring Production Seeding

1. **Convex Dashboard**: Monitor function execution in real-time
   - Go to: `https://dashboard.convex.dev`
   - Select your production deployment
   - Watch the "Functions" tab during seeding

2. **Check for Errors**: Look for red error indicators in the dashboard

3. **Verify Counts**: After seeding, the verify command should show:
   - 13 teams
   - 10 players
   - 10 passports
   - ~80 assessments
   - ~35 goals
   - 38 session plans
   - 10 medical profiles
   - ~10 injury records

### Production Cleanup

If you need to remove demo data from production:

```bash
# WARNING: This is IRREVERSIBLE in production!
npx convex run --prod scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'
```

**Before running cleanup in production:**
1. Confirm this is what you want (data cannot be recovered)
2. Consider taking a manual backup via Convex dashboard if needed
3. Notify your team if this affects shared demo data

### Common Production Issues

**Issue: Different data than development**
- **Cause**: Production and development are separate databases
- **Solution**: Users, teams, and data are independent between deployments

**Issue: Seeding hangs or times out**
- **Cause**: Production may have more data, slower network
- **Solution**: Monitor in Convex dashboard, wait for completion (can take 30-60 seconds)

**Issue: Cannot see demo data after seeding**
- **Cause**: Logged in with wrong account or wrong deployment
- **Solution**: Ensure you're logged into production UI with the owner email you used for seeding

---

## Support

If you encounter issues not covered in this guide:

1. Run `previewCleanup` to diagnose the problem
2. Check the review document at `/docs/archive/bug-fixes/SEEDING_BETTER_AUTH_INTEGRATION_REVIEW_JAN_2026.md`
3. Verify Better Auth is properly configured
4. Check Convex dashboard for errors

---

**Document Version:** 2.0.0
**Compatible with:** Better Auth + Convex Integration (Dev & Production)
**Last Updated:** January 20, 2026
**Includes:** Production deployment instructions, medical profiles, injury tracking
