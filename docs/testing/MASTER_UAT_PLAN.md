# Master UAT Test Plan

**Version:** 2.1  
**Created:** January 7, 2026  
**Last Updated:** January 10, 2026  
**Status:** ACTIVE - Enhanced Test Coverage  
**Total Tests:** 420+ test cases (151+ manual, 140+ automated across 15 test files)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Test Environment](#3-test-environment)
4. [Authentication Tests](#4-authentication-tests)
5. [Onboarding Tests](#5-onboarding-tests)
6. [User Management Tests](#6-user-management-tests)
7. [Team Management Tests](#7-team-management-tests)
8. [Player Management Tests](#8-player-management-tests)
9. [Coach Management Tests](#9-coach-management-tests)
10. [Organization Settings Tests](#10-organization-settings-tests)
11. [Coach Role Tests](#11-coach-role-tests)
12. [Parent Role Tests](#12-parent-role-tests)
13. [Adult Player Role Tests](#13-adult-player-role-tests)
14. [Flow System Tests](#14-flow-system-tests)
15. [Identity System Tests](#15-identity-system-tests)
16. [Cross-Role & Integration Tests](#16-cross-role--integration-tests)
17. [Recommendations & Next Steps](#17-recommendations--next-steps)

---

## 1. Overview

### 1.1 Purpose

This document consolidates all UAT test cases from multiple sources into a single master test plan. It serves as the authoritative reference for:

- Test planning and execution
- Progress tracking
- Implementation verification
- Sign-off requirements

### 1.2 Source Documents

| Document                    | Tests | Focus Area                 |
| --------------------------- | ----- | -------------------------- |
| master-test-plan.md         | 151+  | Comprehensive UAT coverage |
| role-based-test-cases.md    | N/A   | Role capabilities matrix   |
| flow-system-tests.md        | 67    | Flow/Wizard system         |
| identity-migration-tests.md | ~100  | Identity system migration  |

### 1.3 Test ID Convention

```
TEST-{CATEGORY}-{NUMBER}
```

Categories:

- `AUTH` - Authentication
- `ONBOARDING` - First-time setup
- `USER` - User management
- `TEAM` - Team management
- `PLAYER` - Player management
- `COACH-MGT` - Coach management (admin)
- `ORG` - Organization settings
- `COACH` - Coach role functionality
- `PARENT` - Parent role functionality
- `ADULT` - Adult player functionality
- `FLOW` - Flow system
- `IDENTITY` - Identity system
- `CROSS` - Cross-role tests
- `E2E` - End-to-end integration
- `HOME` - Homepage/marketing tests
- `ADMIN` - Admin dashboard tests

### 1.4 Implementation Status Legend

| Symbol | Meaning                          |
| ------ | -------------------------------- |
| ✅     | Implemented and Passing          |
| 🟡     | Partially implemented or Skipped |
| ⬜     | Not yet implemented              |
| 🔴     | Blocked/Issue                    |

---

## 2. Current Implementation Status

### 2.1 Test Suite Summary (As of January 10, 2026)

The project has **two automated test suites** in Playwright:

#### Original UAT Suite (`apps/web/uat/`)

- **Config:** Uses `apps/web/playwright.config.ts`
- **Tests:** Comprehensive onboarding and role-based tests
- **Dependencies:** Runs onboarding tests first to create users

| Test File                     | Tests | Description                                             |
| ----------------------------- | ----- | ------------------------------------------------------- |
| onboarding.spec.ts            | ~50   | First user signup, org creation, team/player management |
| auth.spec.ts                  | ~8    | Authentication flows                                    |
| admin.spec.ts                 | ~20   | Admin dashboard and user management                     |
| admin-advanced.spec.ts        | ~15   | Advanced admin features                                 |
| coach.spec.ts                 | ~10   | Coach dashboard and assessments                         |
| parent.spec.ts                | ~10   | Parent dashboard                                        |
| mobile.spec.ts                | ~5    | Mobile viewport tests                                   |
| first-login-dashboard.spec.ts | ~5    | First login redirect tests                              |

#### New MCP UAT Suite (`apps/web/uatmcp/`)

- **Config:** `apps/web/uatmcp/playwright.config.ts`
- **Purpose:** Lightweight, role-based tests with pre-authenticated users
- **Status:** ✅ **73 passing, 1 skipped**

| Test File                 | Tests | Status            | Description                    |
| ------------------------- | ----- | ----------------- | ------------------------------ |
| auth/login.spec.ts        | 12    | ✅ All Pass       | Login flows for all user roles |
| auth/signup.spec.ts       | 8     | ✅ All Pass       | Signup validation              |
| homepage/homepage.spec.ts | 13    | ✅ All Pass       | Marketing page content         |
| admin/dashboard.spec.ts   | 10    | ✅ 9 Pass, 1 Skip | Admin dashboard features       |
| admin/navigation.spec.ts  | 14    | ✅ All Pass       | Admin sidebar navigation       |
| coach/dashboard.spec.ts   | 6     | ✅ All Pass       | Coach dashboard access         |
| org/dashboard.spec.ts     | 12    | ✅ All Pass       | Organization management        |

### 2.2 Overall Progress

| Category          | Planned  | Automated | Coverage |
| ----------------- | -------- | --------- | -------- |
| Authentication    | 11       | 20        | **182%** |
| Onboarding        | 12       | 50+       | **416%** |
| User Management   | 20       | 15        | 75%      |
| Team Management   | 17       | 12        | 71%      |
| Player Management | 14       | 8         | 57%      |
| Coach Management  | 4        | 3         | 75%      |
| Org Settings      | 19       | 15        | 79%      |
| Coach Role        | 21       | 10        | 48%      |
| Parent Role       | 8        | 8         | 100%     |
| Adult Player      | 7        | 0         | 0%       |
| Homepage          | 0        | 13        | **New**  |
| Flow System       | 47       | 0         | 0%       |
| Identity System   | ~100     | 0         | 0%       |
| Cross-Role        | 13       | 5         | 38%      |
| **TOTAL**         | **~293** | **~160**  | **55%**  |

### 2.3 Skipped Tests

| Test ID   | Reason                                            | Action Required           |
| --------- | ------------------------------------------------- | ------------------------- |
| ADMIN-010 | Command palette keyboard shortcut not implemented | Enable when feature ready |

---

## 3. Test Environment

### 3.1 Prerequisites

- [x] Convex deployment configured
- [x] Test user accounts created
- [x] Browser with DevTools (Chromium via Playwright)
- [x] Playwright test runner configured

### 3.2 Test User Accounts

| Role           | Email                    | Password       | Notes                          |
| -------------- | ------------------------ | -------------- | ------------------------------ |
| Platform Owner | `owner_pdp@outlook.com`  | `Password123!` | First user, platformStaff=true |
| Org Admin      | `adm1n_pdp@outlook.com`  | `Password123!` | Organization administrator     |
| Coach          | `coach_pdp@outlook.com`  | `Password123!` | Has team assignments           |
| Parent         | `parent_pdp@outlook.com` | `Password123!` | Has linked children            |

### 3.3 Test Data Files

```
apps/web/
├── uat/                           # Original comprehensive suite
│   ├── test-data.json             # Test data configuration
│   ├── global-setup.ts            # Database setup
│   ├── global-teardown.ts         # Cleanup
│   ├── auth.setup.ts              # Auth session creation
│   └── tests/
│       ├── onboarding.spec.ts     # Full onboarding flow
│       ├── auth.spec.ts           # Auth tests
│       ├── admin.spec.ts          # Admin tests
│       ├── coach.spec.ts          # Coach tests
│       └── parent.spec.ts         # Parent tests
│
└── uatmcp/                        # New lightweight suite
    ├── test-data.json             # User credentials
    ├── playwright.config.ts       # Standalone config
    ├── global-setup.ts            # Auth state creation
    ├── fixtures/test-fixtures.ts  # Helpers and authenticated pages
    └── tests/
        ├── auth/                  # Login/signup tests
        ├── homepage/              # Marketing page tests
        ├── admin/                 # Admin dashboard tests
        ├── coach/                 # Coach dashboard tests
        └── org/                   # Organization tests
```

### 3.4 Running Tests

```bash
# Run UATMCP suite (recommended for quick validation)
npx playwright test --config=apps/web/uatmcp/playwright.config.ts

# Run specific test file
npx playwright test --config=apps/web/uatmcp/playwright.config.ts apps/web/uatmcp/tests/auth/login.spec.ts

# Run with visible browser
npx playwright test --config=apps/web/uatmcp/playwright.config.ts --headed

# Run original UAT suite (full onboarding flow)
npx playwright test --config=apps/web/playwright.config.ts
```

---

## 4. Authentication Tests

### 4.1 Email Registration

| ID       | Test                                    | Status | Implementation        |
| -------- | --------------------------------------- | ------ | --------------------- |
| AUTH-001 | Display signup page correctly           | ✅     | uatmcp/signup.spec.ts |
| AUTH-002 | Show error for duplicate email          | ✅     | uatmcp/signup.spec.ts |
| AUTH-003 | Show validation error for weak password | ✅     | uatmcp/signup.spec.ts |

### 4.2 Login

| ID       | Test                                  | Status | Implementation       |
| -------- | ------------------------------------- | ------ | -------------------- |
| AUTH-004 | Email/password login success (owner)  | ✅     | uatmcp/login.spec.ts |
| AUTH-005 | Email/password login success (admin)  | ✅     | uatmcp/login.spec.ts |
| AUTH-006 | Email/password login success (coach)  | ✅     | uatmcp/login.spec.ts |
| AUTH-007 | Email/password login success (parent) | ✅     | uatmcp/login.spec.ts |
| AUTH-008 | Google SSO button displayed           | ✅     | uatmcp/login.spec.ts |
| AUTH-009 | Microsoft SSO button displayed        | ✅     | uatmcp/login.spec.ts |
| AUTH-010 | Login failure (invalid credentials)   | ✅     | uatmcp/login.spec.ts |

### 4.3 Session Management

| ID       | Test                               | Status | Implementation       |
| -------- | ---------------------------------- | ------ | -------------------- |
| AUTH-011 | Session persistence after refresh  | ✅     | uatmcp/login.spec.ts |
| AUTH-012 | Protected routes redirect to login | ✅     | uatmcp/login.spec.ts |

---

## 5. Onboarding Tests

### 5.1 First User Flow

| ID             | Test                                         | Status | Implementation         |
| -------------- | -------------------------------------------- | ------ | ---------------------- |
| ONBOARDING-001 | First user signup - automatic platform staff | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-002 | First user prompted to create organization   | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-003 | First user creates organization              | ✅     | uat/onboarding.spec.ts |

### 5.2 Non-Platform Staff Restrictions

| ID             | Test                                    | Status | Implementation         |
| -------------- | --------------------------------------- | ------ | ---------------------- |
| ONBOARDING-004 | Second user cannot create organizations | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-005 | Second user redirected to join page     | ✅     | uat/onboarding.spec.ts |

### 5.3 Owner Experience

| ID             | Test                              | Status | Implementation         |
| -------------- | --------------------------------- | ------ | ---------------------- |
| ONBOARDING-006 | Owner sees organization dashboard | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-007 | Owner accesses Admin Panel        | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-008 | Owner views Pending Requests      | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-009 | Owner views Total Members         | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-010 | Owner views Teams                 | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-011 | Owner views Players               | ✅     | uat/onboarding.spec.ts |
| ONBOARDING-012 | Owner views Medical Profiles      | ✅     | uat/onboarding.spec.ts |

---

## 6. Homepage Tests (NEW)

### 6.1 Marketing Page Content

| ID       | Test                                     | Status | Implementation          |
| -------- | ---------------------------------------- | ------ | ----------------------- |
| HOME-001 | Homepage loads correctly                 | ✅     | uatmcp/homepage.spec.ts |
| HOME-002 | Header navigation is visible             | ✅     | uatmcp/homepage.spec.ts |
| HOME-003 | Hero section displays correctly          | ✅     | uatmcp/homepage.spec.ts |
| HOME-004 | Problem section displays statistics      | ✅     | uatmcp/homepage.spec.ts |
| HOME-005 | Solution section is visible              | ✅     | uatmcp/homepage.spec.ts |
| HOME-006 | Sports section displays supported sports | ✅     | uatmcp/homepage.spec.ts |
| HOME-007 | Features section is visible              | ✅     | uatmcp/homepage.spec.ts |
| HOME-008 | Testimonials section is visible          | ✅     | uatmcp/homepage.spec.ts |
| HOME-009 | Research/Blog section is visible         | ✅     | uatmcp/homepage.spec.ts |
| HOME-010 | Footer is visible with navigation        | ✅     | uatmcp/homepage.spec.ts |
| HOME-011 | Login link is functional                 | ✅     | uatmcp/homepage.spec.ts |
| HOME-012 | Request Demo link works                  | ✅     | uatmcp/homepage.spec.ts |
| HOME-013 | CTA section is visible                   | ✅     | uatmcp/homepage.spec.ts |

---

## 7. Admin Dashboard Tests (NEW)

### 7.1 Dashboard Features

| ID        | Test                                 | Status | Implementation                 |
| --------- | ------------------------------------ | ------ | ------------------------------ |
| ADMIN-001 | Admin dashboard displays overview    | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-002 | Dashboard shows statistics cards     | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-003 | Navigation tabs are visible          | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-004 | Organization owner info is displayed | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-005 | Pending membership requests section  | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-006 | Grow your organization section       | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-007 | Command palette button is visible    | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-008 | Back to App button works             | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-009 | Stat cards are clickable links       | ✅     | uatmcp/admin/dashboard.spec.ts |
| ADMIN-010 | Command palette opens                | 🟡     | Skipped - feature not ready    |

### 7.2 Admin Navigation

| ID            | Test                            | Status | Implementation                  |
| ------------- | ------------------------------- | ------ | ------------------------------- |
| ADMIN-NAV-001 | Navigate to Overview            | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-002 | Navigate to Players             | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-003 | Navigate to Teams               | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-004 | Navigate to Coaches             | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-005 | Navigate to Users               | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-006 | Navigate to Invitations         | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-007 | Navigate to Approvals           | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-008 | Navigate to Settings            | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-009 | Navigate to Announcements       | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-010 | Navigate to Benchmarks          | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-011 | Navigate to GAA Import          | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-012 | Navigate to Player Import       | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-013 | Navigate to Medical Profiles    | ✅     | uatmcp/admin/navigation.spec.ts |
| ADMIN-NAV-014 | Navigate to Unclaimed Guardians | ✅     | uatmcp/admin/navigation.spec.ts |

---

## 8. Organization Dashboard Tests (NEW)

| ID      | Test                                           | Status | Implementation               |
| ------- | ---------------------------------------------- | ------ | ---------------------------- |
| ORG-001 | Organizations dashboard displays correctly     | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-002 | Your Organizations section is visible          | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-003 | Create Organization button is visible          | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-004 | Join Organization button is visible            | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-005 | Navigate to Create Organization page           | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-006 | Navigate to Join Organization page             | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-007 | Organization card displays info                | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-008 | Organization card has Coach Panel link         | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-009 | Organization card has Admin Panel link         | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-010 | Switch between Coach and Admin panels          | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-011 | Header navigation is visible                   | ✅     | uatmcp/org/dashboard.spec.ts |
| ORG-012 | Platform staff sees All Platform Organizations | ✅     | uatmcp/org/dashboard.spec.ts |

---

## 9. Coach Dashboard Tests (NEW)

| ID        | Test                                         | Status | Implementation                 |
| --------- | -------------------------------------------- | ------ | ------------------------------ |
| COACH-001 | Coach dashboard loads correctly              | ✅     | uatmcp/coach/dashboard.spec.ts |
| COACH-002 | Coach dashboard header is visible            | ✅     | uatmcp/coach/dashboard.spec.ts |
| COACH-003 | Back to App button works                     | ✅     | uatmcp/coach/dashboard.spec.ts |
| COACH-004 | Admin link visible for users with admin role | ✅     | uatmcp/coach/dashboard.spec.ts |
| COACH-005 | Navigate to Admin from Coach dashboard       | ✅     | uatmcp/coach/dashboard.spec.ts |
| COACH-010 | Empty state shows when no teams assigned     | ✅     | uatmcp/coach/dashboard.spec.ts |

---

## 10-16. Remaining Test Categories

_See sections 5-16 in the original document for complete test case details. The following categories have NOT YET been automated in the uatmcp suite:_

- **User Management** - Invitation system, role assignment
- **Team Management** - Creation, configuration, roster management
- **Player Management** - Creation, import, profile management
- **Organization Settings** - Theme, branding, sports configuration
- **Coach Role** - Skills assessment, goals, voice notes, injuries
- **Parent Role** - Child viewing, coach feedback, access control
- **Adult Player Role** - Self-access features
- **Flow System** - Platform flows, announcements, wizards
- **Identity System** - Guardian/player identity migration
- **Cross-Role** - Multi-role scenarios, data visibility

---

## 17. Recommendations & Next Steps

### 17.1 Immediate Priorities (P0)

| Priority | Item                           | Effort | Impact                                      |
| -------- | ------------------------------ | ------ | ------------------------------------------- |
| 1        | **Enable ADMIN-010**           | Low    | Implement command palette keyboard shortcut |
| 2        | **Add Player Passport tests**  | Medium | Core feature missing from automation        |
| 3        | **Add Coach Assessment tests** | Medium | Key coach functionality                     |
| 4        | **Add Voice Notes tests**      | High   | Unique differentiating feature              |

### 17.2 Medium-Term Priorities (P1)

| Priority | Item                       | Description                                      |
| -------- | -------------------------- | ------------------------------------------------ |
| 5        | Invitation workflow tests  | Test full invite → accept → role assignment flow |
| 6        | Team management tests      | CRUD operations, player assignment               |
| 7        | Parent dashboard tests     | Child viewing, coach feedback                    |
| 8        | Multi-role switching tests | Users with coach+parent roles                    |

### 17.3 Long-Term Priorities (P2)

| Priority | Item                  | Description                       |
| -------- | --------------------- | --------------------------------- |
| 9        | Flow system tests     | Platform flows, org announcements |
| 10       | Identity system tests | Guardian/player linking           |
| 11       | Performance tests     | Load testing, response times      |
| 12       | Mobile viewport tests | Full mobile test coverage         |

### 17.4 Test Suite Improvements

**Recommended Actions:**

1. **Consolidate test data** - Both suites use slightly different test-data.json formats. Standardize to single source of truth.

2. **Add test tagging** - Implement `@smoke`, `@regression`, `@p0` tags for selective test runs:

   ```typescript
   test("@smoke @p0 AUTH-001: Login works", async ({ page }) => {
   ```

3. **Improve parallelization** - Current suites run sequentially. Consider parallelizing independent test files.

4. **Add visual regression** - Implement Playwright's screenshot comparison for UI consistency.

5. **CI/CD integration** - Add test runs to GitHub Actions pipeline.

### 17.5 Newly Implemented Test Files

The following test files were created to address coverage gaps:

| Feature                    | File Created                    | Tests |
| -------------------------- | ------------------------------- | ----- |
| Player Passport            | player/passport.spec.ts         | 10    |
| Skills Assessment          | coach/assessment.spec.ts        | 7     |
| Voice Notes                | coach/voice-notes.spec.ts       | 8     |
| Injury Tracking            | coach/injuries.spec.ts          | 8     |
| Parent Child Management    | parent/child-management.spec.ts | 10    |
| Player Self-Access         | player/self-access.spec.ts      | 7     |
| Flow System                | flows/flow-wizard.spec.ts       | 9     |
| Organization Announcements | org/announcements.spec.ts       | 8     |

### 17.6 Remaining Coverage Gaps

| Feature           | Status                          |
| ----------------- | ------------------------------- |
| Development Goals | Partially covered in assessment |
| Identity System   | Needs separate test suite       |
| Cross-Role Tests  | Need additional scenarios       |
| Performance Tests | Not yet implemented             |

### 17.6 Test Environment Maintenance

**Weekly:**

- Verify test users still exist and have correct roles
- Check for any database schema changes affecting tests

**Monthly:**

- Review skipped tests and re-enable if features are ready
- Update test data to match production data patterns
- Run full regression suite and triage failures

**Per Release:**

- Update tests for new features
- Add negative tests for bug fixes
- Review test coverage metrics

---

## Appendix A: Test Execution Checklist

### Pre-Testing

- [ ] Application running at http://localhost:3000
- [ ] Test user accounts accessible
- [ ] Database in known state
- [ ] Playwright dependencies installed

### UATMCP Suite Execution

```bash
# Full suite
npx playwright test --config=apps/web/uatmcp/playwright.config.ts

# Expected output:
# ✅ 73 passed, 1 skipped (~3 minutes)
```

### Post-Testing

- [ ] All failures documented with screenshots
- [ ] Regression issues logged as GitHub issues
- [ ] Test report reviewed and shared

---

## Appendix B: Sign-Off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Product Owner |      |      |           |
| Tech Lead     |      |      |           |

---

**Document Version History**

| Version | Date       | Author | Changes                                                                                                                                    |
| ------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-07 | Cline  | Initial consolidation from 4 source documents                                                                                              |
| 2.0     | 2026-01-10 | Cline  | Updated with UATMCP test suite results (73 passing), added recommendations                                                                 |
| 2.1     | 2026-01-10 | Cline  | Added 67 new tests across 8 files: passport, assessment, voice notes, injuries, parent management, self-access, flow wizard, announcements |
