# Production Demo Seeding - Testing Guide

**Date:** January 20, 2026
**Purpose:** Step-by-step testing instructions for the corrected Better Auth-integrated seeding workflow

---

## Overview

This guide will walk you through testing the complete seeding workflow from scratch. Follow each step in order and verify the expected outcomes.

**Estimated Time:** 15-20 minutes

---

## Prerequisites

- [ ] Dev server is running (`npm run dev`)
- [ ] Convex is deployed and running
- [ ] You have access to the web UI
- [ ] You have terminal access for running Convex commands

---

## Phase 1: Clean Slate

### Step 1.1: Preview Existing Data

```bash
npx convex run scripts/seed/cleanupIncorrectData:previewCleanup
```

**Expected Output:**

**Scenario A: No demo data exists**
```json
{
  "demoOrgExists": false,
  "itemsToClean": { ... all zeros ... },
  "recommendations": ["ℹ️  No demo organization found - nothing to clean"]
}
```
→ **Action:** Skip to Phase 2

**Scenario B: Incorrectly seeded data exists**
```json
{
  "demoOrgExists": true,
  "demoOrgCreatedViaDirectInsert": true,
  "itemsToClean": {
    "organizations": 1,
    "teams": 13,
    "members": 1,
    "players": 10,
    ...
  },
  "recommendations": [
    "❌ Demo org was created via direct insert (bypasses Better Auth)",
    "✅ Run cleanupIncorrectData to remove incorrectly created data"
  ]
}
```
→ **Action:** Continue to Step 1.2

**Scenario C: Correctly seeded data exists**
```json
{
  "demoOrgExists": true,
  "demoOrgCreatedViaDirectInsert": false,
  "betterAuthOrgExists": true,
  "recommendations": [
    "✅ Demo org exists and was created correctly via Better Auth",
    "No cleanup needed for organization"
  ]
}
```
→ **Action:** Skip to Phase 4 (verification) or run reset first

### Step 1.2: Clean Up Incorrect Data (if needed)

```bash
npx convex run scripts/seed/cleanupIncorrectData:cleanupIncorrectData '{
  "confirmCleanup": true
}'
```

**Expected Output:**
```
🧹 Starting cleanup of incorrectly seeded data...
  Found demo org: Demo Club (ID: ...)
  🗑️  Deleting goals...
  🗑️  Deleting assessments...
  🗑️  Deleting passports...
  🗑️  Deleting session plans...
  🗑️  Deleting team assignments...
  🗑️  Deleting player enrollments...
  🗑️  Deleting members...
  🗑️  Deleting teams...
  🗑️  Deleting organization...

============================================================
✅ Cleanup Complete!
============================================================
Organizations: 1 deleted
Teams:         13 deleted
Members:       1 deleted
Players:       10 deleted
Passports:     10 deleted
Assessments:   82 deleted
Goals:         36 deleted
Sessions:      38 deleted
============================================================
```

**Verify:**
- [ ] All stats show deleted items
- [ ] Success message displayed
- [ ] No errors in output

---

## Phase 2: User Account Setup

### Step 2.1: Check if User Exists

```bash
npx convex run models/users:getUserByEmail '{
  "email": "jkobrien@gmail.com"
}'
```

**Expected Output:**

**Scenario A: User exists**
```json
{
  "_id": "...",
  "email": "jkobrien@gmail.com",
  "name": "John O'Brien",
  "isPlatformStaff": true,
  ...
}
```
→ **Action:** Skip to Phase 3

**Scenario B: User does not exist**
```json
null
```
→ **Action:** Continue to Step 2.2

### Step 2.2: Create User Account (if needed)

**⚠️ IMPORTANT:** Users MUST be created through the web UI, not via scripts.

1. **Open web browser** and navigate to your app
2. **Click "Sign Up"** or "Create Account"
3. **Enter details:**
   - Email: `jkobrien@gmail.com`
   - Password: (choose secure password)
   - Name: John O'Brien
4. **Complete sign-up flow**
5. **Verify you can log in**

**Verify:**
- [ ] Account created successfully
- [ ] Can log in with credentials
- [ ] Redirected to dashboard or app home

### Step 2.3: Grant Platform Staff Status

