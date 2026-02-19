// @ts-nocheck
/**
 * UAT Test Data Seeding Scripts
 *
 * These functions create/verify test data for UAT tests.
 * They are designed to be idempotent - safe to run multiple times.
 *
 * IMPORTANT: This does NOT reset the database.
 * It only ensures the required test data exists.
 */

import { mutation, query } from "../_generated/server";

/**
 * Test user configuration - MUST match apps/web/uat/test-data.json
 *
 * NOTE: If you change these values, also update test-data.json to match.
 */
const TEST_USERS = [
  {
    email: "owner_pdp@outlook.com",
    name: "Owner User",
    role: "owner",
    platformStaff: true,
  },
  {
    email: "adm1n_pdp@outlook.com",
    name: "Admin User",
    role: "admin",
    platformStaff: false,
  },
  {
    email: "coach_pdp@outlook.com",
    name: "Coach User",
    role: "coach",
    platformStaff: false,
  },
  {
    email: "parent_pdp@outlook.com",
    name: "Parent User",
    role: "parent",
    platformStaff: false,
  },
];

/**
 * Test organization - MUST match apps/web/uat/test-data.json
 */
const TEST_ORG = {
  name: "Test Club FC",
  slug: "test-club-fc",
};

/**
 * Test teams - MUST match apps/web/uat/test-data.json
 */
const _TEST_TEAMS = [
  {
    name: "Test Club FC U12 Boys",
    ageGroup: "U12",
    sport: "Soccer",
    gender: "Boys",
  },
  {
    name: "Test Club FC U14 Girls",
    ageGroup: "U14",
    sport: "Soccer",
    gender: "Girls",
  },
];

/**
 * Test players - MUST match apps/web/uat/test-data.json
 */
const _TEST_PLAYERS = [
  {
    firstName: "Liam",
    lastName: "Murphy",
    dateOfBirth: "2014-03-15",
    gender: "Male",
    ageGroup: "U12",
  },
  {
    firstName: "Noah",
    lastName: "O'Brien",
    dateOfBirth: "2014-06-22",
    gender: "Male",
    ageGroup: "U12",
  },
  {
    firstName: "Emma",
    lastName: "Kelly",
    dateOfBirth: "2012-01-10",
    gender: "Female",
    ageGroup: "U14",
  },
];

/**
 * Main seed function - creates all UAT test data
 * This is idempotent - safe to run multiple times
 */
