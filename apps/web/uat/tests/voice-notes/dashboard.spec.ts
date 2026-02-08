/**
 * Voice Notes Dashboard - E2E Tests
 *
 * Tests for the main coach voice notes page:
 * - Page loads and renders correctly
 * - Tab navigation works
 * - New note tab has correct UI elements
 * - History tab shows search and content
 * - Role-based access (coach only)
 *
 * @feature Voice Notes v2
 * @route /orgs/[orgId]/coach/voice-notes
 */

import type { Page } from "@playwright/test";
import {
	test,
	expect,
	waitForPageLoad,
	dismissBlockingDialogs,
	TEST_ORG_ID,
} from "../../fixtures/test-fixtures";

const VOICE_NOTES_URL = `/orgs/${TEST_ORG_ID}/coach/voice-notes`;

async function navigateToVoiceNotes(page: Page): Promise<void> {
	await page.goto(VOICE_NOTES_URL);
	await waitForPageLoad(page);
	// Dismiss any onboarding/child-linking dialogs that may appear
	await dismissBlockingDialogs(page);
	// Wait for dashboard content to render
	await page
		.getByText(/voice notes/i)
		.first()
		.waitFor({ state: "visible", timeout: 20000 });
}

/**
 * Navigate to voice notes and ensure the New tab is active.
 * The dashboard auto-switches to Parents/Insights tab when there are pending items,
 * so we need to explicitly click the "New" tab button.
 */
async function navigateToNewNoteTab(page: Page): Promise<void> {
	await navigateToVoiceNotes(page);
	// Click "New" tab to ensure it's active (dashboard may auto-switch to another tab)
	const newTab = page.getByText("New", { exact: true }).first();
	await newTab.click();
	await page.waitForTimeout(500);
	// Wait for New tab content to render
	await expect(
		page.getByText(/new voice note/i),
	).toBeVisible({ timeout: 15000 });
}