```bash
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{
  "email": "jkobrien@gmail.com"
}'
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Successfully set jkobrien@gmail.com as platform staff"
}
```

**Verify:**
- [ ] Success is true
- [ ] Message confirms platform staff assignment

### Step 2.4: Verify Platform Staff Status

```bash
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

**Expected Output:**
```json
{
  "platformStaff": [
    {
      "email": "jkobrien@gmail.com",
      "name": "John O'Brien"
    }
  ],
  "totalUsers": 1
}
```

**Verify:**
- [ ] Your email appears in platformStaff array
- [ ] totalUsers >= 1

---

## Phase 3: Seeding Demo Environment

### Step 3.1: Run Seeding Script

```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "jkobrien@gmail.com"
}'
```

**Expected Output:**
```
🌱 Starting production demo seed...
  Owner email: jkobrien@gmail.com

👤 Step 1: Finding user...
  ✓ Found user: John O'Brien
  ✓ User is platform staff

🏢 Step 2: Checking for existing demo organization...
  ⚡ Creating demo organization: Demo Club...
  ✅ Created organization: Demo Club
  ✅ Added jkobrien@gmail.com as owner

⚽ Step 3: Creating teams...
    ✅ Created team: U8 Soccer
    ✅ Created team: U10 GAA Girls
    ✅ Created team: U10 Rugby
    ✅ Created team: U12 Soccer Girls
    ✅ Created team: U12 GAA
    ✅ Created team: U14 Soccer Girls
    ✅ Created team: U14 Rugby
    ✅ Created team: U14 GAA
    ✅ Created team: U16 GAA
    ✅ Created team: U16 Rugby
    ✅ Created team: U16 Soccer
    ✅ Created team: U18 Soccer
    ✅ Created team: U18 GAA

