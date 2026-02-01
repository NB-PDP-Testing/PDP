/**
 * Rugby Team Seed Script
 *
 * Seeds a rugby team with 35 players and assessments.
 *
 * Usage:
 *   # Development
 *   npx convex run scripts/seedRugbyTeam:seed --args '{"orgId":"xxx","teamName":"U15 Boys"}'
 *
 *   # Production (requires confirmation)
 *   npx convex run scripts/seedRugbyTeam:seed --args '{"orgId":"xxx","teamName":"U15 Boys","confirmProduction":true}' --prod
 *
 * Player distribution:
 *   - 28 Irish names (80%)
 *   - 3 Indian names
 *   - 2 Polish names
 *   - 2 European names
 *
 * Skill level distribution:
 *   - 7 high performers (avg 4-5 rating)
 *   - 21 mid performers (avg 2.5-3.5 rating)
 *   - 7 low performers (avg 1-2 rating)
 */

import { v } from "convex/values";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";

// ============ PLAYER NAME DATA ============

const IRISH_FIRST_NAMES_MALE = [
  "Seán",
  "Conor",
  "Cian",
  "Oisín",
  "Fionn",
  "Darragh",
  "Cathal",
  "Eoin",
  "Tadhg",
  "Ruairí",
  "Pádraic",
  "Cillian",
  "Lorcan",
  "Dáire",
  "Colm",
  "Niall",
  "Declan",
  "Ronan",
  "Brendan",
  "Ciaran",
];

const IRISH_FIRST_NAMES_FEMALE = [
  "Aoife",
  "Síofra",
  "Caoimhe",
  "Niamh",
  "Saoirse",
  "Róisín",
  "Aisling",
  "Clodagh",
  "Méabh",
  "Orlaith",
];

const IRISH_LAST_NAMES = [
  "O'Brien",
  "Murphy",
  "Kelly",
  "Walsh",
  "Byrne",
  "Ryan",
  "O'Connor",
  "O'Sullivan",
  "McCarthy",
  "Doyle",
  "Lynch",
  "Murray",
  "Quinn",
  "Moore",
  "McLoughlin",
  "O'Neill",
  "Brennan",
  "Doherty",
  "Kennedy",
  "Fitzgerald",
  "Gallagher",
  "Duffy",
  "Nolan",
  "Dunne",
  "Power",
  "Healy",
  "Connolly",
  "O'Reilly",
];

const INDIAN_FIRST_NAMES = ["Arjun", "Rohan", "Priya"];
const INDIAN_LAST_NAMES = ["Sharma", "Patel", "Singh"];

const POLISH_FIRST_NAMES = ["Jakub", "Kacper"];
const POLISH_LAST_NAMES = ["Kowalski", "Wiśniewski"];

const EUROPEAN_FIRST_NAMES = ["Luca", "Matteo"];
const EUROPEAN_LAST_NAMES = ["Rossi", "Schmidt"];

// ============ PERFORMANCE CONFIG ============

type PerformanceLevel = "high" | "medium" | "low";

const PERFORMANCE_CONFIG: Record<
  PerformanceLevel,
  {
    ratingsRange: { min: number; max: number };
    count: number;
  }
> = {
  high: {
    ratingsRange: { min: 4, max: 5 },
    count: 7,
  },
  medium: {
    ratingsRange: { min: 2.5, max: 3.5 },
    count: 21,
  },
  low: {
    ratingsRange: { min: 1, max: 2 },
    count: 7,
  },
};

