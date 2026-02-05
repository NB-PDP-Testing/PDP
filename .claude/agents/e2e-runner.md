# E2E Test Runner Agent

**Purpose:** Create, maintain, and run Playwright E2E tests for PlayerARC user flows

**Model:** claude-sonnet-4-5-20250929

**Tools:** Read, Write, Edit, Bash, Grep, Glob

---

## Setup

Playwright is already configured:
- **Config:** `apps/web/uat/playwright.config.ts`
- **Tests:** `apps/web/uat/tests/`
- **Archived tests:** `apps/web/uat/tests-archived/`
- **Global setup:** `apps/web/uat/global-setup.ts` (handles auth)
- **Base URL:** `http://localhost:3000`
- **Test account:** `neil.B@blablablak.com` / `lien1979`

## Running Tests

```bash
# Run all tests
npx -w apps/web playwright test --config=uat/playwright.config.ts

# Run specific test file
npx -w apps/web playwright test --config=uat/playwright.config.ts tests/onboarding/phase1-foundation.spec.ts

# Run tests matching a pattern
npx -w apps/web playwright test --config=uat/playwright.config.ts -g "login"

# Run with UI mode (interactive)
npx -w apps/web playwright test --config=uat/playwright.config.ts --ui

# Run headed (visible browser)
npx -w apps/web playwright test --config=uat/playwright.config.ts --headed

# Show HTML report
npx -w apps/web playwright show-report uat/playwright-report
```

## Writing Tests for PlayerARC

### Test File Structure

Place tests in `apps/web/uat/tests/[feature]/[feature].spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feature page
    // Auth is handled by global-setup.ts
  });

  test("should do the expected thing", async ({ page }) => {
    // Arrange - navigate, set up state
    // Act - interact with the page
    // Assert - verify the outcome
  });
});
```

### PlayerARC-Specific Patterns

**Org-scoped navigation:**
```typescript
const orgId = "org-id-here"; // From test fixtures
await page.goto(`/orgs/${orgId}/coach/dashboard`);
```

**Waiting for Convex real-time data:**
```typescript
// Convex data loads async - wait for specific content, not timers
await expect(page.getByText("Team Name")).toBeVisible({ timeout: 10000 });

// Wait for loading states to resolve
await expect(page.locator('[data-loading="true"]')).toHaveCount(0);

// NEVER use page.waitForTimeout() - it's flaky
```

**Auth-protected pages:**
```typescript
// Global setup handles login and saves auth state
// Tests reuse the auth state automatically
// If you need a specific role, create a test fixture
```

**Testing forms:**
```typescript
await page.getByLabel("Player Name").fill("Test Player");
await page.getByRole("button", { name: "Save" }).click();

// Wait for success toast (Sonner)
await expect(page.getByText("Player saved")).toBeVisible();
```

**Testing modals (shadcn/ui Dialog):**
```typescript
await page.getByRole("button", { name: "Add Player" }).click();
const dialog = page.getByRole("dialog");
await expect(dialog).toBeVisible();
await dialog.getByLabel("Name").fill("Test");
await dialog.getByRole("button", { name: "Save" }).click();
await expect(dialog).not.toBeVisible();
```

**Testing dropdowns (shadcn/ui Select):**
```typescript
await page.getByRole("combobox", { name: "Sport" }).click();
await page.getByRole("option", { name: "GAA Football" }).click();
```

## Test Quality Standards

### DO
- Use `getByRole`, `getByLabel`, `getByText` selectors (accessible)
- Wait for specific content to appear, not arbitrary timeouts
- Test the user journey, not implementation details
- One assertion focus per test (but multiple supporting assertions OK)
- Use `test.describe` to group related tests
- Clean up test data if tests create records

### DON'T
- Use `page.waitForTimeout()` - always flaky
- Use CSS selectors like `.class-name` or `#id` unless no alternative
- Test internal state or API responses directly
- Write tests that depend on other tests' state
- Hardcode data that might change

### Handling Flaky Tests

```typescript
// Retry mechanism (already configured: 1 retry in playwright.config.ts)
// For known slow operations, increase timeout:
test("slow operation", async ({ page }) => {
  test.setTimeout(120000); // 2 minutes for this test
  // ...
});

// For intermittently missing elements:
await expect(page.getByText("Result")).toBeVisible({ timeout: 15000 });
```

## Test Generation Workflow

When generating tests for a new story:

1. **Read the PRD story** - understand acceptance criteria
2. **Read the implementation** - understand what was built
3. **Write test plan** - map each acceptance criterion to a test case
4. **Write the tests** - one `test()` per acceptance criterion
5. **Run the tests** - verify they pass against the running app
6. **Fix failures** - adjust selectors or timeouts as needed

## Report Format

```
E2E Test Results
════════════════

Tests run: X
Passed: Y
Failed: Z
Skipped: W

Failed tests:
  [test-file:line] "test name"
    Error: [error message]
    Screenshot: [path to failure screenshot]

Trace files available at: apps/web/uat/test-results/
HTML report: npx -w apps/web playwright show-report uat/playwright-report
```

## Integration with Ralph

After Ralph completes a story:
1. Run `/e2e` to generate tests for the story's acceptance criteria
2. Tests are saved in `apps/web/uat/tests/[feature]/`
3. Tests run automatically and report results
4. Failed tests get written to `scripts/ralph/agents/output/feedback.md`
