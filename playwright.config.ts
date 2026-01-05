// Root playwright config - mirrors apps/web/playwright.config.ts
// This ensures tests run from the root directory work correctly
import { defineConfig, devices } from '@playwright/test';

/**
 * Root Playwright configuration for PDP E2E tests
 * 
 * TEST GROUPS:
 * 
 * 1. Initial Setup Tests (Group 1):
 *    - Run once when setting up a fresh environment
 *    - Tests: setup.spec.ts
 *    - Command: npm run test:setup
 * 
 * 2. Continuous Tests (Group 2):
 *    - Run regularly after code changes
 *    - Tests: auth.spec.ts, admin.spec.ts, coach.spec.ts
 *    - Command: npm run test:continuous
 */
export default defineConfig({
  testDir: './apps/web/uat/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // ========================================
    // CONTINUOUS AUTH - Logs into EXISTING accounts
    // For environments with existing users
    // ========================================
    { 
      name: 'auth-setup', 
      testDir: './apps/web/uat',
      testMatch: /^auth\.setup\.ts$/,
      testIgnore: /initial-auth\.setup\.ts/,
    },
    
    // ========================================
    // GROUP 1: INITIAL SETUP TESTS
    // Run once when setting up a fresh environment
    // Command: npm run test:setup
    // ========================================
    {
      name: 'initial-setup',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /setup\.spec\.ts/,
      // No dependencies - tests handle their own signup/login
    },
    
    // ========================================
    // GROUP 2: CONTINUOUS TESTS
    // Run regularly after code changes - EXCLUDES setup.spec.ts
    // Command: npm run test:continuous
    // ========================================
    {
      name: 'continuous',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /setup\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    
    // ========================================
    // AUTH TESTS - Authentication tests only
    // Command: npx playwright test --project=auth-tests
    // ========================================
    {
      name: 'auth-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /auth\.spec\.ts/,
    },
    
    // ========================================
    // COACH TESTS - Coach dashboard tests only
    // Command: npx playwright test --project=coach-tests
    // ========================================
    {
      name: 'coach-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /coach\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    
    // ========================================
    // ADMIN TESTS - Admin dashboard tests only
    // Command: npx playwright test --project=admin-tests
    // ========================================
    {
      name: 'admin-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /admin\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    
    // ========================================
    // ALL TESTS - Runs all tests
    // Command: npm run test OR npx playwright test --project=all-desktop
    // ========================================
    {
      name: 'all-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: 'cd apps/web && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
