/**
 * Helper script to seed session plans
 *
 * Usage:
 * 1. Update the values below with your organizationId, coachId, and coachName
 * 2. Run: npx convex run seed/sessionPlansSeed:seedSessionPlans --args '{"organizationId":"YOUR_ORG_ID","coachId":"YOUR_COACH_ID","coachName":"YOUR_NAME","count":20}'
 *
 * Or use this script with ts-node:
 * npx ts-node packages/backend/scripts/seedSessionPlans.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// CONFIGURE THESE VALUES
const CONVEX_URL = process.env.CONVEX_URL || "YOUR_CONVEX_URL_HERE";
const ORG_ID = "jh7fc03thdh2hrzjvp0a6fh2tn7z1c36"; // Replace with your organization ID
const COACH_ID = "k17325xe4yhjxfw9e3y99m8e5s7z2tfd"; // Replace with your coach/user ID
const COACH_NAME = "Neil B"; // Replace with your name
const COUNT = 25; // Number of session plans to create

async function seedData() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("Seeding session plans...");
  console.log(`Organization ID: ${ORG_ID}`);
  console.log(`Coach ID: ${COACH_ID}`);
  console.log(`Coach Name: ${COACH_NAME}`);
  console.log(`Count: ${COUNT}`);
  console.log("");

  try {
    const result = await client.mutation(
      api.seed.sessionPlansSeed.seedSessionPlans,
      {
        organizationId: ORG_ID,
        coachId: COACH_ID,
        coachName: COACH_NAME,
        count: COUNT,
      }
    );

    console.log("✅ Success!");
    console.log(result.message);
    console.log(`Created ${result.created} session plans`);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedData();
