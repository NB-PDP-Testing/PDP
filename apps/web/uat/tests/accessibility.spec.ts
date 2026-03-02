/**
 * WCAG 2.1 AA Accessibility Audit (Phase 9 — US-P9-007)
 *
 * Automated axe-core audit of key pages in PlayerARC.
 * - Critical and serious violations → test failure (blocking)
 * - Moderate and minor violations → console.warn (non-blocking)
 *
 * Test account: ownerPage (has both admin and player roles)
 * Run: npx playwright test accessibility.spec.ts
 *
 * Report written to: apps/web/uat/accessibility-report.md
 */

import { AxeBuilder } from "@axe-core/playwright";
import * as fs from "fs";
import * as path from "path";
import {
  TEST_ORG_ID,
  dismissBlockingDialogs,
  test,
  waitForPageLoad,
} from "../fixtures/test-fixtures";

// ============================================================
// TYPES
// ============================================================

interface ViolationEntry {
  page: string;
  id: string;
  description: string;
  impact: string;
  nodes: { target: string[] }[];
  tags: string[];
  helpUrl: string;
}

// ============================================================
// HELPERS
// ============================================================

async function auditPage(
  page: Parameters<Parameters<typeof test>[2]>[0]["ownerPage"],
  url: string,
  pageName: string,
  allViolations: ViolationEntry[]
): Promise<{ critical: number; serious: number; moderate: number; minor: number }> {
  await page.goto(url);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);

  // Additional wait for Convex real-time data to settle
  await page.waitForTimeout(2000);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  let critical = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;

  for (const violation of results.violations) {
    const impact = violation.impact ?? "unknown";

    // Count by impact
    if (impact === "critical") {
      critical += 1;
    } else if (impact === "serious") {
      serious += 1;
    } else if (impact === "moderate") {
      moderate += 1;
    } else {
      minor += 1;
    }

    // Collect for report
    allViolations.push({
      page: pageName,
      id: violation.id,
      description: violation.description,
      impact,
      nodes: violation.nodes.map((n) => ({ target: n.target.map(String) })),
      tags: violation.tags,
      helpUrl: violation.helpUrl,
    });

    // Log moderate/minor as warnings (non-blocking)
    if (impact === "moderate" || impact === "minor") {
      console.warn(
        `[axe:${impact}] ${pageName} — ${violation.id}: ${violation.description}`
      );
    }
  }

  return { critical, serious, moderate, minor };
}

function generateReport(violations: ViolationEntry[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [
    "# PlayerARC WCAG 2.1 AA Accessibility Audit Report",
    "",
    `Generated: ${now}`,
    "",
    "## Summary",
    "",
  ];

  const byCritical = violations.filter((v) => v.impact === "critical");
  const bySerious = violations.filter((v) => v.impact === "serious");
  const byModerate = violations.filter((v) => v.impact === "moderate");
  const byMinor = violations.filter((v) => v.impact === "minor");

  lines.push(`| Impact | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Critical | ${byCritical.length} |`);
  lines.push(`| Serious | ${bySerious.length} |`);
  lines.push(`| Moderate | ${byModerate.length} |`);
  lines.push(`| Minor | ${byMinor.length} |`);
  lines.push(`| **Total** | **${violations.length}** |`);
  lines.push("");

  if (violations.length === 0) {
    lines.push("✅ No violations found across all audited pages.");
    return lines.join("\n");
  }

  // Group by page
  const pages = [...new Set(violations.map((v) => v.page))];
  for (const page of pages) {
    const pageViolations = violations.filter((v) => v.page === page);
    lines.push(`## Page: ${page}`);
    lines.push("");

    for (const v of pageViolations) {
      lines.push(`### ${v.id} (${v.impact})`);
      lines.push("");
      lines.push(`**Description:** ${v.description}`);
      lines.push(`**Impact:** ${v.impact}`);
      lines.push(`**Tags:** ${v.tags.join(", ")}`);
      lines.push(`**Help:** ${v.helpUrl}`);
      lines.push("");
      lines.push("**Affected elements:**");
      for (const node of v.nodes.slice(0, 5)) {
        lines.push(`- \`${node.target.join(" > ")}\``);
      }
      if (v.nodes.length > 5) {
        lines.push(`- … and ${v.nodes.length - 5} more`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================
// AUDIT TESTS
// ============================================================

test.describe("WCAG 2.1 AA Accessibility Audit", () => {
  const allViolations: ViolationEntry[] = [];

  const PAGES = [
    {
      name: "Player Portal — Home",
      url: `/orgs/${TEST_ORG_ID}/player`,
    },
    {
      name: "Player Portal — Settings",
      url: `/orgs/${TEST_ORG_ID}/player/settings`,
    },
    {
      name: "Player Portal — Health Checks",
      url: `/orgs/${TEST_ORG_ID}/player/health-check`,
    },
    {
      name: "Admin Dashboard",
      url: `/orgs/${TEST_ORG_ID}/admin`,
    },
    {
      name: "Admin Players Roster",
      url: `/orgs/${TEST_ORG_ID}/admin/players`,
    },
  ];

  for (const { name, url } of PAGES) {
    test(`No critical/serious WCAG 2.1 AA violations — ${name}`, async ({
      ownerPage,
    }) => {
      const counts = await auditPage(ownerPage, url, name, allViolations);

      // Log counts for context
      console.log(
        `[axe] ${name}: critical=${counts.critical} serious=${counts.serious} moderate=${counts.moderate} minor=${counts.minor}`
      );

      // Fail on critical or serious violations
      if (counts.critical > 0 || counts.serious > 0) {
        const failingViolations = allViolations
          .filter(
            (v) =>
              v.page === name &&
              (v.impact === "critical" || v.impact === "serious")
          )
          .map(
            (v) =>
              `  [${v.impact}] ${v.id}: ${v.description} — ${v.helpUrl}`
          )
          .join("\n");

        throw new Error(
          `WCAG violations on "${name}" — ${counts.critical} critical, ${counts.serious} serious:\n${failingViolations}`
        );
      }
    });
  }

  test.afterAll(async () => {
    // Write the full report after all tests complete
    const report = generateReport(allViolations);
    const reportPath = path.join(__dirname, "../accessibility-report.md");
    fs.writeFileSync(reportPath, report, "utf-8");
    console.log(`[axe] Accessibility report written to: ${reportPath}`);
  });
});
