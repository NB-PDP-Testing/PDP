# PlayerARC UAT Test Suite

Comprehensive User Acceptance Testing suite for PlayerARC using Playwright.

## Overview

This test suite validates all major user journeys and functionality of the PlayerARC application.

## Directory Structure

```text
uat/
├── README.md                 # This file
├── test-data.json            # Test data configuration (users, org, teams, players)
├── playwright.config.ts      # Main Playwright configuration
├── global-setup.ts           # Authentication setup for test users
├── .auth/                    # Cached auth states
├── fixtures/
│   └── test-fixtures.ts      # Shared test fixtures and helpers
├── scripts/
│   ├── onboarding.spec.ts    # First-time setup tests (runs on fresh DB)
│   └── playwright.config.ts  # Standalone config for setup scripts
├── tests/
│   ├── admin/                # Admin dashboard tests
│   │   ├── dashboard.spec.ts
│   │   ├── identity.spec.ts
│   │   ├── invitations.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── teams.spec.ts
│   ├── auth/                 # Authentication tests
│   ├── coach/                # Coach features tests
│   ├── cross-role/           # Cross-role scenario tests (NEW)
│   │   └── cross-role.spec.ts
│   ├── flows/                # Flow wizard tests
│   ├── homepage/             # Homepage tests
│   ├── mobile/               # Mobile viewport tests (NEW)
│   │   └── mobile-viewport.spec.ts
│   ├── org/                  # Organization tests
│   ├── parent/               # Parent dashboard tests
│   ├── performance/          # Performance tests (NEW)
│   │   └── performance.spec.ts
│   ├── player/               # Player features tests
│   └── fixtures/
│       └── test-utils.ts     # Test utilities and data exports
├── playwright-report/        # HTML test reports
└── test-results/             # Test artifacts (screenshots, traces)
```

## Test Categories

| Category   | Test ID Prefix | Description                 |
| ---------- | -------------- | --------------------------- |
| AUTH       | AUTH-xxx       | Authentication flows        |
| ONBOARDING | ONBOARDING-xxx | First-time setup flow       |
| ADMIN      | ADMIN-xxx      | Admin dashboard features    |
| COACH      | COACH-xxx      | Coach features              |
| PARENT     | PARENT-xxx     | Parent dashboard            |
| PLAYER     | PLAYER-xxx     | Player features             |
| ORG        | ORG-xxx        | Organization management     |
| TEAM       | TEAM-xxx       | Team management             |
| INVITE     | INVITE-xxx     | Invitation workflow         |
| FLOW       | FLOW-xxx       | Flow wizard tests           |
| IDENTITY   | IDENTITY-xxx   | Identity system tests       |
| HOME       | HOME-xxx       | Homepage tests              |
| CROSS      | CROSS-xxx      | Cross-role scenarios (NEW)  |
| PERF       | PERF-xxx       | Performance tests (NEW)     |
| MOBILE     | MOBILE-xxx     | Mobile viewport tests (NEW) |
| E2E        | E2E-xxx        | End-to-end flows            |

## Test Users

All test accounts are defined in `test-data.json`:

| Role   | Email                    | Description                     |
| ------ | ------------------------ | ------------------------------- |
| Owner  | <owner_pdp@outlook.com>  | Platform staff with full access |
| Admin  | <adm1n_pdp@outlook.com>  | Organization administrator      |
| Coach  | <coach_pdp@outlook.com>  | Team coach                      |
| Parent | <parent_pdp@outlook.com> | Player guardian                 |

## Running Tests

### From Project Root

```bash
# Run all UAT tests
npm run test -w web

# Run specific test category
npm run test:admin -w web
npm run test:auth -w web
npm run test:coach -w web
npm run test:parent -w web
npm run test:player -w web
npm run test:org -w web
npm run test:flows -w web
npm run test:homepage -w web
npm run test:cross-role -w web    # NEW: Cross-role scenarios
npm run test:performance -w web   # NEW: Performance tests
npm run test:mobile -w web        # NEW: Mobile viewport tests

# Run with UI mode
npm run test:ui -w web

# Run headed (visible browser)
npm run test:headed -w web

# Run in debug mode
npm run test:debug -w web

# View HTML report
npm run test:report -w web

# List all tests
npm run test:list -w web
```

### From apps/web Directory

