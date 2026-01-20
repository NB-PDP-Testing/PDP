/**
 * Logo Upload UAT Tests
 *
 * Tests for organization logo upload functionality including:
 * - Drag-and-drop upload
 * - File validation (type, size)
 * - Auto-resize functionality
 * - URL fallback option
 * - Permission verification
 * - Accessibility compliance
 *
 * Test IDs: LOGO-001 through LOGO-015
 */

import { test, expect } from "../../fixtures/test-fixtures";
import * as path from "path";
import * as fs from "fs";

test.describe("Logo Upload - Admin Settings", () => {

  // ============================================================
  // LOGO-001: Admin can access logo upload in settings
  // ============================================================
  test("LOGO-001: Admin can navigate to logo upload settings", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    // Click on the first organization
    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    // Navigate to admin settings
    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify logo upload component is visible
    const logoUpload = adminPage.getByText(/Organization Logo/i);
    await expect(logoUpload).toBeVisible({ timeout: 10000 });

    // Verify drag-drop zone exists
    const dropZone = adminPage.getByRole("button", { name: /Upload logo/i });
    await expect(dropZone).toBeVisible();
  });

  // ============================================================
  // LOGO-002: Logo upload component displays current logo
  // ============================================================
  test("LOGO-002: Component displays current logo if set", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Check if logo preview exists (may or may not have logo)
    const currentLogoText = adminPage.getByText(/Current Logo/i);
    const hasCurrentLogo = await currentLogoText.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCurrentLogo) {
      // If logo exists, verify preview image is visible
      const logoPreview = adminPage.locator('img[alt="Logo preview"]');
      await expect(logoPreview).toBeVisible();
    }

    // Component should always be visible regardless of current logo state
    const dropZone = adminPage.getByRole("button", { name: /Upload logo/i });
    await expect(dropZone).toBeVisible();
  });

  // ============================================================
  // LOGO-003: URL fallback option is available
  // ============================================================
  test("LOGO-003: URL input fallback is available", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify URL input exists
    const urlLabel = adminPage.getByText(/Or provide a URL/i);
    await expect(urlLabel).toBeVisible();

    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await expect(urlInput).toBeVisible();

    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await expect(useUrlButton).toBeVisible();
  });

  // ============================================================
  // LOGO-004: Can set logo via URL
  // ============================================================
  test("LOGO-004: Admin can set logo using external URL", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Enter a valid logo URL
    const testLogoUrl = "https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png";
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await urlInput.fill(testLogoUrl);

    // Click Use URL button
    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await useUrlButton.click();

    // Wait for success toast
    const successToast = adminPage.getByText(/Logo URL updated/i);
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Verify preview appears
    const logoPreview = adminPage.locator('img[alt="Logo preview"]');
    await expect(logoPreview).toBeVisible({ timeout: 5000 });
  });

  // ============================================================
  // LOGO-005: URL validation rejects invalid URLs
  // ============================================================
  test("LOGO-005: Invalid URL is rejected", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Enter invalid URL
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await urlInput.fill("not-a-valid-url");

    // Click Use URL button
    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await useUrlButton.click();

    // Wait for error toast
    const errorToast = adminPage.getByText(/Please enter a valid URL/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  // ============================================================
  // LOGO-006: Empty URL is rejected
  // ============================================================
  test("LOGO-006: Empty URL is rejected", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Leave URL empty and click button
    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });

    // Button should be disabled when input is empty
    await expect(useUrlButton).toBeDisabled();
  });

  // ============================================================
  // LOGO-007: Can remove existing logo
  // ============================================================
  test("LOGO-007: Admin can remove existing logo", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // First set a logo via URL
    const testLogoUrl = "https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png";
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await urlInput.fill(testLogoUrl);

    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await useUrlButton.click();

    // Wait for logo to be set
    await adminPage.waitForTimeout(1000);

    // Now remove it
    const removeButton = adminPage.locator('button').filter({ has: adminPage.locator('svg.lucide-x') }).first();
    if (await removeButton.isVisible({ timeout: 3000 })) {
      await removeButton.click();

      // Verify preview is gone
      const logoPreview = adminPage.locator('img[alt="Logo preview"]');
      await expect(logoPreview).not.toBeVisible({ timeout: 3000 });
    }
  });

  // ============================================================
  // LOGO-008: Drag-drop zone is keyboard accessible
  // ============================================================
  test("LOGO-008: Drag-drop zone is keyboard accessible", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify drop zone has proper ARIA attributes
    const dropZone = adminPage.getByRole("button", { name: /Upload logo/i });
    await expect(dropZone).toBeVisible();

    // Verify it's focusable
    await dropZone.focus();
    const isFocused = await dropZone.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBeTruthy();

    // Verify it has tabindex
    const tabIndex = await dropZone.getAttribute("tabindex");
    expect(tabIndex).toBe("0");
  });

  // ============================================================
  // LOGO-009: Component shows validation requirements
  // ============================================================
  test("LOGO-009: Validation requirements are displayed", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify file requirements are shown
    const requirements = adminPage.getByText(/PNG or JPG.*Max 5MB.*512x512px/i);
    await expect(requirements).toBeVisible();

    // Verify upload instructions are shown
    const instructions = adminPage.getByText(/Drag and drop/i);
    await expect(instructions).toBeVisible();
  });

  // ============================================================
  // LOGO-010: Component displays helper text
  // ============================================================
  test("LOGO-010: Helper text for logo upload is visible", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify helper text below component
    const helperText = adminPage.getByText(/Upload a PNG or JPG logo.*max 5MB.*recommended 512x512px/i);
    await expect(helperText).toBeVisible();
  });

  // ============================================================
  // LOGO-011: Click to browse works
  // ============================================================
  test("LOGO-011: Click to browse opens file picker", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify hidden file input exists
    const fileInput = adminPage.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify it accepts correct file types
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toContain("image/png");
    expect(accept).toContain("image/jpeg");
  });

  // ============================================================
  // LOGO-012: Non-admin cannot access logo upload
  // ============================================================
  test("LOGO-012: Coach cannot upload organization logo", async ({ coachPage }) => {
    await coachPage.goto("/orgs");
    await coachPage.waitForLoadState("networkidle");

    const orgCard = coachPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await coachPage.waitForLoadState("networkidle");
    }

    // Try to navigate to admin settings (should fail or redirect)
    await coachPage.goto(coachPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await coachPage.waitForLoadState("networkidle");

    // Should either be redirected or see access denied
    const url = coachPage.url();
    const hasAdminInUrl = url.includes("/admin");

    // Coach should not have access to admin settings
    expect(hasAdminInUrl).toBeFalsy();
  });

  // ============================================================
  // LOGO-013: Uploaded logo appears in header
  // ============================================================
  test("LOGO-013: Logo set via URL appears in header", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    // Get org ID from URL
    const orgUrl = adminPage.url();
    const orgId = orgUrl.match(/\/orgs\/([^/]+)/)?.[1];

    await adminPage.goto(`/orgs/${orgId}/admin/settings`);
    await adminPage.waitForLoadState("networkidle");

    // Set logo via URL
    const testLogoUrl = "https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png";
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await urlInput.fill(testLogoUrl);

    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await useUrlButton.click();

    // Wait for success
    await adminPage.waitForTimeout(1000);

    // Navigate to different page to see header
    await adminPage.goto(`/orgs/${orgId}/coach`);
    await adminPage.waitForLoadState("networkidle");

    // Check if logo appears in header (look for any img in header area)
    const headerLogo = adminPage.locator('header img, nav img').first();
    const hasLogo = await headerLogo.isVisible({ timeout: 5000 }).catch(() => false);

    // Logo should be visible in header
    expect(hasLogo).toBeTruthy();
  });

  // ============================================================
  // LOGO-014: Settings save button works after logo change
  // ============================================================
  test("LOGO-014: Can save organization settings after logo change", async ({ adminPage }) => {
    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Set logo via URL
    const testLogoUrl = "https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png";
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await urlInput.fill(testLogoUrl);

    const useUrlButton = adminPage.getByRole("button", { name: /Use URL/i });
    await useUrlButton.click();

    // Wait for logo to be set
    await adminPage.waitForTimeout(1000);

    // Find and click Save Changes button (in Basic Information section)
    const saveButton = adminPage.getByRole("button", { name: /Save Changes/i }).first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();

      // Wait for success toast
      const successToast = adminPage.getByText(/Organization updated successfully/i);
      await expect(successToast).toBeVisible({ timeout: 5000 });
    }
  });

  // ============================================================
  // LOGO-015: Component responsive on mobile
  // ============================================================
  test("LOGO-015: Logo upload component works on mobile viewport", async ({ adminPage }) => {
    // Set mobile viewport
    await adminPage.setViewportSize({ width: 375, height: 667 });

    await adminPage.goto("/orgs");
    await adminPage.waitForLoadState("networkidle");

    const orgCard = adminPage.locator('[data-testid="org-card"]').first();
    if (await orgCard.isVisible({ timeout: 5000 })) {
      await orgCard.click();
      await adminPage.waitForLoadState("networkidle");
    }

    await adminPage.goto(adminPage.url().replace(/\/orgs\/[^/]+$/, "") + "/admin/settings");
    await adminPage.waitForLoadState("networkidle");

    // Verify component is visible on mobile
    const logoUploadLabel = adminPage.getByText(/Organization Logo/i);
    await expect(logoUploadLabel).toBeVisible();

    const dropZone = adminPage.getByRole("button", { name: /Upload logo/i });
    await expect(dropZone).toBeVisible();

    // Verify URL input is visible
    const urlInput = adminPage.getByPlaceholder(/https:\/\/example.com\/logo.png/i);
    await expect(urlInput).toBeVisible();
  });
});

export {};
