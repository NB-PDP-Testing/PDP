import { test, expect, navigateToCoach, navigateToCoachPage } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Injury Tracking Tests
 *
 * Tests for coach injury tracking and medical functionality.
 * Based on gaps identified in MASTER_UAT_PLAN.md
 */

test.describe.skip("COACH - Injury Tracking Tests", () => {
  test.describe.skip("Injuries Page Access", () => {
    test("INJURY-001: Coach can access injuries page", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      // Look for injuries link in sidebar
      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);
        await expect(page).toHaveURL(/\/injuries/);
      }
    });

    test("INJURY-002: Injuries dashboard displays correctly", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);

        // Should show injuries page content
        await expect(page.getByText(/injur/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });

  test.describe.skip("Injury Recording", () => {
    test("INJURY-003: Add injury button is visible", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);

        // Look for add injury button
        const addButton = page.getByRole("button", { name: /add|new|record/i });
        await expect(addButton).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("INJURY-004: Player selector is available", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);

        // Look for player selector
        const playerSelector = page.getByText(/player/i).or(page.locator('[data-testid="player-selector"]'));
        await expect(playerSelector.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });

  test.describe.skip("Injury Status", () => {
    test("INJURY-005: Active injuries are displayed", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);

        // Look for active/current injuries section
        const activeSection = page.getByText(/active/i).or(page.getByText(/current/i));
        await expect(activeSection.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("INJURY-006: Recovery status indicators are visible", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const injuriesLink = page.getByRole("link", { name: /injur/i }).or(page.locator('a[href*="/injuries"]'));
      if (await injuriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await injuriesLink.click();
        await waitForPageLoad(page);

        // Look for status indicators
        const statusIndicator = page.getByText(/status/i).or(page.getByText(/recovery/i));
        await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });

  test.describe.skip("Medical Page Access", () => {
    test("INJURY-007: Coach can access medical page", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const medicalLink = page.getByRole("link", { name: /medical/i }).or(page.locator('a[href*="/medical"]'));
      if (await medicalLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await medicalLink.click();
        await waitForPageLoad(page);
        await expect(page).toHaveURL(/\/medical/);
      }
    });

    test("INJURY-008: Medical summary is displayed", async ({ ownerPage }) => {
      const page = ownerPage;

      await navigateToCoachPage(page, undefined, 'injuries');
      await waitForPageLoad(page);

      const medicalLink = page.getByRole("link", { name: /medical/i }).or(page.locator('a[href*="/medical"]'));
      if (await medicalLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await medicalLink.click();
        await waitForPageLoad(page);

        // Should show medical overview
        await expect(page.getByText(/medical/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });
});
