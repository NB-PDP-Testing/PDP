# Master UAT Test Plan

**Version:** 3.0  
**Created:** January 7, 2026  
**Last Updated:** January 10, 2026  
**Status:** ACTIVE - Lightweight UAT Model  
**Total Tests:** 15 test files across 8 categories

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

```
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

```
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
    │   └── navigation.spec.ts
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

| Category  | Files  | Tests    | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| auth      | 2      | ~20      | Login flows, signup validation               |
| admin     | 2      | ~24      | Dashboard features, navigation               |
| coach     | 4      | ~29      | Dashboard, assessment, voice notes, injuries |
| parent    | 1      | ~10      | Child management, linked players             |
| player    | 2      | ~17      | Passport viewing, self-access (18+)          |
| org       | 2      | ~20      | Dashboard, announcements                     |
| flows     | 1      | ~9       | Flow wizard system                           |
| homepage  | 1      | ~13      | Marketing page content                       |
| **Total** | **15** | **~140** |                                              |

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

| Setting            | Value          |
| ------------------ | -------------- |
| Browser            | Chromium       |
| Workers            | 1 (sequential) |
| Test Timeout       | 60 seconds     |
| Assertion Timeout  | 10 seconds     |
| Action Timeout     | 15 seconds     |
| Navigation Timeout | 30 seconds     |

---

## 4. Running Tests

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

---

## 6. Test Coverage by Category

| Category       | Tests | Coverage Status |
| -------------- | ----- | --------------- |
| Authentication | 12    | ✅ Complete     |
| Admin          | 24    | ✅ Complete     |
| Coach          | 29    | ✅ Complete     |
| Parent         | 10    | ✅ Complete     |
| Player         | 17    | ✅ Complete     |
| Organization   | 20    | ✅ Complete     |
| Flows          | 9     | ✅ Complete     |
| Homepage       | 13    | ✅ Complete     |

---

## 7. Remaining Coverage Gaps

### 7.1 Not Yet Automated

| Feature               | Priority | Estimated Tests |
| --------------------- | -------- | --------------- |
| Identity System       | P1       | 20-30           |
| Cross-Role Scenarios  | P2       | 10-15           |
| Performance Tests     | P2       | 5-10            |
| Mobile Viewport Tests | P3       | 15-20           |
| Invitation Workflow   | P1       | 8-10            |
| Team Management CRUD  | P1       | 10-12           |

### 7.2 Known Limitations

1. **No onboarding tests** - Removed in v3.0; assumes pre-created test users
2. **Single browser** - Only Chromium configured
3. **Sequential execution** - No parallelization for stability
4. **No visual regression** - Screenshot comparison not implemented

---

## 8. Recommendations & Next Steps

### 8.1 Immediate Priorities (P0)

1. **Add Identity System tests** - Guardian/player linking
2. **Add Invitation Workflow tests** - Full invite → accept flow
3. **Add Team Management CRUD tests** - Create, update, delete teams

### 8.2 Medium-Term (P1)

1. **Cross-Role Tests** - Users with multiple roles
2. **Data Isolation Tests** - Verify users can't access others' data
3. **CI/CD Integration** - Add to GitHub Actions

### 8.3 Long-Term (P2)

1. **Visual Regression** - Screenshot comparison
2. **Performance Testing** - Response time monitoring
3. **Mobile Testing** - Full mobile viewport coverage
4. **Parallel Execution** - Speed up test runs

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

**Document Version History**

| Version | Date       | Author | Changes                                                                                   |
| ------- | ---------- | ------ | ----------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-07 | Cline  | Initial consolidation from 4 source documents                                             |
| 2.0     | 2026-01-10 | Cline  | Updated with UATMCP test suite results                                                    |
| 2.1     | 2026-01-10 | Cline  | Added 67 new tests across 8 files                                                         |
| 3.0     | 2026-01-10 | Cline  | Migrated to lightweight UAT model, removed onboarding, consolidated to single uat/ folder |
