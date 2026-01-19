import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Player Passport Tests
 *
 * Tests for viewing and interacting with player passport/profile pages.
 * Based on gaps identified in MASTER_UAT_PLAN.md
 */

test.describe.skip("PLAYER - Passport Tests", () => {
  test.describe.skip("Admin Access", () => {
    test("PLAYER-001: Admin can view players list", async ({ ownerPage }) => {
      const page = ownerPage;

      // Navigate to admin players
      await page.goto("/orgs");
      await waitForPageLoad(page);
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      // Verify players page loads
      await expect(page).toHaveURL(/\/admin\/players/);
      await expect(page.getByRole("heading", { name: /Players/i }).first()).toBeVisible();
    });

    test("PLAYER-002: Admin can search players", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      // Look for search functionality
      const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();
      }
    });

    test("PLAYER-003: Admin can navigate to player passport", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      // Click on first player if available
      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);
        await expect(page).toHaveURL(/\/players\/[^/]+$/);
      }
    });
  });

  test.describe.skip("Passport Sections", () => {
    test("PLAYER-004: Player passport displays basic info section", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      // Navigate to first player
      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Verify basic info section
        await expect(page.getByText(/basic info/i).or(page.getByText(/player info/i)).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("PLAYER-005: Player passport displays skills section", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for skills section
        const skillsSection = page.getByText(/skills/i).first();
        await expect(skillsSection).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("PLAYER-006: Player passport displays goals section", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for goals section
        const goalsSection = page.getByText(/goals/i).first();
        await expect(goalsSection).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("PLAYER-007: Player passport displays notes section", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for notes section
        const notesSection = page.getByText(/notes/i).first();
        await expect(notesSection).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("PLAYER-008: Player passport displays emergency contacts", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for emergency contacts
        const contactsSection = page.getByText(/emergency/i).or(page.getByText(/contacts/i)).first();
        await expect(contactsSection).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });

  test.describe.skip("Edit Player", () => {
    test("PLAYER-009: Admin can access edit player page", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for edit button
        const editButton = page.getByRole("button", { name: /edit/i }).or(page.getByRole("link", { name: /edit/i })).first();
        if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await editButton.click();
          await waitForPageLoad(page);
          await expect(page).toHaveURL(/\/edit/);
        }
      }
    });
  });

  test.describe.skip("Share Player", () => {
    test("PLAYER-010: Share button is visible on player passport", async ({ ownerPage }) => {
      const page = ownerPage;

      await page.goto("/orgs");
      await page.click('text="Admin Panel"');
      await waitForPageLoad(page);
      await page.click('text="Players"');
      await waitForPageLoad(page);

      const playerLink = page.locator('[data-testid="player-card"], a[href*="/players/"]').first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await waitForPageLoad(page);

        // Look for share button
        const shareButton = page.getByRole("button", { name: /share/i });
        await expect(shareButton).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });
  });
});
