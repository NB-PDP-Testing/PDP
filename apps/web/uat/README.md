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

Edit `uat/fixtures/test-utils.ts` and update the `TEST_USERS` object with your actual test account credentials:

```typescript
export const TEST_USERS = {
  admin: {
    email: 'your-admin@example.com',
    password: 'your-password',
    name: 'Admin User',
  },
  // ... other users
};
```

### 4. Run Tests

```bash
# Run all tests
npm run test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests with browser visible
npm run test:headed

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in debug mode
npm run test:debug
```

## Test Structure

```
uat/
├── fixtures/
│   └── test-utils.ts    # Shared utilities, test users, helper functions
├── tests/
│   ├── auth.spec.ts     # Authentication tests (login, signup, logout)
│   ├── admin.spec.ts    # Admin dashboard & approval tests
│   ├── coach.spec.ts    # Coach dashboard tests
│   └── ...
├── auth.setup.ts        # Authentication setup (creates logged-in sessions)
├── .auth/               # Saved auth states (gitignored)
└── README.md
```

## Test Files Mapped to Test Cases

| Test File | Test Cases Covered |
|-----------|-------------------|
| `auth.spec.ts` | TEST-AUTH-001 to TEST-AUTH-004 |
| `admin.spec.ts` | TEST-ADMIN-001 to TEST-ADMIN-004 |
| `coach.spec.ts` | TEST-COACH-001 to TEST-COACH-004 |

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
