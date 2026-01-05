import { test, expect } from '../fixtures/test-utils';

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
      await expect(page.getByRole('button', { name: /create account|sign up/i })).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to register with existing email
      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('adm1n_pdp@outlook.com'); // Existing user
      await page.getByLabel(/password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: /create account|sign up/i }).click();
      
      // Should show error message
      await expect(page.getByText(/already registered|already exists|email taken/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for weak password', async ({ page }) => {
      await page.goto('/signup');
      
      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('weakpass@test.com');
      await page.getByLabel(/password/i).fill('123'); // Weak password
      await page.getByRole('button', { name: /create account|sign up/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/password|characters|stronger/i)).toBeVisible();
    });
  });

  test.describe('TEST-AUTH-003: Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page, helper }) => {
      // Login first
      await helper.login('coach_pdp@outlook.com', 'AskJohn123!');
      
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
      // Login first
      await helper.login('coach_pdp@outlook.com', 'AskJohn123!');
      
      // Verify logged in
      await expect(page).toHaveURL(/\/orgs/);
      
      // Logout
      await helper.logout();
      
      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });

    test('should not access protected routes after logout', async ({ page, helper }) => {
      // Login first
      await helper.login('coach_pdp@outlook.com', 'AskJohn123!');
      
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
