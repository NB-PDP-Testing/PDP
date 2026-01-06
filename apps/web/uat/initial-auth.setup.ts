import { test as setup, expect } from '@playwright/test';
import { TEST_USERS, AUTH_STATES } from './fixtures/test-utils';
import path from 'path';

/**
 * Initial Authentication Setup
 * 
 * This file creates user accounts via SIGNUP for fresh environment testing.
 * Use this setup for the Initial Setup test group (Group 1).
 * 
 * These tests assume NO users exist in the database.
 */

// Path for initial setup auth states (separate from regular auth)
export const INITIAL_AUTH_STATES = {
  platformStaff: path.join(__dirname, '.auth/initial-platform-staff.json'),
  owner: path.join(__dirname, '.auth/initial-owner.json'),
  admin: path.join(__dirname, '.auth/initial-admin.json'),
  coach: path.join(__dirname, '.auth/initial-coach.json'),
};

/**
 * Create the initial platform staff account via signup
 * This user will be able to create organizations
 */
setup('create platform staff account', async ({ page }) => {
  await page.goto('/signup');
  
  // Fill signup form
  await page.getByLabel(/name/i).fill('Platform Staff');
  await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
  await page.getByLabel(/password/i).first().fill(TEST_USERS.admin.password);
  
  // Check for confirm password field
  const confirmPassword = page.getByLabel(/confirm.*password/i);
  if (await confirmPassword.isVisible()) {
    await confirmPassword.fill(TEST_USERS.admin.password);
  }
  
  // Submit signup - use exact match to avoid SSO buttons
  await page.getByRole('button', { name: 'Create Account' }).click();
  
  // Wait for successful signup (may redirect to different pages)
  await page.waitForURL(/\/(orgs|dashboard|verify|onboarding)/);
  
  // Save storage state
  await page.context().storageState({ path: INITIAL_AUTH_STATES.platformStaff });
});

/**
 * Create the owner account via signup
 * This will be the organization owner
 */
setup('create owner account', async ({ page }) => {
  await page.goto('/signup');
  
  // Fill signup form
  await page.getByLabel(/name/i).fill(TEST_USERS.owner.name);
  await page.getByLabel(/email/i).fill(TEST_USERS.owner.email);
  await page.getByLabel(/password/i).first().fill(TEST_USERS.owner.password);
  
  // Check for confirm password field
  const confirmPassword = page.getByLabel(/confirm.*password/i);
  if (await confirmPassword.isVisible()) {
    await confirmPassword.fill(TEST_USERS.owner.password);
  }
  
  // Submit signup - use exact match to avoid SSO buttons
  await page.getByRole('button', { name: 'Create Account' }).click();
  
  // Wait for successful signup
  await page.waitForURL(/\/(orgs|dashboard|verify|onboarding)/, { timeout: 15000 });
  
  // Save storage state
  await page.context().storageState({ path: INITIAL_AUTH_STATES.owner });
});

/**
 * Note: Admin and Coach accounts are created via invitation flow
 * Their auth states will be saved during the setup.spec.ts tests
 * after they accept their invitations.
 * 
 * For now, we just create placeholder files to avoid errors.
 */
setup('placeholder for invited users', async ({ page }) => {
  // This is a no-op setup that just ensures the auth directory exists
  // Actual admin/coach auth states are created when they accept invitations
  
  // Create empty auth states for invited users
  // These will be populated when the invitation acceptance tests run
  await page.goto('/');
  
  // We don't save auth states here - they'll be created during invitation acceptance
  console.log('Note: Admin and Coach auth states will be created during invitation acceptance tests');
});
