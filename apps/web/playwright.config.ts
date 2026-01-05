import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PDP E2E tests
 * See https://playwright.dev/docs/test-configuration
 * 
 * TEST GROUPS:
 * 
 * 1. Initial Setup Tests (Group 1):
 *    - Run once when setting up a fresh environment
 *    - Uses initial-auth.setup.ts (creates accounts via SIGNUP)
 *    - Tests: setup.spec.ts
 *    - Command: npm run test:setup
 * 
 * 2. Continuous Tests (Group 2):
 *    - Run regularly after code changes
 *    - Uses auth.setup.ts (logs into EXISTING accounts)
 *    - Tests: auth.spec.ts, admin.spec.ts, coach.spec.ts
 *    - Command: npm run test:continuous
 */
export default defineConfig({
  testDir: './uat/tests',
  
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
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for different test groups */
  projects: [
    // ========================================
    // INITIAL SETUP AUTH - Creates accounts via SIGNUP
    // For fresh environment (no existing users)
    // ========================================
    { 
      name: 'initial-auth-setup', 
      testDir: './uat',
      testMatch: /initial-auth\.setup\.ts/ 
    },
    
    // ========================================
    // CONTINUOUS AUTH - Logs into EXISTING accounts
    // For environments with existing users
    // ========================================
    { 
      name: 'auth-setup', 
      testDir: './uat',
      testMatch: /auth\.setup\.ts/ 
    },
    
    // ========================================
    // GROUP 1: INITIAL SETUP TESTS
    // Run once when setting up a fresh environment
    // NO dependencies - tests handle their own signup/login
    // Command: npm run test:setup
    // ========================================
    {
      name: 'initial-setup',
      use: { ...devices['Desktop Chrome'] },
      testDir: './uat/tests',
      testMatch: /setup\.spec\.ts/,
      // No dependencies - tests do their own signup/login for fresh environment
    },
    
    // ========================================
    // GROUP 2: CONTINUOUS TESTS
    // Run regularly after code changes
    // Uses auth-setup (login-based)
    // Command: npm run test:continuous
    // ========================================
    {
      name: 'continuous',
      use: { ...devices['Desktop Chrome'] },
      testDir: './uat/tests',
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /setup\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    
    // ========================================
    // ALL TESTS - Runs both groups sequentially
    // Command: npm run test
    // ========================================
    {
      name: 'all-desktop',
      use: { ...devices['Desktop Chrome'] },
      testDir: './uat/tests',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    
    // ========================================
    // MOBILE TESTS - Continuous tests on mobile viewport
    // Command: npm run test:mobile
    // ========================================
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testDir: './uat/tests',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /setup\.spec\.ts/, // Setup tests are desktop-focused
      dependencies: ['auth-setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Ensure the dev server always starts from the apps/web directory
    cwd: __dirname,
  },
});
