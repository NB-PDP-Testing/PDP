/**
 * UAT Setup Verification Scripts
 *
 * These functions verify that the test environment is properly configured
 * for running UAT tests. They check for:
 * - Platform admin account with correct permissions
 * - Test user accounts with correct roles
 * - Required reference data (sports, skills, benchmarks)
 *
 * NOTE: These are utility scripts for UAT setup verification.
 * Type assertions are used because the exact schema may vary.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Test user configuration - MUST match apps/web/uat/test-data.json
 */
const TEST_ACCOUNTS = {
  owner: { email: "owner_pdp@outlook.com", role: "owner" },
  admin: { email: "adm1n_pdp@outlook.com", role: "admin" },
  coach: { email: "coach_pdp@outlook.com", role: "coach" },
  parent: { email: "parent_pdp@outlook.com", role: "parent" },
};

/**
 * Verify that the platform admin (owner) account exists and has correct permissions
 */
export const verifyPlatformAdmin = query({
  args: {},
  handler: async (ctx) => {
    // Look for the owner account - MUST match test-data.json
    const ownerEmail = TEST_ACCOUNTS.owner.email;

    // Check in users table - using any to handle dynamic schema
    const user = await (ctx.db as any)
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), ownerEmail))
      .first();

    if (!user) {
      console.log(`❌ Owner account not found: ${ownerEmail}`);
      return {
        success: false,
        error: `Owner account not found: ${ownerEmail}`,
        user: null,
      };
    }

    // Check if user has platformStaff flag
    const isPlatformStaff = user.platformStaff === true;

    if (!isPlatformStaff) {
      console.log(`⚠️ Owner account exists but is not platform staff`);
      return {
        success: false,
        error: "Owner account is not platform staff",
        user: { id: user._id, email: user.email, platformStaff: user.platformStaff },
      };
    }

    console.log(`✅ Platform admin verified: ${ownerEmail}`);
    return {
      success: true,
      user: { id: user._id, email: user.email, platformStaff: true },
    };
  },
});

/**
 * Check if a user exists by email
 */
/**
 * Get test organization info
 */
export const getTestOrganization = query({
  args: {},
  handler: async (ctx) => {
    // Find any organization
    const org = await (ctx.db as any).query("organizations").first();
    
    if (org) {
      return {
        found: true,
        id: org._id,
        name: org.name,
        slug: org.slug,
      };
    }
    
    return { found: false };
  },
});

export const checkUserExists = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await (ctx.db as any)
      .query("users")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      console.log(`User not found: ${args.email}`);
      return { exists: false, email: args.email };
    }

    console.log(`User found: ${args.email}`);
    return { exists: true, email: args.email, userId: user._id };
  },
});

/**
 * Verify all test user permissions
 * Uses TEST_ACCOUNTS which MUST match apps/web/uat/test-data.json
 */
export const verifyTestUserPermissions = query({
  args: {},
  handler: async (ctx) => {
    const testUsers = [
      { email: TEST_ACCOUNTS.owner.email, expectedRole: TEST_ACCOUNTS.owner.role, description: "Platform Owner" },
      { email: TEST_ACCOUNTS.admin.email, expectedRole: TEST_ACCOUNTS.admin.role, description: "Organization Admin" },
      { email: TEST_ACCOUNTS.coach.email, expectedRole: TEST_ACCOUNTS.coach.role, description: "Team Coach" },
      { email: TEST_ACCOUNTS.parent.email, expectedRole: TEST_ACCOUNTS.parent.role, description: "Player Parent" },
    ];

    const results = [];

    for (const testUser of testUsers) {
      const user = await (ctx.db as any)
        .query("users")
        .filter((q: any) => q.eq(q.field("email"), testUser.email))
        .first();

      if (!user) {
        results.push({
          email: testUser.email,
          description: testUser.description,
          status: "NOT_FOUND",
          error: "User does not exist",
        });
        continue;
      }

      // Check for organization roles
      const orgRoles = await (ctx.db as any)
        .query("organizationRoles")
        .filter((q: any) => q.eq(q.field("userId"), user._id))
        .collect();

      const hasExpectedRole = orgRoles.some(
        (role: any) => role.role === testUser.expectedRole
      );

      results.push({
        email: testUser.email,
        description: testUser.description,
        status: hasExpectedRole ? "OK" : "ROLE_MISSING",
        userId: user._id,
        roles: orgRoles.map((r: any) => r.role),
        expectedRole: testUser.expectedRole,
      });
    }

    const allOk = results.every((r) => r.status === "OK");

    console.log("Test user verification results:");
    results.forEach((r) => {
      const icon = r.status === "OK" ? "✅" : "❌";
      console.log(`  ${icon} ${r.description} (${r.email}): ${r.status}`);
    });

    return {
      success: allOk,
      results,
    };
  },
});

/**
 * Get count of users in the database
 */
export const getUserCount = query({
  args: {},
  handler: async (ctx) => {
    const users = await (ctx.db as any).query("users").collect();
    console.log(`Total users in database: ${users.length}`);
    return users.length;
  },
});

/**
 * Verify reference data exists (sports, skills, benchmarks)
 */
export const verifyReferenceData = query({
  args: {},
  handler: async (ctx) => {
    // Check for sports
    const sports = await ctx.db.query("sports").collect();
    const hasSports = sports.length > 0;

    // Check for skills
    const skills = await (ctx.db as any).query("skills").collect();
    const hasSkills = skills.length > 0;

    // Check for benchmarks (may be called skillBenchmarks or benchmarks)
    let benchmarks: any[] = [];
    try {
      benchmarks = await (ctx.db as any).query("skillBenchmarks").collect();
    } catch {
      // Table may not exist
    }
    const hasBenchmarks = benchmarks.length > 0;

    console.log(`Reference data check:`);
    console.log(`  Sports: ${sports.length}`);
    console.log(`  Skills: ${skills.length}`);
    console.log(`  Benchmarks: ${benchmarks.length}`);

    return {
      success: hasSports && hasSkills,
      sports: sports.length,
      skills: skills.length,
      benchmarks: benchmarks.length,
    };
  },
});
