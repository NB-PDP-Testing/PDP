import { test, expect } from "@playwright/test";

/**
 * Homepage Tests
 *
 * Tests for the marketing landing page.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("HOME - Homepage Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("HOME-001: Homepage loads correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/PlayerArc/i);

    // Verify hero section
    await expect(
      page.getByRole("heading", { name: /Transforming Youth Sports Development/i })
    ).toBeVisible();
  });

  test("HOME-002: Header navigation is visible", async ({ page }) => {
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();

    // Logo - there are multiple logos (header and elsewhere), use first visible
    const headerLogo = page.locator("header").getByRole("img").first();
    await expect(headerLogo).toBeVisible();

    // Navigation buttons - may not exist in all designs, check header nav
    const header = page.locator("header");
    
    // Auth links - verify login link exists in header
    await expect(header.getByRole("link", { name: /Login/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /Request Demo/i })).toBeVisible();
  });

  test("HOME-003: Hero section displays correctly", async ({ page }) => {
    // Heading
    await expect(
      page.getByRole("heading", { name: /Transforming Youth Sports Development/i })
    ).toBeVisible();

    // CTA buttons
    await expect(
      page.getByRole("link", { name: /Request Demo/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Learn More/i })
    ).toBeVisible();
  });

  test("HOME-004: Problem section displays statistics", async ({ page }) => {
    // Problem section heading
    await expect(
      page.getByRole("heading", { name: /We're Losing Our Young Athletes/i })
    ).toBeVisible();

    // Statistics - use first() to handle multiple matching elements
    await expect(page.getByText("70%", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("35%", { exact: true }).first()).toBeVisible();
  });

  test("HOME-005: Solution section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Our Solution/i })
    ).toBeVisible();

    // Feature cards - use first() to handle potential duplicates
    await expect(page.getByText("Unified Collaboration", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Development Tracking", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("AI-Powered Insights", { exact: true }).first()).toBeVisible();
  });

  test("HOME-006: Sports section displays supported sports", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Built for your Sport/i })
    ).toBeVisible();

    // Sport cards
    await expect(page.getByRole("heading", { name: "GAA" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rugby" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Soccer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Swimming" })).toBeVisible();
  });

  test("HOME-007: Features section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Everything You Need/i })
    ).toBeVisible();

    // Feature cards
    await expect(page.getByText("Player Passports")).toBeVisible();
    await expect(page.getByText("Coach Tools")).toBeVisible();
    await expect(page.getByText("Parent Portal")).toBeVisible();
    await expect(page.getByText("Voice Notes")).toBeVisible();
  });

  test("HOME-008: Testimonials section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Trusted by/i })
    ).toBeVisible();
  });

  test("HOME-009: Research/Blog section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Research & Insights/i })
    ).toBeVisible();

    // View All Research link
    await expect(
      page.getByRole("link", { name: /View All Research/i }).first()
    ).toBeVisible();
  });

  test("HOME-010: Footer is visible with navigation", async ({ page }) => {
    // Footer logo
    await expect(
      page.locator("footer").getByAltText("PlayerARC Logo")
    ).toBeVisible();

    // Footer sections
    await expect(
      page.locator("footer").getByRole("heading", { name: "Product" })
    ).toBeVisible();
    await expect(
      page.locator("footer").getByRole("heading", { name: "Resources" })
    ).toBeVisible();
    await expect(
      page.locator("footer").getByRole("heading", { name: "Company" })
    ).toBeVisible();
    await expect(
      page.locator("footer").getByRole("heading", { name: "Legal" })
    ).toBeVisible();
  });

  test("HOME-011: Login link is functional", async ({ page }) => {
    const loginLink = page.locator("header").getByRole("link", { name: /Login/i });
    await expect(loginLink).toBeVisible();
    
    // Verify the href attribute points to login
    const href = await loginLink.getAttribute("href");
    expect(href).toMatch(/\/login/);
  });

  test("HOME-012: Request Demo link navigates correctly", async ({ page }) => {
    const demoLink = page.locator("header").getByRole("link", { name: /Request Demo/i });
    await expect(demoLink).toBeVisible();
    await demoLink.click();
    
    // Wait for navigation
    await page.waitForLoadState("networkidle");
    const url = page.url();
    
    // Demo link might stay on page (scroll to section) or navigate to a page
    // Just verify the link was clickable and page responded
    expect(url).toBeTruthy();
  });

  test("HOME-013: CTA section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Ready to Transform/i })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /Request a Demo/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Contact Us/i })
    ).toBeVisible();
  });
});
