/**
 * Import Athletics Data Script
 *
 * This script imports Athletics level descriptors and benchmarks from JSON files
 * into the Convex database.
 *
 * It handles two types of imports:
 * 1. Level descriptors - Updates existing Athletics skills with 1-5 level descriptors
 * 2. Benchmarks - Creates benchmark records for Athletics skills
 *
 * Usage:
 *   cd packages/backend
 *   npx tsx scripts/import-athletics-data.ts
 *
 * Or with a specific Convex URL:
 *   CONVEX_URL=https://your-instance.convex.cloud npx tsx scripts/import-athletics-data.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the Convex URL from environment or use production
const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  "https://valuable-pig-963.convex.cloud";

type LevelDescriptorsData = {
  sports: Array<{
    sportCode: string;
    categories: Array<{
      name: string;
      skills: Array<{
        name: string;
        level1Descriptor: string;
        level2Descriptor: string;
        level3Descriptor: string;
        level4Descriptor: string;
        level5Descriptor: string;
      }>;
    }>;
  }>;
};

type BenchmarkData = {
  benchmarks: Array<{
    sport: string;
    ageGroup: string;
    gender: string;
    competitiveLevel: string;
    eventGroup: string;
    skillName: string;
    expectedLevel: number;
    performanceIndicators: {
      technical: string[];
      performance: string[];
      training: string[];
    };
    assessmentNotes: string;
    progressionPath: string;
  }>;
};

// Helper to convert skill name to code
function skillNameToCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Helper to convert category name to code
function categoryNameToCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Helper to convert gender string to schema format
function normalizeGender(gender: string): "male" | "female" | "all" {
  const normalized = gender.toLowerCase();
  if (normalized === "male") {
    return "male";
  }
  if (normalized === "female") {
    return "female";
  }
  return "all";
}

// Helper to convert competitive level to schema format
function normalizeLevel(
  level: string
): "recreational" | "competitive" | "development" | "elite" {
  const normalized = level.toLowerCase();
  if (normalized === "developmental") {
    return "development";
  }
  if (normalized === "competitive") {
    return "competitive";
  }
  if (normalized === "elite") {
    return "elite";
  }
  return "recreational";
}

async function main() {
  console.log("🏃 Starting Athletics Data Import");
  console.log(`📡 Connecting to: ${CONVEX_URL}`);

  const client = new ConvexHttpClient(CONVEX_URL);

  // ============================================================
  // STEP 1: Import Level Descriptors
  // ============================================================

  console.log("\n📚 STEP 1: Importing Level Descriptors...");

  const levelDescriptorsPath = join(
    __dirname,
    "athletics-level-descriptors-UPDATE.json"
  );

  if (!existsSync(levelDescriptorsPath)) {
    console.error(
      `❌ Level descriptors file not found: ${levelDescriptorsPath}`
    );
    process.exit(1);
  }

  const levelDescriptorsRaw = readFileSync(levelDescriptorsPath, "utf-8");
  const levelDescriptorsData: LevelDescriptorsData =
    JSON.parse(levelDescriptorsRaw);

  console.log(`   Sports found: ${levelDescriptorsData.sports.length}`);

  // Transform the data to include required code and sortOrder fields
  const transformedSkillsData = {
    sports: levelDescriptorsData.sports.map((sport) => ({
      sportCode: sport.sportCode,
      categories: sport.categories.map((category, catIndex) => ({
        code: categoryNameToCode(category.name),
        name: category.name,
        sortOrder: catIndex,
        skills: category.skills.map((skill, skillIndex) => ({
          code: skillNameToCode(skill.name),
          name: skill.name,
          level1Descriptor: skill.level1Descriptor,
          level2Descriptor: skill.level2Descriptor,
          level3Descriptor: skill.level3Descriptor,
          level4Descriptor: skill.level4Descriptor,
          level5Descriptor: skill.level5Descriptor,
          sortOrder: skillIndex,
        })),
      })),
    })),
  };

  for (const sport of transformedSkillsData.sports) {
    console.log(`\n   Processing sport: ${sport.sportCode}`);
    console.log(`   Categories: ${sport.categories.length}`);

    let totalSkills = 0;
    for (const category of sport.categories) {
      totalSkills += category.skills.length;
    }
    console.log(`   Total skills: ${totalSkills}`);

    // Import using the existing importCompleteSkillsData mutation
    try {
      const result = await client.mutation(
        api.models.referenceData.importCompleteSkillsData,
        {
          skillsData: transformedSkillsData,
          ensureSportsExist: true,
          replaceExisting: false,
        }
      );

      console.log("\n   ✅ Level descriptors imported!");
      console.log(`      Sports processed: ${result.sportsProcessed}`);
      console.log(`      Categories created: ${result.totalCategoriesCreated}`);
      console.log(`      Categories updated: ${result.totalCategoriesUpdated}`);
      console.log(`      Skills created: ${result.totalSkillsCreated}`);
      console.log(`      Skills updated: ${result.totalSkillsUpdated}`);
    } catch (error: any) {
      console.error("   ❌ Level descriptors import failed:", error.message);
      throw error;
    }
  }

  // ============================================================
  // STEP 2: Import Benchmarks
  // ============================================================

  console.log("\n\n🎯 STEP 2: Importing Benchmarks...");

  const benchmarksPath = join(__dirname, "athletics-benchmarks-IMPORT.json");

  if (!existsSync(benchmarksPath)) {
    console.error(`❌ Benchmarks file not found: ${benchmarksPath}`);
    process.exit(1);
  }

  const benchmarksRaw = readFileSync(benchmarksPath, "utf-8");
  const benchmarksData: BenchmarkData = JSON.parse(benchmarksRaw);

  console.log(
    `   Total benchmarks to import: ${benchmarksData.benchmarks.length}`
  );

  // Group benchmarks by event group for better reporting
  const byEventGroup: Record<string, number> = {};
  for (const benchmark of benchmarksData.benchmarks) {
    byEventGroup[benchmark.eventGroup] =
      (byEventGroup[benchmark.eventGroup] || 0) + 1;
  }

  console.log("\n   Breakdown by event group:");
  for (const [eventGroup, count] of Object.entries(byEventGroup)) {
    console.log(`      ${eventGroup}: ${count} benchmarks`);
  }

  // Transform benchmarks to match database schema
  const transformedBenchmarks = benchmarksData.benchmarks.map((b) => ({
    sportCode: "athletics",
    skillCode: skillNameToCode(b.skillName),
    ageGroup: b.ageGroup,
    gender: normalizeGender(b.gender),
    level: normalizeLevel(b.competitiveLevel),
    expectedRating: b.expectedLevel,
    // Calculate thresholds based on expected level
    minAcceptable: Math.max(1, b.expectedLevel - 1),
    developingThreshold: b.expectedLevel,
    excellentThreshold: Math.min(5, b.expectedLevel + 1),
    notes: `${b.assessmentNotes}\n\nProgression: ${b.progressionPath}\n\nEvent Group: ${b.eventGroup}`,
  }));

  console.log("\n   Importing benchmarks...");

  try {
    const result = await client.mutation(
      api.models.skillBenchmarks.bulkImportBenchmarks,
      {
        source: "Athletics Ireland",
        sourceDocument: "Athletics Skill Standards and Benchmarks 2025",
        sourceYear: 2025,
        benchmarks: transformedBenchmarks,
      }
    );

    console.log("\n   ✅ Benchmarks imported!");
    console.log(`      Created: ${result.created}`);
    console.log(`      Skipped (already exist): ${result.skipped}`);

    if (result.errors.length > 0) {
      console.log(`\n   ⚠️  Errors encountered: ${result.errors.length}`);
      console.log("\n   First 10 errors:");
      for (const error of result.errors.slice(0, 10)) {
        console.log(`      - ${error}`);
      }
    }
  } catch (error: any) {
    console.error("   ❌ Benchmarks import failed:", error.message);
    throw error;
  }

  // ============================================================
  // STEP 3: Verification
  // ============================================================

  console.log("\n\n🔍 STEP 3: Verifying Import...");

  try {
    // Verify skills were imported
    const skills = await client.query(
      api.models.referenceData.getSkillDefinitionsBySport,
      { sportCode: "athletics" }
    );

    console.log(`\n   ✅ Skills in database: ${skills.length}`);
    console.log("      Expected: 30 skills");

    if (skills.length !== 30) {
      console.log(
        `      ⚠️  Warning: Expected 30 skills but found ${skills.length}`
      );
    }

    // Verify benchmarks were imported
    const benchmarks = await client.query(
      api.models.skillBenchmarks.getBenchmarksForSport,
      { sportCode: "athletics", activeOnly: true }
    );

    console.log(`\n   ✅ Benchmarks in database: ${benchmarks.length}`);
    console.log("      Expected: 1174 benchmarks");

    if (benchmarks.length !== 1174) {
      console.log(
        `      ⚠️  Warning: Expected 1174 benchmarks but found ${benchmarks.length}`
      );
    }

    // Show benchmark breakdown by age group and gender
    const byAgeGender: Record<string, number> = {};
    for (const benchmark of benchmarks) {
      const key = `${benchmark.ageGroup} ${benchmark.gender}`;
      byAgeGender[key] = (byAgeGender[key] || 0) + 1;
    }

    console.log("\n   Benchmark breakdown by age group and gender:");
    const sortedKeys = Object.keys(byAgeGender).sort();
    for (const key of sortedKeys) {
      console.log(`      ${key}: ${byAgeGender[key]}`);
    }

    console.log("\n✨ Athletics data import complete!");
    console.log("\n📋 Summary:");
    console.log("   - Sport: Athletics");
    console.log(`   - Skills: ${skills.length}`);
    console.log(`   - Benchmarks: ${benchmarks.length}`);
    console.log("   - Status: Ready for use in assessments");
  } catch (error: any) {
    console.error("   ❌ Verification failed:", error.message);
    throw error;
  }
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
