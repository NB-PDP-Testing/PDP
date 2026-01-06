import { test as setup, expect } from '@playwright/test';
import { TEST_USERS, AUTH_STATES } from './fixtures/test-utils';

/**
 * Authentication Setup
 * 
 * This file creates authenticated session states for different user roles.
 * These sessions are saved and reused by tests to avoid logging in repeatedly.
 * 
 * Run this setup first before other tests.
 */

// Setup admin user session
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
  await page.getByLabel(/password/i).fill(TEST_USERS.admin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  
  // Wait for successful login
  await page.waitForURL(/\/orgs/);
  await expect(page).toHaveURL(/\/orgs/);
  
  // Save storage state
  await page.context().storageState({ path: AUTH_STATES.admin });
});

// Setup coach user session
setup('authenticate as coach', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.coach.email);
  await page.getByLabel(/password/i).fill(TEST_USERS.coach.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  
  await page.waitForURL(/\/orgs/);
  await page.context().storageState({ path: AUTH_STATES.coach });
});

// Setup parent user session
setup('authenticate as parent', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.parent.email);
  await page.getByLabel(/password/i).fill(TEST_USERS.parent.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  
  await page.waitForURL(/\/orgs/);
  await page.context().storageState({ path: AUTH_STATES.parent });
});

// Setup owner user session
setup('authenticate as owner', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.owner.email);
  await page.getByLabel(/password/i).fill(TEST_USERS.owner.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  
  await page.waitForURL(/\/orgs/);
  await page.context().storageState({ path: AUTH_STATES.owner });
});
