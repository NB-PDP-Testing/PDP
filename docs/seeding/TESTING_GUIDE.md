# Production Demo Seeding - Testing Guide

**Date:** January 21, 2026
**Purpose:** Step-by-step testing instructions for the corrected Better Auth-integrated seeding workflow

**Updated:** Reflects new configuration with 60 players (10 per team), 6 teams, whole number ratings, and 50 session plans

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
- [ ] The owner account `owner_pdp@outlook.com` has already been created and granted platform staff status

---

## Phase 1: Seeding Demo Environment

### Step 1.1: Run Seeding Script

```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "owner_pdp@outlook.com"
}'
```

**Expected Output:**

```
🌱 Starting production demo seed...
  Owner email: owner_pdp@outlook.com

👤 Step 1: Finding user...
  ✓ Found user: PDP Owner
  ✓ User is platform staff

🏢 Step 2: Checking for existing demo organization...
  ⚡ Creating demo organization: Demo Club...
  ✅ Created organization: Demo Club
  ✅ Added owner_pdp@outlook.com as owner

⚽ Step 3: Creating teams...
    ✅ Created team: U10 Soccer
    ✅ Created team: U14 Soccer
    ✅ Created team: U12 GAA
    ✅ Created team: U16 GAA
    ✅ Created team: U10 Rugby
    ✅ Created team: U16 Rugby

👶 Step 4: Creating players...
    ✅ Created player: Liam Walsh (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 0 assessments, 3 goals
    ✅ Created player: Noah Murphy (beginner)
      📋 Generating passport data (beginner)...
      ✅ Passport: 0 assessments, 3 goals
    ... (60 players total - 18 beginner, 24 developing, 18 advanced)

🏋️ Step 5: Creating session plans...
  ✅ Created 50 session plans

👥 Step 6: Assigning owner as coach and guardian...
  ✅ Assigned as coach to 6 teams
  ✅ Created guardian identity
  ✅ Created organization guardian profile
  ✅ Linked as guardian to 60 players

🏥 Step 7: Creating medical profiles...
  ✅ Created 60 medical profiles

🩹 Step 8: Creating injury records...
  ✅ Created 36 injury records

============================================================
✅ Production Demo Seed Complete!
============================================================
Teams:         6 created
Players:       60 created
Passports:     60 created
Assessments:   787 created
Goals:         147 created
Sessions:      50 created
Medical:       60 profiles created
Injuries:      36 records created
============================================================

Demo Organization: Demo Club
Slug: demo-club
Owner: owner_pdp@outlook.com
URL: /orgs/k17abc123def456
============================================================
```

**Verify:**

- [ ] ✓ Found user successfully
- [ ] ✓ User is platform staff
- [ ] ✅ Created organization
- [ ] ✅ Added user as owner
- [ ] ✅ Created all 6 teams
- [ ] ✅ Created all 60 players with correct stages
- [ ] ✅ Assessment counts match stages (whole numbers only: 1-5):
  - Beginner: 0-1 assessments per player
  - Developing: 2-3 assessments per player
  - Advanced: 4-6 assessments per player
- [ ] ✅ Created 50 session plans
- [ ] ✅ Created 60 medical profiles
- [ ] ✅ Created ~36 injury records
- [ ] **SAVE THE ORG ID** from the output (e.g., `k17abc123def456`)

---

## Phase 2: Backend Verification

### Step 2.1: Verify Demo Data

```bash
npx convex run scripts/seed/orchestrator:verifyProductionDemo
```

**Expected Output:**

```json
{
  "orgExists": true,
  "orgId": "k17abc123def456",
  "teamCount": 6,
  "playerCount": 60,
  "passportCount": 60,
  "assessmentCount": 787,
  "goalCount": 147,
  "sessionCount": 50,
  "medicalProfileCount": 60,
  "injuryCount": 36,
  "memberCount": 1,
  "stageDistribution": {
    "beginner": 18,
    "developing": 24,
    "advanced": 18
  }
}
```

**Verify:**

- [ ] orgExists: true
- [ ] teamCount: 6
- [ ] playerCount: 60
- [ ] passportCount: 60
- [ ] assessmentCount: ~780-820 (will vary slightly, all whole numbers 1-5)
- [ ] goalCount: ~145-155 (will vary slightly)
- [ ] sessionCount: 50
- [ ] medicalProfileCount: 60
- [ ] injuryCount: ~35-50 (will vary)
- [ ] memberCount: 1
- [ ] stageDistribution matches 18/24/18 split

### Step 2.2: Check Organization via Better Auth

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

## Phase 3: Frontend Verification

### Step 3.1: Log In to Application

1. Open web browser
2. Navigate to your application
3. Log in with `owner_pdp@outlook.com` and your password

**Verify:**

- [ ] Login successful
- [ ] Redirected to dashboard/home

### Step 3.2: Access Demo Organization

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

### Step 3.3: Verify Teams

1. Navigate to Teams page (e.g., `/orgs/[orgId]/admin/teams` or `/orgs/[orgId]/coach/teams`)
2. View teams list

**Expected to see:**

