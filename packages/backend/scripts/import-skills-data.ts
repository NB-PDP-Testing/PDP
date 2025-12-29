/**
 * Import Skills Data Script
 *
 * This script imports skill categories and skill definitions from the exported JSON files
 * into the Convex database using the importCompleteSkillsData mutation.
 *
 * Usage:
 *   cd packages/backend
 *   npx tsx scripts/import-skills-data.ts
 *
 * Or with a specific Convex URL:
 *   CONVEX_URL=https://your-instance.convex.cloud npx tsx scripts/import-skills-data.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the Convex URL from environment or use default local dev URL
const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  "https://valuable-pig-963.convex.cloud";

async function main() {
  console.log("🚀 Starting Skills Data Import");
  console.log(`📡 Connecting to: ${CONVEX_URL}`);

  const client = new ConvexHttpClient(CONVEX_URL);

  // Find the most recent skills export file
  const dataExportsDir = path.join(__dirname, "../../../docs/data-exports");
  const files = fs.readdirSync(dataExportsDir);
  const completeFiles = files
    .filter((f) => f.startsWith("skills-complete-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (completeFiles.length === 0) {
    console.error(
      "❌ No skills-complete-*.json files found in docs/data-exports"
    );
    process.exit(1);
  }

  const latestFile = completeFiles[0];
  console.log(`📄 Using data file: ${latestFile}`);

  const dataPath = path.join(dataExportsDir, latestFile);
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(rawData);

  console.log("\n📊 Data Summary:");
  console.log(`   Sports: ${data.sports.length}`);
  data.sports.forEach((sport: any) => {
    const skillCount = sport.categories.reduce(
      (sum: number, cat: any) => sum + cat.skills.length,
      0
    );
    console.log(
      `   - ${sport.sportCode}: ${sport.categories.length} categories, ${skillCount} skills`
    );
  });

  // Use the importCompleteSkillsData mutation
  console.log("\n🔄 Importing skills data...");

  try {
    const result = await client.mutation(
      api.models.referenceData.importCompleteSkillsData,
      { data }
    );

    console.log("\n✅ Import complete!");
    console.log(`   Categories created: ${result.categoriesCreated}`);
    console.log(`   Categories skipped: ${result.categoriesSkipped}`);
    console.log(`   Skills created: ${result.skillsCreated}`);
    console.log(`   Skills skipped: ${result.skillsSkipped}`);
  } catch (error: any) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
