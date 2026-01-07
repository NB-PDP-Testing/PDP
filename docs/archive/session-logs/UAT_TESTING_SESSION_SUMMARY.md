# UAT Testing Session Summary

**Date:** January 4, 2026  
**Purpose:** Set up automated User Acceptance Testing (UAT) infrastructure for PDP application

---

## Overview

This session accomplished two major goals:

1. **Created 33 test case issues** on the GitHub Project board based on `USER_TESTING_PROCESS.md`
2. **Set up Playwright UAT testing infrastructure** to automate these tests

---

## Part 1: GitHub Project Board Test Cases

### What Was Created

Created **33 GitHub Issues** in the [NB-PDP-Testing/PDP repository](https://github.com/NB-PDP-Testing/PDP) and added them to [Project Board #6](https://github.com/orgs/NB-PDP-Testing/projects/6/views/1).

Each issue follows the naming convention: `{NUMBER} {TEST-ID} {Test Name}`

### Test Categories

| Category | Issues | Test IDs |
|----------|--------|----------|
| **Authentication** | 4 | TEST-AUTH-001 to TEST-AUTH-004 |
| **Organization Join** | 4 | TEST-JOIN-001 to TEST-JOIN-004 |
| **Admin Approval** | 4 | TEST-ADMIN-001 to TEST-ADMIN-004 |
| **Coach Dashboard** | 4 | TEST-COACH-001 to TEST-COACH-004 |
| **Parent Dashboard** | 2 | TEST-PARENT-001 to TEST-PARENT-002 |
| **Player Passport** | 3 | TEST-PASSPORT-001 to TEST-PASSPORT-003 |
| **Role Request** | 3 | TEST-ROLE-001 to TEST-ROLE-003 |
| **API** | 1 | TEST-API-001 |
| **Audit** | 1 | TEST-AUDIT-001 |
| **Security** | 3 | TEST-SEC-001 to TEST-SEC-003 |
| **UX** | 2 | TEST-UX-001 to TEST-UX-002 |
| **Performance** | 1 | TEST-PERF-001 |
| **Resilience** | 1 | TEST-RESIL-001 |

### Issue Content Structure

Each issue contains:
- **Test Details** table (Objective, User Role, Preconditions)
- **Steps** to execute
- **Expected Results** table (UI, Backend, Data)
- **Failure Cases**
- **Compliance Notes** (where applicable)

### Links

- **Project Board:** https://github.com/orgs/NB-PDP-Testing/projects/6/views/1
- **Issues:** https://github.com/NB-PDP-Testing/PDP/issues?q=label%3Atest

---

## Part 2: Playwright UAT Testing Infrastructure

### Files Created

| File | Purpose |
|------|---------|
| `apps/web/playwright.config.ts` | Playwright configuration (browsers, timeouts, dev server) |
| `apps/web/uat/fixtures/test-utils.ts` | Test utilities, user credentials, helper class |
| `apps/web/uat/auth.setup.ts` | Authentication setup (creates pre-logged-in sessions) |
| `apps/web/uat/tests/auth.spec.ts` | Tests for TEST-AUTH-001 to TEST-AUTH-004 |
| `apps/web/uat/tests/coach.spec.ts` | Tests for TEST-COACH-001 to TEST-COACH-004 |
| `apps/web/uat/tests/admin.spec.ts` | Tests for TEST-ADMIN-001 to TEST-ADMIN-004 |
| `apps/web/uat/README.md` | Documentation for running and writing tests |
| `.github/workflows/uat-tests.yml` | CI/CD workflow to run tests on PR/push |

### Files Modified

| File | Changes |
|------|---------|
| `apps/web/package.json` | Added test scripts (`test`, `test:ui`, `test:headed`, `test:debug`, `test:report`) |
| `apps/web/.gitignore` | Added `/uat/.auth/`, `/playwright-report/`, `/test-results/` |

### Final Directory Structure

```
apps/web/
├── playwright.config.ts
├── package.json (updated with test scripts)
├── .gitignore (updated)
└── uat/
    ├── README.md
    ├── auth.setup.ts
    ├── fixtures/
    │   └── test-utils.ts
    └── tests/
        ├── auth.spec.ts
        ├── coach.spec.ts
        └── admin.spec.ts

.github/workflows/
└── uat-tests.yml
```

---

## How to Use

### Install Playwright

```bash
cd apps/web
npm install -D @playwright/test
npx playwright install
```

### Configure Test Environment

1. **Set TEST_ORG_ID** - Find your organization ID from the URL when viewing an org
2. **Update test credentials** in `uat/fixtures/test-utils.ts` with actual test account passwords

### Run Tests Locally

```bash
npm run test          # Run all tests
npm run test:ui       # Interactive UI mode
npm run test:headed   # See the browser
npm run test:debug    # Debug mode with inspector
npm run test:report   # View HTML report
```

### CI/CD

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Required GitHub Secrets:**
- `PLAYWRIGHT_BASE_URL` - Test environment URL
- `TEST_ORG_ID` - Organization ID for testing
- `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`
- `TEST_COACH_EMAIL` / `TEST_COACH_PASSWORD`

---

## Test Coverage

### Currently Automated (12 tests)

| Test File | Test Cases | Status |
|-----------|------------|--------|
| `auth.spec.ts` | TEST-AUTH-001, 002, 003, 004 | ✅ Implemented |
| `coach.spec.ts` | TEST-COACH-001, 002, 003, 004 | ✅ Implemented |
| `admin.spec.ts` | TEST-ADMIN-001, 002, 003, 004 | ✅ Implemented |

### Pending Automation (21 tests)

- TEST-JOIN-001 to TEST-JOIN-004 (4 tests)
- TEST-PARENT-001 to TEST-PARENT-002 (2 tests)
- TEST-PASSPORT-001 to TEST-PASSPORT-003 (3 tests)
- TEST-ROLE-001 to TEST-ROLE-003 (3 tests)
- TEST-API-001 (1 test)
- TEST-AUDIT-001 (1 test)
- TEST-SEC-001 to TEST-SEC-003 (3 tests)
- TEST-UX-001 to TEST-UX-002 (2 tests)
- TEST-PERF-001 (1 test)
- TEST-RESIL-001 (1 test)

---

## Key Features

### Test Helper Class

The `TestHelper` class provides convenient methods:

```typescript
await helper.login(email, password);    // Login
await helper.logout();                   // Logout
await helper.goToCoach();               // Navigate to coach dashboard
await helper.goToAdmin();               // Navigate to admin dashboard
await helper.goToParent();              // Navigate to parent dashboard
await helper.waitForPageLoad();         // Wait for network idle
await helper.expectToast(/success/i);   // Check for toast notification
```

### Pre-authenticated Sessions

The `auth.setup.ts` file creates authenticated sessions that are reused across tests, speeding up test execution:

```typescript
// In test file
test.use({ storageState: AUTH_STATES.admin });
// Tests run as admin without re-logging in
```

### CI/CD Blocking

The GitHub Actions workflow will:
- ❌ **Block PR merge** if any test fails
- 📊 Upload test reports as artifacts
- 📸 Upload screenshots on failure

---

## Next Steps

1. **Install Playwright** in the project
2. **Configure test credentials** with real test accounts
3. **Run tests locally** to verify they work
4. **Set up GitHub Secrets** for CI/CD
5. **Add more test files** for remaining test cases
6. **Add `data-testid` attributes** to components for stable selectors

---

## References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [USER_TESTING_PROCESS.md](./USER_TESTING_PROCESS.md) - Original test specifications
- [GitHub Project Board](https://github.com/orgs/NB-PDP-Testing/projects/6/views/1) - All 33 test cases