- [ ] U10 Soccer (Boys)
- [ ] U14 Soccer (Girls)
- [ ] U12 GAA (Boys)
- [ ] U16 GAA (Girls)
- [ ] U10 Rugby (Boys)
- [ ] U16 Rugby (Boys)

**Total:** 6 teams (2 per sport)

### Step 3.4: Verify Players

1. Navigate to Players page (e.g., `/orgs/[orgId]/admin/players` or `/orgs/[orgId]/coach/players`)
2. View players list

**Expected to see 60 players total:**

**Per Team (10 players each):**

- 3 beginner players
- 4 developing players
- 3 advanced players

**Example Players to Verify:**

**U10 Soccer Beginners:**

- [ ] Liam Walsh
- [ ] Noah Murphy
- [ ] Jack Kelly

**U10 Soccer Developing:**

- [ ] Ryan O'Brien
- [ ] Luke Connor
- [ ] Adam Byrne
- [ ] Dylan Ryan

**U10 Soccer Advanced:**

- [ ] Conor Brennan
- [ ] Cian McCarthy
- [ ] Darragh Quinn

**Total Distribution:**

- [ ] 18 beginner players across all teams
- [ ] 24 developing players across all teams
- [ ] 18 advanced players across all teams

### Step 3.5: Verify Player Passports

**Test Beginner Player:**

1. Click on "Liam Walsh"
2. View player passport

**Expected to see:**

- [ ] Player name and details
- [ ] 0-1 assessments (or none)
- [ ] **Whole number ratings only: 1 or 2**
- [ ] 2-3 basic goals (e.g., "Master basic ball control")
- [ ] Goals with 0-10% progress
- [ ] Goals in "not_started" status

**Test Developing Player:**

1. Click on "Ryan O'Brien"
2. View player passport

**Expected to see:**

- [ ] 2-3 assessments showing progression
- [ ] **Whole number ratings only: 2, 3, or 4**
- [ ] Overall rating: 3 or 4
- [ ] 2-3 goals in "in_progress" status
- [ ] Goals with 30-70% progress
- [ ] 1-2 milestones per goal

**Test Advanced Player:**

1. Click on "Conor Brennan"
2. View player passport

**Expected to see:**

- [ ] 4-6 assessments with upward trend
- [ ] **Whole number ratings only: 3, 4, or 5**
- [ ] Overall rating: 4 or 5
- [ ] 2-3 goals, mix of completed and in-progress
- [ ] Goals with 80-100% progress
- [ ] 1-2 milestones per goal, some completed

### Step 3.6: Verify Session Plans

1. Navigate to Session Plans page (e.g., `/orgs/[orgId]/coach/session-plans`)
2. View session plans list

**Expected to see:**

- [ ] 50 total session plans
- [ ] Mix of sports: soccer, GAA football, rugby
- [ ] Mix of age groups: U10, U12, U14, U16
- [ ] Various focus areas (technical, tactical, physical)

---

## Phase 4: Platform Admin Verification

### Step 4.1: Access Platform Admin Panel

1. Navigate to platform admin panel (e.g., `/platform/admin` or `/admin/organizations`)

**Verify:**

- [ ] Can access platform admin panel
- [ ] No permission errors

### Step 4.2: Verify Organizations List

1. View organizations list in platform admin

**Expected to see:**

- [ ] "Demo Club" appears in list
- [ ] Shows 1 member
- [ ] Shows created date
- [ ] Can click to view details

### Step 4.3: Test Join Organization Flow

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

## Phase 5: Cleanup Testing

### Step 5.1: Test Reset Function

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
  Deleted: 1 orgs, 6 teams, 1 members, 60 players
  Deleted: 60 passports, 787 assessments, 147 goals
  Deleted: 50 session plans, 60 medical profiles, 36 injuries
```

**Verify:**

- [ ] All data deleted
- [ ] Success message shown

### Step 5.2: Verify Cleanup in UI

1. Refresh browser
2. Try to access Demo Club

**Expected:**

- [ ] Cannot access /orgs/[orgId] (404 or redirect)
- [ ] Demo Club not in organization selector
- [ ] No teams, players, or data visible

### Step 5.3: Re-seed to Verify Idempotency

```bash
npx convex run scripts/seed/orchestrator:seedProductionDemo '{
  "ownerEmail": "owner_pdp@outlook.com"
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
- [ ] 6 teams created (2 per sport)
- [ ] 60 players created with correct stage distribution (18/24/18)
- [ ] ~780-820 assessments created with whole number ratings only (1-5)
- [ ] ~145-155 goals created
- [ ] 50 session plans created
- [ ] 60 medical profiles created
- [ ] ~35-50 injury records created

### Frontend ✅

- [ ] Can log in with seeded user
- [ ] Can access Demo Club organization
- [ ] See all 6 teams
- [ ] See all 60 players
- [ ] View player passports with assessments (whole number ratings 1-5)
- [ ] View development goals
- [ ] Access 50 session plans
- [ ] View medical profiles and injury records

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
  "email": "owner_pdp@outlook.com"
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

**Testing Version:** 2.0.0
**Last Updated:** January 21, 2026
**Changes:** Updated for 60 players (10 per team), 6 teams, whole number ratings, 50 session plans
