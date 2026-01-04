import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PDP E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './uat/tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
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

  /* Configure projects for major browsers */
  projects: [
    /* Setup project - runs before tests to set up auth states */
    { 
      name: 'setup', 
      testDir: './uat',
      testMatch: /auth\.setup\.ts/ 
    },
    
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './uat/tests',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
    },
    
    /* Test against mobile viewport */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './uat/tests',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
    },
    
    /* Uncomment for cross-browser testing */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
