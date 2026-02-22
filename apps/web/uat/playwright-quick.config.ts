import { defineConfig, devices } from "@playwright/test";
import path from "path";

const configDir = __dirname;

/**
 * Quick test config - no global setup, uses existing auth state
 */
export default defineConfig({
  testDir: path.join(configDir, "tests"),
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  timeout: 90000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  outputDir: path.join(configDir, "test-results"),
  // No globalSetup - relies on existing .auth/ state files
});