// ============ HELPER FUNCTIONS ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDateOfBirth(ageGroup: string): string {
  // Extract age from ageGroup (e.g., "u15" -> 15)
  const age = Number.parseInt(ageGroup.replace(/\D/g, ""), 10) || 15;
  const now = new Date();
  const birthYear = now.getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${birthYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateAssessmentDates(): string[] {
  const now = new Date();
  return [
    new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 3 months ago
    new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 6 weeks ago
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 1 week ago
  ];
}

function generateProgressiveRatings(
  baseMin: number,
  baseMax: number
): number[] {
  const progression = [0, 0.2, 0.4]; // Slight improvement each assessment
  return progression.map((p) => {
    const rating = baseMin + (baseMax - baseMin) * (0.3 + p);
    return Math.min(5, Math.max(1, Math.round(rating * 2) / 2)); // Round to 0.5
  });
}

// Generate 35 players with the specified distribution
function generatePlayers(ageGroup: string): Array<{
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  performanceLevel: PerformanceLevel;
  origin: string;
}> {
  const players: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: "male" | "female";
    performanceLevel: PerformanceLevel;
    origin: string;
  }> = [];

  // Create performance level assignments (7 high, 21 medium, 7 low)
  const performanceLevels: PerformanceLevel[] = [
    ...new Array<PerformanceLevel>(7).fill("high"),
    ...new Array<PerformanceLevel>(21).fill("medium"),
    ...new Array<PerformanceLevel>(7).fill("low"),
  ];

  // Shuffle performance levels
  for (let i = performanceLevels.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [performanceLevels[i], performanceLevels[j]] = [
      performanceLevels[j],
      performanceLevels[i],
    ];
  }

  let playerIndex = 0;

  // 28 Irish players (80%)
  for (let i = 0; i < 28; i += 1) {
    const isFemale = i % 4 === 0; // ~25% female
    const firstName = isFemale
      ? randomElement(IRISH_FIRST_NAMES_FEMALE)
      : randomElement(IRISH_FIRST_NAMES_MALE);
    const level = performanceLevels[playerIndex];
    playerIndex += 1;
    players.push({
      firstName,
      lastName: randomElement(IRISH_LAST_NAMES),
      dateOfBirth: generateDateOfBirth(ageGroup),
      gender: isFemale ? "female" : "male",
      performanceLevel: level,
      origin: "Irish",
    });
  }

  // 3 Indian players
  for (let i = 0; i < 3; i += 1) {
    const level = performanceLevels[playerIndex];
    playerIndex += 1;
    players.push({
      firstName: INDIAN_FIRST_NAMES[i],
      lastName: INDIAN_LAST_NAMES[i],
      dateOfBirth: generateDateOfBirth(ageGroup),
      gender: "male",
      performanceLevel: level,
      origin: "Indian",
    });
  }

  // 2 Polish players
  for (let i = 0; i < 2; i += 1) {
    const level = performanceLevels[playerIndex];
    playerIndex += 1;
    players.push({
      firstName: POLISH_FIRST_NAMES[i],
      lastName: POLISH_LAST_NAMES[i],
      dateOfBirth: generateDateOfBirth(ageGroup),
      gender: "male",
      performanceLevel: level,
      origin: "Polish",
    });
  }

  // 2 European players
  for (let i = 0; i < 2; i += 1) {
    const level = performanceLevels[playerIndex];
    playerIndex += 1;
    players.push({
      firstName: EUROPEAN_FIRST_NAMES[i],
      lastName: EUROPEAN_LAST_NAMES[i],
      dateOfBirth: generateDateOfBirth(ageGroup),
      gender: "male",
      performanceLevel: level,
      origin: "European",
    });
  }

  return players;
}

// ============ MAIN SEED FUNCTION ============

