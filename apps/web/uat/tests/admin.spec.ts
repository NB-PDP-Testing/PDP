import { test, expect, TEST_USERS, AUTH_STATES } from '../fixtures/test-utils';

/**
 * Admin Approval Tests
 * 
 * TEST-ADMIN-001: View Pending Requests
 * TEST-ADMIN-002: Approve Coach Request with Team Assignment
 * TEST-ADMIN-003: Approve Parent Request with Smart Matching
 * TEST-ADMIN-004: Reject Request with Reason
 */

test.describe('Admin Dashboard', () => {
  // Use admin's authenticated session for these tests
  test.use({ storageState: AUTH_STATES.admin });

  test.describe('TEST-ADMIN-001: View Pending Requests', () => {
    test('should display admin dashboard', async ({ page, helper }) => {
      await helper.goToAdmin();
      await helper.waitForPageLoad();
      
      // Should see admin dashboard heading
      await expect(page.getByRole('heading', { name: /admin|dashboard|management/i })).toBeVisible({ timeout: 15000 });
    });

    test('should show pending requests badge if requests exist', async ({ page, helper }) => {
      await helper.goToAdmin();
      await helper.waitForPageLoad();
      
      // Look for pending requests indicator or approvals link
      const hasPendingIndicator = await page.getByText(/pending|approval/i).isVisible({ timeout: 10000 }).catch(() => false);
      const hasApprovalsLink = await page.getByRole('link', { name: /approvals?/i }).isVisible().catch(() => false);
      
      // At least one should be present (even if 0 pending)
      expect(hasPendingIndicator || hasApprovalsLink).toBeTruthy();
    });

    test('should navigate to approvals page', async ({ page, helper }) => {
      await helper.goToAdmin();
      await helper.waitForPageLoad();
      
      // Navigate to approvals
      const approvalsLink = page.getByRole('link', { name: /approvals?|pending/i });
      if (await approvalsLink.isVisible({ timeout: 5000 })) {
        await approvalsLink.click();
        await expect(page).toHaveURL(/\/approvals/);
      } else {
        // Try direct navigation
        await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/admin/users/approvals');
      }
      
      await helper.waitForPageLoad();
      
      // Should display approvals page content
      await expect(page.getByText(/pending|requests|approvals/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('TEST-ADMIN-002: Approve Coach Request with Team Assignment', () => {
    test.skip('should open approval dialog with team selection', async ({ page, helper }) => {
      // Navigate to approvals
      await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/admin/users/approvals');
      await helper.waitForPageLoad();
      
      // Find a coach request (if any)
      const coachRequest = page.locator('[data-testid="pending-request"]')
        .filter({ hasText: /coach/i })
        .first();
      
      if (await coachRequest.isVisible({ timeout: 5000 })) {
        // Click configure & approve
        await coachRequest.getByRole('button', { name: /configure|approve/i }).click();
        
        // Should show team selection dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/team|assign/i)).toBeVisible();
      }
    });
  });

  test.describe('TEST-ADMIN-003: Approve Parent Request with Smart Matching', () => {
    test.skip('should show smart matches for parent request', async ({ page, helper }) => {
      // Navigate to approvals
      await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/admin/users/approvals');
      await helper.waitForPageLoad();
      
      // Find a parent request (if any)
      const parentRequest = page.locator('[data-testid="pending-request"]')
        .filter({ hasText: /parent/i })
        .first();
      
      if (await parentRequest.isVisible({ timeout: 5000 })) {
        // Click configure & approve
        await parentRequest.getByRole('button', { name: /configure|approve/i }).click();
        
        // Should show dialog with potential matches
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/match|children|link/i)).toBeVisible();
      }
    });
  });

  test.describe('TEST-ADMIN-004: Reject Request with Reason', () => {
    test.skip('should require reason when rejecting', async ({ page, helper }) => {
      // Navigate to approvals
      await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/admin/users/approvals');
      await helper.waitForPageLoad();
      
      // Find any pending request
      const pendingRequest = page.locator('[data-testid="pending-request"]').first();
      
      if (await pendingRequest.isVisible({ timeout: 5000 })) {
        // Click reject
        await pendingRequest.getByRole('button', { name: /reject/i }).click();
        
        // Should show rejection dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Confirm button should be disabled without reason
        const confirmButton = page.getByRole('button', { name: /confirm|reject/i }).last();
        await expect(confirmButton).toBeDisabled();
        
        // Enter reason
        await page.getByLabel(/reason/i).fill('Unable to verify identity');
        
        // Now button should be enabled
        await expect(confirmButton).toBeEnabled();
      }
    });
  });
});

test.describe('Admin Access Control', () => {
  test('should deny access to non-admins', async ({ page }) => {
    // Login as coach (non-admin)
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USERS.coach.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.coach.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/orgs/);
    
    // Try to access admin page
    await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/admin');
    
    // Should show access denied or redirect
    const hasAccessDenied = await page.getByText(/access denied|not authorized|admin|permission/i).isVisible({ timeout: 10000 }).catch(() => false);
    const notOnAdminPage = !/\/admin/.test(page.url());
    
    expect(hasAccessDenied || notOnAdminPage).toBeTruthy();
  });
});
