#!/usr/bin/env node

/**
 * Script to export skills data from Convex dev instance
 *
 * Usage:
 *   npx tsx scripts/export-skills-data.ts
 *
 * This script exports:
 * - All skillCategories
 * - All skillDefinitions
 * - Complete structured skills data (grouped by sport)
 *
 * Output files are saved to packages/backend/data-exports/
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Convex URL from environment or use default dev URL
const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  "https://valuable-pig-963.convex.cloud";

const OUTPUT_DIR = join(__dirname, "..", "data-exports");

async function main() {
  console.log("🔍 Connecting to Convex...");
  console.log(`   URL: ${CONVEX_URL}`);

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Create output directory if it doesn't exist
    await mkdir(OUTPUT_DIR, { recursive: true });

    console.log("\n📥 Exporting skill categories...");
    const categories = await client.query(
      api.models.referenceData.exportAllSkillCategories,
      {}
    );
    console.log(`   ✅ Exported ${categories.length} skill categories`);

    console.log("\n📥 Exporting skill definitions...");
    const definitions = await client.query(
      api.models.referenceData.exportAllSkillDefinitions,
      {}
    );
    console.log(`   ✅ Exported ${definitions.length} skill definitions`);

    console.log("\n📥 Exporting complete structured skills data...");
    const completeData = await client.query(
      api.models.referenceData.exportCompleteSkillsData,
      {}
    );
    console.log(`   ✅ Exported data for ${completeData.sports.length} sports`);

    // Generate timestamp for filenames
    const _timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const dateStr = new Date().toISOString().split("T")[0];

    // Save individual exports
    const categoriesFile = join(OUTPUT_DIR, `skill-categories-${dateStr}.json`);
    await writeFile(
      categoriesFile,
      JSON.stringify(categories, null, 2),
      "utf-8"
    );
    console.log(`\n💾 Saved categories to: ${categoriesFile}`);

    const definitionsFile = join(
      OUTPUT_DIR,
      `skill-definitions-${dateStr}.json`
    );
    await writeFile(
      definitionsFile,
      JSON.stringify(definitions, null, 2),
      "utf-8"
    );
    console.log(`💾 Saved definitions to: ${definitionsFile}`);

    const completeFile = join(OUTPUT_DIR, `skills-complete-${dateStr}.json`);
    await writeFile(
      completeFile,
      JSON.stringify(completeData, null, 2),
      "utf-8"
    );
    console.log(`💾 Saved complete data to: ${completeFile}`);

    // Also save a summary
    const summary = {
      exportedAt: new Date().toISOString(),
      convexUrl: CONVEX_URL,
      summary: {
        totalCategories: categories.length,
        totalDefinitions: definitions.length,
        sports: completeData.sports.map((s) => ({
          sportCode: s.sportCode,
          categoryCount: s.categories.length,
          skillCount: s.categories.reduce(
            (sum, cat) => sum + cat.skills.length,
            0
          ),
          activeCategories: s.categories.filter((c) => c.isActive).length,
          activeSkills: s.categories.reduce(
            (sum, cat) => sum + cat.skills.filter((s) => s.isActive).length,
            0
          ),
        })),
      },
    };

    const summaryFile = join(
      OUTPUT_DIR,
      `skills-export-summary-${dateStr}.json`
    );
    await writeFile(summaryFile, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`💾 Saved summary to: ${summaryFile}`);

    console.log("\n✅ Export complete!");
    console.log("\n📊 Summary:");
    console.log(
      `   - Categories: ${categories.length} (${categories.filter((c) => c.isActive).length} active)`
    );
    console.log(
      `   - Definitions: ${definitions.length} (${definitions.filter((d) => d.isActive).length} active)`
    );
    console.log(`   - Sports: ${completeData.sports.length}`);
    console.log(`\n📁 Files saved to: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("\n❌ Error during export:", error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
