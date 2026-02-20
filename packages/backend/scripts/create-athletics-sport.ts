/**
 * Create Athletics Sport
 *
 * This script creates the Athletics sport entry in the database if it doesn't exist.
 *
 * Usage:
 *   cd packages/backend
 *   npx tsx scripts/create-athletics-sport.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  "https://valuable-pig-963.convex.cloud";

async function main() {
  console.log("🏃 Creating Athletics Sport");
  console.log(`📡 Connecting to: ${CONVEX_URL}`);

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Check if Athletics already exists
    const sports = await client.query(api.models.referenceData.getSports);
    const athleticsExists = sports.some((s) => s.code === "athletics");

    if (athleticsExists) {
      console.log("\n✅ Athletics sport already exists!");
      return;
    }

    // Create Athletics sport
    const result = await client.mutation(api.models.referenceData.createSport, {
      code: "athletics",
      name: "Athletics",
      governingBody: "Athletics Ireland",
      description:
        "Track and field athletics, including running, jumping, and throwing events.",
    });

    console.log("\n✅ Athletics sport created successfully!");
    console.log(`   ID: ${result}`);
  } catch (error: any) {
    console.error("❌ Failed to create Athletics sport:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
