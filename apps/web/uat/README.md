# UAT Testing Infrastructure

This directory contains User Acceptance Testing (UAT) infrastructure for PDP.

## Architecture

### Test Types

1. **Standard Tests** (`npm run test`)
   - Global Setup creates test data (users, org, teams, players)
   - Tests run against existing data
   - Global Teardown cleans up test data
   - Uses authenticated sessions from auth-setup

2. **Onboarding Tests** (`npm run test:onboarding:fresh`)
   - Resets entire database before running
   - Seeds reference data (sports, skills, benchmarks)
   - Tests fresh user signup flows
   - Creates users during test execution

## Directory Structure

```
uat/
├── fixtures/
│   └── test-utils.ts       # Test helpers, utilities, and fixtures
├── tests/
│   ├── admin.spec.ts       # Admin dashboard tests
│   ├── admin-advanced.spec.ts  # Advanced admin features
│   ├── auth.spec.ts        # Authentication tests
│   ├── coach.spec.ts       # Coach dashboard tests
│   ├── first-login-dashboard.spec.ts  # Dashboard redirect tests
│   ├── mobile.spec.ts      # Mobile viewport tests
│   ├── onboarding.spec.ts  # Fresh signup tests
│   └── parent.spec.ts      # Parent dashboard tests
├── auth.setup.ts           # Creates authenticated sessions
├── global-setup.ts         # Runs before standard tests
├── global-teardown.ts      # Runs after standard tests
├── onboarding-db-setup.ts  # Resets DB for onboarding tests
├── test-data.json          # Test user credentials and data
└── README.md               # This file
```

## Available Commands

Run from `apps/web` directory:

```bash
# Run all standard tests
npm run test

# Run specific test suites
npm run test:auth           # Authentication tests
npm run test:admin          # Admin dashboard tests
npm run test:coach          # Coach dashboard tests
npm run test:parent         # Parent dashboard tests
npm run test:first-login    # Dashboard redirect tests
npm run test:mobile         # Mobile viewport tests

# Run onboarding tests (RESETS DATABASE!)
npm run test:onboarding:fresh

# Debug and UI modes
npm run test:ui             # Visual test runner
npm run test:headed         # Run with browser visible
npm run test:debug          # Debug mode with breakpoints
npm run test:report         # View HTML report
```

## Test Users

Test users are configured in `test-data.json`:

| Role   | Email                    | Password   | Description                |
|--------|--------------------------|------------|----------------------------|
| Owner  | 0wn3r_pdp@outlook.com    | Gegrep_01  | Platform staff, org owner  |
| Admin  | adm1n_pdp@outlook.com    | Gegrep_01  | Organization admin         |
| Coach  | c0ach_pdp@outlook.com    | Gegrep_01  | Team coach                 |
| Parent | par3nt_pdp@outlook.com   | Gegrep_01  | Player parent              |

## Prerequisites

1. **Convex dev server must be running**
   ```bash
   cd packages/backend && npx convex dev
   ```

2. **Web app dev server running (or will be started by tests)**
   ```bash
   cd apps/web && npm run dev
   ```

3. **Test users must exist in database**
   - Run onboarding tests first to create users
   - Or manually create users in Convex dashboard

## Global Setup/Teardown

### Global Setup (`global-setup.ts`)
Runs before standard tests:
1. Verifies platform admin has correct permissions
2. Verifies test user accounts exist
3. Creates/verifies UAT test data (idempotent)
4. Creates `.auth` directory for session storage

### Global Teardown (`global-teardown.ts`)
Runs after standard tests:
1. Cleans up UAT-specific test data
2. Removes auth session files
3. Preserves users and organizations

### Onboarding DB Setup (`onboarding-db-setup.ts`)
Special setup for onboarding tests:
1. **RESETS ENTIRE DATABASE**
2. Seeds reference data only
3. Prepares clean slate for signup tests

## Writing Tests

### Using Test Utilities

```typescript
import { test, expect, TEST_USERS, TestHelper } from "../fixtures/test-utils";

test.describe("My Feature", () => {
  test("should do something", async ({ page, helper }) => {
    // Login
    await helper.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // Navigate
    await helper.goToAdmin();
    
    // Assert
    await expect(page.getByText("Dashboard")).toBeVisible();
  });
});
```

### Available Helpers

```typescript
helper.login(email, password)     // Login with credentials
helper.logout()                   // Logout current user
helper.goToOrg(orgId?)           // Navigate to organization
helper.goToAdmin(orgId?)         // Navigate to admin dashboard
helper.goToCoach(orgId?)         // Navigate to coach dashboard
helper.goToParent(orgId?)        // Navigate to parent dashboard
helper.waitForPageLoad()         // Wait for network idle
helper.expectToast(text)         // Expect Sonner toast
helper.expectRedirectToLogin()   // Expect redirect to login
helper.fillField(label, value)   // Fill form field
helper.clickButton(name)         // Click button by name
helper.screenshot(name)          // Take screenshot
```

## Test Naming Convention

Tests follow the pattern: `TEST-{CATEGORY}-{NUMBER}: description`

- `TEST-AUTH-XXX` - Authentication tests
- `TEST-ADMIN-XXX` - Admin functionality tests
- `TEST-COACH-XXX` - Coach functionality tests
- `TEST-PARENT-XXX` - Parent functionality tests
- `TEST-MOBILE-XXX` - Mobile viewport tests
- `TEST-SETUP-XXX` - Setup/onboarding tests

## Troubleshooting

### Tests fail with "Login failed"
- Check that test users exist in database
- Run onboarding tests first: `npm run test:onboarding:fresh`
- Verify credentials in `test-data.json`

### Tests timeout
- Check if Convex dev server is running
- Check if web app is accessible at localhost:3000
- Increase timeout in playwright.config.ts

### Cannot find element
- Use `page.pause()` to inspect the page
- Check if element selector is correct
- Verify page has finished loading

### Database not reset
- Onboarding tests require `npm run test:onboarding:fresh`
- Standard tests DO NOT reset the database

## CI/CD Integration

For CI environments:
- Set `PLAYWRIGHT_BASE_URL` environment variable
- Tests will retry twice on failure
- Video/trace recorded on failure
- HTML report generated automatically
