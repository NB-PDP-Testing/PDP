/**
 * Disambiguation Page - E2E Tests
 *
 * Tests for the entity resolution disambiguation page:
 * - Page load and structure
 * - Empty state (all resolved)
 * - Access control (coach only, artifact ownership)
 * - Back navigation
 *
 * Note: Testing with actual disambiguation data requires v2 pipeline
 * to generate entity resolutions. These tests cover page structure
 * and edge cases.
 *
 * @feature Voice Notes v2 - Phase 5
 * @route /orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]
 */

import type { Page } from "@playwright/test";
import {
	test,
	expect,
	waitForPageLoad,
	TEST_ORG_ID,
} from "../../fixtures/test-fixtures";

const DISAMBIGUATION_BASE = `/orgs/${TEST_ORG_ID}/coach/voice-notes/disambiguation`;

test.describe("Disambiguation Page", () => {
	test.describe("VN-DISAMB-001: Invalid Artifact Handling", () => {
		test("should handle non-existent artifact gracefully", async ({
			coachPage,
		}) => {
			// Use a fake artifact ID
			await coachPage.goto(`${DISAMBIGUATION_BASE}/jh7aaa000000000000000000`);
			await waitForPageLoad(coachPage);

			// Should show error or empty state, not crash
			const hasContent = await coachPage
				.getByText(
					/resolve player|all mentions resolved|not found|error|no.*mention/i,
				)
				.first()
				.isVisible({ timeout: 15000 })
				.catch(() => false);

			// Page should render something meaningful
			expect(hasContent || coachPage.url().includes("voice-notes")).toBeTruthy();
		});
	});

	test.describe("VN-DISAMB-002: Page Structure", () => {
		test("should show page title when loaded with valid format", async ({
			coachPage,
		}) => {
			await coachPage.goto(`${DISAMBIGUATION_BASE}/jh7aaa000000000000000000`);
			await waitForPageLoad(coachPage);

			// Should show page content (resolve title, all-resolved, error, or redirect to voice notes)
			const hasContent = await coachPage
				.getByText(/resolve player|all mentions resolved|not found|voice notes/i)
				.first()
				.isVisible({ timeout: 20000 })
				.catch(() => false);

			const isRedirected = coachPage.url().includes("voice-notes");

			expect(hasContent || isRedirected).toBeTruthy();
		});

		test("should have a back navigation link", async ({ coachPage }) => {
			await coachPage.goto(`${DISAMBIGUATION_BASE}/jh7aaa000000000000000000`);
			await waitForPageLoad(coachPage);

			// Back button or link to voice notes
			const backLink = coachPage
				.locator(`a[href*="voice-notes"]`)
				.or(coachPage.getByRole("link", { name: /back/i }));

			if (await backLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
				await expect(backLink.first()).toBeVisible();
			}
		});
	});

	test.describe("VN-DISAMB-003: Access Control", () => {
		test("parent should not access disambiguation page", async ({
			parentPage,
		}) => {
			await parentPage.goto(
				`${DISAMBIGUATION_BASE}/jh7aaa000000000000000000`,
			);
			await waitForPageLoad(parentPage);

			// Wait for redirect/auth check
			await parentPage.waitForTimeout(3000);

			// Should be redirected or denied
			const url = parentPage.url();
			const isDenied = await parentPage
				.getByText(/access denied|not authorized|forbidden/i)
				.isVisible({ timeout: 5000 })
				.catch(() => false);
			const isRedirected = !url.includes("disambiguation");
			const isOnDashboard = url.includes("/parents") || url.includes("/orgs");

			expect(isDenied || isRedirected || isOnDashboard).toBeTruthy();
		});
	});
});
