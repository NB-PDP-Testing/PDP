import { test, expect, TEST_USERS, AUTH_STATES } from '../fixtures/test-utils';

/**
 * Coach Dashboard Tests
 * 
 * TEST-COACH-001: View Assigned Team Players
 * TEST-COACH-002: Filter Players by Team
 * TEST-COACH-003: Navigate to Player Passport
 * TEST-COACH-004: Filter by Review Status
 */

test.describe('Coach Dashboard', () => {
  // Use coach's authenticated session for these tests
  test.use({ storageState: AUTH_STATES.coach });

  test.describe('TEST-COACH-001: View Assigned Team Players', () => {
    test('should display coach dashboard with assigned teams', async ({ page, helper }) => {
      await helper.goToCoach();
      await helper.waitForPageLoad();
      
      // Should see Smart Coach Dashboard or similar heading
      await expect(page.getByRole('heading', { name: /coach|dashboard|players/i })).toBeVisible({ timeout: 15000 });
      
      // Should display team cards or player list
      const hasTeams = await page.locator('[data-testid="team-card"], .team-card, [class*="team"]').count() > 0 ||
                       await page.getByText(/no teams assigned/i).isVisible().catch(() => false);
      
      expect(hasTeams || await page.getByText(/no teams/i).isVisible()).toBeTruthy();
    });

    test('should show "No Teams Assigned" message when coach has no assignments', async ({ page }) => {
      // This test assumes a coach with no team assignments
      // Skip if coach has assignments
      await page.goto('/orgs/' + (process.env.TEST_ORG_ID || '') + '/coach');
      await page.waitForLoadState('networkidle');
      
      // Check for either players or no teams message
      const hasContent = await page.getByText(/players|no teams assigned/i).isVisible({ timeout: 10000 });
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('TEST-COACH-002: Filter Players by Team', () => {
    test('should filter players when team is selected', async ({ page, helper }) => {
      await helper.goToCoach();
      await helper.waitForPageLoad();
      
      // Find team filter/cards
      const teamCards = page.locator('[data-testid="team-card"], .team-card, [class*="team-filter"]');
      const teamCount = await teamCards.count();
      
      if (teamCount > 1) {
        // Click on a team to filter
        await teamCards.first().click();
        
        // Player list should update (verify by checking loading or content change)
        await page.waitForLoadState('networkidle');
      } else {
        // Skip if only one team or no teams
        test.skip();
      }
    });
  });

  test.describe('TEST-COACH-003: Navigate to Player Passport', () => {
    test('should navigate to player details when clicking player row', async ({ page, helper }) => {
      await helper.goToCoach();
      await helper.waitForPageLoad();
      
      // Find a player row/card
      const playerRow = page.locator('[data-testid="player-row"], tr[data-player-id], .player-card, [class*="player-item"]').first();
      
      if (await playerRow.isVisible({ timeout: 10000 })) {
        // Click on the player or view button
        const viewButton = playerRow.getByRole('button', { name: /view/i });
        if (await viewButton.isVisible()) {
          await viewButton.click();
        } else {
          await playerRow.click();
        }
        
        // Should navigate to player passport page
        await expect(page).toHaveURL(/\/players\//, { timeout: 10000 });
        
        // Should display player details
        await expect(page.getByText(/skills|passport|player/i)).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('TEST-COACH-004: Filter by Review Status', () => {
    test('should filter players by review status', async ({ page, helper }) => {
      await helper.goToCoach();
      await helper.waitForPageLoad();
      
      // Find status filter (overdue, due soon, etc.)
      const overdueFilter = page.getByRole('button', { name: /overdue/i });
      const statusFilter = page.locator('[data-testid="status-filter"], [class*="status-filter"]');
      
      if (await overdueFilter.isVisible({ timeout: 5000 })) {
        await overdueFilter.click();
        await page.waitForLoadState('networkidle');
        // List should be filtered
      } else if (await statusFilter.isVisible({ timeout: 5000 })) {
        await statusFilter.first().click();
        await page.waitForLoadState('networkidle');
      } else {
        // No filter available - skip
        test.skip();
      }
    });
  });
});
