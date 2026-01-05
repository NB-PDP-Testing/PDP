// Root Playwright config - delegates to apps/web config
// This ensures tests run from the root directory use the same settings
// as the app-specific configuration in apps/web/playwright.config.ts
import type { PlaywrightTestConfig } from '@playwright/test';
import appConfig from './apps/web/playwright.config';

const config: PlaywrightTestConfig = appConfig;

export default config;
