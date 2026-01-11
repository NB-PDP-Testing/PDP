import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Get the directory of this config file
const configDir = __dirname;

/**
 * PlayerARC UAT MCP Test Configuration
 *
 * Based on best practices from docs/testing/UAT_MCP_TESTS.MD
 */
export default defineConfig({
  testDir: path.join(configDir, "tests"),
  fullyParallel: false, // Run tests sequentially for UAT stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 1 retry for local, 2 for CI to handle intermittent failures
  workers: process.env.CI ? 1 : 6, // 6 workers locally for faster runs, 1 for CI stability
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Output directories relative to config
  outputDir: path.join(configDir, "test-results"),

  // Global setup/teardown - creates auth states for all users
  globalSetup: path.join(configDir, "global-setup.ts"),
});
