# Production Demo Seeding - UAT Guide

**Last Updated:** January 21, 2026
**Purpose:** User Acceptance Testing guide for production demo database seeding
**Status:** Ready for UAT Testing
**Changes:** Updated for 60 players (10 per team), 6 teams, whole number ratings, 50 session plans

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Prerequisites](#prerequisites)
4. [Seeding Process](#seeding-process)
5. [Verification Procedures](#verification-procedures)
6. [Rollback & Cleanup](#rollback--cleanup)
7. [Troubleshooting](#troubleshooting)
8. [UAT Test Checklist](#uat-test-checklist)

---

## Overview

### What is Production Demo Seeding?

The production demo seeding system creates a complete, realistic demonstration environment for PlayerARC. This helps:

- **New clubs** understand the platform's capabilities
- **Sales/demos** showcase the full feature set
- **Testing** validate that all systems work correctly
- **Training** provide a realistic environment for learning

### What Gets Created?

When you run the production demo seed, it creates:

- ✅ **1 Demo Organization** - "Demo Club" with multi-sport support
- ✅ **6 Teams** - 2 teams per sport across soccer, GAA football, and rugby (U10, U12, U14, U16)
- ✅ **60 Players** - 10 players per team, distributed across 3 development stages:
  - 18 beginner players (0-1 assessments each)
  - 24 developing players (2-3 assessments each)
  - 18 advanced players (4-6 assessments each)
- ✅ **~780-820 Skill Assessments** - With **whole number ratings only (1, 2, 3, 4, 5)**, showing realistic progression over time
- ✅ **~145-155 Development Goals** - With milestones and progress tracking (2-3 goals per player)
- ✅ **50 Training Session Plans** - Diverse plans across sports and age groups
- ✅ **60 Medical Profiles** - With varied health information
- ✅ **~35-50 Injury Records** - Historical and current injuries

### Critical: Better Auth Integration

**IMPORTANT:** This seeding system is fully integrated with Better Auth authentication. This means:

- Organizations are visible in the "Join Organization" flow
- Members have proper authentication and permissions
- Data is accessible through Better Auth queries
- Users can actually log in and access the demo organization

---

## How It Works

### Better Auth Architecture

PlayerARC uses **Better Auth** for authentication and organization management. Understanding this is critical:

```
┌─────────────────────────────────────────────────────────┐
│ AUTHENTICATION LAYER (Better Auth)                       │
│ - User sign-up (email/password, OAuth)                  │
│ - Session management                                     │
│ - Organization multi-tenancy                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ DATA LAYER (Convex via Better Auth Adapter)             │
│ - Store organizations, members, teams                    │
│ - Query through adapter for proper filtering            │
└─────────────────────────────────────────────────────────┘
```

### Key Principle: Users MUST Sign Up First

**You CANNOT create users from backend scripts.** Users must go through the Better Auth sign-up flow to create proper authentication records (password hash, session capability, etc.).

The seeding script requires an **existing authenticated user** who will own the demo organization.

### What the Script Does

1. **Finds existing user** via email (must be signed up already)
2. **Verifies platform staff** status (must be granted beforehand)
3. **Creates organization** via Better Auth adapter (not direct database insert)
4. **Adds user as owner** via Better Auth adapter (with admin + coach roles)
5. **Creates teams** via Better Auth adapter
6. **Creates players** with realistic data
7. **Generates passports** with assessments based on development stage
8. **Creates goals** with appropriate progress and milestones
9. **Seeds session plans** with usage patterns and feedback

---

## Prerequisites

### 1. User Account Setup

**Before running the seeding script, you MUST have an authenticated user account.**

#### Option A: Sign Up via Web UI (Recommended)

1. Navigate to your application URL
2. Click "Sign Up" or "Create Account"
3. Complete sign-up with email/password or OAuth (Google/Microsoft)
4. Verify you can log in successfully
5. Note your email address for later use

#### Option B: OAuth Sign-Up

1. Click "Sign in with Google" or "Sign in with Microsoft"
2. Complete OAuth flow
3. Verify authentication works
4. Note your email address

### 2. Grant Platform Staff Access

Once you have an authenticated user, grant platform staff status:

```bash
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "your-email@example.com"
}'
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Successfully set your-email@example.com as platform staff"
}
```

### 3. Verify Prerequisites

Check that your user exists and has correct permissions:

```bash
# Check user exists
npx convex run models/users:getUserByEmail '{
  "email": "your-email@example.com"
}'

# List all platform staff
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

---

## Seeding Process

### Step 1: Run Production Demo Seed

Run the seeding script with your authenticated user's email:

```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

**Replace `your-email@example.com`** with the email address of your authenticated user.

**Note:** If a demo organization already exists, the script will return an error. See the troubleshooting section for how to reset and re-seed.

### Step 2: Watch the Output

The script will provide detailed progress output:

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

============================================================
✅ Production Demo Seed Complete!
============================================================
Teams:         13 created
Players:       10 created
Passports:     10 created
Assessments:   82 created
Goals:         36 created
Sessions:      38 created
============================================================

Demo Organization: Demo Club
Slug: demo-club
Owner: your-email@example.com
URL: /orgs/k17abc123def456
============================================================
```

**IMPORTANT:** Save the organization ID (`k17abc123def456` in the example) - you'll need it for accessing the demo club.

---

## Verification Procedures

### Backend Verification

#### Quick Verification Command

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
  "memberCount": 1,
  "stageDistribution": {
    "beginner": 3,
    "developing": 4,
    "advanced": 3
  }
}
```

#### Verification Checklist

- [ ] `orgExists: true` - Organization was created
- [ ] `teamCount: 13` - All teams created
- [ ] `playerCount: 10` - All players created
- [ ] `assessmentCount: ~80` - Assessments generated
- [ ] `goalCount: ~35` - Goals created
- [ ] `sessionCount: 38` - Session plans seeded
- [ ] `memberCount: 1` - You are a member
- [ ] Stage distribution: 3 beginner, 4 developing, 3 advanced

### Frontend Verification

#### 1. Log In

1. Navigate to your application
2. Log in with the email/password or OAuth you used
3. You should be automatically logged in

#### 2. Access Demo Club

**Option A: Via Organization Selector**
1. Look for organization selector/switcher in navigation
2. You should see "Demo Club" in the list
3. Click to switch to Demo Club

**Option B: Direct URL**
1. Navigate to `/orgs/[orgId]` (use the orgId from seeding output)
2. You should land on the Demo Club dashboard

#### 3. Verify Teams

1. Navigate to Teams page
2. **Expected:** See 13 teams listed
3. **Check:** Teams across different sports (Soccer, GAA Football, Rugby)
4. **Check:** Age groups from U8 to U18

#### 4. Verify Players

1. Navigate to Players page
2. **Expected:** See 10 players listed
3. **Check:** Players have different assessment counts (0-1, 4-7, 12-18)
4. **Check:** Sort by "Assessment Count" shows clear grouping

#### 5. Test Player Passport - Beginner

1. Open "Liam Beginner" player profile
2. Navigate to passport view
3. **Expected:**
   - 0 or 1 assessments
   - 2-3 basic goals with 0-10% progress
   - Status: "not_started"
   - Coach notes: "New to club" or similar

#### 6. Test Player Passport - Developing

1. Open "Sophia Progress" player profile
2. Navigate to passport view
3. **Expected:**
   - 4-7 assessments showing progression
   - Skill ratings in 2-4 range
   - 4-5 goals with 30-70% progress
   - Some milestones completed
   - Status: "in_progress"

#### 7. Test Player Passport - Advanced

1. Open "Mason Elite" player profile
2. Navigate to passport view
3. **Expected:**
   - 12-18 assessments showing upward trend
   - Skill ratings in 3-5 range (multiple 5s)
   - 3-4 goals, mix of completed and advanced
   - Multiple team badges (plays on multiple teams)
   - High completion rates

#### 8. Verify Training Sessions

1. Navigate to Training Sessions / Session Plans page
2. **Expected:** See 35-40 session plans
3. **Check:** Filter by sport works (Soccer, GAA Football, Rugby)
4. **Check:** Filter by age group works (U8-U18)
5. **Check:** Some plans show "Times Used" counts (8-12, 2-4, 0-1)
6. **Check:** Some plans have feedback/ratings

#### 9. Platform Admin Verification (CRITICAL)

**This is the key test to confirm Better Auth integration works correctly.**

1. Navigate to platform admin panel
2. Click "Organizations" or similar menu
3. **CRITICAL CHECK:** "Demo Club" appears in the organizations list
4. **Expected:** Member count shows 1
5. **Expected:** You can view organization details
6. Navigate to "Join Organization" flow
7. **CRITICAL CHECK:** "Demo Club" appears in the list of organizations to join

**If Demo Club does NOT appear in platform admin or "Join Organization" list:**
- ❌ The seeding did not work correctly
- ❌ Organization was created via direct insert (bypassing Better Auth)
- ❌ You need to run cleanup and re-seed

---

## Rollback & Cleanup

### Reset Production Demo

To remove the demo organization and all related data:

```bash
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'
```

**What This Removes:**
- ✅ All players and enrollments
- ✅ All passports, assessments, goals
- ✅ All session plans
- ✅ All teams
- ✅ Organization and members (via Better Auth adapter)

**What This Preserves:**
- ✅ User accounts (authentication intact)
- ✅ Platform staff status

**Expected Output:**
```
🧹 Starting production demo reset...

Finding demo organization...
  ✓ Found organization: Demo Club (k17abc123def456)

Deleting data...
  🗑️  Deleted 36 goals
  🗑️  Deleted 82 assessments
  🗑️  Deleted 10 passports
  🗑️  Deleted 38 session plans
  🗑️  Deleted 15 team assignments
  🗑️  Deleted 10 player enrollments
  🗑️  Deleted 13 teams
  🗑️  Deleted organization: Demo Club
  🗑️  Deleted 1 member

============================================================
✅ Production Demo Reset Complete!
============================================================
Deleted:
  - 1 organization
  - 13 teams
  - 1 member
  - 10 players
  - 10 passports
  - 82 assessments
  - 36 goals
  - 38 sessions
============================================================
```

### Verify Cleanup Completed

After running cleanup, verify everything was removed:

```bash
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

**Expected Output After Cleanup:**
```json
{
  "orgExists": false,
  "orgId": null,
  "teamCount": 0,
  "playerCount": 0,
  "passportCount": 0,
  "assessmentCount": 0,
  "goalCount": 0,
  "sessionCount": 0,
  "memberCount": 0,
  "stageDistribution": {
    "beginner": 0,
    "developing": 0,
    "advanced": 0
  }
}
```

---

## Troubleshooting

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
1. Organization created via direct insert (old script)
2. Not a member of the organization
3. Not logged in with correct account

**Solution:**
```bash
# 1. Preview what's wrong
npx convex run scripts/seed/cleanupIncorrectData:previewCleanup

# 2. Clean up incorrect data
npx convex run scripts/seed/cleanupIncorrectData:cleanupIncorrectData '{
  "confirmCleanup": true
}'

# 3. Re-seed with correct email
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'
```

### Problem: Demo org doesn't appear in "Join Organization" list

**This should not happen with the corrected seeding script.**

**Diagnosis:**
```bash
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

**If verification shows the org exists but it's not visible:**
1. Verify you're logged in with the correct user account
2. Check that you're a member of the Demo Club organization
3. Try logging out and back in

**If the issue persists:**
```bash
# Reset and re-seed
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'

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

Either keep the existing demo org, or reset it first:
```bash
# Option A: Reset and re-seed
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'

npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "your-email@example.com"
}'

# Option B: Just verify the existing one is correct
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

### Problem: Index not found errors

**Symptom:**
```
Error: Index sessionPlans.by_organizationId not found
```

**This should be fixed in the latest version.** If you see this:

1. The scripts have been updated to use correct index names
2. Make sure you're using the latest version of the scripts
3. If issue persists, contact development team

---

## UAT Test Checklist

### Pre-Test Setup

- [ ] User account created via web UI sign-up
- [ ] User can log in successfully
- [ ] User granted platform staff status
- [ ] Verified user exists via `getUserByEmail`
- [ ] Verified platform staff status via `listPlatformStaff`

### Seeding Phase

- [ ] Ran `previewCleanup` - no existing demo data
- [ ] Ran `seedProductionDemo` with correct owner email
- [ ] Seeding completed successfully (no errors)
- [ ] Noted organization ID from output

### Backend Verification

- [ ] Ran `verifyProductionDemo` - all counts correct
- [ ] `orgExists: true`
- [ ] `teamCount: 13`
- [ ] `playerCount: 10`
- [ ] `assessmentCount: ~80`
- [ ] `goalCount: ~35`
- [ ] `sessionCount: 38`
- [ ] `memberCount: 1`
- [ ] Stage distribution: 3/4/3

### Frontend Verification - Basic Access

- [ ] Logged in successfully
- [ ] Demo Club appears in organization selector
- [ ] Can navigate to Demo Club via selector
- [ ] Can navigate to Demo Club via direct URL `/orgs/[orgId]`
- [ ] Dashboard loads without errors

### Frontend Verification - Teams

- [ ] Teams page shows 13 teams
- [ ] Teams include Soccer, GAA Football, Rugby
- [ ] Age groups range from U8 to U18
- [ ] Can view individual team details

### Frontend Verification - Players

- [ ] Players page shows 10 players
- [ ] Can sort/filter by assessment count
- [ ] Players grouped by stage (beginner/developing/advanced)
- [ ] Can view individual player profiles

### Frontend Verification - Player Passports

**Beginner Player ("Liam Beginner"):**
- [ ] 0-1 assessments
- [ ] 2-3 basic goals
- [ ] Progress 0-10%
- [ ] Status: "not_started"
- [ ] Coach notes present

**Developing Player ("Sophia Progress"):**
- [ ] 4-7 assessments
- [ ] Skill ratings 2-4 range
- [ ] 4-5 goals with 30-70% progress
- [ ] Some milestones completed
- [ ] Status: "in_progress"

**Advanced Player ("Mason Elite"):**
- [ ] 12-18 assessments
- [ ] Skill ratings 3-5 range
- [ ] Multiple team badges
- [ ] 3-4 goals, some completed
- [ ] High completion rates

### Frontend Verification - Training Sessions

- [ ] Session plans page shows 35-40 plans
- [ ] Filter by sport works
- [ ] Filter by age group works
- [ ] Some plans show usage counts
- [ ] Some plans have feedback/ratings

### Platform Admin Verification (CRITICAL)

- [ ] **Platform admin panel accessible**
- [ ] **"Demo Club" appears in organizations list**
- [ ] **Member count shows 1**
- [ ] **Can view organization details**
- [ ] **"Join Organization" flow shows Demo Club**

**⚠️ If ANY of these fail, Better Auth integration is broken - escalate immediately**

### Cleanup Phase

- [ ] Ran `previewCleanup` to preview deletion
- [ ] Preview shows correct counts
- [ ] Ran `resetProductionDemo` or `cleanupIncorrectData`
- [ ] Cleanup completed successfully
- [ ] Ran `verifyProductionDemo` - all counts now 0
- [ ] Demo Club no longer appears in UI
- [ ] Demo Club no longer in platform admin
- [ ] User account still exists and can log in
- [ ] Platform staff status preserved

### Re-Seed Test (Optional)

- [ ] Ran `seedProductionDemo` again after cleanup
- [ ] Second seed completed successfully
- [ ] Verification shows correct counts again
- [ ] Organization accessible in UI
- [ ] **Idempotency confirmed: Can seed, clean, re-seed successfully**

---

## Success Criteria

### Must Pass (Blocking Issues if Fail)

1. ✅ User can sign up and log in
2. ✅ Platform staff status can be granted
3. ✅ Seeding completes without errors
4. ✅ All counts match expected values
5. ✅ **Demo Club appears in platform admin organizations list**
6. ✅ **Demo Club appears in "Join Organization" flow**
7. ✅ User can access Demo Club via UI
8. ✅ All players visible with correct data
9. ✅ Passports show correct stage data
10. ✅ Cleanup removes all demo data
11. ✅ User account and platform staff status preserved after cleanup
12. ✅ Can re-seed after cleanup (idempotent)

### Should Pass (Non-Blocking but Important)

1. ✅ Session plans show usage patterns
2. ✅ Goals show realistic progress
3. ✅ Assessments show progression over time
4. ✅ Multi-team players show all team badges
5. ✅ Coach notes are realistic and helpful

---

## Notes for UAT Testers

### What to Look For

1. **Better Auth Integration**: The most critical aspect is that Demo Club appears in platform admin and "Join Organization" flow. If it doesn't, the integration is broken.

2. **Realistic Data**: The data should look realistic - not random. Players should show clear progression, goals should be age-appropriate, etc.

3. **Data Consistency**: All foreign keys should work - clicking on a team should show its players, etc.

4. **Idempotency**: You should be able to seed, clean up, and re-seed multiple times without issues.

### Common Pitfalls

1. **Forgetting to sign up first**: The script requires an existing authenticated user - you can't skip this step.

2. **Not granting platform staff**: The user must be platform staff to own organizations.

3. **Using wrong email**: Make sure the email you pass to `seedProductionDemo` exactly matches your authenticated user's email.

4. **Not checking platform admin**: This is the most important verification step - if Demo Club doesn't appear here, the seeding failed.

### Reporting Issues

If you encounter issues during UAT, please report:

1. **Exact command run** (copy/paste from terminal)
2. **Full error output** (screenshots or copy/paste)
3. **What you expected to happen**
4. **What actually happened**
5. **Output of `verifyProductionDemo`** (if seeding appeared to complete)
6. **Whether Demo Club appears in platform admin** (critical data point)

---

## Additional Resources

### Related Documentation

- **Complete Workflow Guide**: `/packages/backend/convex/scripts/seed/README.md`
- **Testing Guide**: `/packages/backend/convex/scripts/seed/TESTING_GUIDE.md`
- **Technical Review**: `/docs/archive/bug-fixes/SEEDING_BETTER_AUTH_INTEGRATION_REVIEW_JAN_2026.md`
- **Better Auth Integration**: [Better Auth Docs](https://www.better-auth.com/llms.txt/docs/plugins/organization.md)

### Quick Command Reference

```bash
# Prerequisites
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "your-email@example.com"}'
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff

# Seeding
npx convex run scripts/seed/orchestrator:seedProductionDemo '{"ownerEmail": "your-email@example.com"}'
npx convex run scripts/seed/orchestrator:verifyProductionDemo

# Cleanup
npx convex run scripts/seed/orchestrator:resetProductionDemo '{"confirmReset": true}'
```

---

**Document Version:** 1.0.0
**Last Updated:** January 20, 2026
**UAT Status:** Ready for Testing
**Author:** Claude Code
**Reviewed By:** [Pending UAT]