export const seed = mutation({
  args: {
    orgId: v.string(),
    teamName: v.string(),
    sport: v.optional(v.string()), // defaults to "rugby" - can be "rugby", "soccer", "gaa_football", etc.
    ageGroup: v.optional(v.string()), // defaults to "u15"
    gender: v.optional(v.string()), // defaults to "Mixed"
    confirmProduction: v.optional(v.boolean()), // Required for production runs
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    created: v.optional(
      v.object({
        teamId: v.string(),
        players: v.number(),
        passports: v.number(),
        assessments: v.number(),
      })
    ),
    message: v.optional(v.string()),
    playerBreakdown: v.optional(
      v.object({
        irish: v.number(),
        indian: v.number(),
        polish: v.number(),
        european: v.number(),
        highPerformers: v.number(),
        mediumPerformers: v.number(),
        lowPerformers: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const sport = args.sport || "rugby";
    const ageGroup = args.ageGroup || "u15";
    const gender = args.gender || "Mixed";

    console.log("🏃 Starting Team seed...");
    console.log(`  Organization ID: ${args.orgId}`);
    console.log(`  Team Name: ${args.teamName}`);
    console.log(`  Sport: ${sport}`);
    console.log(`  Age Group: ${ageGroup}`);
    console.log(`  Gender: ${gender}`);

    if (args.dryRun) {
      console.log("  [DRY RUN MODE - no changes will be made]");
    }

    // Check for production safety
    const isProduction = process.env.CONVEX_CLOUD_URL?.includes("prod");
    if (isProduction && !args.confirmProduction) {
      return {
        success: false,
        message: "Production run requires confirmProduction: true",
      };
    }

    const stats = {
      players: 0,
      passports: 0,
      assessments: 0,
    };

    try {
      // 1. Verify organization exists
      console.log("\n🏢 Step 1: Verifying organization...");
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "_id", value: args.orgId, operator: "eq" }],
      });

      if (!org) {
        return {
          success: false,
          message: `Organization ${args.orgId} not found`,
        };
      }
      console.log(`  ✓ Found organization: ${org.name}`);

      // 2. Find or create team
      console.log("\n👥 Step 2: Finding/creating team...");
      let teamId: string;

      // Check if team exists
      const existingTeams = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 10 },
          where: [
            { field: "name", value: args.teamName, operator: "eq" },
            { field: "organizationId", value: args.orgId, operator: "eq" },
          ],
        }
      );

      if (existingTeams && existingTeams.length > 0) {
        teamId = existingTeams[0]._id as string;
        console.log(`  ✓ Found existing team: ${args.teamName}`);
      } else if (args.dryRun) {
        console.log(`  [DRY RUN] Would create team: ${args.teamName}`);
        teamId = "dry-run-team-id";
      } else {
        // Create the team
        const teamResult = await ctx.runMutation(api.models.teams.createTeam, {
          name: args.teamName,
          organizationId: args.orgId,
          sport,
          ageGroup,
          gender: gender as "Male" | "Female" | "Mixed",
          season: new Date().getFullYear().toString(),
          isActive: true,
        });
        teamId = teamResult;
        console.log(`  ✅ Created team: ${args.teamName}`);
      }

      // 3. Generate player data
      console.log("\n🧑‍🤝‍🧑 Step 3: Generating 35 players...");
      const players = generatePlayers(ageGroup);

      const breakdown = {
        irish: players.filter((p) => p.origin === "Irish").length,
        indian: players.filter((p) => p.origin === "Indian").length,
        polish: players.filter((p) => p.origin === "Polish").length,
        european: players.filter((p) => p.origin === "European").length,
        highPerformers: players.filter((p) => p.performanceLevel === "high")
          .length,
        mediumPerformers: players.filter((p) => p.performanceLevel === "medium")
          .length,
        lowPerformers: players.filter((p) => p.performanceLevel === "low")
          .length,
      };

      console.log(
        `  Irish: ${breakdown.irish}, Indian: ${breakdown.indian}, Polish: ${breakdown.polish}, European: ${breakdown.european}`
      );
      console.log(
        `  High: ${breakdown.highPerformers}, Medium: ${breakdown.mediumPerformers}, Low: ${breakdown.lowPerformers}`
      );

      if (args.dryRun) {
        return {
          success: true,
          message: "[DRY RUN] Would create 35 players with assessments",
          playerBreakdown: breakdown,
        };
      }

      // 4. Get skill definitions for the sport
      console.log(`\n📋 Step 4: Loading ${sport} skills...`);
      const allSkills = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode", (q) => q.eq("sportCode", sport))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      if (allSkills.length === 0) {
        return {
          success: false,
          message: `No ${sport} skills found. Please seed sport rules first.`,
        };
      }
      console.log(`  ✓ Found ${allSkills.length} ${sport} skills`);

      // Get skill categories for variety (query needed to ensure they exist)
      const _categories = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode", (q) => q.eq("sportCode", sport))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Group skills by category
      const skillsByCategory = new Map<string, typeof allSkills>();
      for (const skill of allSkills) {
        const catId = skill.categoryId as string;
        if (!skillsByCategory.has(catId)) {
          skillsByCategory.set(catId, []);
        }
        skillsByCategory.get(catId)?.push(skill);
      }
      const categoryIds = Array.from(skillsByCategory.keys());

      // 5. Create players with passports and assessments
      console.log("\n🏃 Step 5: Creating players and assessments...");
      const assessmentDates = generateAssessmentDates();

      for (let i = 0; i < players.length; i++) {
        const playerConfig = players[i];
        console.log(
          `  [${i + 1}/35] ${playerConfig.firstName} ${playerConfig.lastName} (${playerConfig.performanceLevel})...`
        );

        // Create player identity
        const playerResult = await ctx.runMutation(
          api.models.playerIdentities.findOrCreatePlayer,
          {
            firstName: playerConfig.firstName,
            lastName: playerConfig.lastName,
            dateOfBirth: playerConfig.dateOfBirth,
            gender: playerConfig.gender,
            createdFrom: `seed_team_${sport}`,
          }
        );
        const playerIdentityId = playerResult.playerIdentityId;
        if (playerResult.wasCreated) {
          stats.players += 1;
        }

        // Enroll in organization
        const existingEnrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerIdentityId)
              .eq("organizationId", args.orgId)
          )
          .first();

        if (!existingEnrollment) {
          await ctx.runMutation(api.models.orgPlayerEnrollments.enrollPlayer, {
            playerIdentityId,
            organizationId: args.orgId,
            ageGroup,
            season: new Date().getFullYear().toString(),
            sportCode: sport,
            status: "active",
          });
        }

        // Assign to team
        const existingAssignment = await ctx.db
          .query("teamPlayerIdentities")
          .withIndex("by_team_and_player", (q) =>
            q.eq("teamId", teamId).eq("playerIdentityId", playerIdentityId)
          )
          .first();

        if (!existingAssignment) {
          await ctx.db.insert("teamPlayerIdentities", {
            teamId,
            playerIdentityId,
            organizationId: args.orgId,
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create sport passport
        const passportResult = await ctx.runMutation(
          api.models.sportPassports.findOrCreatePassport,
          {
            playerIdentityId: playerIdentityId as Id<"playerIdentities">,
            sportCode: sport,
            organizationId: args.orgId,
          }
        );
        stats.passports += 1;

        // Generate performance-based ratings
        const performanceConfig =
          PERFORMANCE_CONFIG[playerConfig.performanceLevel];
        const baseRatings = generateProgressiveRatings(
          performanceConfig.ratingsRange.min,
          performanceConfig.ratingsRange.max
        );

        // Create category modifiers for realistic variety (strengths/weaknesses)
        const categoryModifiers = new Map<string, number>();
        categoryIds.forEach((catId, index) => {
          if (index < Math.ceil(categoryIds.length / 3)) {
            categoryModifiers.set(catId, 0.5); // Strength
          } else if (
            index >=
            categoryIds.length - Math.ceil(categoryIds.length / 3)
          ) {
            categoryModifiers.set(catId, -0.5); // Weakness
          } else {
            categoryModifiers.set(catId, 0); // Average
          }
        });

        // Create 3 assessments showing progression
        for (let a = 0; a < 3; a++) {
          const assessmentData = allSkills.map((skill, skillIndex) => {
            const baseRating = baseRatings[a];
            const categoryMod =
              categoryModifiers.get(skill.categoryId as string) || 0;

            // Add individual skill variation
            const skillVariation =
              ((skillIndex % 5) - 2) * 0.2 + // Position-based
              (Math.random() - 0.5) * 0.4; // Random

            let finalRating = baseRating + categoryMod + skillVariation;
            finalRating = Math.max(1, Math.min(5, finalRating));
            finalRating = Math.round(finalRating * 2) / 2; // Round to 0.5

            return {
              skillCode: skill.code,
              rating: finalRating,
            };
          });

          await ctx.runMutation(
            api.models.skillAssessments.recordBatchAssessments,
            {
              passportId: passportResult.passportId,
              assessmentDate: assessmentDates[a],
              assessmentType: a === 0 ? "initial" : "training",
              assessedByName: "Seed Script",
              assessorRole: "coach",
              ratings: assessmentData,
            }
          );
          stats.assessments += assessmentData.length;
        }

        // Update passport with final rating
        const finalRating = baseRatings[2];
        await ctx.runMutation(api.models.sportPassports.updateRatings, {
          passportId: passportResult.passportId,
          currentOverallRating: finalRating,
          incrementAssessmentCount: false,
        });

        await ctx.db.patch(passportResult.passportId, {
          assessmentCount: 3,
          lastAssessmentDate: assessmentDates[2],
          lastAssessmentType: "training",
        });
      }

      console.log("\n✅ Seed complete!");
      console.log(`  Players: ${stats.players}`);
      console.log(`  Passports: ${stats.passports}`);
      console.log(`  Assessments: ${stats.assessments}`);

      return {
        success: true,
        created: {
          teamId,
          players: stats.players,
          passports: stats.passports,
          assessments: stats.assessments,
        },
        playerBreakdown: breakdown,
      };
    } catch (error) {
      console.error("❌ Seed failed:", error);
      return {
        success: false,
        message: `Seed failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// ============ CLEANUP FUNCTION ============

export const cleanup = mutation({
  args: {
    orgId: v.string(),
    teamName: v.string(),
    sport: v.optional(v.string()), // defaults to "rugby"
    confirmDelete: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    deleted: v.optional(
      v.object({
        players: v.number(),
        passports: v.number(),
        assessments: v.number(),
        teamAssignments: v.number(),
      })
    ),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmDelete) {
      return {
        success: false,
        message: "Cleanup requires confirmDelete: true",
      };
    }

    const sport = args.sport || "rugby";

    console.log("🧹 Starting cleanup...");
    console.log(`  Organization: ${args.orgId}`);
    console.log(`  Team: ${args.teamName}`);
    console.log(`  Sport: ${sport}`);

    const stats = {
      players: 0,
      passports: 0,
      assessments: 0,
      teamAssignments: 0,
    };

    try {
      // Find the team
      const teams = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "team",
        paginationOpts: { cursor: null, numItems: 10 },
        where: [
          { field: "name", value: args.teamName, operator: "eq" },
          { field: "organizationId", value: args.orgId, operator: "eq" },
        ],
      });

      if (!teams || teams.length === 0) {
        return {
          success: false,
          message: `Team "${args.teamName}" not found in organization`,
        };
      }

      const teamId = teams[0]._id as string;

      // Find all player assignments for this team
      const assignments = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .collect();

      console.log(`  Found ${assignments.length} player assignments`);

      // For each player, delete their data
      for (const assignment of assignments) {
        const playerIdentityId = assignment.playerIdentityId;

        // Delete assessments via passports
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        for (const passport of passports) {
          const assessments = await ctx.db
            .query("skillAssessments")
            .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
            .collect();

          for (const assessment of assessments) {
            await ctx.db.delete(assessment._id);
            stats.assessments += 1;
          }

          await ctx.db.delete(passport._id);
          stats.passports += 1;
        }

        // Delete team assignment
        await ctx.db.delete(assignment._id);
        stats.teamAssignments += 1;

        // Delete enrollment
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerIdentityId)
              .eq("organizationId", args.orgId)
          )
          .first();

        if (enrollment) {
          await ctx.db.delete(enrollment._id);
        }

        // Delete player identity (only if created by seed)
        const player = await ctx.db.get(playerIdentityId);
        if (player && player.createdFrom === `seed_team_${sport}`) {
          await ctx.db.delete(playerIdentityId);
          stats.players += 1;
        }
      }

      console.log("\n✅ Cleanup complete!");
      console.log(`  Deleted ${stats.players} players`);
      console.log(`  Deleted ${stats.passports} passports`);
      console.log(`  Deleted ${stats.assessments} assessments`);
      console.log(`  Deleted ${stats.teamAssignments} team assignments`);

      return {
        success: true,
        deleted: stats,
      };
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      return {
        success: false,
        message: `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
