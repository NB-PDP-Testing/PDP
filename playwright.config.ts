// Root playwright config - delegates to apps/web config
// See apps/web/playwright.config.ts for details
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/uat/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "initial-auth-setup",
      testDir: "./apps/web/uat",
      testMatch: /initial-auth\.setup\.ts/,
    },
    {
      name: "auth-setup",
      testDir: "./apps/web/uat",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "initial-onboarding",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /onboarding\.spec\.ts/,
    },
    {
      name: "continuous",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /^(auth|admin|coach)\.spec\.ts$/,
      dependencies: ["auth-setup"],
    },
    {
      name: "auth-tests",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: "coach-tests",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /coach\.spec\.ts/,
      dependencies: ["auth-setup"],
    },
    {
      name: "admin-tests",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /admin\.spec\.ts/,
      dependencies: ["auth-setup"],
    },
    {
      name: "all-desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.spec\.ts/,
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /.*\.spec\.ts/,
      testIgnore: /onboarding\.spec\.ts/,
      dependencies: ["auth-setup"],
    },
  ],
  webServer: {
    command: "cd apps/web && npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