```bash
cd apps/web

# Run all tests
npm run test

# Run specific category
npm run test:admin
npm run test:auth
npm run test:coach
npm run test:parent
npm run test:player
npm run test:org
npm run test:flows
npm run test:homepage
npm run test:cross-role     # NEW: Cross-role scenarios
npm run test:performance    # NEW: Performance tests
npm run test:mobile         # NEW: Mobile viewport tests

# Run with UI
npm run test:ui

# Run headed
npm run test:headed

# Debug mode
npm run test:debug

# View report
npm run test:report
```

### First-Time Setup Tests

The onboarding tests run on a **fresh database** (no existing users):

```bash
# Run onboarding/setup tests (headless)
npm run test:setup -w web

# Run with visible browser
npm run test:setup -w web -- --headed
```

> **Note:** The `test:setup` script uses a separate config (`scripts/playwright.config.ts`) that does NOT use globalSetup, since users don't exist yet.

## Authentication Setup

**Authentication happens automatically!** You don't need to run a separate auth setup command.

### How It Works

1. When you run `npx playwright test`, the **global-setup.ts** file runs first
2. Global setup:
   - Runs linting checks on changed files
   - Calls **auth.setup.ts** to authenticate all test users
3. Auth setup:
   - Verifies the dev server is running
   - Logs in as each test user (owner, admin, coach, parent)
   - Saves authenticated session states to `.auth/` directory
4. Tests use these pre-authenticated sessions via `storageState`

### Refreshing Auth States

If you need to refresh authentication (e.g., after password changes or auth errors):

**Option 1: Delete auth cache and re-run**
```bash
rm -rf apps/web/uat/.auth
npm run test -w web
```

**Option 2: Run any single test** (global setup will run first and refresh auth)
```bash
npm run test:admin -w web -- -g "ADMIN-001"
```

The `.auth/` directory is gitignored and contains JSON files with session cookies for each role:
- `owner.json` - Platform staff session
- `admin.json` - Organization admin session
- `coach.json` - Coach session
- `parent.json` - Parent session

## Test Data Configuration

`test-data.json` contains:

- **users**: Test user accounts (owner, admin, coach, parent)
- **organization**: Test organization details
- **teams**: Team configurations
- **players**: Player profiles for testing
- **invitations**: Invitation test data

## Prerequisites

1. Development server running on `http://localhost:3000`
2. Database seeded with test data (for regular tests)
3. Playwright browsers installed: `npx playwright install`

## Key Test Files

### Invitation Workflow Tests (`tests/admin/invitations.spec.ts`)

Tests the invitation and approval workflow:

| Test ID    | Description                                      |
| ---------- | ------------------------------------------------ |
| INVITE-001 | Admin can navigate to approvals management       |
| INVITE-002 | Approvals page shows pending membership requests |
| INVITE-003 | Invite member dialog has email and role fields   |
| INVITE-004 | Can send invitation with admin role selected     |
| INVITE-005 | Can send invitation with coach role selected     |
| INVITE-006 | Parent role invitation shows player linking      |
| INVITE-007 | Pending requests can be approved or rejected     |
| INVITE-008 | Admin can access org join page link              |
| INVITE-009 | Pending requests display user information        |
| INVITE-010 | Multiple roles can be selected                   |

### Cross-Role Scenario Tests (`tests/cross-role/cross-role.spec.ts`) - NEW

Tests multi-role user behavior and data isolation:

| Test ID   | Description                                     |
| --------- | ----------------------------------------------- |
| CROSS-001 | User can switch from Admin to Coach panel       |
| CROSS-002 | User can switch from Coach to Admin panel       |
| CROSS-003 | OrgRoleSwitcher displays available roles        |
| CROSS-004 | Coach can only see assigned team players        |
| CROSS-005 | Parent can only see linked children             |
| CROSS-006 | Admin can see all organization players          |
| CROSS-007 | Coach cannot access admin settings              |
| CROSS-008 | Parent cannot create assessments                |
| CROSS-009 | Coach cannot manage users                       |
| CROSS-010 | Owner has access to both Admin and Coach panels |
| CROSS-011 | Multi-role user can create assessment as coach  |
| CROSS-012 | Multi-role user can manage teams as admin       |
| CROSS-013 | Player data consistent across Admin/Coach views |
| CROSS-014 | Role context persists after navigation          |
| CROSS-015 | Platform staff can see Platform link            |

### Performance Tests (`tests/performance/performance.spec.ts`) - NEW

Tests application performance metrics:

