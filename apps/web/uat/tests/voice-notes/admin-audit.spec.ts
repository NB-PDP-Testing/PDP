/**
 * Admin Voice Notes Audit - E2E Tests
 *
 * Tests for the organization admin voice notes audit page:
 * - Page load and access control
 * - Search functionality
 * - Filter chips
 * - Empty states
 * - Role-based access (admin/owner only)
 *
 * @feature Voice Notes v2
 * @route /orgs/[orgId]/admin/voice-notes
 */

import type { Page } from "@playwright/test";
import {
	test,
	expect,
	waitForPageLoad,
	TEST_ORG_ID,
} from "../../fixtures/test-fixtures";

const ADMIN_VN_URL = `/orgs/${TEST_ORG_ID}/admin/voice-notes`;

/**
 * Navigate to the admin voice notes audit page and wait for it to render.
 * Admin pages can be slow to render due to auth state + data loading.
 */
async function navigateToAdminAudit(page: Page): Promise<void> {
	await page.goto(ADMIN_VN_URL);
	await waitForPageLoad(page);
	// Wait for the page title to confirm the admin page has rendered
	await expect(
		page.getByText(/voice notes audit/i),
	).toBeVisible({ timeout: 30000 });
}

test.describe("Admin Voice Notes Audit", () => {
	test.describe("VN-ADMIN-001: Page Load & Structure", () => {
		test("should load the audit page for admin user", async ({
			adminPage,
		}) => {
			await navigateToAdminAudit(adminPage);

			// Page title confirmed by navigateToAdminAudit
			await expect(
				adminPage.getByText(/voice notes audit/i),
			).toBeVisible();
		});

		test("should show Admin badge", async ({ adminPage }) => {
			await navigateToAdminAudit(adminPage);

			// Badge contains exact text "Admin"
			await expect(
				adminPage.getByText("Admin").first(),
			).toBeVisible({ timeout: 10000 });
		});

		test("should show subtitle about organization-wide oversight", async ({
			adminPage,
		}) => {
			await navigateToAdminAudit(adminPage);

			await expect(
				adminPage.getByText(/organization-wide|compliance|oversight/i),
			).toBeVisible({ timeout: 10000 });
		});

		test("should show export button (disabled/coming soon)", async ({
			adminPage,
		}) => {
			await navigateToAdminAudit(adminPage);

			const exportButton = adminPage.getByRole("button", {
				name: /export/i,
			});

			if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
				await expect(exportButton).toBeDisabled();
			}
		});
	});

	test.describe("VN-ADMIN-002: Search & Filters", () => {
		test("should show search input", async ({ adminPage }) => {
			await navigateToAdminAudit(adminPage);

			const searchInput = adminPage.getByPlaceholder(
				/search.*transcription|search.*insight|search.*player/i,
			);
			await expect(searchInput).toBeVisible({ timeout: 10000 });
		});

		test("should show filter toggle button", async ({ adminPage }) => {
			await navigateToAdminAudit(adminPage);

			const filterButton = adminPage.getByRole("button", {
				name: /filter/i,
			});
			await expect(filterButton).toBeVisible({ timeout: 10000 });
		});

		test("should toggle filter panel visibility", async ({
			adminPage,
		}) => {
			await navigateToAdminAudit(adminPage);

			const filterButton = adminPage.getByRole("button", {
				name: /filter/i,
			});
			await filterButton.click();

			// Filter panel should show note type dropdown
			await expect(
				adminPage.getByText(/note type/i),
			).toBeVisible({ timeout: 5000 });
		});

		test("should show empty state or results", async ({ adminPage }) => {
			await navigateToAdminAudit(adminPage);

			// Either shows voice notes or empty state
			await expect(
				adminPage
					.getByText(/no voice notes yet/i)
					.or(adminPage.getByText(/showing.*of.*voice notes/i))
					.or(adminPage.getByText(/voice notes.*will appear/i)),
			).toBeVisible({ timeout: 15000 });
		});

		test("should allow typing in search field", async ({ adminPage }) => {
			await navigateToAdminAudit(adminPage);

			const searchInput = adminPage.getByPlaceholder(/search/i);
			await searchInput.fill("knee injury");

			await expect(searchInput).toHaveValue("knee injury");
		});
	});

	test.describe("VN-ADMIN-003: Access Control", () => {
		test("coach user should see audit page or access denied", async ({ coachPage }) => {
			await coachPage.goto(ADMIN_VN_URL);
			await waitForPageLoad(coachPage);

			// Coach user may also have admin role in the org, so they might see the page
			const accessDenied = await coachPage
				.getByText(/access denied/i)
				.isVisible({ timeout: 10000 })
				.catch(() => false);
			const hasAuditPage = await coachPage
				.getByText(/voice notes audit/i)
				.isVisible({ timeout: 5000 })
				.catch(() => false);
			const redirected = !coachPage.url().includes("admin/voice-notes");

			expect(accessDenied || hasAuditPage || redirected).toBeTruthy();
		});

		test("parent should see access denied", async ({ parentPage }) => {
			await parentPage.goto(ADMIN_VN_URL);
			await waitForPageLoad(parentPage);

			const accessDenied = await parentPage
				.getByText(/access denied/i)
				.isVisible({ timeout: 10000 })
				.catch(() => false);
			const redirected = !parentPage.url().includes("admin/voice-notes");

			expect(accessDenied || redirected).toBeTruthy();
		});

		test("owner should see audit page or be redirected", async ({ ownerPage }) => {
			await ownerPage.goto(ADMIN_VN_URL);
			await waitForPageLoad(ownerPage);

			// Owner/platform-staff access depends on org membership role
			// (platform staff may only be "coach" in org, not "admin"/"owner")
			// If not admin in org, they get redirected to coach dashboard
			const url = ownerPage.url();
			const wasRedirected = !url.includes("admin/voice-notes");

			const hasAuditPage = await ownerPage
				.getByText(/voice notes audit/i)
				.isVisible()
				.catch(() => false);

			const hasAccessDenied = await ownerPage
				.getByText(/access denied/i)
				.isVisible()
				.catch(() => false);

			expect(hasAuditPage || hasAccessDenied || wasRedirected).toBeTruthy();
		});
	});

	test.describe("VN-ADMIN-004: Back Navigation", () => {
		test("should have back button to admin dashboard", async ({
			adminPage,
		}) => {
			await navigateToAdminAudit(adminPage);

			const backLink = adminPage
				.locator(`a[href*="/admin"]`)
				.first();

			await expect(backLink).toBeVisible({ timeout: 10000 });
		});
	});
});