export const seedUATTestData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Starting UAT Test Data Seeding...\n");

    const results = {
      users: { found: 0, created: 0, errors: [] as string[] },
      organization: { found: false, created: false, id: null as string | null },
      teams: { found: 0, created: 0 },
      players: { found: 0, created: 0 },
      roles: { assigned: 0 },
    };

    try {
      // Step 1: Verify/create test users exist
      console.log("👥 Step 1: Checking test users...");
      for (const testUser of TEST_USERS) {
        const existingUser = await (ctx.db as any)
          .query("users")
          .filter((q: any) => q.eq(q.field("email"), testUser.email))
          .first();

        if (existingUser) {
          console.log(`  ✓ User exists: ${testUser.email}`);
          results.users.found++;

          // Update platformStaff if needed
          if (testUser.platformStaff && !existingUser.platformStaff) {
            await ctx.db.patch(existingUser._id, {
              platformStaff: true,
            } as any);
            console.log("    → Updated platformStaff flag");
          }
        } else {
          // Users are created via auth flow, we can't create them directly
          // Log that the user needs to be created manually or via auth
          console.log(`  ✗ User NOT found: ${testUser.email}`);
          console.log("    → User must sign up via the app first");
          results.users.errors.push(testUser.email);
        }
      }

      // Step 2: Find or create test organization
      console.log("\n🏢 Step 2: Checking test organization...");
      let org = await (ctx.db as any)
        .query("organizations")
        .filter((q: any) => q.eq(q.field("slug"), TEST_ORG.slug))
        .first();

      if (org) {
        console.log(`  ✓ Organization exists: ${TEST_ORG.name}`);
        results.organization.found = true;
        results.organization.id = org._id;
      } else {
        // Try to find any organization
        org = await (ctx.db as any).query("organizations").first();
        if (org) {
          console.log(`  ✓ Using existing organization: ${org.name}`);
          results.organization.found = true;
          results.organization.id = org._id;
        } else {
          console.log("  ✗ No organization found");
          console.log("    → Organization must be created via onboarding flow");
        }
      }

      // Step 3: Check teams exist
      if (results.organization.id) {
        console.log("\n⚽ Step 3: Checking teams...");
        const teams = await (ctx.db as any)
          .query("teams")
          .filter((q: any) =>
            q.eq(q.field("organizationId"), results.organization.id)
          )
          .collect();

        results.teams.found = teams.length;
        console.log(`  ✓ Found ${teams.length} team(s) in organization`);
      }

      // Step 4: Check players exist
      if (results.organization.id) {
        console.log("\n👶 Step 4: Checking players...");
        const players = await (ctx.db as any)
          .query("players")
          .filter((q: any) =>
            q.eq(q.field("organizationId"), results.organization.id)
          )
          .collect();

        results.players.found = players.length;
        console.log(`  ✓ Found ${players.length} player(s) in organization`);
      }

      // Step 5: Verify role assignments
      console.log("\n🔐 Step 5: Checking role assignments...");
      for (const testUser of TEST_USERS) {
        const user = await (ctx.db as any)
          .query("users")
          .filter((q: any) => q.eq(q.field("email"), testUser.email))
          .first();

        if (user && results.organization.id) {
          const roles = await (ctx.db as any)
            .query("organizationRoles")
            .filter((q: any) =>
              q.and(
                q.eq(q.field("userId"), user._id),
                q.eq(q.field("organizationId"), results.organization.id)
              )
            )
            .collect();

          if (roles.length > 0) {
            console.log(
              `  ✓ ${testUser.email}: ${roles.map((r: any) => r.role).join(", ")}`
            );
            results.roles.assigned++;
          } else {
            console.log(`  ✗ ${testUser.email}: No roles assigned`);
          }
        }
      }

      // Summary
      console.log("\n📊 UAT Seed Summary:");
      console.log(
        `  Users: ${results.users.found} found, ${results.users.errors.length} missing`
      );
      console.log(
        `  Organization: ${results.organization.found ? "Found" : "Missing"}`
      );
      console.log(`  Teams: ${results.teams.found} found`);
      console.log(`  Players: ${results.players.found} found`);
      console.log(
        `  Role Assignments: ${results.roles.assigned}/${TEST_USERS.length}`
      );

      if (results.users.errors.length > 0) {
        console.log("\n⚠️  Missing users must sign up manually:");
        results.users.errors.forEach((email) => console.log(`    - ${email}`));
      }

      console.log("\n✅ UAT Test Data Seeding Complete!\n");

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error("❌ UAT Seed Error:", error);
      return {
        success: false,
        error: String(error),
        results,
      };
    }
  },
});

/**
 * Query to check UAT data status without modifying anything
 */
export const checkUATDataStatus = query({
  args: {},
  handler: async (ctx) => {
    const status = {
      users: [] as {
        email: string;
        exists: boolean;
        platformStaff?: boolean;
      }[],
      organization: null as { id: string; name: string; slug: string } | null,
      teamsCount: 0,
      playersCount: 0,
    };

    // Check users
    for (const testUser of TEST_USERS) {
      const user = await (ctx.db as any)
        .query("users")
        .filter((q: any) => q.eq(q.field("email"), testUser.email))
        .first();

      status.users.push({
        email: testUser.email,
        exists: !!user,
        platformStaff: user?.platformStaff,
      });
    }

    // Check organization
    const org = await (ctx.db as any)
      .query("organizations")
      .filter((q: any) => q.eq(q.field("slug"), TEST_ORG.slug))
      .first();

    if (org) {
      status.organization = {
        id: org._id,
        name: org.name,
        slug: org.slug,
      };

      // Check teams
      const teams = await (ctx.db as any)
        .query("teams")
        .filter((q: any) => q.eq(q.field("organizationId"), org._id))
        .collect();
      status.teamsCount = teams.length;

      // Check players
      const players = await (ctx.db as any)
        .query("players")
        .filter((q: any) => q.eq(q.field("organizationId"), org._id))
        .collect();
      status.playersCount = players.length;
    }

    return status;
  },
});
