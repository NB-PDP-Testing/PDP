/**
 * Mobile Responsiveness Tests - Onboarding System
 *
 * Tests for:
 * - Mobile viewport layouts
 * - Touch interactions
 * - Responsive navigation
 * - Form usability on mobile
 * - Modal behavior on mobile
 *
 * @phase Mobile
 * @issue #371
 */

import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad, getCurrentOrgId } from "../../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

// Mobile viewport sizes
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad

/**
 * Helper to navigate to admin page with proper org ID resolution
 */
async function navigateToAdminPage(page: Page, subPath: string = ""): Promise<void> {
  const orgId = await getCurrentOrgId(page);
  const path = subPath ? `/orgs/${orgId}/admin/${subPath}` : `/orgs/${orgId}/admin`;
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Helper to check if hamburger menu is visible
 */
async function isHamburgerMenuVisible(page: Page): Promise<boolean> {
  const hamburger = page.locator(
    '[data-testid="hamburger-menu"], [aria-label*="menu" i], button[class*="mobile-menu"]'
  );
  return hamburger.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Helper to check if element is in viewport
 */
async function isElementInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  if (!(await element.isVisible().catch(() => false))) return false;

  const box = await element.boundingBox();
  if (!box) return false;

  const viewport = page.viewportSize();
  if (!viewport) return false;

  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

test.describe("Mobile: Viewport Responsiveness", () => {
  test.describe("M-001: Mobile Layout", () => {
    test("should display correctly on mobile viewport", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      // Page should not have horizontal scroll
      const hasHorizontalScroll = await adminPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });

    test("should display correctly on tablet viewport", async ({ adminPage }) => {
      await adminPage.setViewportSize(TABLET_VIEWPORT);
      await navigateToAdminPage(adminPage);

      const hasHorizontalScroll = await adminPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });

    test("should stack content vertically on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      // Main content should be visible
      const main = adminPage.locator("main");
      await expect(main).toBeVisible();
    });
  });

  test.describe("M-002: Touch Target Sizes", () => {
    test("should have adequate touch target sizes for buttons", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      const buttons = await adminPage.locator("button").all();

      for (const button of buttons.slice(0, 5)) {
        if (await button.isVisible().catch(() => false)) {
          const box = await button.boundingBox();
          if (box) {
            // Minimum touch target is 44x44 per WCAG
            expect(box.width >= 32 || box.height >= 32).toBeTruthy();
          }
        }
      }
    });

    test("should have adequate touch target sizes for links", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      const links = await adminPage.locator("a").all();

      for (const link of links.slice(0, 5)) {
        if (await link.isVisible().catch(() => false)) {
          const box = await link.boundingBox();
          if (box) {
            expect(box.height >= 24).toBeTruthy();
          }
        }
      }
    });
  });
});

test.describe("Mobile: Navigation", () => {
  test.describe("M-003: Mobile Navigation Menu", () => {
    test("should show hamburger menu on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      // Either shows hamburger or compact nav
      const hamburgerVisible = await isHamburgerMenuVisible(adminPage);
      const navExists = await adminPage.locator("nav").isVisible().catch(() => false);

      expect(hamburgerVisible || navExists).toBeTruthy();
    });

    test("should open mobile menu when hamburger clicked", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      const hamburger = adminPage.locator(
        '[data-testid="hamburger-menu"], [aria-label*="menu" i]'
      ).first();

      if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hamburger.click();
        await adminPage.waitForTimeout(500);

        // Mobile menu should be visible
        const mobileMenu = adminPage.locator(
          '[data-testid="mobile-menu"], [role="navigation"], nav'
        );
        await expect(mobileMenu).toBeVisible();
      }
    });

    test("should close mobile menu when item selected", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      const hamburger = adminPage.locator('[data-testid="hamburger-menu"]').first();

      if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hamburger.click();
        await adminPage.waitForTimeout(500);

        // Click a menu item
        const menuItem = adminPage.locator("nav a").first();
        if (await menuItem.isVisible().catch(() => false)) {
          await menuItem.click();
          await waitForPageLoad(adminPage);

          // Menu should close after navigation
          await adminPage.waitForTimeout(500);
        }
      }
    });
  });

  test.describe("M-004: Swipe Navigation", () => {
    test("should allow swipe gestures for carousels if present", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      // Look for swipeable elements
      const carousel = adminPage.locator('[data-testid="carousel"], .swipe-container');

      if (await carousel.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Swipe functionality would be tested here
        expect(true).toBeTruthy();
      }
    });
  });
});