| Test ID  | Description                                     |
| -------- | ----------------------------------------------- |
| PERF-001 | Homepage loads within acceptable time (<5s)     |
| PERF-002 | Login page loads within acceptable time (<5s)   |
| PERF-003 | Organizations page loads within time (<5s)      |
| PERF-004 | Admin dashboard loads within time (<5s)         |
| PERF-005 | Coach dashboard loads within time (<5s)         |
| PERF-006 | Navigation between admin sections is fast (<3s) |
| PERF-007 | Role switching is fast (<3s)                    |
| PERF-008 | Players list loads efficiently (<5s)            |
| PERF-009 | Teams list loads efficiently (<5s)              |
| PERF-010 | No slow API requests on dashboard load (<2s)    |

### Mobile Viewport Tests (`tests/mobile/mobile-viewport.spec.ts`) - NEW

Tests responsive design on mobile devices:

| Test ID    | Description                             |
| ---------- | --------------------------------------- |
| MOBILE-001 | Homepage renders correctly on mobile    |
| MOBILE-002 | Mobile navigation is accessible         |
| MOBILE-003 | Login page is usable on mobile          |
| MOBILE-004 | Organizations page renders on mobile    |
| MOBILE-005 | Admin dashboard works on mobile         |
| MOBILE-006 | Coach dashboard works on mobile         |
| MOBILE-007 | Buttons have adequate touch target size |
| MOBILE-008 | Form inputs are accessible on mobile    |
| MOBILE-009 | Links have adequate spacing on mobile   |
| MOBILE-010 | Bottom navigation works if present      |
| MOBILE-011 | PWA install prompt can be dismissed     |
| MOBILE-012 | Content hierarchy maintained on mobile  |
| MOBILE-013 | Tables are scrollable or responsive     |
| MOBILE-014 | Modals/dialogs work on mobile           |
| MOBILE-015 | Different mobile sizes render correctly |

**Mobile viewport sizes tested:**

- iPhone SE: 375x667
- iPhone 12/13: 390x844
- Android common: 360x640

### Onboarding Tests (`scripts/onboarding.spec.ts`)

First-time setup flow on fresh database:

| Test ID        | Description                                    |
| -------------- | ---------------------------------------------- |
| ONBOARDING-001 | First user signup - automatic platform staff   |
| ONBOARDING-002 | Non-platform staff cannot create organizations |
| ONBOARDING-003 | Owner first login experience                   |
| ONBOARDING-004 | Owner creates first team                       |
| ONBOARDING-005 | Owner invites first admin                      |
| ONBOARDING-006 | First admin accepts invitation                 |
| ONBOARDING-007 | Owner invites first coach                      |
| ONBOARDING-008 | First coach accepts and gets team assignment   |
| ONBOARDING-009 | Admin creates first players                    |
| ONBOARDING-010 | Owner invites first parent                     |
| ONBOARDING-011 | Platform admin edits organization              |
| ONBOARDING-012 | Owner transfers ownership to admin             |

## Known Issues

### INVITE-007 Empty State Detection

The test looks for empty state text that doesn't match the actual UI:

- **Test expects:** `/no pending|all caught up/i`
- **Actual UI shows:** "No Membership Requests" or "There are no pending membership requests at the moment."
- **Fix:** Update the regex to match actual UI text.

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Test IDs follow `CATEGORY-NNN: Description`
3. **Data-Driven**: Test data from `test-data.json`
4. **Fixtures**: Use shared fixtures from `fixtures/test-fixtures.ts`
5. **Assertions**: Clear assertions with descriptive messages
6. **Wait States**: Use proper waits for async operations

## Test Suite Summary

| Category     | Tests   | Status            |
| ------------ | ------- | ----------------- |
| Auth         | 12      | ✅ Complete       |
| Admin        | 39      | ✅ Complete       |
| Coach        | 29      | ✅ Complete       |
| Parent       | 10      | ✅ Complete       |
| Player       | 17      | ✅ Complete       |
| Organization | 20      | ✅ Complete       |
| Flows        | 9       | ✅ Complete       |
| Homepage     | 13      | ✅ Complete       |
| Identity     | 6       | ✅ Complete       |
| Invitations  | 10      | ✅ Complete       |
| Teams        | 12      | ✅ Complete       |
| Cross-Role   | 15      | ✅ NEW            |
| Performance  | 10      | ✅ NEW            |
| Mobile       | 15      | ✅ NEW            |
| **Total**    | **217** | **14 categories** |

## Coverage Mapping

Tests are mapped to requirements in:

- `docs/testing/MASTER_UAT_PLAN.md`
- `docs/testing/UAT_MCP_TESTS.MD`
