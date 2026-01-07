import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for PDP E2E tests
 * See https://playwright.dev/docs/test-configuration
 *
 * TEST GROUPS:
 *
 * 1. Initial Onboarding Tests (Group 1):
 *    - Run once when setting up a fresh environment
 *    - Uses initial-auth.setup.ts (creates accounts via SIGNUP)
 *    - Tests: onboarding.spec.ts
 *    - Command: npm run test:onboarding
 *
 * 2. Continuous Tests (Group 2):
 *    - Run regularly after code changes
 *    - Uses auth.setup.ts (logs into EXISTING accounts)
 *    - Tests: auth.spec.ts, admin.spec.ts, coach.spec.ts
 *    - Command: npm run test:continuous
 */
export default defineConfig({
  testDir: "./uat/tests",

  /* Run tests in files in parallel */
  fullyParallel: false, // Run tests sequentially for setup

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: 1, // Single worker for sequential execution

  /* Reporter to use */
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Video recording on failure */
    video: "on-first-retry",
  },

  /* Configure projects for different test groups */
  projects: [
    // ========================================
    // INITIAL SETUP AUTH - Creates accounts via SIGNUP
    // For fresh environment (no existing users)
    // ========================================
    {
      name: "initial-auth-setup",
      testDir: "./uat",
      testMatch: /initial-auth\.setup\.ts/,
    },

    // ========================================
    // CONTINUOUS AUTH - Logs into EXISTING accounts
    // For environments with existing users
    // ========================================
    {
      name: "auth-setup",
      testDir: "./uat",
      testMatch: /(?<![a-z-])auth\.setup\.ts$/,
    },

    // ========================================
    // GROUP 1: INITIAL ONBOARDING TESTS
    // Run once when setting up a fresh environment
    // NO dependencies - tests handle their own signup/login
    // Command: npm run test:onboarding
    // OR: npx playwright test --project=initial-onboarding
    // ========================================
    {
      name: "initial-onboarding",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /onboarding\.spec\.ts/,
      // No dependencies - tests do their own signup/login for fresh environment
    },

    // ========================================
    // FIRST LOGIN DASHBOARD TESTS
    // Run AFTER onboarding tests to verify dashboard redirects
    // NO auth dependencies - tests login themselves
    // Command: npx playwright test --project=first-login-dashboard
    // ========================================
    {
      name: "first-login-dashboard",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /first-login-dashboard\.spec\.ts/,
      // No auth dependencies - tests do their own login
      // MUST be run after onboarding.spec.ts has created the users
    },

    // ========================================
    // GROUP 2: CONTINUOUS TESTS
    // Run regularly after code changes
    // Uses auth-setup (login-based)
    // Command: npm run test:continuous
    // ========================================
    {
      name: "continuous",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /(auth|admin|coach|first-login-dashboard)\.spec\.ts$/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // AUTH TESTS - Authentication tests only
    // Command: npx playwright test --project=auth-tests
    // ========================================
    {
      name: "auth-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /auth\.spec\.ts/,
      // No dependencies - tests handle their own login
    },

    // ========================================
    // COACH TESTS - Coach dashboard tests only
    // Command: npx playwright test --project=coach-tests
    // ========================================
    {
      name: "coach-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /coach\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // ADMIN TESTS - Admin dashboard tests only
    // Command: npx playwright test --project=admin-tests
    // ========================================
    {
      name: "admin-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // ALL TESTS - Runs both groups sequentially
    // Command: npm run test OR npx playwright test --project=all-desktop
    // ========================================
    {
      name: "all-desktop",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // MOBILE TESTS - Continuous tests on mobile viewport
    // Command: npm run test:mobile
    // ========================================
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testDir: "./uat/tests",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /onboarding\.spec\.ts/, // Onboarding tests are desktop-focused
      dependencies: ["auth-setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
