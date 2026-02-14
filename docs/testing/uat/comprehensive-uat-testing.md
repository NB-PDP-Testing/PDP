# Comprehensive UAT Testing

> Last updated: February 2026

This document provides a complete inventory of all UAT/E2E test files in the PlayerARC project, along with commands to run them.

---

## Prerequisites

- Dev server must be running on `localhost:3000` before running any E2E tests
- Playwright config: `apps/web/uat/playwright.config.ts`
- Tests run serially (1 worker), 90s timeout, Desktop Chrome
- Global setup creates authenticated storage states for all user roles

---

## Active UAT/E2E Test Files

### Navigation Tests

| # | File | Summary |
|---|------|---------|
| 1 | `apps/web/uat/tests/navigation/navbar-comprehensive.spec.ts` | Tests navbar navigation, orgId extraction, and role-based dashboard routing |

### Onboarding Tests

| # | File | Summary |
|---|------|---------|
| 2 | `apps/web/uat/tests/onboarding/accessibility.spec.ts` | WCAG 2.1 AA compliance: ARIA landmarks, keyboard nav, focus, color contrast |
| 3 | `apps/web/uat/tests/onboarding/mobile.spec.ts` | Mobile viewport layouts (iPhone SE 375x667): responsive nav, forms |
| 4 | `apps/web/uat/tests/onboarding/phase1-foundation.spec.ts` | OnboardingOrchestrator rendering, Bug #297/#327 fixes, guardian claim flow |
| 5 | `apps/web/uat/tests/onboarding/phase2-gdpr.spec.ts` | GDPR consent modal, DB recording, progress blocking, version tracking |
| 6 | `apps/web/uat/tests/onboarding/phase3-child-linking.spec.ts` | Parent-child linking: smart matching, manual search, link persistence |
| 7 | `apps/web/uat/tests/onboarding/phase4-notifications.spec.ts` | Notification preferences: email/push toggles, preference persistence |
| 8 | `apps/web/uat/tests/onboarding/phase5-first-user.spec.ts` | First-user org setup wizard, platform staff auto-assignment, team creation |
| 9 | `apps/web/uat/tests/onboarding/phase6-polish.spec.ts` | Loading/error states, success feedback, retry mechanisms |
| 10 | `apps/web/uat/tests/onboarding/phase7-graduation.spec.ts` | Onboarding completion, post-onboarding persistence, analytics tracking |
| 11 | `apps/web/uat/tests/onboarding/regression.spec.ts` | Regression prevention for Bug #297, Bug #327, cross-role functionality |

### Voice Notes Tests

| # | File | Summary |
|---|------|---------|
| 12 | `apps/web/uat/tests/voice-notes/admin-audit.spec.ts` | Admin voice notes audit page: search, filter chips, role-based access |
| 13 | `apps/web/uat/tests/voice-notes/dashboard.spec.ts` | Coach voice notes dashboard: tab navigation, UI elements, access control |
| 14 | `apps/web/uat/tests/voice-notes/disambiguation.spec.ts` | Entity resolution page: empty state handling, artifact ownership access |
| 15 | `apps/web/uat/tests/voice-notes/navigation-integration.spec.ts` | Cross-page navigation flows, deep linking, mobile responsiveness |
| 16 | `apps/web/uat/tests/voice-notes/platform-claims-viewer.spec.ts` | Platform v2 claims viewer: stats cards, platform staff access control |
| 17 | `apps/web/uat/tests/voice-notes/review-microsite.spec.ts` | Public review microsite (/r/[code]): invalid/expired link handling |
| 18 | `apps/web/uat/tests/voice-notes/typed-note-flow.spec.ts` | Typed voice note flow: create, save, processing, insights, history |

---

## Support Files

| File | Purpose |
|------|---------|
| `apps/web/uat/fixtures/test-fixtures.ts` | Authenticated user contexts (owner, admin, coach, parent) |
| `apps/web/uat/fixtures/test-utils.ts` | Shared utility/helper functions |
| `apps/web/uat/global-setup.ts` | Pre-test auth state creation for all roles |
| `apps/web/uat/playwright.config.ts` | Primary Playwright config (Desktop Chrome, serial, 90s timeout) |
| `apps/web/uat/scripts/playwright.config.ts` | Standalone config for onboarding/setup scripts (120s timeout) |

---

## Archived Test Files

39 test files live in `apps/web/uat/tests-archived/`. These are skipped but preserved for reference.

| Area | Count | Topics |
|------|-------|--------|
| Admin | 13 | Dashboard, analytics, benchmarks, guardians, identity, invitations, logos, navigation, overrides, teams, parent summaries |
| Auth | 2 | Login, signup |
| Coach | 5 | Analytics, assessments, dashboard, injuries, voice notes |
| Cross-Role | 1 | Cross-role functionality |
| Error Handling | 1 | Error states |
| Flows | 4 | Flow management, wizard, advanced, platform access |
| Homepage | 2 | Homepage features |
| Mobile | 1 | Mobile viewport |
| Organization | 2 | Announcements, dashboard |
| Parent | 2 | Child management, summaries |
| Performance | 1 | Performance metrics |
| Platform | 1 | Platform management |
| Player | 2 | Passport, self-access |
| UX | 2 | UX features, testing suite |

---

## Backend Unit Tests

106 Convex backend test files exist in `packages/backend/convex/__tests__/`, covering user stories from US-001 through US-P9-063. These are Vitest tests (not Playwright).

---

## Commands

### Run All Active E2E Tests

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts
```

### Run by Feature Area

```bash
# Navigation tests only
npx -w apps/web playwright test --config=uat/playwright.config.ts tests/navigation/

# All onboarding tests
npx -w apps/web playwright test --config=uat/playwright.config.ts tests/onboarding/

# All voice notes tests
npx -w apps/web playwright test --config=uat/playwright.config.ts tests/voice-notes/
```

### Run a Single Test File

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts tests/voice-notes/dashboard.spec.ts
```

### Run by Test Name (grep)

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts -g "GDPR"
```

### Interactive UI Mode

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts --ui
```

### Headed Mode (see the browser)

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts --headed
```

### Debug Mode

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts --debug
```

### View HTML Report

```bash
npx -w apps/web playwright show-report apps/web/uat/playwright-report
```

### Backend Unit Tests

```bash
# Run all backend tests
npx -w packages/backend vitest run

# Run a single backend test file
npx -w packages/backend vitest run __tests__/US-P9-001.test.ts
```

---

## Test Statistics

| Category | Count |
|----------|-------|
| Active E2E spec files | 18 |
| Support/fixture files | 2 |
| Config files | 2 |
| Archived E2E spec files | 39 |
| Backend unit test files | 106 |
| **Total** | **167** |