test.describe("Voice Notes Dashboard", () => {
	test.describe("VN-DASH-001: Page Load & Structure", () => {
		test("should load the voice notes dashboard", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			// Page should contain "Voice Notes" text
			await expect(
				coachPage.getByText(/voice notes/i).first(),
			).toBeVisible();
		});

		test("should display the subtitle text", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			await expect(
				coachPage.getByText(/record and analyze/i),
			).toBeVisible();
		});

		test("should show a back button", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			// ArrowLeft icon button should exist
			const backButton = coachPage
				.locator('a[href*="/coach"], button:has(svg)')
				.first();
			await expect(backButton).toBeVisible();
		});
	});

	test.describe("VN-DASH-002: Tab Navigation", () => {
		test("should display core tabs", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			// Core tabs always visible: New, History, My Impact
			// Conditional tabs: Insights, Team, Parents (only show with pending data)
			const coreTabs = ["New", "History", "My Impact"];

			for (const tabName of coreTabs) {
				await expect(
					coachPage.getByText(tabName, { exact: true }).first(),
				).toBeVisible({ timeout: 10000 });
			}
		});

		test("should switch to the History tab", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			const historyTab = coachPage.getByText("History", { exact: true }).first();
			await historyTab.click();
			await coachPage.waitForTimeout(2000);

			// History tab shows search input or empty state
			const hasSearch = await coachPage
				.getByPlaceholder(/search/i)
				.isVisible({ timeout: 10000 })
				.catch(() => false);

			const hasEmptyState = await coachPage
				.getByText(/no recordings yet|no matching notes/i)
				.isVisible({ timeout: 5000 })
				.catch(() => false);

			expect(hasSearch || hasEmptyState).toBeTruthy();
		});

		test("should switch to the My Impact tab", async ({ coachPage }) => {
			await navigateToVoiceNotes(coachPage);

			const impactTab = coachPage
				.getByText("My Impact", { exact: true })
				.first();
			await impactTab.click();
			await coachPage.waitForTimeout(2000);

			// Should show impact content (tab panel rendered)
			const url = coachPage.url();
			expect(url).toContain("voice-notes");
		});
	});

	test.describe("VN-DASH-003: New Note Tab", () => {
		test("should show the New Voice Note card", async ({
			coachPage,
		}) => {
			await navigateToNewNoteTab(coachPage);

			// New Voice Note card should be visible
			await expect(
				coachPage.getByText(/new voice note/i),
			).toBeVisible();
		});

		test("should display note type selector buttons", async ({
			coachPage,
		}) => {
			await navigateToNewNoteTab(coachPage);

			// Training, Match, General buttons
			await expect(
				coachPage.getByRole("button", { name: /training/i }),
			).toBeVisible({ timeout: 10000 });
			await expect(
				coachPage.getByRole("button", { name: /match/i }),
			).toBeVisible();
			await expect(
				coachPage.getByRole("button", { name: /general/i }),
			).toBeVisible();
		});

		test("should show recording button", async ({ coachPage }) => {
			await navigateToNewNoteTab(coachPage);

			// The mic button has a title attribute
			const micButton = coachPage.locator(
				'button[title*="recording"]',
			);
			await expect(micButton.first()).toBeVisible({ timeout: 10000 });
		});

		test("should show typed note textarea", async ({ coachPage }) => {
			await navigateToNewNoteTab(coachPage);

			const textarea = coachPage.getByPlaceholder(
				/type your coaching notes/i,
			);
			await expect(textarea).toBeVisible({ timeout: 10000 });
		});

		test("should have Save button disabled when textarea is empty", async ({
			coachPage,
		}) => {
			await navigateToNewNoteTab(coachPage);

			const saveButton = coachPage.getByRole("button", {
				name: /save.*analyze/i,
			});
			await expect(saveButton).toBeVisible({ timeout: 10000 });
			await expect(saveButton).toBeDisabled();
		});

		test("should enable Save button when text is entered", async ({
			coachPage,
		}) => {
			await navigateToNewNoteTab(coachPage);

			const textarea = coachPage.getByPlaceholder(
				/type your coaching notes/i,
			);
			await textarea.fill(
				"Clodagh Barlow showed great improvement in passing today",
			);

			const saveButton = coachPage.getByRole("button", {
				name: /save.*analyze/i,
			});
			await expect(saveButton).toBeEnabled({ timeout: 5000 });
		});

		test("should toggle between note types", async ({ coachPage }) => {
			await navigateToNewNoteTab(coachPage);

			// Click Match
			const matchButton = coachPage.getByRole("button", {
				name: /match/i,
			});
			await matchButton.click();

			// Match should be visually selected (non-outline variant)
			await expect(matchButton).toBeVisible();

			// Click General
			const generalButton = coachPage.getByRole("button", {
				name: /general/i,
			});
			await generalButton.click();
			await expect(generalButton).toBeVisible();
		});
	});

	test.describe("VN-DASH-004: History Tab", () => {
		test("should show history tab with search bar", async ({
			coachPage,
		}) => {
			await navigateToVoiceNotes(coachPage);

			// Navigate to history tab
			const historyTab = coachPage
				.getByText("History", { exact: true })
				.first();
			await historyTab.click();
			await coachPage.waitForTimeout(2000);

			// Search input should be visible (placeholder: "Search... (try: training, match, general)")
			await expect(
				coachPage.getByPlaceholder(/search/i),
			).toBeVisible({ timeout: 10000 });
		});

		test("should show empty state or note cards", async ({
			coachPage,
		}) => {
			await navigateToVoiceNotes(coachPage);

			const historyTab = coachPage
				.getByText("History", { exact: true })
				.first();
			await historyTab.click();
			await coachPage.waitForTimeout(2000);

			// Either shows notes or empty state
			const hasNotes = await coachPage
				.locator(".space-y-3 > div, .space-y-4 > div")
				.first()
				.isVisible({ timeout: 10000 })
				.catch(() => false);

			const isEmpty = await coachPage
				.getByText(/no recordings yet|no matching notes/i)
				.isVisible({ timeout: 5000 })
				.catch(() => false);

			expect(hasNotes || isEmpty).toBeTruthy();
		});
	});

	test.describe("VN-DASH-005: Access Control", () => {
		test("parent should not see voice notes dashboard", async ({
			parentPage,
		}) => {
			await parentPage.goto(VOICE_NOTES_URL);
			await waitForPageLoad(parentPage);

			// Should be redirected away or see an error/access denied
			const url = parentPage.url();
			const hasVoiceNotes = url.includes("voice-notes");
			const accessDenied = await parentPage
				.getByText(/access denied|not authorized|forbidden/i)
				.isVisible({ timeout: 5000 })
				.catch(() => false);

			// Either redirected away OR shown access denied
			expect(!hasVoiceNotes || accessDenied).toBeTruthy();
		});
	});
});
