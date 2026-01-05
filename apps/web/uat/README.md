# PDP UAT (User Acceptance Testing) with Playwright

This directory contains User Acceptance Tests for the PDP application using [Playwright](https://playwright.dev/).

## Quick Start

### 1. Install Playwright

```bash
cd apps/web
npm install -D @playwright/test
npx playwright install
```

### 2. Configure Test Environment

Create a `.env.test` file in `apps/web/`:

```env
# Test environment URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test organization ID
TEST_ORG_ID=your_test_org_id_here

# Optional: Use a staging/test environment instead of localhost
# PLAYWRIGHT_BASE_URL=https://test.yourapp.com
```

### 3. Update Test User Credentials

Edit `uat/fixtures/test-data.json` and update the test user entries with your actual test account credentials:

```json
{
  "users": {
    "admin": {
      "email": "your-admin@example.com",
      "password": "your-password",
      "name": "Admin User"
    }
    // ... other users
  }
}
```

### 4. Run Tests

```bash
# Run all tests (all groups)
npm run test

# Run Initial Setup tests only (Group 1 - for fresh environment)
npm run test:setup

# Run Continuous tests only (Group 2 - after code changes)
npm run test:continuous

# Run mobile viewport tests
npm run test:mobile

# Run in UI mode (interactive)
npm run test:ui
npm run test:ui:setup      # UI mode for setup tests only
npm run test:ui:continuous # UI mode for continuous tests only

# Run with browser visible
npm run test:headed

# Run in debug mode
npm run test:debug

# List all available tests
npm run test:list
```

## Test Groups

Tests are organized into two groups for different use cases:

### Group 1: Initial Setup Tests (`npm run test:setup`)

**When to run:** Once when setting up a fresh environment (after database reset)

| Test File | Purpose |
|-----------|---------|
| `setup.spec.ts` | First-time organization setup, user onboarding, team creation |

**Test Cases:**
- TEST-SETUP-001: Platform Staff Creates First Organization
- TEST-SETUP-002: Non-Platform Staff Cannot Create Organizations
- TEST-SETUP-003: Owner First Login Experience
- TEST-SETUP-004: Owner Creates First Team
- TEST-SETUP-005: Owner Invites First Admin
- TEST-SETUP-006: First Admin Accepts Invitation
- TEST-SETUP-007: Owner Invites First Coach
- TEST-SETUP-008: First Coach Accepts and Gets Team Assignment
- TEST-SETUP-009: Admin Creates First Players
- TEST-SETUP-010: Owner Invites First Parent

### Group 2: Continuous Tests (`npm run test:continuous`)

**When to run:** Regularly after code changes to ensure nothing is broken

| Test File | Purpose |
|-----------|---------|
| `auth.spec.ts` | Login, signup, logout, session management |
| `admin.spec.ts` | Admin dashboard, approval workflows |
| `coach.spec.ts` | Coach dashboard, player management |

**Test Cases:**
- TEST-AUTH-001 to TEST-AUTH-004: Authentication flows
- TEST-ADMIN-001 to TEST-ADMIN-004: Admin operations
- TEST-COACH-001 to TEST-COACH-004: Coach operations

### Typical Workflow

```bash
# 1. Fresh environment setup (run once)
cd packages/backend
npx convex run scripts/fullReset:fullReset '{"confirmNuclearDelete": true}'
npx convex run models/referenceData:seedAllReferenceData

# 2. Run Initial Setup tests - creates first user via signup
cd apps/web
npm run test:setup

# 3. IMPORTANT: Bootstrap the first platform staff user
# The first user does NOT automatically become platform staff.
# After the first user signs up, run this command to grant platform staff privileges:
cd packages/backend
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "owner_pdp@outlook.com"}'

# 4. To check who has platform staff privileges:
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff

# 5. After any code changes, run Continuous tests
cd apps/web
npm run test:continuous

# 6. Before release, run all tests
npm run test
```

### Platform Staff Bootstrap

The `isPlatformStaff` flag must be explicitly set on user accounts. It is NOT automatically granted to the first user.

**Available scripts:**

| Script | Purpose |
|--------|---------|
| `setFirstPlatformStaff` | Sets a user as platform staff (only works if NO platform staff exists - safety check) |
| `listPlatformStaff` | Shows all current platform staff users and total user count |

**Usage:**

**Windows (Command Prompt):**
```bash
# Set first platform staff (safe - fails if platform staff already exists)
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff "{\"email\": \"user@example.com\"}"

# Check current platform staff
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

**Windows (PowerShell):**
```powershell
# Set first platform staff
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "user@example.com"}'

