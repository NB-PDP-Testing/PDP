import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Standalone config for onboarding/setup scripts
 * 
 * This config is used for scripts that create users and organizations
 * It does NOT use globalSetup because users don't exist yet
 */
export default defineConfig({
  // Use the parent uat directory as testDir so imports work correctly
  testDir: path.join(__dirname, ".."),
  fullyParallel: false, // Run tests sequentially
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for setup scripts
  workers: 1, // Single worker for consistent execution
  reporter: [
    ["html", { outputFolder: path.join(__dirname, "../playwright-report") }],
    ["list"],
  ],
  timeout: 120000, // 2 minutes per test (setup takes longer)
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30000,
    navigationTimeout: 60000,
    headless: true,
  },

  projects: [
    {
      name: "setup",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Output directories
  outputDir: path.join(__dirname, "../test-results"),

  // NO globalSetup - users are created during tests
});