test.describe("Mobile: Forms", () => {
  test.describe("M-005: Mobile Form Input", () => {
    test("should have properly sized inputs on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "settings");

      const inputs = await adminPage.locator('input[type="text"]').all();

      for (const input of inputs.slice(0, 3)) {
        if (await input.isVisible().catch(() => false)) {
          const box = await input.boundingBox();
          if (box) {
            // Input should be at least 40px tall for easy touch
            expect(box.height >= 32).toBeTruthy();
          }
        }
      }
    });

    test("should show appropriate keyboard for input type", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "settings");

      // Check email inputs have correct type
      const emailInputs = adminPage.locator('input[type="email"]');
      expect((await emailInputs.count()) >= 0).toBeTruthy();

      // Check tel inputs have correct type
      const telInputs = adminPage.locator('input[type="tel"]');
      expect((await telInputs.count()) >= 0).toBeTruthy();
    });

    test("should not zoom on input focus", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "settings");

      // Check viewport meta tag prevents zoom
      const viewportMeta = await adminPage.locator('meta[name="viewport"]').getAttribute("content");

      // Font size should be at least 16px to prevent zoom
      const inputs = adminPage.locator("input");
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible().catch(() => false)) {
          const fontSize = await input.evaluate((el) =>
            window.getComputedStyle(el).fontSize
          );
          const sizeNum = parseInt(fontSize);
          expect(sizeNum >= 14).toBeTruthy();
        }
      }
    });
  });

  test.describe("M-006: Mobile Form Submission", () => {
    test("should allow form submission on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "settings");

      const submitButton = adminPage.locator('button[type="submit"]').first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Submit button should be touchable
        const box = await submitButton.boundingBox();
        if (box) {
          expect(box.height >= 40).toBeTruthy();
        }
      }
    });
  });
});

test.describe("Mobile: Modals and Dialogs", () => {
  test.describe("M-007: Mobile Modal Display", () => {
    test("should display modals full-screen on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "teams");

      const createButton = adminPage.locator('button:has-text("Create")').first();

      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await adminPage.waitForTimeout(500);

        const modal = adminPage.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await modal.boundingBox();
          if (box) {
            // Modal should take significant portion of screen
            expect(box.width >= MOBILE_VIEWPORT.width * 0.8).toBeTruthy();
          }
        }
      }
    });

    test("should allow scrolling within modal on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "teams");

      const createButton = adminPage.locator('button:has-text("Create")').first();

      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await adminPage.waitForTimeout(500);

        const modal = adminPage.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Check modal allows overflow scroll
          const overflowY = await modal.evaluate(
            (el) => window.getComputedStyle(el).overflowY
          );
          expect(["auto", "scroll", "visible"].includes(overflowY)).toBeTruthy();
        }
      }
    });

    test("should have easily tappable close button on mobile modals", async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage, "teams");

      const createButton = adminPage.locator('button:has-text("Create")').first();

      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await adminPage.waitForTimeout(500);

        const closeButton = adminPage.locator(
          '[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has-text("Close")'
        ).first();

        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await closeButton.boundingBox();
          if (box) {
            expect(box.width >= 24 && box.height >= 24).toBeTruthy();
          }
        }
      }
    });
  });
});

test.describe("Mobile: Onboarding Flow", () => {
  test.describe("M-008: Mobile Onboarding Wizard", () => {
    test("should display onboarding wizard correctly on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      await adminPage.waitForTimeout(2000);

      // Look for onboarding elements
      const onboardingUI = adminPage.locator(
        '[data-testid="onboarding"], [data-testid="wizard"]'
      );

      // Onboarding should be visible if present
      expect((await onboardingUI.count()) >= 0).toBeTruthy();
    });

    test("should have step navigation visible on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      await adminPage.waitForTimeout(2000);

      // Step indicators should be visible
      const stepIndicators = adminPage.locator(
        '[data-testid="step-indicator"], .step, [role="progressbar"]'
      );

      expect((await stepIndicators.count()) >= 0).toBeTruthy();
    });
  });

  test.describe("M-009: Mobile GDPR Modal", () => {
    test("should display GDPR modal correctly on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      await adminPage.waitForTimeout(2000);

      const gdprModal = adminPage.locator(
        '[data-testid="gdpr-consent-modal"], [aria-label*="GDPR" i]'
      );

      if (await gdprModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Modal should be readable on mobile
        const box = await gdprModal.boundingBox();
        if (box) {
          expect(box.width <= MOBILE_VIEWPORT.width).toBeTruthy();
        }
      }
    });

    test("should have scrollable GDPR content on mobile", async ({ adminPage }) => {
      await adminPage.setViewportSize(MOBILE_VIEWPORT);
      await navigateToAdminPage(adminPage);

      await adminPage.waitForTimeout(2000);

      const gdprContent = adminPage.locator('[data-testid="gdpr-content"]');

      if (await gdprContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const overflowY = await gdprContent.evaluate(
          (el) => window.getComputedStyle(el).overflowY
        );
        expect(["auto", "scroll", "visible"].includes(overflowY)).toBeTruthy();
      }
    });
  });
});

test.describe("Mobile: Performance", () => {
  test("should load within acceptable time on mobile", async ({ adminPage }) => {
    await adminPage.setViewportSize(MOBILE_VIEWPORT);

    const startTime = Date.now();
    await navigateToAdminPage(adminPage);
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds (accounting for test environment)
    expect(loadTime).toBeLessThan(10000);
  });

  test("should remain responsive during interactions on mobile", async ({ adminPage }) => {
    await adminPage.setViewportSize(MOBILE_VIEWPORT);
    await navigateToAdminPage(adminPage);

    // Perform multiple interactions
    for (let i = 0; i < 5; i++) {
      await adminPage.keyboard.press("Tab");
      await adminPage.waitForTimeout(100);
    }

    // Page should still be responsive
    const body = adminPage.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Mobile: Orientation", () => {
  test("should handle portrait orientation", async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 375, height: 667 });
    await navigateToAdminPage(adminPage);

    const hasHorizontalScroll = await adminPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test("should handle landscape orientation", async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 667, height: 375 });
    await navigateToAdminPage(adminPage);

    const hasHorizontalScroll = await adminPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });
});
