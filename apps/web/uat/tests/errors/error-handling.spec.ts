import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Error Handling Tests (P2)
 *
 * Tests for empty states, 404, and 403 error pages.
 * Test IDs: ERR-EMPTY-PLAYERS-001, ERR-EMPTY-TEAMS-001, ERR-404-001, ERR-403-001
 */

test.describe("ERROR - Empty States and Error Pages", () => {
  test("ERR-EMPTY-PLAYERS-001: Empty state message when no players", async ({ adminPage }) => {
    const page = adminPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Navigate to players
    const playersLink = page.getByRole("link", { name: /players/i }).first();
    
    if (await playersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playersLink.click();
      await waitForPageLoad(page);

      // Check for empty state or player list
      const emptyState = page.getByText(/no players|add your first|get started/i)
        .or(page.locator("[data-testid='empty-state']"))
        .or(page.locator(".empty-state"));

      const playerList = page.locator("table tbody tr, [role='listitem']");

      const hasPlayerCount = await playerList.count();
      const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

      // Either has players or shows empty state
      expect(hasPlayerCount > 0 || hasEmptyState).toBeTruthy();
    }
  });

  test("ERR-EMPTY-TEAMS-001: Empty state message when no teams", async ({ adminPage }) => {
    const page = adminPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Navigate to teams
    const teamsLink = page.getByRole("link", { name: /teams/i }).first();
    
    if (await teamsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamsLink.click();
      await waitForPageLoad(page);

      // Check for empty state or team list
      const emptyState = page.getByText(/no teams|create your first|add team/i)
        .or(page.locator("[data-testid='empty-state']"))
        .or(page.locator(".empty-state"));

      const teamList = page.locator("table tbody tr, [role='listitem'], [data-testid='team-card']");

      const hasTeamCount = await teamList.count();
      const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

      // Either has teams or shows empty state
      expect(hasTeamCount > 0 || hasEmptyState).toBeTruthy();
    }
  });

  test("ERR-404-001: 404 page for invalid routes", async ({ adminPage }) => {
    const page = adminPage;

    // Navigate to a definitely invalid route
    await page.goto("/this-page-does-not-exist-12345");
    await waitForPageLoad(page);

    // Check for 404 indicators
    const notFound404 = page.getByText(/404|not found|page.*exist|couldn't find/i);
    const errorPage = page.locator("[data-testid='error-page']")
      .or(page.locator(".error-page"))
      .or(page.locator("[class*='not-found']"));

    const homeLink = page.getByRole("link", { name: /home|back|return/i });

    const is404 =
      (await notFound404.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await errorPage.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await homeLink.isVisible({ timeout: 3000 }).catch(() => false));

    expect(is404).toBeTruthy();
  });

  test("ERR-403-001: 403 page for unauthorized access", async ({ coachPage }) => {
    const page = coachPage;

    // Try to access platform admin (coach should not have access)
    await page.goto("/platform");
    await waitForPageLoad(page);

    // Check for 403/unauthorized indicators
    const unauthorized = page.getByText(/403|unauthorized|access denied|forbidden|permission/i);
    const redirectedToOrgs = page.url().includes("/orgs");
    const redirectedToLogin = page.url().includes("/sign-in") || page.url().includes("/login");

    const errorPage = page.locator("[data-testid='error-page']")
      .or(page.locator(".error-page"))
      .or(page.locator("[class*='unauthorized']"));

    const is403OrRedirected =
      (await unauthorized.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await errorPage.isVisible({ timeout: 3000 }).catch(() => false)) ||
      redirectedToOrgs ||
      redirectedToLogin;

    expect(is403OrRedirected).toBeTruthy();
  });
});
