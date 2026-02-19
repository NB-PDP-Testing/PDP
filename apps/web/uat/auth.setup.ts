import { test as setup } from "@playwright/test";
import { loginWithEmail, setupAuthentication } from "./auth-utils";

/**
 * Authentication Setup for PlayerARC UAT Tests
 *
 * Creates authenticated storage states for all user roles.
 * The actual logic lives in auth-utils.ts so this file can be safely
 * imported by global-setup.ts without the setup() call firing.
 *
 * Usage (run directly to refresh auth states):
 *   npx playwright test --config apps/web/uat/playwright.config.ts apps/web/uat/auth.setup.ts
 */

export { loginWithEmail, setupAuthentication };

setup("create authenticated storage states for all users", async () => {
  await setupAuthentication();
});