# Check current platform staff
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

**macOS/Linux:**
```bash
# Set first platform staff
npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "user@example.com"}'

# Check current platform staff
npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
```

## Test Structure

```
uat/
├── fixtures/
│   └── test-utils.ts    # Shared utilities, test users, helper functions
├── tests/
│   ├── setup.spec.ts    # GROUP 1: Initial setup tests
│   ├── auth.spec.ts     # GROUP 2: Authentication tests
│   ├── admin.spec.ts    # GROUP 2: Admin dashboard tests
│   ├── coach.spec.ts    # GROUP 2: Coach dashboard tests
│   └── ...
├── auth.setup.ts        # Authentication setup (creates logged-in sessions)
├── .auth/               # Saved auth states (gitignored)
└── README.md
```

## Test Files Mapped to Test Cases

| Test File | Test Cases Covered | Tests |
|-----------|-------------------|-------|
| `setup.spec.ts` | TEST-SETUP-001 to TEST-SETUP-010 | 21 |
| `auth.spec.ts` | TEST-AUTH-001 to TEST-AUTH-004 | 7 |
| `admin.spec.ts` | TEST-ADMIN-001 to TEST-ADMIN-004 | 7 |
| `coach.spec.ts` | TEST-COACH-001 to TEST-COACH-004 | 5 |
| **Total** | **22 Test Cases** | **40 Tests** |

## CI/CD Integration

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Required GitHub Secrets

Set these in your repository settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `PLAYWRIGHT_BASE_URL` | URL of the test environment |
| `TEST_ORG_ID` | Organization ID for testing |
| `TEST_ADMIN_EMAIL` | Admin test account email |
| `TEST_ADMIN_PASSWORD` | Admin test account password |
| `TEST_COACH_EMAIL` | Coach test account email |
| `TEST_COACH_PASSWORD` | Coach test account password |
| `STAGING_URL` | (Optional) Staging environment URL |

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/test-utils';

test.describe('Feature Name', () => {
  test('should do something', async ({ page, helper }) => {
    // Navigate
    await page.goto('/some-page');
    
    // Interact
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Assert
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Using Authenticated Sessions

```typescript
import { AUTH_STATES } from '../fixtures/test-utils';

test.describe('Admin Tests', () => {
  // Use pre-authenticated admin session
  test.use({ storageState: AUTH_STATES.admin });
  
  test('should access admin page', async ({ page }) => {
    await page.goto('/admin');
    // Already logged in as admin
  });
});
```

### Using Helper Functions

```typescript
test('should login and navigate', async ({ helper, page }) => {
  await helper.login('user@example.com', 'password');
  await helper.goToCoach();
  await helper.expectToast(/success/i);
});
```

## Best Practices

1. **Use data-testid attributes** - Add `data-testid="component-name"` to key elements for stable selectors
2. **Avoid flaky tests** - Use `waitForLoadState('networkidle')` when needed
3. **Keep tests independent** - Each test should work in isolation
4. **Use meaningful assertions** - Check for user-visible outcomes
5. **Handle dynamic data** - Skip tests if required data isn't present

## Debugging

### View Test Report

```bash
npm run test:report
```

### Debug Single Test

```bash
npx playwright test auth.spec.ts --debug
```

### Use Playwright Inspector

```bash
PWDEBUG=1 npx playwright test --headed
```

## Troubleshooting

### Tests fail with "element not found"

- Add `await page.waitForLoadState('networkidle')`
- Increase timeout: `await expect(element).toBeVisible({ timeout: 10000 })`
- Check if element exists with different selector

### Authentication issues

- Ensure test users exist in the database
- Check that credentials are correct
- Verify session storage is being saved correctly

### CI fails but local passes

- Check environment variables are set in GitHub secrets
- Ensure `CI: true` is set in workflow
- Compare browser versions between local and CI