👶 Step 4: Creating players...
    ✅ Created player: Liam Beginner (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 0 assessments, 2 goals
    ✅ Created player: Emma Novice (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 1 assessments, 3 goals
    ✅ Created player: Noah Starter (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 0 assessments, 2 goals
    ✅ Created player: Sophia Progress (developing)
      📋 Generating passport data (developing)...
      ✅ Passport: 5 assessments, 4 goals
    ✅ Created player: Oliver Growth (developing)
      📋 Generating passport data (developing)...
      ✅ Passport: 6 assessments, 5 goals
    ✅ Created player: Ava Improving (developing)
      📋 Generating passport data (developing)...
      ✅ Passport: 4 assessments, 4 goals
    ✅ Created player: Ethan Developing (developing)
      📋 Generating passport data (developing)...
      ✅ Passport: 7 assessments, 5 goals
    ✅ Created player: Mason Elite (advanced)
      📋 Generating passport data (advanced)...
      ✅ Passport: 18 assessments, 3 goals
    ✅ Created player: Isabella Advanced (advanced)
      📋 Generating passport data (advanced)...
      ✅ Passport: 15 assessments, 4 goals
    ✅ Created player: Lucas Expert (advanced)
      📋 Generating passport data (advanced)...
      ✅ Passport: 20 assessments, 3 goals

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
Owner: jkobrien@gmail.com
URL: /orgs/k17abc123def456
============================================================
```

**Verify:**
- [ ] ✓ Found user successfully
- [ ] ✓ User is platform staff
- [ ] ✅ Created organization
- [ ] ✅ Added user as owner
- [ ] ✅ Created all 13 teams
- [ ] ✅ Created all 10 players with correct stages
- [ ] ✅ Assessment counts match stages:
  - Beginner: 0-1 assessments
  - Developing: 4-7 assessments
  - Advanced: 12-20 assessments
- [ ] ✅ Created 38 session plans
- [ ] **SAVE THE ORG ID** from the output (e.g., `k17abc123def456`)

---

## Phase 4: Backend Verification

### Step 4.1: Verify Demo Data

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

**Verify:**
- [ ] orgExists: true
- [ ] teamCount: 13
- [ ] playerCount: 10
- [ ] passportCount: 10
- [ ] assessmentCount: ~80 (will vary slightly)
- [ ] goalCount: ~35 (will vary slightly)
- [ ] sessionCount: 38
- [ ] memberCount: 1
- [ ] stageDistribution matches 3/4/3 split

### Step 4.2: Check Organization via Better Auth

```bash
npx convex run models/organizations:getAllOrganizations
```

**Expected Output:**
```json
[
  {
    "_id": "k17abc123def456",
    "name": "Demo Club",
    "slug": "demo-club",
    "logo": null,
    "createdAt": 1737360000000,
    "memberCount": 1
  }
]
```

**Verify:**
- [ ] Demo Club appears in list
- [ ] Has correct slug: "demo-club"
- [ ] memberCount: 1

---

## Phase 5: Frontend Verification

### Step 5.1: Log In to Application

1. Open web browser
2. Navigate to your application
3. Log in with `jkobrien@gmail.com` and your password

**Verify:**
- [ ] Login successful
- [ ] Redirected to dashboard/home

### Step 5.2: Access Demo Organization

**Option A: Via Organization Selector**
1. Look for organization selector/switcher in UI
2. Click to open dropdown
3. Select "Demo Club"

**Option B: Direct URL**
1. Navigate to `/orgs/[orgId]` (use orgId from seeding output)

**Verify:**
- [ ] Can access Demo Club
- [ ] No permission errors
- [ ] Organization dashboard loads

### Step 5.3: Verify Teams

1. Navigate to Teams page (e.g., `/orgs/[orgId]/admin/teams` or `/orgs/[orgId]/coach/teams`)
2. View teams list

**Expected to see:**
- [ ] U8 Soccer
- [ ] U10 GAA Girls
- [ ] U10 Rugby
- [ ] U12 Soccer Girls
- [ ] U12 GAA
- [ ] U14 Soccer Girls
- [ ] U14 Rugby
- [ ] U14 GAA
- [ ] U16 GAA
- [ ] U16 Rugby
- [ ] U16 Soccer
- [ ] U18 Soccer
- [ ] U18 GAA

**Total:** 13 teams

### Step 5.4: Verify Players

1. Navigate to Players page (e.g., `/orgs/[orgId]/admin/players` or `/orgs/[orgId]/coach/players`)
2. View players list

**Expected to see 10 players:**

**Beginner (3 players):**
- [ ] Liam Beginner
- [ ] Emma Novice
- [ ] Noah Starter

**Developing (4 players):**
- [ ] Sophia Progress
- [ ] Oliver Growth
- [ ] Ava Improving
- [ ] Ethan Developing

**Advanced (3 players):**
- [ ] Mason Elite
- [ ] Isabella Advanced
- [ ] Lucas Expert

### Step 5.5: Verify Player Passports

**Test Beginner Player:**
1. Click on "Liam Beginner"
2. View player passport

**Expected to see:**
- [ ] Player name and details
- [ ] 0-1 assessments (or none)
- [ ] 2-3 basic goals (e.g., "Master basic ball control")
- [ ] Goals with 0-10% progress
- [ ] Goals in "not_started" status

**Test Developing Player:**
1. Click on "Sophia Progress"
2. View player passport

**Expected to see:**
- [ ] 4-7 assessments showing progression
- [ ] Skill ratings in 2-4 range
- [ ] 4-5 goals in "in_progress" status
- [ ] Goals with 30-70% progress
- [ ] Some milestones

**Test Advanced Player:**
1. Click on "Mason Elite"
2. View player passport

**Expected to see:**
- [ ] 12-20 assessments with upward trend
- [ ] Skill ratings in 3-5 range
- [ ] 3-4 goals, mix of completed and in-progress
- [ ] Goals with 80-100% progress
- [ ] Multiple completed milestones

### Step 5.6: Verify Session Plans

1. Navigate to Session Plans page (e.g., `/orgs/[orgId]/coach/session-plans`)
2. View session plans list

**Expected to see:**
- [ ] 38 total session plans
- [ ] Mix of sports: soccer, GAA football, rugby
- [ ] Mix of age groups: U8, U10, U12, U14, U16, U18
- [ ] Various focus areas (technical, tactical, physical)

---

## Phase 6: Platform Admin Verification

### Step 6.1: Access Platform Admin Panel

1. Navigate to platform admin panel (e.g., `/platform/admin` or `/admin/organizations`)

**Verify:**
- [ ] Can access platform admin panel
- [ ] No permission errors

### Step 6.2: Verify Organizations List

1. View organizations list in platform admin

**Expected to see:**
- [ ] "Demo Club" appears in list
- [ ] Shows 1 member
- [ ] Shows created date
- [ ] Can click to view details

### Step 6.3: Test Join Organization Flow

**⚠️ CRITICAL TEST - This was the original issue**

1. Log out
2. Sign up with a different test email
3. Log in with new test account
4. Navigate to "Join Organization" page
5. Search for or view available organizations

**Expected:**
- [ ] "Demo Club" appears in available organizations list
- [ ] Can request to join
- [ ] See organization details (logo, name, etc.)

**If "Demo Club" does NOT appear:** This indicates the organization was not created via Better Auth adapter correctly.

---

## Phase 7: Cleanup Testing

### Step 7.1: Test Reset Function

```bash
npx convex run scripts/seed/orchestrator:resetProductionDemo '{
  "confirmReset": true
}'
```

**Expected Output:**
```
🗑️  Starting demo data cleanup...
  🏢 Deleting organization via Better Auth adapter...
✅ Demo data cleanup complete
  Deleted: 1 orgs, 13 teams, 1 members, 10 players
  Deleted: 10 passports, 82 assessments, 36 goals
  Deleted: 38 session plans
```

**Verify:**
- [ ] All data deleted
- [ ] Success message shown

### Step 7.2: Verify Cleanup in UI

1. Refresh browser
2. Try to access Demo Club

**Expected:**
- [ ] Cannot access /orgs/[orgId] (404 or redirect)
- [ ] Demo Club not in organization selector
- [ ] No teams, players, or data visible

### Step 7.3: Re-seed to Verify Idempotency

```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "jkobrien@gmail.com"
}'
```

**Expected:**
- [ ] Script runs successfully again
- [ ] Creates organization again
- [ ] All data seeded correctly
- [ ] Can access in UI

---

## Success Criteria

### Backend ✅

- [ ] User created via Better Auth sign-up (not backend script)
- [ ] User has platform staff status
- [ ] Organization created via Better Auth adapter
- [ ] Member added via Better Auth adapter
- [ ] 13 teams created
- [ ] 10 players created with correct stage distribution
- [ ] ~80 assessments created
- [ ] ~35 goals created
- [ ] 38 session plans created

### Frontend ✅

- [ ] Can log in with seeded user
- [ ] Can access Demo Club organization
- [ ] See all 13 teams
- [ ] See all 10 players
- [ ] View player passports with assessments
- [ ] View development goals
- [ ] Access session plans
- [ ] Multi-team players show correct team badges

### Platform Admin ✅

- [ ] Platform admin panel accessible
- [ ] Demo Club visible in organizations list
- [ ] Member count correct (1)
- [ ] **Demo Club appears in "Join Organization" flow** ← CRITICAL

### Cleanup ✅

- [ ] Reset script removes all data
- [ ] Cleanup script detects incorrect data
- [ ] Can re-seed after cleanup
- [ ] Idempotent (safe to run multiple times)

---

## Common Issues & Solutions

### Issue: Script fails with "User not found"

**Check:**
```bash
npx convex run models/users:getUserByEmail '{
  "email": "jkobrien@gmail.com"
}'
```

**Solution:** Sign up via web UI first

### Issue: Script fails with "not platform staff"

**Check:**
```bash
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

**Solution:** Run bootstrapPlatformStaff script

### Issue: Demo org not visible in UI

**Check:**
```bash
npx convex run scripts/seed/cleanupIncorrectData:previewCleanup
```

**If shows "demoOrgCreatedViaDirectInsert": true:**
1. Run cleanup script
2. Re-seed with correct script

### Issue: Components not defined error

**Check:** Verify line 21 of orchestrator.ts:
```typescript
import { components, internal } from "../../_generated/api";
```

**Solution:** Ensure using latest version of orchestrator.ts

---

## Reporting Results

After completing all tests, please report:

1. **All phases passed:** ✅ or ❌
2. **Critical test results:**
   - Organization visible in Join Organization flow: ✅ or ❌
   - Can access via UI: ✅ or ❌
   - All player stages correct: ✅ or ❌
3. **Any errors encountered:**
   - Error message
   - Phase/step where it occurred
   - What you tried to fix it

---

**Testing Version:** 1.0.0
**Last Updated:** January 20, 2026
