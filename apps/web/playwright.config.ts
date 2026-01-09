import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for PDP UAT Tests
 * 
 * ARCHITECTURE:
 * - Standard tests have global setup/teardown to create and cleanup test data
 * - Onboarding tests reset the entire database and seed reference data
 * 
 * TEST TYPES:
 * 1. Standard Tests (npm run test)
 *    - Global Setup creates test data (users, org, teams, players)
 *    - Tests run against the created test data
 *    - Global Teardown removes the test data (leaves system as before)
 *    - Use authenticated sessions from auth-setup
 * 
 * 2. Onboarding Tests (npm run test:onboarding:fresh)
 *    - Reset entire database and seed reference data before running
 *    - Create users during test execution
 *    - Test fresh environment flows
 * 
 * COMMANDS:
 * - npm run test              - Run standard tests (with setup/teardown)
 * - npm run test:auth         - Auth tests only
 * - npm run test:admin        - Admin tests only
 * - npm run test:coach        - Coach tests only
 * - npm run test:parent       - Parent tests only
 * - npm run test:first-login  - Dashboard redirect tests
 * - npm run test:mobile       - Mobile viewport tests
 * - npm run test:onboarding:fresh  - Onboarding (resets entire DB)
 */
export default defineConfig({
  testDir: "./uat/tests",

  /* Global setup/teardown removed - onboarding tests create the data */
  // globalSetup: "./uat/global-setup.ts",
  // globalTeardown: "./uat/global-teardown.ts",

  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for predictable test order

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

    /* Default timeout for actions */
    actionTimeout: 15000,
  },

  /* Default test timeout */
  timeout: 60000,

  /* Configure projects */
  projects: [
    // ========================================
    // AUTH SETUP - Creates authenticated browser sessions
    // Runs AFTER onboarding creates the users
    // ========================================
    {
      name: "auth-setup",
      testDir: "./uat",
      testMatch: /(?<![a-z-])auth\.setup\.ts$/,
      dependencies: ["onboarding"], // Wait for onboarding to create users first
    },

    // ========================================
    // ONBOARDING PROJECT - Runs first to create users/org/team
    // ========================================
    {
      name: "onboarding",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /onboarding\.spec\.ts/,
    },

    // ========================================
    // DEFAULT: ALL OTHER TESTS
    // Runs after onboarding completes
    // Command: npm run test
    // ========================================
    {
      name: "default",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/mobile\.spec\.ts/, /onboarding\.spec\.ts/], // Exclude onboarding and mobile
      dependencies: ["onboarding", "auth-setup"], // Onboarding first, then auth
    },

    // ========================================
    // AUTH TESTS - Authentication flow tests
    // Command: npm run test:auth
    // ========================================
    {
      name: "auth-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /auth\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // ADMIN TESTS - Admin dashboard tests
    // Command: npm run test:admin
    // ========================================
    {
      name: "admin-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /admin.*\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // COACH TESTS - Coach dashboard tests
    // Command: npm run test:coach
    // ========================================
    {
      name: "coach-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /coach\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // PARENT TESTS - Parent dashboard tests
    // Command: npm run test:parent
    // ========================================
    {
      name: "parent-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /parent\.spec\.ts/,
      dependencies: ["auth-setup"],
    },

    // ========================================
    // FIRST-LOGIN TESTS - Dashboard redirect tests
    // Command: npm run test:first-login
    // ========================================
    {
      name: "first-login-tests",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./uat/tests",
      testMatch: /first-login-dashboard\.spec\.ts/,
      dependencies: ["auth-setup"],
    },


    // ========================================
    // MOBILE TESTS - All tests on mobile viewport
    // Command: npm run test:mobile
    // ========================================
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testDir: "./uat/tests",
      testMatch: /mobile\.spec\.ts/,
      dependencies: ["auth-setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "ignore", // Suppress normal output
    stderr: "ignore", // Suppress source map warnings from Next.js
  },
});

