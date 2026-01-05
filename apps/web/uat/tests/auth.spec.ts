import { test, expect, TEST_USERS } from '../fixtures/test-utils';

/**
 * Authentication Tests
 * 
 * TEST-AUTH-001: Email Registration
 * TEST-AUTH-002: Google SSO Login (manual - requires OAuth)
 * TEST-AUTH-003: Session Persistence
 * TEST-AUTH-004: Logout
 */

test.describe('Authentication', () => {
  
  test.describe('TEST-AUTH-001: Email Registration', () => {
    test('should display signup page correctly', async ({ page }) => {
      await page.goto('/signup');
      
      // Verify signup form elements are present
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      // Use exact match to avoid matching SSO buttons
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to register with existing email from test data
      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).fill(TEST_USERS.owner.email); // Existing user
      await page.getByLabel(/password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Should show error message
      await expect(page.getByText(/already registered|already exists|email taken/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for weak password', async ({ page }) => {
      await page.goto('/signup');
      
      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('weakpass@test.com');
      await page.getByLabel(/password/i).fill('123'); // Weak password
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Should show validation error - look for the specific error message class
      await expect(page.locator('.text-destructive').filter({ hasText: /password|must be at least/i })).toBeVisible();
    });
  });

  test.describe('TEST-AUTH-003: Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page, helper }) => {
      // Login first using owner credentials from test data
      await helper.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      
      // Verify logged in
      await expect(page).toHaveURL(/\/orgs/);
      
      // Get current URL
      const urlBefore = page.url();
      
      // Refresh the page
      await page.reload();
      
      // Should still be on the same page (not redirected to login)
      await expect(page).not.toHaveURL('/login');
      
      // User should still be authenticated
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('TEST-AUTH-004: Logout', () => {
    test('should logout and redirect to login page', async ({ page, helper }) => {
      // Login first using owner credentials from test data
      await helper.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      
      // Verify logged in
      await expect(page).toHaveURL(/\/orgs/);
      
      // Logout
      await helper.logout();
      
      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });

    test('should not access protected routes after logout', async ({ page, helper }) => {
      // Login first using owner credentials from test data
      await helper.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      
      // Logout
      await helper.logout();
      
      // Try to access protected route
      await page.goto('/orgs');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe('TEST-AUTH-002: Google SSO Login', () => {
  test.skip('should display Google SSO button', async ({ page }) => {
    // Note: Full OAuth testing requires mocking or separate OAuth test environment
    await page.goto('/login');
    
    // Verify Google SSO button is present
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });
});
