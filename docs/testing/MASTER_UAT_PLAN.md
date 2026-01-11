# Master UAT Test Plan

**Version:** 5.2  
**Created:** January 7, 2026  
**Last Updated:** January 11, 2026  
**Status:** ACTIVE - Lightweight UAT Model  
**Total Tests:** 33 test files, 272 tests across 14 categories (+ 51 setup tests)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Test Environment](#3-test-environment)
4. [Running Tests](#4-running-tests)
5. [Test Categories](#5-test-categories)
6. [Test Coverage by Category](#6-test-coverage-by-category)
7. [Remaining Coverage Gaps](#7-remaining-coverage-gaps)
8. [Recommendations & Next Steps](#8-recommendations--next-steps)

---

## 1. Overview

### 1.1 Purpose

This document provides the authoritative reference for the PlayerARC UAT test suite. The lightweight model focuses on:

- Pre-authenticated user sessions
- Role-based test isolation
- Fast execution for CI/CD integration
- Comprehensive feature coverage

### 1.2 Test ID Convention

```text
TEST-{CATEGORY}-{NUMBER}
```

Categories:

- `AUTH` - Authentication (login, signup)
- `ADMIN` - Admin dashboard and navigation
- `COACH` - Coach features (assessment, voice notes, injuries)
- `PARENT` - Parent dashboard and child management
- `PLAYER` - Player passport and self-access
- `ORG` - Organization dashboard and announcements
- `FLOW` - Flow wizard system
- `HOME` - Homepage/marketing

### 1.3 Implementation Status Legend

| Symbol | Meaning                          |
| ------ | -------------------------------- |
| ✅     | Implemented and Passing          |
| 🟡     | Partially implemented or Skipped |
| ⬜     | Not yet implemented              |

---

## 2. Current Implementation Status

### 2.1 Test Suite Structure

```text
apps/web/uat/
├── playwright.config.ts      # Main configuration
├── global-setup.ts           # Creates auth states for all users
├── test-data.json            # Test user credentials
├── fixtures/
│   └── test-fixtures.ts      # Authenticated page fixtures
└── tests/
    ├── auth/                 # Authentication tests
    │   ├── login.spec.ts
    │   └── signup.spec.ts
    ├── admin/                # Admin dashboard tests
    │   ├── dashboard.spec.ts
    │   ├── navigation.spec.ts
    │   ├── identity.spec.ts      # NEW: Guardian/player linking
    │   ├── invitations.spec.ts   # NEW: Approvals/membership workflow
    │   └── teams.spec.ts         # NEW: Team management CRUD
    ├── coach/                # Coach feature tests
    │   ├── dashboard.spec.ts
    │   ├── assessment.spec.ts
    │   ├── voice-notes.spec.ts
    │   └── injuries.spec.ts
    ├── parent/               # Parent tests
    │   └── child-management.spec.ts
    ├── player/               # Player tests
    │   ├── passport.spec.ts
    │   └── self-access.spec.ts
    ├── org/                  # Organization tests
    │   ├── dashboard.spec.ts
    │   └── announcements.spec.ts
    ├── flows/                # Flow wizard tests
    │   └── flow-wizard.spec.ts
    └── homepage/             # Marketing page tests
        └── homepage.spec.ts
```

### 2.2 Test File Summary

| Category    | Files  | Tests   | Description                                                                    |
| ----------- | ------ | ------- | ------------------------------------------------------------------------------ |
| admin       | 8      | 64      | Dashboard, nav, identity, invitations, teams, overrides, benchmarks, analytics |
| coach       | 5      | 30      | Dashboard, assessment, voice notes, injuries, analytics                        |
| flows       | 4      | 26      | Flow wizard, platform access, management, advanced                             |
| auth        | 2      | 22      | Login flows, signup validation                                                 |
| org         | 2      | 20      | Dashboard, announcements                                                       |
| ux          | 2      | 18      | UX features, testing suite                                                     |
| player      | 2      | 17      | Passport viewing, self-access (18+)                                            |
| mobile      | 1      | 15      | Mobile viewport responsive tests                                               |
| cross-role  | 1      | 15      | Multi-role scenario tests                                                      |
| homepage    | 2      | 15      | Marketing page content, advanced navigation                                    |
| parent      | 1      | 10      | Child management, linked players                                               |
| performance | 1      | 10      | Page load and API performance tests                                            |
| errors      | 1      | 4       | Empty states, 404, 403 error pages                                             |
| platform    | 1      | 6       | Platform staff management (dashboard, staff, sports, skills, bulk import)      |
| **Total**   | **33** | **272** | (+ 51 tests in onboarding setup script)                                        |

---

## 3. Test Environment

### 3.1 Prerequisites

- [x] Next.js dev server running on localhost:3000
- [x] Convex backend configured
- [x] Test user accounts exist in database
- [x] Playwright installed (`npm install`)

### 3.2 Test User Accounts

| Role           | Email                    | Password       | Notes                          |
| -------------- | ------------------------ | -------------- | ------------------------------ |
| Platform Owner | `owner_pdp@outlook.com`  | `Password123!` | First user, platformStaff=true |
| Org Admin      | `adm1n_pdp@outlook.com`  | `Password123!` | Organization administrator     |
| Coach          | `coach_pdp@outlook.com`  | `Password123!` | Has team assignments           |
| Parent         | `parent_pdp@outlook.com` | `Password123!` | Has linked children            |

### 3.3 Configuration

| Setting            | Value              |
| ------------------ | ------------------ |
| Browser            | Chromium           |
| Workers            | 6 (local) / 1 (CI) |
| Retries            | 1 (local) / 2 (CI) |
| Test Timeout       | 60 seconds         |
| Assertion Timeout  | 10 seconds         |
| Action Timeout     | 15 seconds         |
| Navigation Timeout | 30 seconds         |

---

## 4. Running Tests

### 4.0 Database Reset (Pre-Setup)

Before running the onboarding setup script on a fresh database, you must clear any existing data and seed reference data. Use one of the provided reset scripts.

#### Option 1: Using PowerShell Script (Windows)

```powershell
# From the project root
.\apps\web\uat\scripts\reset-pdp-database.ps1
```

#### Option 2: Using Shell Script (macOS/Linux)

```bash
# From the project root
./apps/web/uat/scripts/reset-pdp-database.sh
```

**What the reset scripts do (4 stages):**

1. **Stage 1** - Delete application data (players, assessments, goals, etc.)
2. **Stage 2** - Delete reference data (sports, skills, benchmarks)
3. **Stage 3** - Delete Better Auth tables (users, sessions, organizations, etc.)
4. **Stage 4** - Re-seed reference data (sports, skills, benchmarks)

**Location:** `apps/web/uat/scripts/`

- `reset-pdp-database.ps1` - PowerShell script for Windows
- `reset-pdp-database.sh` - Bash script for macOS/Linux

**⚠️ Important Notes:**

- Run from the project root directory
- Requires the Convex backend to be running (`npx convex dev` in `packages/backend`)
- Uses staged deletion to avoid timeouts on large datasets
- Automatically re-seeds reference data after clearing

---

From the `apps/web` directory:

```bash
cd apps/web

# Run all tests
npm run test

# Run by category
npm run test:auth       # Authentication tests
npm run test:admin      # Admin dashboard tests
npm run test:coach      # Coach feature tests
npm run test:parent     # Parent tests
npm run test:player     # Player tests
npm run test:org        # Organization tests
npm run test:flows      # Flow wizard tests
npm run test:homepage   # Marketing page tests

# Utilities
npm run test:ui         # Playwright UI mode
npm run test:headed     # Run with visible browser
npm run test:debug      # Debug mode
npm run test:report     # View HTML report
npm run test:list       # List all tests
```

### 4.1 Setup Script (Pre-UAT Data Creation)

The onboarding setup script creates all necessary test accounts, organizations, teams, and players **before** running the regular UAT tests. This is a standalone script that should be run on a **fresh/empty database**.

```bash
cd apps/web

# Run the onboarding setup script (headless by default)
npm run test:setup

# Run with visible browser
npm run test:setup -- --headed
```

**Location:** `apps/web/uat/scripts/onboarding.spec.ts`

**What it creates:**

- Platform owner account (first user, auto-granted platformStaff)
- Organization with configured sports and colors
- Test teams with proper sport/age group settings
- Admin, Coach, and Parent user accounts
- Player records with team assignments
- Guardian-player relationships

**⚠️ Important Notes:**

- This script is **NOT** included in regular `npm run test` runs
- Run this **only once** on a fresh database before UAT testing
- The script runs in `--headed` mode so you can observe the setup process
- All test data comes from `uat/test-data.json`

---

## 5. Test Categories

### 5.1 Authentication Tests (`tests/auth/`)

| ID       | Test                                | Status | File           |
| -------- | ----------------------------------- | ------ | -------------- |
| AUTH-001 | Display signup page correctly       | ✅     | signup.spec.ts |
| AUTH-002 | Show error for duplicate email      | ✅     | signup.spec.ts |
| AUTH-003 | Show validation for weak password   | ✅     | signup.spec.ts |
| AUTH-004 | Login success (owner)               | ✅     | login.spec.ts  |
| AUTH-005 | Login success (admin)               | ✅     | login.spec.ts  |
| AUTH-006 | Login success (coach)               | ✅     | login.spec.ts  |
| AUTH-007 | Login success (parent)              | ✅     | login.spec.ts  |
| AUTH-008 | Google SSO button displayed         | ✅     | login.spec.ts  |
| AUTH-009 | Microsoft SSO button displayed      | ✅     | login.spec.ts  |
| AUTH-010 | Login failure (invalid credentials) | ✅     | login.spec.ts  |
| AUTH-011 | Session persistence after refresh   | ✅     | login.spec.ts  |
| AUTH-012 | Protected routes redirect to login  | ✅     | login.spec.ts  |

### 5.2 Admin Dashboard Tests (`tests/admin/`)

| ID            | Test                        | Status | File               |
| ------------- | --------------------------- | ------ | ------------------ |
| ADMIN-001     | Dashboard displays overview | ✅     | dashboard.spec.ts  |
| ADMIN-002     | Statistics cards visible    | ✅     | dashboard.spec.ts  |
| ADMIN-003     | Navigation tabs visible     | ✅     | dashboard.spec.ts  |
| ADMIN-NAV-001 | Navigate to Overview        | ✅     | navigation.spec.ts |
| ADMIN-NAV-002 | Navigate to Players         | ✅     | navigation.spec.ts |
| ADMIN-NAV-003 | Navigate to Teams           | ✅     | navigation.spec.ts |
| ADMIN-NAV-004 | Navigate to Coaches         | ✅     | navigation.spec.ts |
| ADMIN-NAV-005 | Navigate to Users           | ✅     | navigation.spec.ts |
| ADMIN-NAV-006 | Navigate to Invitations     | ✅     | navigation.spec.ts |
| ADMIN-NAV-007 | Navigate to Settings        | ✅     | navigation.spec.ts |
| ADMIN-NAV-008 | Navigate to Announcements   | ✅     | navigation.spec.ts |

### 5.3 Coach Feature Tests (`tests/coach/`)

| ID        | Test                         | Status | File                |
| --------- | ---------------------------- | ------ | ------------------- |
| COACH-001 | Dashboard loads correctly    | ✅     | dashboard.spec.ts   |
| COACH-002 | Team roster visible          | ✅     | dashboard.spec.ts   |
| COACH-003 | Player cards display         | ✅     | dashboard.spec.ts   |
| COACH-004 | Skills assessment form loads | ✅     | assessment.spec.ts  |
| COACH-005 | Rating system works          | ✅     | assessment.spec.ts  |
| COACH-006 | Assessment save/submit       | ✅     | assessment.spec.ts  |
| COACH-007 | Voice notes recording UI     | ✅     | voice-notes.spec.ts |
| COACH-008 | Voice notes playback         | ✅     | voice-notes.spec.ts |
| COACH-009 | AI insights display          | ✅     | voice-notes.spec.ts |
| COACH-010 | Injury tracking form         | ✅     | injuries.spec.ts    |
| COACH-011 | Injury history visible       | ✅     | injuries.spec.ts    |
| COACH-012 | Medical profile access       | ✅     | injuries.spec.ts    |

### 5.4 Parent Tests (`tests/parent/`)

| ID         | Test                         | Status | File                     |
| ---------- | ---------------------------- | ------ | ------------------------ |
| PARENT-001 | Parent dashboard loads       | ✅     | child-management.spec.ts |
| PARENT-002 | Linked children visible      | ✅     | child-management.spec.ts |
| PARENT-003 | Child passport viewable      | ✅     | child-management.spec.ts |
| PARENT-004 | Skills progress visible      | ✅     | child-management.spec.ts |
| PARENT-005 | Coach feedback visible       | ✅     | child-management.spec.ts |
| PARENT-006 | Medical info access          | ✅     | child-management.spec.ts |
| PARENT-007 | Emergency contacts displayed | ✅     | child-management.spec.ts |

### 5.5 Player Tests (`tests/player/`)

| ID         | Test                         | Status | File                |
| ---------- | ---------------------------- | ------ | ------------------- |
| PLAYER-001 | Admin can view players list  | ✅     | passport.spec.ts    |
| PLAYER-002 | Admin can search players     | ✅     | passport.spec.ts    |
| PLAYER-003 | Navigate to player passport  | ✅     | passport.spec.ts    |
| PLAYER-004 | Passport displays basic info | ✅     | passport.spec.ts    |
| PLAYER-005 | Passport displays skills     | ✅     | passport.spec.ts    |
| PLAYER-006 | Passport displays goals      | ✅     | passport.spec.ts    |
| PLAYER-007 | Passport displays notes      | ✅     | passport.spec.ts    |
| PLAYER-008 | Edit player page accessible  | ✅     | passport.spec.ts    |
| PLAYER-009 | Share button visible         | ✅     | passport.spec.ts    |
| ADULT-001  | Adult player login           | ✅     | self-access.spec.ts |
| ADULT-002  | Self-access dashboard        | ✅     | self-access.spec.ts |
| ADULT-003  | Own passport viewable        | ✅     | self-access.spec.ts |
| ADULT-004  | Cannot access others' data   | ✅     | self-access.spec.ts |

### 5.6 Organization Tests (`tests/org/`)

| ID      | Test                           | Status | File                  |
| ------- | ------------------------------ | ------ | --------------------- |
| ORG-001 | Orgs dashboard displays        | ✅     | dashboard.spec.ts     |
| ORG-002 | Your Organizations visible     | ✅     | dashboard.spec.ts     |
| ORG-003 | Create Organization button     | ✅     | dashboard.spec.ts     |
| ORG-004 | Join Organization button       | ✅     | dashboard.spec.ts     |
| ORG-005 | Organization card displays     | ✅     | dashboard.spec.ts     |
| ORG-006 | Coach Panel link works         | ✅     | dashboard.spec.ts     |
| ORG-007 | Admin Panel link works         | ✅     | dashboard.spec.ts     |
| ANN-001 | Announcements page loads       | ✅     | announcements.spec.ts |
| ANN-002 | Create announcement button     | ✅     | announcements.spec.ts |
| ANN-003 | Announcement list displays     | ✅     | announcements.spec.ts |
| ANN-004 | Announcement targeting options | ✅     | announcements.spec.ts |

### 5.7 Flow Wizard Tests (`tests/flows/`)

| ID       | Test                           | Status | File                |
| -------- | ------------------------------ | ------ | ------------------- |
| FLOW-001 | Flow wizard initializes        | ✅     | flow-wizard.spec.ts |
| FLOW-002 | Multi-step navigation          | ✅     | flow-wizard.spec.ts |
| FLOW-003 | Form validation between steps  | ✅     | flow-wizard.spec.ts |
| FLOW-004 | Progress indicator updates     | ✅     | flow-wizard.spec.ts |
| FLOW-005 | Back navigation preserves data | ✅     | flow-wizard.spec.ts |
| FLOW-006 | Flow completion handling       | ✅     | flow-wizard.spec.ts |

### 5.8 Homepage Tests (`tests/homepage/`)

| ID       | Test                      | Status | File             |
| -------- | ------------------------- | ------ | ---------------- |
| HOME-001 | Homepage loads correctly  | ✅     | homepage.spec.ts |
| HOME-002 | Header navigation visible | ✅     | homepage.spec.ts |
| HOME-003 | Hero section displays     | ✅     | homepage.spec.ts |
| HOME-004 | Features section visible  | ✅     | homepage.spec.ts |
| HOME-005 | Sports section displays   | ✅     | homepage.spec.ts |
| HOME-006 | Testimonials visible      | ✅     | homepage.spec.ts |
| HOME-007 | Footer navigation works   | ✅     | homepage.spec.ts |
| HOME-008 | Login link functional     | ✅     | homepage.spec.ts |
| HOME-009 | Request Demo link works   | ✅     | homepage.spec.ts |

### 5.9 Identity System Tests (`tests/admin/identity.spec.ts`) - NEW

| ID           | Test                                    | Status | File             |
| ------------ | --------------------------------------- | ------ | ---------------- |
| IDENTITY-001 | Admin can navigate to guardians mgmt    | ✅     | identity.spec.ts |
| IDENTITY-002 | Admin can view parent users with links  | ✅     | identity.spec.ts |
| IDENTITY-003 | Invite dialog shows player linking      | ✅     | identity.spec.ts |
| IDENTITY-004 | Parent sees linked children on dash     | ✅     | identity.spec.ts |
| IDENTITY-005 | Parent can access linked child passport | ✅     | identity.spec.ts |
| IDENTITY-006 | Admin can modify guardian-player links  | ✅     | identity.spec.ts |

### 5.10 Invitation/Approvals Tests (`tests/admin/invitations.spec.ts`) - NEW

| ID         | Test                                    | Status | File                |
| ---------- | --------------------------------------- | ------ | ------------------- |
| INVITE-001 | Admin can navigate to approvals mgmt    | ✅     | invitations.spec.ts |
| INVITE-002 | Approvals page shows pending requests   | ✅     | invitations.spec.ts |
| INVITE-003 | Invite dialog has email and role fields | ✅     | invitations.spec.ts |
| INVITE-004 | Can send invitation with admin role     | ✅     | invitations.spec.ts |
| INVITE-005 | Can send invitation with coach role     | ✅     | invitations.spec.ts |
| INVITE-006 | Parent role shows player linking opts   | ✅     | invitations.spec.ts |
| INVITE-007 | Pending requests can be approved        | ✅     | invitations.spec.ts |
| INVITE-008 | Admin can access org join page link     | ✅     | invitations.spec.ts |
| INVITE-009 | Pending requests display user info      | ✅     | invitations.spec.ts |
| INVITE-010 | Can select multiple roles               | ✅     | invitations.spec.ts |

### 5.11 Team Management Tests (`tests/admin/teams.spec.ts`) - NEW

| ID       | Test                                | Status | File          |
| -------- | ----------------------------------- | ------ | ------------- |
| TEAM-001 | Admin can navigate to teams mgmt    | ✅     | teams.spec.ts |
| TEAM-002 | Teams page shows list of teams      | ✅     | teams.spec.ts |
| TEAM-003 | Create team button is accessible    | ✅     | teams.spec.ts |
| TEAM-004 | Create team dialog opens            | ✅     | teams.spec.ts |
| TEAM-005 | Create team form has sport dropdown | ✅     | teams.spec.ts |
| TEAM-006 | Create team form has age dropdown   | ✅     | teams.spec.ts |
| TEAM-007 | Can click team to view details      | ✅     | teams.spec.ts |
| TEAM-008 | Team details shows player roster    | ✅     | teams.spec.ts |
| TEAM-009 | Edit team functionality accessible  | ✅     | teams.spec.ts |
| TEAM-010 | Coach assignment option available   | ✅     | teams.spec.ts |
| TEAM-011 | Add player to team available        | ✅     | teams.spec.ts |
| TEAM-012 | Delete team option accessible       | ✅     | teams.spec.ts |

### 5.12 Cross-Role Scenario Tests (`tests/cross-role/cross-role.spec.ts`) - NEW

| ID        | Test                                            | Status | File               |
| --------- | ----------------------------------------------- | ------ | ------------------ |
| CROSS-001 | User can switch from Admin to Coach panel       | ✅     | cross-role.spec.ts |
| CROSS-002 | User can switch from Coach to Admin panel       | ✅     | cross-role.spec.ts |
| CROSS-003 | OrgRoleSwitcher displays available roles        | ✅     | cross-role.spec.ts |
| CROSS-004 | Coach can only see assigned team players        | ✅     | cross-role.spec.ts |
| CROSS-005 | Parent can only see linked children             | ✅     | cross-role.spec.ts |
| CROSS-006 | Admin can see all organization players          | ✅     | cross-role.spec.ts |
| CROSS-007 | Coach cannot access admin settings              | ✅     | cross-role.spec.ts |
| CROSS-008 | Parent cannot create assessments                | ✅     | cross-role.spec.ts |
| CROSS-009 | Coach cannot manage users                       | ✅     | cross-role.spec.ts |
| CROSS-010 | Owner has access to both Admin and Coach panels | ✅     | cross-role.spec.ts |
| CROSS-011 | Multi-role user can create assessment as coach  | ✅     | cross-role.spec.ts |
| CROSS-012 | Multi-role user can manage teams as admin       | ✅     | cross-role.spec.ts |
| CROSS-013 | Player data consistent across Admin/Coach views | ✅     | cross-role.spec.ts |
| CROSS-014 | Role context persists after navigation          | ✅     | cross-role.spec.ts |
| CROSS-015 | Platform staff can see Platform link            | ✅     | cross-role.spec.ts |

### 5.13 Performance Tests (`tests/performance/performance.spec.ts`) - NEW

| ID       | Test                                      | Status | File                |
| -------- | ----------------------------------------- | ------ | ------------------- |
| PERF-001 | Homepage loads within acceptable time     | ✅     | performance.spec.ts |
| PERF-002 | Login page loads within acceptable time   | ✅     | performance.spec.ts |
| PERF-003 | Organizations page loads within time      | ✅     | performance.spec.ts |
| PERF-004 | Admin dashboard loads within time         | ✅     | performance.spec.ts |
| PERF-005 | Coach dashboard loads within time         | ✅     | performance.spec.ts |
| PERF-006 | Navigation between admin sections is fast | ✅     | performance.spec.ts |
| PERF-007 | Role switching is fast                    | ✅     | performance.spec.ts |
| PERF-008 | Players list loads efficiently            | ✅     | performance.spec.ts |
| PERF-009 | Teams list loads efficiently              | ✅     | performance.spec.ts |
| PERF-010 | No slow API requests on dashboard load    | ✅     | performance.spec.ts |

**Performance Thresholds:**

- Page load: < 5 seconds
- Navigation: < 3 seconds
- API responses: < 2 seconds

### 5.14 Mobile Viewport Tests (`tests/mobile/mobile-viewport.spec.ts`) - NEW

| ID         | Test                                    | Status | File                    |
| ---------- | --------------------------------------- | ------ | ----------------------- |
| MOBILE-001 | Homepage renders correctly on mobile    | ✅     | mobile-viewport.spec.ts |
| MOBILE-002 | Mobile navigation is accessible         | ✅     | mobile-viewport.spec.ts |
| MOBILE-003 | Login page is usable on mobile          | ✅     | mobile-viewport.spec.ts |
| MOBILE-004 | Organizations page renders on mobile    | ✅     | mobile-viewport.spec.ts |
| MOBILE-005 | Admin dashboard works on mobile         | ✅     | mobile-viewport.spec.ts |
| MOBILE-006 | Coach dashboard works on mobile         | ✅     | mobile-viewport.spec.ts |
| MOBILE-007 | Buttons have adequate touch target      | ✅     | mobile-viewport.spec.ts |
| MOBILE-008 | Form inputs are accessible on mobile    | ✅     | mobile-viewport.spec.ts |
| MOBILE-009 | Links have adequate spacing on mobile   | ✅     | mobile-viewport.spec.ts |
| MOBILE-010 | Bottom navigation works if present      | ✅     | mobile-viewport.spec.ts |
| MOBILE-011 | PWA install prompt can be dismissed     | ✅     | mobile-viewport.spec.ts |
| MOBILE-012 | Content hierarchy maintained on mobile  | ✅     | mobile-viewport.spec.ts |
| MOBILE-013 | Tables are scrollable or responsive     | ✅     | mobile-viewport.spec.ts |
| MOBILE-014 | Modals/dialogs work on mobile           | ✅     | mobile-viewport.spec.ts |
| MOBILE-015 | Different mobile sizes render correctly | ✅     | mobile-viewport.spec.ts |

**Mobile Viewport Sizes Tested:**

- iPhone SE: 375x667
- iPhone 12/13: 390x844
- Android common: 360x640

---

## 6. Test Coverage by Category

| Category       | Tests   | Coverage Status                    |
| -------------- | ------- | ---------------------------------- |
| Admin          | 64      | ✅ Complete                        |
| Coach          | 30      | ✅ Complete                        |
| Flows          | 26      | ✅ Complete                        |
| Authentication | 22      | ✅ Complete                        |
| Organization   | 20      | ✅ Complete                        |
| UX             | 18      | ✅ Complete                        |
| Player         | 17      | ✅ Complete                        |
| Mobile         | 15      | ✅ Complete                        |
| Cross-Role     | 15      | ✅ Complete                        |
| Homepage       | 15      | ✅ Complete                        |
| Performance    | 10      | ✅ Complete                        |
| Parent         | 10      | ✅ Complete                        |
| Errors         | 4       | ✅ Complete                        |
| Platform       | 3       | ✅ Complete                        |
| **Total**      | **269** | **14 categories + 51 setup tests** |

---

## 7. Remaining Coverage Gaps

### 7.1 Not Yet Automated

| Feature               | Priority | Estimated Tests | Status         |
| --------------------- | -------- | --------------- | -------------- |
| Identity System       | P1       | 6               | ✅ IMPLEMENTED |
| Invitation Workflow   | P1       | 10              | ✅ IMPLEMENTED |
| Team Management CRUD  | P1       | 12              | ✅ IMPLEMENTED |
| Cross-Role Scenarios  | P2       | 15              | ✅ IMPLEMENTED |
| Performance Tests     | P2       | 10              | ✅ IMPLEMENTED |
| Mobile Viewport Tests | P3       | 15              | ✅ IMPLEMENTED |

**All planned test categories are now implemented!**

### 7.2 Known Limitations

1. **No onboarding tests** - Removed in v3.0; assumes pre-created test users
2. **Single browser** - Only Chromium configured
3. **Sequential execution** - No parallelization for stability
4. **No visual regression** - Screenshot comparison not implemented

---

## 8. Recommendations & Next Steps

### 8.1 Immediate Priorities (P0) - ✅ COMPLETED

1. ~~**Add Identity System tests**~~ - ✅ 6 tests implemented (identity.spec.ts)
2. ~~**Add Invitation Workflow tests**~~ - ✅ 10 tests implemented (invitations.spec.ts)
3. ~~**Add Team Management CRUD tests**~~ - ✅ 12 tests implemented (teams.spec.ts)

### 8.2 Medium-Term (P1) - ✅ COMPLETED

1. ~~**Cross-Role Tests**~~ - ✅ 15 tests implemented (cross-role.spec.ts)
2. ~~**Data Isolation Tests**~~ - ✅ Included in cross-role tests (CROSS-004 to CROSS-009)
3. **CI/CD Integration** - Add to GitHub Actions

### 8.3 Long-Term (P2/P3) - MOSTLY COMPLETED

1. **Visual Regression** - Screenshot comparison ⬜
2. ~~**Performance Testing**~~ - ✅ 10 tests implemented (performance.spec.ts)
3. ~~**Mobile Testing**~~ - ✅ 15 tests implemented (mobile-viewport.spec.ts)
4. **Parallel Execution** - Speed up test runs ⬜

---

## Appendix A: Test Execution Checklist

### Pre-Testing

- [ ] `npm run dev` running on localhost:3000
- [ ] Test user accounts exist in database
- [ ] Playwright installed (`cd apps/web && npm install`)

### Running Tests

```bash
cd apps/web
npm run test
```

### Post-Testing

- [ ] Review failures in `uat/playwright-report/`
- [ ] Document any new issues
- [ ] Update test data if needed

---

## Appendix B: Sign-Off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Product Owner |      |      |           |
| Tech Lead     |      |      |           |

---

---

## 9. UX Testing Suite (tests/ux/)

The UX testing suite contains 14 detailed test specifications for user experience validation. These tests focus on visual consistency, mobile responsiveness, and interaction patterns.

### 9.1 UX Test Files ✅ IMPLEMENTED

| Test ID            | Description                       | Status |
| ------------------ | --------------------------------- | ------ |
| TEST-UXTESTING-000 | Testing Infrastructure Setup      | ✅     |
| TEST-UXTESTING-001 | Role-specific Bottom Navigation   | ✅     |
| TEST-UXTESTING-002 | Touch Target Sizes (44px minimum) | ✅     |
| TEST-UXTESTING-003 | Mobile Player Cards with Swipe    | ✅     |
| TEST-UXTESTING-004 | Admin Navigation Variants         | ✅     |
| TEST-UXTESTING-005 | Skeleton Loading States           | ✅     |
| TEST-UXTESTING-006 | Actionable Empty States           | ✅     |
| TEST-UXTESTING-007 | Touch-optimized Forms             | ✅     |
| TEST-UXTESTING-008 | Pull-to-refresh & Gestures        | ✅     |
| TEST-UXTESTING-009 | Mobile vs Desktop Comparison      | ✅     |
| TEST-UXTESTING-010 | Desktop Data Table Features       | ✅     |
| TEST-UXTESTING-011 | Command Palette (Cmd+K)           | ✅     |
| TEST-UXTESTING-012 | Information Density Options       | ✅     |
| TEST-UXTESTING-013 | Org/Role Switcher                 | ✅     |

**Location:** `apps/web/uat/tests/ux/ux-testing-suite.spec.ts`

---

## 10. Additional Test Areas

### 10.1 First-Time Onboarding Tests ✅ AUTOMATED

All onboarding tests are now automated in `uat/scripts/onboarding.spec.ts` (51 sub-tests).

| Test ID     | Description                                    | Priority | Status |
| ----------- | ---------------------------------------------- | -------- | ------ |
| ONBOARD-001 | Platform Staff Creates First Organization      | P0       | ✅     |
| ONBOARD-002 | Non-Platform Staff Cannot Create Organizations | P0       | ✅     |
| ONBOARD-003 | Owner First Login Experience                   | P1       | ✅     |
| ONBOARD-004 | Owner Creates First Team                       | P1       | ✅     |
| ONBOARD-005 | Owner Invites First Admin                      | P1       | ✅     |
| ONBOARD-006 | First Admin Accepts Invitation                 | P1       | ✅     |
| ONBOARD-007 | Owner Invites First Coach                      | P1       | ✅     |
| ONBOARD-008 | First Coach Accepts and Gets Team Assignment   | P1       | ✅     |
| ONBOARD-009 | Admin Creates First Players                    | P1       | ✅     |
| ONBOARD-010 | Owner Invites First Parent                     | P1       | ✅     |
| ONBOARD-011 | Platform Admin Edits Organization              | P1       | ✅     |
| ONBOARD-012 | Owner Transfers Ownership to Admin             | P2       | ✅     |

### 10.2 Platform Staff Management Tests ✅ AUTOMATED

| Test ID      | Description                     | Priority | Status         | File                        |
| ------------ | ------------------------------- | -------- | -------------- | --------------------------- |
| PLATFORM-001 | Platform Staff Dashboard Access | P1       | ✅ Implemented | platform-management.spec.ts |
| PLATFORM-002 | Manage Sports                   | P2       | ✅ Implemented | platform-management.spec.ts |
| PLATFORM-003 | Manage Skill Categories         | P2       | ✅ Implemented | platform-management.spec.ts |
| PLATFORM-004 | Manage Skill Definitions        | P2       | ✅ Implemented | platform-management.spec.ts |
| PLATFORM-005 | Platform Staff Management       | P2       | ✅ Implemented | platform-management.spec.ts |
| PLATFORM-006 | Bulk Skills Import              | P2       | ✅ Implemented | platform-management.spec.ts |

### 10.3 Flow System Tests

Detailed flow wizard testing (reference: `docs/archive/testing/flow-system-tests.md`):

| Test ID           | Description                               | Priority |
| ----------------- | ----------------------------------------- | -------- |
| FLOW-PLATFORM-001 | View Platform Flows List                  | P1       |
| FLOW-PLATFORM-002 | Empty State Display                       | P2       |
| FLOW-PLATFORM-003 | Create Simple Announcement Flow           | P1       |
| FLOW-PLATFORM-004 | Create Multi-Step Onboarding Flow         | P1       |
| FLOW-PLATFORM-005 | Flow Validation - Missing Required Fields | P1       |
| FLOW-PLATFORM-006 | Create Blocking Priority Flow             | P2       |
| FLOW-PLATFORM-007 | Edit Existing Flow                        | P1       |
| FLOW-PLATFORM-008 | Add/Remove Steps in Edit Mode             | P2       |
| FLOW-PLATFORM-009 | Toggle Flow Active/Inactive               | P1       |
| FLOW-PLATFORM-010 | Delete Flow                               | P2       |
| FLOW-PLATFORM-011 | Non-Platform-Staff Cannot Access          | P0       |
| FLOW-ORG-001      | View Announcements Dashboard              | P1       |
| FLOW-ORG-002      | Announcements Empty State                 | P2       |
| FLOW-ORG-003      | Create Announcement for All Members       | P1       |
| FLOW-ORG-004      | Create Coach-Only Announcement            | P2       |
| FLOW-ORG-005      | Create Parent-Only Announcement           | P2       |
| FLOW-ORG-006      | Announcement with Markdown Formatting     | P2       |
| FLOW-ORG-007      | Validation - Empty Title or Content       | P1       |
| FLOW-ORG-008      | Only Admins Can Create Announcements      | P0       |
| FLOW-USER-001     | Flow Displays on Login                    | P0       |
| FLOW-USER-002     | Blocking Flow Prevents Access             | P1       |
| FLOW-USER-003     | Multiple Flows - Priority Ordering        | P2       |
| FLOW-E2E-001      | Platform Flow Creation to User Completion | P1       |

### 10.4 Guardian/Parent Linking Tests ✅ AUTOMATED

| Test ID                | Description                  | Priority | Status         | File                      |
| ---------------------- | ---------------------------- | -------- | -------------- | ------------------------- |
| GUARDIAN-BULK-001      | Bulk Guardian Claim          | P2       | ✅ Implemented | guardian-advanced.spec.ts |
| GUARDIAN-ADMIN-001     | Admin Links Parent to Player | P1       | ✅ Implemented | identity.spec.ts          |
| GUARDIAN-UNCLAIMED-001 | View Unclaimed Guardians     | P2       | ✅ Implemented | guardian-advanced.spec.ts |

### 10.5 Analytics & Reporting Tests ✅ AUTOMATED

| Test ID                | Description               | Priority | Status         | File                    |
| ---------------------- | ------------------------- | -------- | -------------- | ----------------------- |
| ANALYTICS-ADMIN-001    | Admin Dashboard Stats     | P2       | ✅ Implemented | analytics.spec.ts       |
| ANALYTICS-ADMIN-002    | Organization Stats        | P2       | ✅ Implemented | analytics.spec.ts       |
| ANALYTICS-COACH-001    | Coach Analytics View      | P2       | ✅ Implemented | analytics-coach.spec.ts |
| ANALYTICS-PROGRESS-001 | Player Progress Over Time | P2       | ✅ Implemented | analytics-coach.spec.ts |

### 10.6 Error Handling & Edge Cases ✅ AUTOMATED

| Test ID       | Description              | Priority | Status         | File                   |
| ------------- | ------------------------ | -------- | -------------- | ---------------------- |
| ERR-EMPTY-001 | Empty State - No Players | P2       | ✅ Implemented | error-handling.spec.ts |
| ERR-EMPTY-002 | Empty State - No Teams   | P2       | ✅ Implemented | error-handling.spec.ts |
| ERR-403-001   | Permission Denied Page   | P1       | ✅ Implemented | error-handling.spec.ts |
| ERR-404-001   | 404 Not Found            | P2       | ✅ Implemented | error-handling.spec.ts |

---

## 11. Known Gaps from MCP Browser Exploration

Based on live browser exploration (reference: `docs/archive/testing/UAT_MCP_TESTS.MD`):

### 11.1 UI Elements Missing Tests

| Area     | Element                         | Priority |
| -------- | ------------------------------- | -------- |
| AUTH     | PWA install prompt handling     | P1       |
| AUTH     | Forgot password flow            | P1       |
| ADMIN    | Command Palette (⌘K) search     | P1       |
| ADMIN    | Overrides page                  | P2       |
| ADMIN    | Benchmarks page                 | P2       |
| ADMIN    | Analytics dashboard             | P2       |
| ADMIN    | Player Access controls          | P1       |
| HOMEPAGE | All navigation section clicks   | P2       |
| HOMEPAGE | Request Demo form submission    | P2       |
| ORG      | Coach/Admin panel switching     | P1       |
| COACH    | Empty state (no teams assigned) | P1       |

### 11.2 UI Inconsistencies Identified

1. **Branding**: Signup page shows "Welcome to PDP" instead of "Welcome to PlayerARC"
2. **Console Warnings**: PostHog not initialized (missing env vars)
3. **UX Issue**: PWA install prompt appears immediately on login page

---

## Document Version History

| Version | Date       | Author | Changes                                                                                           |
| ------- | ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-07 | Cline  | Initial consolidation from 4 source documents                                                     |
| 2.0     | 2026-01-10 | Cline  | Updated with UATMCP test suite results                                                            |
| 2.1     | 2026-01-10 | Cline  | Added 67 new tests across 8 files                                                                 |
| 3.0     | 2026-01-10 | Cline  | Migrated to lightweight UAT model, removed onboarding, consolidated to single uat/ folder         |
| 3.1     | 2026-01-10 | Cline  | Added 28 new tests: Identity (6), Invitations (10), Teams (12). All P0 priorities complete        |
| 3.2     | 2026-01-10 | Cline  | Added 15 Cross-Role Scenario tests. All P1 priorities complete (except CI/CD)                     |
| 3.3     | 2026-01-10 | Cline  | Added 10 Performance tests. P2 performance testing complete                                       |
| 3.4     | 2026-01-10 | Cline  | Added 15 Mobile Viewport tests. All planned test categories complete (217 tests total)            |
| 4.0     | 2026-01-10 | UAT    | Consolidated content from 6 archived documents. Added UX tests, Onboarding, Flow System, MCP gaps |
| 5.0     | 2026-10-01 | Cline  | Implemented all 40 missing tests across P0-P3 priorities. Total: 269 tests                        |
| 5.1     | 2026-01-11 | Cline  | Fixed test stability (ORG-001 fixture issue), added retries. Updated config settings              |
| 5.2     | 2026-01-11 | Cline  | Added 3 Platform Staff tests (PLATFORM-001, PLATFORM-005, PLATFORM-006). Total: 272 tests         |

---

## 12. Next Steps - Missing UAT Tests to Implement

Based on comprehensive code review and analysis of archived documents, the following UAT tests are identified as **missing** and should be prioritized for implementation.

### 12.1 Priority 0 (Critical - Must Have)

| Test ID             | Description                                | Category       | Effort | Status                        |
| ------------------- | ------------------------------------------ | -------------- | ------ | ----------------------------- |
| AUTH-PWA-001        | PWA install prompt can be dismissed        | Authentication | Low    | ✅ Implemented                |
| AUTH-FORGOT-001     | Forgot password link navigation            | Authentication | Medium | 🟡 Skipped - Awaiting feature |
| AUTH-FORGOT-002     | Password reset email sent                  | Authentication | Medium | 🟡 Skipped - Awaiting feature |
| FLOW-ACCESS-001     | Non-Platform-Staff cannot access /platform | Flow System    | Low    | ✅ Implemented                |
| FLOW-USER-LOGIN-001 | Active flow displays after login           | Flow System    | Medium | ✅ Implemented                |

**Implementation Details:**

- `AUTH-PWA-001`: Implemented in `tests/auth/login.spec.ts` as `AUTH-010`
- `AUTH-FORGOT-001`: Test written in `tests/auth/login.spec.ts` but **SKIPPED** - waiting on forgot password feature implementation
- `AUTH-FORGOT-002`: Test written in `tests/auth/login.spec.ts` but **SKIPPED** - waiting on forgot password feature implementation
- `FLOW-ACCESS-001`: Implemented in `tests/flows/platform-access.spec.ts` (with variants for coach, admin, and positive test for owner)
- `FLOW-USER-LOGIN-001`: Implemented in `tests/flows/platform-access.spec.ts` (with flow dismissal test)

**⚠️ Blocked Items:**
The forgot password feature has not been implemented in the application yet. Tests are written and marked as `test.skip()`. Once the feature is implemented:

1. Remove `test.skip` from `AUTH-FORGOT-001` and `AUTH-FORGOT-002` in `tests/auth/login.spec.ts`
2. Verify the URL patterns match the actual implementation
3. Update this document to mark as ✅ Implemented

### 12.2 Priority 1 (High - Should Have) ✅ IMPLEMENTED

| Test ID                | Description                                 | Category     | Effort | Status |
| ---------------------- | ------------------------------------------- | ------------ | ------ | ------ |
| ONBOARD-FIRST-001      | First user auto-granted platformStaff       | Onboarding   | Medium | ✅     |
| ONBOARD-ORG-001        | Platform staff can create organization      | Onboarding   | Medium | ✅     |
| ONBOARD-TEAM-001       | Owner creates first team in empty org       | Onboarding   | Low    | ✅     |
| ONBOARD-INVITE-001     | Owner invites first admin                   | Onboarding   | Medium | ✅     |
| ADMIN-CMD-001          | Command Palette (⌘K) opens                  | Admin        | Low    | ✅     |
| ADMIN-CMD-002          | Command Palette search works                | Admin        | Medium | ✅     |
| ADMIN-PLAYERACCESS-001 | Player Access page loads                    | Admin        | Low    | ✅     |
| ADMIN-PLAYERACCESS-002 | Configure self-access minimum age           | Admin        | Medium | ✅     |
| COACH-EMPTY-001        | Empty state shown when no teams assigned    | Coach        | Low    | ✅     |
| GUARDIAN-LINK-001      | Admin manually links parent to player       | Guardian     | Medium | ✅     |
| GUARDIAN-SMART-001     | Smart matching suggests children for parent | Guardian     | Medium | ✅     |
| ORG-SWITCH-001         | User can switch between Coach/Admin panels  | Organization | Low    | ✅     |
| FLOW-CREATE-001        | Create simple announcement flow             | Flow System  | Medium | ✅     |
| FLOW-EDIT-001          | Edit existing flow                          | Flow System  | Medium | ✅     |
| FLOW-TOGGLE-001        | Toggle flow active/inactive                 | Flow System  | Low    | ✅     |

**Implementation Details:**

- `ADMIN-CMD-001/002`: Implemented in `tests/admin/dashboard.spec.ts`
- `ADMIN-PLAYERACCESS-001/002`: Implemented in `tests/admin/dashboard.spec.ts`
- `COACH-EMPTY-001`: Already exists as `COACH-010` in `tests/coach/dashboard.spec.ts`
- `GUARDIAN-LINK-001`: Implemented in `tests/admin/identity.spec.ts`
- `GUARDIAN-SMART-001`: Implemented in `tests/admin/identity.spec.ts`
- `ORG-SWITCH-001`: Implemented in `tests/admin/identity.spec.ts`
- `FLOW-CREATE-001/EDIT-001/TOGGLE-001`: Implemented in `tests/flows/flow-management.spec.ts`
- `ONBOARD-FIRST-001/ORG-001/TEAM-001/INVITE-001`: Implemented in `tests/flows/flow-management.spec.ts`

### 12.3 Priority 2 (Medium - Nice to Have) ✅ IMPLEMENTED

| Test ID                | Description                                 | Category       | Effort | Status |
| ---------------------- | ------------------------------------------- | -------------- | ------ | ------ |
| ADMIN-OVERRIDES-001    | Overrides page loads                        | Admin          | Low    | ✅     |
| ADMIN-OVERRIDES-002    | Age group override can be created           | Admin          | Medium | ✅     |
| ADMIN-BENCH-001        | Benchmarks page loads                       | Admin          | Low    | ✅     |
| ADMIN-BENCH-002        | View NGB benchmarks by sport/age            | Admin          | Medium | ✅     |
| ADMIN-ANALYTICS-001    | Analytics dashboard loads                   | Admin          | Low    | ✅     |
| ADMIN-ANALYTICS-002    | Organization stats display correctly        | Admin          | Medium | ✅     |
| PLATFORM-SPORTS-001    | Platform staff can manage sports            | Platform       | Medium | ✅     |
| PLATFORM-SKILLS-001    | Platform staff can manage skill categories  | Platform       | Medium | ✅     |
| PLATFORM-SKILLS-002    | Platform staff can manage skill definitions | Platform       | Medium | ✅     |
| GUARDIAN-UNCLAIMED-001 | View unclaimed guardians list               | Guardian       | Low    | ✅     |
| GUARDIAN-BULK-001      | Bulk guardian claim for multiple children   | Guardian       | Medium | ✅     |
| FLOW-MULTISTEP-001     | Create multi-step onboarding flow           | Flow System    | High   | ✅     |
| FLOW-BLOCKING-001      | Blocking flow prevents app access           | Flow System    | Medium | ✅     |
| FLOW-PRIORITY-001      | Multiple flows display in priority order    | Flow System    | Medium | ✅     |
| ERR-EMPTY-PLAYERS-001  | Empty state message when no players         | Error Handling | Low    | ✅     |
| ERR-EMPTY-TEAMS-001    | Empty state message when no teams           | Error Handling | Low    | ✅     |
| ERR-404-001            | 404 page for invalid routes                 | Error Handling | Low    | ✅     |
| ERR-403-001            | 403 page for unauthorized access            | Error Handling | Low    | ✅     |

**Implementation Details:**

- `ADMIN-OVERRIDES-001/002`: Implemented in `tests/admin/overrides.spec.ts`
- `ADMIN-BENCH-001/002`: Implemented in `tests/admin/benchmarks.spec.ts`
- `ADMIN-ANALYTICS-001/002`: Implemented in `tests/admin/analytics.spec.ts`
- `PLATFORM-SPORTS/SKILLS`: Implemented in `tests/platform/platform-management.spec.ts`
- `GUARDIAN-UNCLAIMED/BULK`: Implemented in `tests/admin/guardian-advanced.spec.ts`
- `FLOW-MULTISTEP/BLOCKING/PRIORITY`: Implemented in `tests/flows/flow-advanced.spec.ts`
- `ERR-*`: Implemented in `tests/errors/error-handling.spec.ts`

### 12.4 Priority 3 (Low - Future Enhancement) ✅ IMPLEMENTED

| Test ID                | Description                               | Category   | Effort | Status |
| ---------------------- | ----------------------------------------- | ---------- | ------ | ------ |
| UX-SKELETON-001        | Skeleton loading states display correctly | UX Testing | Medium | ✅     |
| UX-TOUCH-001           | Touch targets meet 44px minimum           | UX Testing | Medium | ✅     |
| UX-SWIPE-001           | Mobile player cards support swipe         | UX Testing | High   | ✅     |
| UX-DENSITY-001         | Information density options work          | UX Testing | Medium | ✅     |
| HOMEPAGE-NAV-001       | All navigation sections scroll correctly  | Homepage   | Low    | ✅     |
| HOMEPAGE-DEMO-001      | Request Demo form submission              | Homepage   | Medium | ✅     |
| ANALYTICS-PROGRESS-001 | Player progress over time chart           | Analytics  | High   | ✅     |
| ANALYTICS-COACH-001    | Coach analytics view                      | Analytics  | High   | ✅     |

**Implementation Details:**

- `UX-SKELETON/TOUCH/SWIPE/DENSITY`: Implemented in `tests/ux/ux-features.spec.ts`
- `HOMEPAGE-NAV/DEMO`: Implemented in `tests/homepage/homepage-advanced.spec.ts`
- `ANALYTICS-PROGRESS/COACH`: Implemented in `tests/coach/analytics-coach.spec.ts`

### 12.5 Implementation Roadmap

**Phase 1 (Immediate - P0 tests):** ~5 tests, ~1-2 days effort

- Focus on critical auth flows and access control
- Ensure blocking flows work correctly

**Phase 2 (Short-term - P1 tests):** ~15 tests, ~3-5 days effort

- Onboarding journey tests
- Command palette and admin features
- Guardian linking workflows

**Phase 3 (Medium-term - P2 tests):** ~18 tests, ~5-7 days effort

- Platform staff management
- Flow system comprehensive testing
- Error handling edge cases

**Phase 4 (Long-term - P3 tests):** ~8 tests, ~3-5 days effort

- UX testing suite
- Analytics dashboards
- Homepage interactions

### 12.6 Archived Documents Reference

The following documents have been archived to `docs/archive/testing/` after content consolidation:

| Document                      | Key Content Extracted                                |
| ----------------------------- | ---------------------------------------------------- |
| `flow-system-tests.md`        | 67 detailed flow system test cases                   |
| `identity-migration-tests.md` | Technical migration phase tests (7 phases)           |
| `master-test-plan.md`         | Onboarding tests, settings tests, comprehensive plan |
| `role-based-test-cases.md`    | Role capability matrix, implementation status        |
| `UAT_MCP_TESTS.MD`            | Browser exploration gaps, UI element inventory       |
| `ux-uat/`                     | 14 UX test specifications                            |

---

<!-- End of Document -->
