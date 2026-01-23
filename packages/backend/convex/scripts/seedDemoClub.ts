/**
 * Demo Club Seed Script
 *
 * Creates a focused demo environment showcasing all PlayerARC features:
 * - 3 teams across 3 sports (Rugby, GAA, Soccer) - all U14
 * - 6 players with multi-team assignments (each on 2 teams)
 * - 3 performance levels: underachieving, achieving, overachieving
 * - Medical profiles with varied data
 * - Injuries with mix of healed, active, and recovering
 * - Guardian links (5 acknowledged + 1 pending)
 *
 * All demo players use "_Demo" suffix for easy cleanup identification.
 */

import { v } from "convex/values";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// ============ CONFIGURATION ============

const DEMO_ORG = {
  name: "Demo Club",
  slug: "demo-club",
  colors: ["#2563eb", "#7c3aed", "#db2777"],
  supportedSports: ["soccer", "gaa_football", "rugby"],
};

/**
 * 3 teams - one per sport, all U14
 */
const DEMO_TEAMS = [
  {
    name: "Demo Rugby U14",
    sport: "rugby",
    ageGroup: "u14",
    gender: "Mixed" as const,
  },
  {
    name: "Demo GAA U14",
    sport: "gaa_football",
    ageGroup: "u14",
    gender: "Mixed" as const,
  },
  {
    name: "Demo Soccer U14",
    sport: "soccer",
    ageGroup: "u14",
    gender: "Mixed" as const,
  },
];

/**
 * Performance level configuration for assessments and goals
 */
type PerformanceLevel = "underachieving" | "achieving" | "overachieving";

const PERFORMANCE_CONFIG: Record<
  PerformanceLevel,
  {
    ratingsRange: { min: number; max: number };
    benchmarkStatuses: string[];
    goalCount: number;
    goalStatus: "in_progress" | "completed";
    progressRange: { min: number; max: number };
  }
> = {
  underachieving: {
    ratingsRange: { min: 1.5, max: 2.5 },
    benchmarkStatuses: ["below", "developing"],
    goalCount: 3,
    goalStatus: "in_progress",
    progressRange: { min: 30, max: 50 },
  },
  achieving: {
    ratingsRange: { min: 3, max: 3.5 },
    benchmarkStatuses: ["on_track"],
    goalCount: 3,
    goalStatus: "in_progress",
    progressRange: { min: 50, max: 70 },
  },
  overachieving: {
    ratingsRange: { min: 4, max: 5 },
    benchmarkStatuses: ["exceeding", "exceptional"],
    goalCount: 3,
    goalStatus: "completed",
    progressRange: { min: 100, max: 100 },
  },
};

/**
 * 6 demo players - each assigned to 2 teams with specific performance levels
 */
const DEMO_PLAYERS: Array<{
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  performanceLevel: PerformanceLevel;
  primaryTeam: string;
  secondaryTeam: string;
  primarySport: string;
  secondarySport: string;
}> = [
  // Underachieving (2 players)
  {
    firstName: "Sean",
    lastName: "O'Brien_Demo",
    dateOfBirth: "2012-03-15",
    gender: "male",
    performanceLevel: "underachieving",
    primaryTeam: "Demo Rugby U14",
    secondaryTeam: "Demo GAA U14",
    primarySport: "rugby",
    secondarySport: "gaa_football",
  },
  {
    firstName: "Cian",
    lastName: "Murphy_Demo",
    dateOfBirth: "2012-07-22",
    gender: "male",
    performanceLevel: "underachieving",
    primaryTeam: "Demo Rugby U14",
    secondaryTeam: "Demo Soccer U14",
    primarySport: "rugby",
    secondarySport: "soccer",
  },
  // Achieving (2 players)
  {
    firstName: "Aoife",
    lastName: "Kelly_Demo",
    dateOfBirth: "2012-05-10",
    gender: "female",
    performanceLevel: "achieving",
    primaryTeam: "Demo GAA U14",
    secondaryTeam: "Demo Soccer U14",
    primarySport: "gaa_football",
    secondarySport: "soccer",
  },
  {
    firstName: "Roisin",
    lastName: "Walsh_Demo",
    dateOfBirth: "2012-09-18",
    gender: "female",
    performanceLevel: "achieving",
    primaryTeam: "Demo GAA U14",
    secondaryTeam: "Demo Rugby U14",
    primarySport: "gaa_football",
    secondarySport: "rugby",
  },
  // Overachieving (2 players)
  {
    firstName: "Conor",
    lastName: "Byrne_Demo",
    dateOfBirth: "2012-02-28",
    gender: "male",
    performanceLevel: "overachieving",
    primaryTeam: "Demo Soccer U14",
    secondaryTeam: "Demo Rugby U14",
    primarySport: "soccer",
    secondarySport: "rugby",
  },
  {
    firstName: "Niamh",
    lastName: "Doherty_Demo",
    dateOfBirth: "2012-11-05",
    gender: "female",
    performanceLevel: "overachieving",
    primaryTeam: "Demo Soccer U14",
    secondaryTeam: "Demo GAA U14",
    primarySport: "soccer",
    secondarySport: "gaa_football",
  },
];

/**
 * Medical profile data for each player
 */
const MEDICAL_DATA: Array<{
  playerLastName: string;
  bloodType: string | undefined;
  allergies: string[];
  conditions: string[];
  medications: string[];
}> = [
  {
    playerLastName: "O'Brien_Demo",
    bloodType: "A+",
    allergies: ["Peanuts"],
    conditions: [],
    medications: [],
  },
  {
    playerLastName: "Murphy_Demo",
    bloodType: "B-",
    allergies: [],
    conditions: ["Asthma"],
    medications: ["Inhaler"],
  },
  {
    playerLastName: "Kelly_Demo",
    bloodType: "O+",
    allergies: ["Penicillin", "Shellfish"],
    conditions: [],
    medications: [],
  },
  {
    playerLastName: "Walsh_Demo",
    bloodType: "AB+",
    allergies: [],
    conditions: ["Type 1 Diabetes"],
    medications: ["Insulin"],
  },
  {
    playerLastName: "Byrne_Demo",
    bloodType: "O-",
    allergies: ["Bee stings"],
    conditions: [],
    medications: ["EpiPen"],
  },
  {
    playerLastName: "Doherty_Demo",
    bloodType: "A-",
    allergies: ["Lactose"],
    conditions: ["Mild Eczema"],
    medications: [],
  },
];

/**
 * Injury data for players
 */
const INJURY_DATA: Array<{
  playerLastName: string;
  injuries: Array<{
    injuryType: string;
    bodyPart: string;
    status: "healed" | "active" | "recovering";
    severity: "minor" | "moderate" | "severe" | "long_term";
    daysAgo: number;
    description: string;
    hasReturnProtocol?: boolean;
  }>;
}> = [
  {
    playerLastName: "O'Brien_Demo",
    injuries: [
      {
        injuryType: "Ankle sprain",
        bodyPart: "Ankle",
        status: "healed",
        severity: "minor",
        daysAgo: 365,
        description: "Minor ankle sprain during training in 2023",
      },
    ],
  },
  {
    playerLastName: "Murphy_Demo",
    injuries: [
      {
        injuryType: "Muscle strain",
        bodyPart: "Hamstring",
        status: "healed",
        severity: "minor",
        daysAgo: 180,
        description: "Hamstring strain from overexertion",
      },
    ],
  },
  {
    playerLastName: "Kelly_Demo",
    injuries: [
      {
        injuryType: "Bruised ribs",
        bodyPart: "Ribs",
        status: "healed",
        severity: "minor",
        daysAgo: 400,
        description: "Contact injury during match",
      },
    ],
  },
  {
    playerLastName: "Walsh_Demo",
    injuries: [
      {
        injuryType: "Hamstring strain",
        bodyPart: "Hamstring",
        status: "healed",
        severity: "minor",
        daysAgo: 200,
        description: "Hamstring strain during training",
      },
      {
        injuryType: "Knee sprain",
        bodyPart: "Knee",
        status: "active",
        severity: "minor",
        daysAgo: 7,
        description: "Minor knee sprain, currently resting",
      },
    ],
  },
  {
    playerLastName: "Byrne_Demo",
    injuries: [
      {
        injuryType: "Concussion",
        bodyPart: "Head",
        status: "healed",
        severity: "moderate",
        daysAgo: 500,
        description: "Concussion from collision, fully recovered",
      },
    ],
  },
  {
    playerLastName: "Doherty_Demo",
    injuries: [
      {
        injuryType: "ACL tear",
        bodyPart: "Knee",
        status: "healed",
        severity: "severe",
        daysAgo: 600,
        description: "Previous ACL tear, surgically repaired",
      },
      {
        injuryType: "ACL recovery",
        bodyPart: "Knee",
        status: "recovering",
        severity: "long_term",
        daysAgo: 60,
        description: "ACL reconstruction recovery, following rehab protocol",
        hasReturnProtocol: true,
      },
    ],
  },
];

// ============ HELPER FUNCTIONS ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate 3 assessment dates spread over 3 months showing progression
 */
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

/**
 * Generate progressive ratings showing improvement trend
 */
function generateProgressiveRatings(
  baseMin: number,
  baseMax: number
): number[] {
  const progression = [0, 0.2, 0.5]; // Slight improvement each assessment
  return progression.map((p) => {
    const rating = baseMin + (baseMax - baseMin) * (0.3 + p);
    return Math.min(5, Math.max(1, Math.round(rating * 2) / 2)); // Round to 0.5
  });
}

// ============ MAIN SEED FUNCTION ============

export const seedDemoClub = mutation({
  args: {
    ownerEmail: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    created: v.optional(
      v.object({
        organizationId: v.string(),
        teams: v.number(),
        players: v.number(),
        passports: v.number(),
        assessments: v.number(),
        goals: v.number(),
        medicalProfiles: v.number(),
        injuries: v.number(),
        guardianLinks: v.number(),
      })
    ),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log("🎯 Starting Demo Club seed...");
    console.log(`  Owner email: ${args.ownerEmail}`);

    if (args.dryRun) {
      console.log("  [DRY RUN MODE - no changes will be made]");
    }

    const stats = {
      teams: 0,
      players: 0,
      passports: 0,
      assessments: 0,
      goals: 0,
      medicalProfiles: 0,
      injuries: 0,
      guardianLinks: 0,
    };

    try {
      // 1. Find existing user
      console.log("\n👤 Step 1: Finding user...");
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: args.ownerEmail, operator: "eq" }],
      });

      if (!user) {
        return {
          success: false,
          message: `User ${args.ownerEmail} not found. Please sign up through the web UI first.`,
        };
      }
      console.log(`  ✓ Found user: ${user.name || user.email}`);

      // 2. Check/create demo organization
      console.log("\n🏢 Step 2: Setting up demo organization...");
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
      });

      let orgId: string;

      if (org) {
        console.log(`  ✓ Demo organization exists: ${org.name}`);
        orgId = org._id as string;
      } else if (args.dryRun) {
        console.log("  [DRY RUN] Would create organization");
        orgId = "dry-run-org-id";
      } else {
        const orgResult = await ctx.runMutation(
          components.betterAuth.adapter.create,
          {
            input: {
              model: "organization",
              data: {
                name: DEMO_ORG.name,
                slug: DEMO_ORG.slug,
                colors: DEMO_ORG.colors,
                supportedSports: DEMO_ORG.supportedSports,
                createdAt: Date.now(),
                metadata: JSON.stringify({
                  isDemo: true,
                  createdBy: "Demo Club Seed",
                }),
              },
            },
          }
        );
        orgId = orgResult._id as string;
        console.log(`  ✅ Created organization: ${DEMO_ORG.name}`);

        // Add user as owner
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "member",
            data: {
              userId: user._id,
              organizationId: orgId,
              role: "owner",
              functionalRoles: ["admin", "coach", "parent"],
              activeFunctionalRole: "admin",
              createdAt: Date.now(),
            },
          },
        });
        console.log(`  ✅ Added ${args.ownerEmail} as owner`);
      }

      // 3. Create teams
      console.log("\n⚽ Step 3: Creating teams...");
      const teamMap: Record<string, string> = {};

      const existingTeamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 100 },
          where: [{ field: "organizationId", value: orgId, operator: "eq" }],
        }
      );
      const existingTeamsMap = new Map<string, string>(
        // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped records
        existingTeamsResult.page.map((team: any) => [team.name, team._id])
      );

      for (const teamConfig of DEMO_TEAMS) {
        const existingTeamId = existingTeamsMap.get(teamConfig.name);

        if (existingTeamId) {
          console.log(`    ✓ Team exists: ${teamConfig.name}`);
          teamMap[teamConfig.name] = existingTeamId;
        } else if (args.dryRun) {
          console.log(`    [DRY RUN] Would create team: ${teamConfig.name}`);
          teamMap[teamConfig.name] = `dry-run-team-${teamConfig.name}`;
        } else {
          const teamId = await ctx.runMutation(api.models.teams.createTeam, {
            name: teamConfig.name,
            organizationId: orgId,
            sport: teamConfig.sport,
            ageGroup: teamConfig.ageGroup,
            gender: teamConfig.gender,
            season: "2026",
            isActive: true,
          });
          teamMap[teamConfig.name] = teamId;
          console.log(`    ✅ Created team: ${teamConfig.name}`);
          stats.teams += 1;
        }
      }

      // 4. Create players with multi-team assignments
      console.log(
        "\n👶 Step 4: Creating players with multi-team assignments..."
      );
      const playerIdentityIds: Id<"playerIdentities">[] = [];

      for (const playerConfig of DEMO_PLAYERS) {
        // Check if player exists
        const existing = await ctx.db
          .query("playerIdentities")
          .withIndex("by_name_dob", (q) =>
            q
              .eq("firstName", playerConfig.firstName)
              .eq("lastName", playerConfig.lastName)
          )
          .first();

        let playerIdentityId: Id<"playerIdentities">;

        if (existing) {
          console.log(
            `    ✓ Player exists: ${playerConfig.firstName} ${playerConfig.lastName}`
          );
          playerIdentityId = existing._id;
        } else if (args.dryRun) {
          console.log(
            `    [DRY RUN] Would create: ${playerConfig.firstName} ${playerConfig.lastName}`
          );
          continue;
        } else {
          const result = await ctx.runMutation(
            api.models.playerIdentities.findOrCreatePlayer,
            {
              firstName: playerConfig.firstName,
              lastName: playerConfig.lastName,
              dateOfBirth: playerConfig.dateOfBirth,
              gender: playerConfig.gender,
              createdFrom: "demo_seed",
            }
          );
          playerIdentityId = result.playerIdentityId;
          console.log(
            `    ✅ Created player: ${playerConfig.firstName} ${playerConfig.lastName} (${playerConfig.performanceLevel})`
          );
          stats.players += 1;
        }

        playerIdentityIds.push(playerIdentityId);

        if (!args.dryRun) {
          // Enroll in organization
          const existingEnrollment = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_player_and_org", (q) =>
              q
                .eq("playerIdentityId", playerIdentityId)
                .eq("organizationId", orgId)
            )
            .first();

          if (!existingEnrollment) {
            await ctx.runMutation(
              api.models.orgPlayerEnrollments.enrollPlayer,
              {
                playerIdentityId,
                organizationId: orgId,
                ageGroup: "u14",
                season: "2026",
                sportCode: playerConfig.primarySport,
                status: "active" as const,
              }
            );
          }

          // Assign to primary team
          const primaryTeamId = teamMap[playerConfig.primaryTeam];
          if (primaryTeamId) {
            const existingPrimaryAssignment = await ctx.db
              .query("teamPlayerIdentities")
              .withIndex("by_team_and_player", (q) =>
                q
                  .eq("teamId", primaryTeamId)
                  .eq("playerIdentityId", playerIdentityId)
              )
              .first();

            if (!existingPrimaryAssignment) {
              await ctx.db.insert("teamPlayerIdentities", {
                teamId: primaryTeamId,
                playerIdentityId,
                organizationId: orgId,
                status: "active" as const,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          }

          // Assign to secondary team
          const secondaryTeamId = teamMap[playerConfig.secondaryTeam];
          if (secondaryTeamId) {
            const existingSecondaryAssignment = await ctx.db
              .query("teamPlayerIdentities")
              .withIndex("by_team_and_player", (q) =>
                q
                  .eq("teamId", secondaryTeamId)
                  .eq("playerIdentityId", playerIdentityId)
              )
              .first();

            if (!existingSecondaryAssignment) {
              await ctx.db.insert("teamPlayerIdentities", {
                teamId: secondaryTeamId,
                playerIdentityId,
                organizationId: orgId,
                status: "active" as const,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          }

          // 5. Create sport passports and assessments for both sports
          const sports = [
            playerConfig.primarySport,
            playerConfig.secondarySport,
          ];
          for (const sportCode of sports) {
            console.log(`      📋 Creating passport for ${sportCode}...`);

            // Create or get sport passport
            const passportResult = await ctx.runMutation(
              api.models.sportPassports.findOrCreatePassport,
              {
                playerIdentityId: playerIdentityId as Id<"playerIdentities">,
                sportCode,
                organizationId: orgId,
              }
            );
            stats.passports += 1;

            // Generate 3 assessments
            const assessmentDates = generateAssessmentDates();
            const performanceConfig =
              PERFORMANCE_CONFIG[playerConfig.performanceLevel];
            const ratings = generateProgressiveRatings(
              performanceConfig.ratingsRange.min,
              performanceConfig.ratingsRange.max
            );

            // Get skill categories for this sport
            const categories = await ctx.db
              .query("skillCategories")
              .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
              .filter((q) => q.eq(q.field("isActive"), true))
              .collect();

            // Get skill definitions for this sport
            const allSkills = await ctx.db
              .query("skillDefinitions")
              .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
              .filter((q) => q.eq(q.field("isActive"), true))
              .collect();

            if (allSkills.length > 0 && categories.length > 0) {
              // Group skills by category
              const skillsByCategory = new Map<string, typeof allSkills>();
              for (const skill of allSkills) {
                const catId = skill.categoryId as string;
                if (!skillsByCategory.has(catId)) {
                  skillsByCategory.set(catId, []);
                }
                skillsByCategory.get(catId)?.push(skill);
              }

              // Create category-specific rating modifiers for variety
              // Each category gets a modifier: -1, 0, or +1 relative to base rating
              const categoryIds = Array.from(skillsByCategory.keys());
              const categoryModifiers = new Map<string, number>();

              // Assign modifiers to create strengths and weaknesses
              // First 1-2 categories are strengths (+1), last 1-2 are weaknesses (-1)
              categoryIds.forEach((catId, index) => {
                if (index < Math.ceil(categoryIds.length / 3)) {
                  categoryModifiers.set(catId, 1); // Strength
                } else if (
                  index >=
                  categoryIds.length - Math.ceil(categoryIds.length / 3)
                ) {
                  categoryModifiers.set(catId, -1); // Weakness
                } else {
                  categoryModifiers.set(catId, 0); // Average
                }
              });

              // Assess ALL skills from ALL categories for complete coverage
              const skillsToAssess: Array<{
                skill: (typeof allSkills)[0];
                categoryId: string;
              }> = [];
              for (const [categoryId, categorySkills] of skillsByCategory) {
                // Include ALL skills from each category
                for (const skill of categorySkills) {
                  skillsToAssess.push({ skill, categoryId });
                }
              }

              for (let i = 0; i < 3; i++) {
                const assessmentData = skillsToAssess.map(
                  ({ skill, categoryId }, skillIndex) => {
                    // Base rating from performance level
                    const baseRating = ratings[i];
                    // Category modifier (+1 strength, 0 average, -1 weakness)
                    const categoryMod = categoryModifiers.get(categoryId) || 0;

                    // Add individual skill variation for realistic spread
                    // Use skill index to create consistent but varied ratings
                    // Range: -1 to +1 based on skill position and randomness
                    const skillVariation =
                      ((skillIndex % 5) - 2) * 0.3 + // Position-based: -0.6 to +0.6
                      (Math.random() - 0.5) * 0.5; // Random: -0.25 to +0.25

                    // Calculate final rating, clamped between 1 and 5
                    let finalRating = baseRating + categoryMod + skillVariation;
                    finalRating = Math.max(1, Math.min(5, finalRating));
                    // Round to nearest 0.5
                    finalRating = Math.round(finalRating * 2) / 2;

                    return {
                      skillCode: skill.code,
                      rating: finalRating,
                      notes: i === 2 ? "Most recent assessment" : undefined,
                    };
                  }
                );

                await ctx.runMutation(
                  api.models.skillAssessments.recordBatchAssessments,
                  {
                    passportId: passportResult.passportId,
                    assessmentDate: assessmentDates[i],
                    assessmentType: i === 0 ? "initial" : "training",
                    assessedByName: "Demo Coach",
                    assessorRole: "coach" as const,
                    ratings: assessmentData,
                  }
                );
                stats.assessments += assessmentData.length;
              }

              // Update passport with final rating and assessment count
              const finalRating = ratings[2]; // Most recent rating
              await ctx.runMutation(api.models.sportPassports.updateRatings, {
                passportId: passportResult.passportId,
                currentOverallRating: finalRating,
                incrementAssessmentCount: false,
              });

              // Update assessment count and last assessment date directly
              await ctx.db.patch(passportResult.passportId, {
                assessmentCount: 3,
                lastAssessmentDate: assessmentDates[2],
                lastAssessmentType: "training",
              });
            }
          }

          // 6. Create development goals
          console.log("      🎯 Creating development goals...");
          const performanceConfig =
            PERFORMANCE_CONFIG[playerConfig.performanceLevel];

          // Get the primary sport passport for goals
          const primaryPassport = await ctx.db
            .query("sportPassports")
            .withIndex("by_player_and_sport", (q) =>
              q
                .eq("playerIdentityId", playerIdentityId)
                .eq("sportCode", playerConfig.primarySport)
            )
            .first();

          if (primaryPassport) {
            const goalTitles = [
              "Improve first touch control",
              "Develop game awareness",
              "Build physical endurance",
            ];

            for (let g = 0; g < performanceConfig.goalCount; g++) {
              const goalId = await ctx.runMutation(
                api.models.passportGoals.createGoal,
                {
                  passportId: primaryPassport._id,
                  title: goalTitles[g],
                  description: `Focus on developing ${goalTitles[g].toLowerCase()} through structured training.`,
                  category: ["technical", "tactical", "physical"][g] as
                    | "technical"
                    | "tactical"
                    | "physical",
                  priority:
                    playerConfig.performanceLevel === "overachieving"
                      ? "low"
                      : "high",
                  targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  linkedSkills: [],
                  parentCanView: true,
                }
              );

              // Update progress
              const progress = randomInt(
                performanceConfig.progressRange.min,
                performanceConfig.progressRange.max
              );
              await ctx.runMutation(
                api.models.passportGoals.updateGoalProgress,
                {
                  goalId,
                  progress,
                }
              );

              // Mark as completed if overachieving
              if (performanceConfig.goalStatus === "completed") {
                await ctx.runMutation(api.models.passportGoals.updateGoal, {
                  goalId,
                  status: "completed",
                });
              }

              stats.goals += 1;
            }
          }
        }
      }

      // 7. Create medical profiles
      console.log("\n🏥 Step 5: Creating medical profiles...");

      if (!args.dryRun) {
        for (let i = 0; i < playerIdentityIds.length; i++) {
          const playerIdentityId = playerIdentityIds[i];
          const playerConfig = DEMO_PLAYERS[i];
          const medicalData = MEDICAL_DATA.find(
            (m) => m.playerLastName === playerConfig.lastName
          );

          if (medicalData) {
            await ctx.runMutation(
              api.models.medicalProfiles.upsertForIdentity,
              {
                playerIdentityId,
                organizationId: orgId,
                ageGroup: "u14",
                sport: playerConfig.primarySport,
                bloodType: medicalData.bloodType,
                allergies: medicalData.allergies,
                medications: medicalData.medications,
                conditions: medicalData.conditions,
                doctorName: "Dr. Demo",
                doctorPhone: "+353 1 555 0100",
                emergencyContact1Name: "Demo Parent",
                emergencyContact1Phone: "+353 87 555 0101",
                emergencyContact2Name: "Demo Guardian",
                emergencyContact2Phone: "+353 87 555 0102",
                lastMedicalCheck: "2025-09-01",
                insuranceCovered: true,
                notes:
                  medicalData.conditions.length > 0
                    ? "Please see coach for specific accommodations"
                    : undefined,
              }
            );
            stats.medicalProfiles += 1;
            console.log(
              `    ✅ Created medical profile: ${playerConfig.firstName} ${playerConfig.lastName}`
            );
          }
        }
      }

      // 8. Create injury records
      console.log("\n🩹 Step 6: Creating injury records...");

      if (!args.dryRun) {
        for (let i = 0; i < playerIdentityIds.length; i++) {
          const playerIdentityId = playerIdentityIds[i];
          const playerConfig = DEMO_PLAYERS[i];
          const injuryData = INJURY_DATA.find(
            (inj) => inj.playerLastName === playerConfig.lastName
          );

          if (injuryData) {
            for (const injury of injuryData.injuries) {
              const injuryDate = new Date(
                Date.now() - injury.daysAgo * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0];

              // Build return to play protocol for long-term injuries
              let returnToPlayProtocol:
                | Array<{
                    id: string;
                    step: number;
                    description: string;
                    completed: boolean;
                    completedDate?: string;
                  }>
                | undefined;

              if (injury.hasReturnProtocol) {
                returnToPlayProtocol = [
                  {
                    id: "1",
                    step: 1,
                    description: "Complete rest and initial healing",
                    completed: true,
                    completedDate: new Date(
                      Date.now() - 45 * 24 * 60 * 60 * 1000
                    )
                      .toISOString()
                      .split("T")[0],
                  },
                  {
                    id: "2",
                    step: 2,
                    description: "Light mobility exercises",
                    completed: true,
                    completedDate: new Date(
                      Date.now() - 30 * 24 * 60 * 60 * 1000
                    )
                      .toISOString()
                      .split("T")[0],
                  },
                  {
                    id: "3",
                    step: 3,
                    description: "Strength rehabilitation",
                    completed: true,
                    completedDate: new Date(
                      Date.now() - 14 * 24 * 60 * 60 * 1000
                    )
                      .toISOString()
                      .split("T")[0],
                  },
                  {
                    id: "4",
                    step: 4,
                    description: "Sport-specific drills",
                    completed: false,
                  },
                  {
                    id: "5",
                    step: 5,
                    description: "Light training with team",
                    completed: false,
                  },
                  {
                    id: "6",
                    step: 6,
                    description: "Full training and match clearance",
                    completed: false,
                  },
                ];
              }

              await ctx.db.insert("playerInjuries", {
                playerIdentityId,
                injuryType: injury.injuryType,
                bodyPart: injury.bodyPart,
                side: "right" as const,
                dateOccurred: injuryDate,
                dateReported: injuryDate,
                severity: injury.severity,
                status: injury.status,
                description: injury.description,
                mechanism: "Contact during play",
                treatment:
                  injury.status === "healed"
                    ? "RICE protocol, physiotherapy - fully recovered"
                    : "Ongoing rehabilitation",
                medicalProvider: "Club Physiotherapist",
                expectedReturn:
                  injury.status === "recovering"
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0]
                    : undefined,
                actualReturn:
                  injury.status === "healed"
                    ? new Date(
                        Date.now() - (injury.daysAgo - 30) * 24 * 60 * 60 * 1000
                      )
                        .toISOString()
                        .split("T")[0]
                    : undefined,
                daysOut: injury.status === "healed" ? 21 : undefined,
                returnToPlayProtocol,
                occurredDuring: "training",
                occurredAtOrgId: orgId,
                sportCode: playerConfig.primarySport,
                isVisibleToAllOrgs: true,
                reportedBy: user._id,
                reportedByRole: "coach",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              stats.injuries += 1;
            }
            console.log(
              `    ✅ Created ${injuryData.injuries.length} injury record(s): ${playerConfig.firstName} ${playerConfig.lastName}`
            );
          }
        }
      }

      // 9. Create guardian links
      console.log("\n👨‍👩‍👧 Step 7: Creating guardian links...");

      if (!args.dryRun) {
        // Create guardian identity for owner
        let guardianIdentityId: Id<"guardianIdentities">;

        const existingGuardian = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_userId", (q) => q.eq("userId", user._id as string))
          .first();

        if (existingGuardian) {
          guardianIdentityId = existingGuardian._id;
          console.log("    ✓ Guardian identity exists");
        } else {
          const nameParts = (user.name || "Demo Parent").split(" ");
          guardianIdentityId = await ctx.db.insert("guardianIdentities", {
            firstName: nameParts[0] || "Demo",
            lastName: nameParts.slice(1).join(" ") || "Parent",
            email: args.ownerEmail,
            userId: user._id as string,
            verificationStatus: "email_verified",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdFrom: "demo_seed",
          });
          console.log("    ✅ Created guardian identity");
        }

        // Create org guardian profile
        const existingOrgProfile = await ctx.db
          .query("orgGuardianProfiles")
          .withIndex("by_guardian_and_org", (q) =>
            q
              .eq("guardianIdentityId", guardianIdentityId)
              .eq("organizationId", orgId)
          )
          .first();

        if (!existingOrgProfile) {
          await ctx.db.insert("orgGuardianProfiles", {
            guardianIdentityId,
            organizationId: orgId,
            emergencyPriority: 1,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Link first 5 players (acknowledged)
        for (let i = 0; i < Math.min(5, playerIdentityIds.length); i++) {
          const playerIdentityId = playerIdentityIds[i];

          const existingLink = await ctx.db
            .query("guardianPlayerLinks")
            .withIndex("by_guardian_and_player", (q) =>
              q
                .eq("guardianIdentityId", guardianIdentityId)
                .eq("playerIdentityId", playerIdentityId)
            )
            .first();

          if (!existingLink) {
            await ctx.db.insert("guardianPlayerLinks", {
              guardianIdentityId,
              playerIdentityId,
              relationship: "guardian",
              isPrimary: true,
              hasParentalResponsibility: true,
              canCollectFromTraining: true,
              consentedToSharing: true,
              acknowledgedByParentAt: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            stats.guardianLinks += 1;
          }
        }
        console.log("    ✅ Linked 5 players as acknowledged");

        // Create pending link for player 6 (Niamh Doherty) using the SAME guardian identity
        // This tests the "pending children for claimed guardian" flow - where a parent
        // already has a claimed guardian identity but a new child is added that needs acknowledgment
        if (playerIdentityIds.length >= 6 && guardianIdentityId) {
          const pendingPlayerIdentityId = playerIdentityIds[5];

          // Use the same guardian identity but create a link WITHOUT acknowledgedByParentAt
          // This triggers the pending claim prompt on the parent dashboard
          await ctx.db.insert("guardianPlayerLinks", {
            guardianIdentityId,
            playerIdentityId: pendingPlayerIdentityId,
            relationship: "guardian",
            isPrimary: true,
            hasParentalResponsibility: true,
            canCollectFromTraining: true,
            consentedToSharing: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // NOTE: No acknowledgedByParentAt = pending claim
          });
          stats.guardianLinks += 1;
          console.log(
            "    ✅ Created PENDING guardian link for Niamh Doherty_Demo (same guardian, pending acknowledgment)"
          );
        }

        // 8. Create coach assignment for owner
        console.log("\n🏋️ Step 8: Creating coach assignment...");
        const allTeamIds = Object.values(teamMap);

        // Check if coach assignment exists
        const existingCoachAssignment = await ctx.db
          .query("coachAssignments")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), user._id as string),
              q.eq(q.field("organizationId"), orgId)
            )
          )
          .first();

        if (existingCoachAssignment) {
          // Update with current team IDs (in case teams were recreated)
          await ctx.db.patch(existingCoachAssignment._id, {
            teams: allTeamIds,
            updatedAt: Date.now(),
          });
          console.log(
            `    ✅ Updated coach assignment with ${allTeamIds.length} teams`
          );
        } else {
          await ctx.db.insert("coachAssignments", {
            userId: user._id as string,
            organizationId: orgId,
            teams: allTeamIds,
            ageGroups: ["U14"],
            sport: "soccer",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          console.log(`    ✅ Assigned as coach to ${allTeamIds.length} teams`);
        }
      }

      // Summary
      console.log(`\n${"=".repeat(60)}`);
      console.log("✅ Demo Club Seed Complete!");
      console.log("=".repeat(60));
      console.log(`Teams:           ${stats.teams} created`);
      console.log(`Players:         ${stats.players} created`);
      console.log(`Passports:       ${stats.passports} created`);
      console.log(`Assessments:     ${stats.assessments} created`);
      console.log(`Goals:           ${stats.goals} created`);
      console.log(`Medical:         ${stats.medicalProfiles} profiles created`);
      console.log(`Injuries:        ${stats.injuries} records created`);
      console.log(`Guardian Links:  ${stats.guardianLinks} created`);
      console.log("=".repeat(60));
      console.log(`\nDemo Organization: ${DEMO_ORG.name}`);
      console.log(`Owner: ${args.ownerEmail}`);
      console.log(`URL: /orgs/${orgId}`);
      console.log("=".repeat(60));

      return {
        success: true,
        created: {
          organizationId: orgId,
          ...stats,
        },
      };
    } catch (error) {
      console.error("❌ Error during seed:", error);
      return {
        success: false,
        message: String(error),
      };
    }
  },
});

// ============ CLEANUP FUNCTIONS ============

/**
 * Preview what will be deleted (dry run)
 */
export const previewDemoClubCleanup = query({
  args: {},
  returns: v.object({
    found: v.boolean(),
    counts: v.object({
      players: v.number(),
      teams: v.number(),
      passports: v.number(),
      assessments: v.number(),
      goals: v.number(),
      medicalProfiles: v.number(),
      injuries: v.number(),
      guardianLinks: v.number(),
      guardianIdentities: v.number(),
      coachAssignments: v.number(),
    }),
    playerNames: v.array(v.string()),
    teamNames: v.array(v.string()),
  }),
  handler: async (ctx) => {
    // Find demo players by _Demo suffix
    const demoPlayers = await ctx.db
      .query("playerIdentities")
      .filter((q) =>
        q.or(
          q.eq(q.field("lastName"), "O'Brien_Demo"),
          q.eq(q.field("lastName"), "Murphy_Demo"),
          q.eq(q.field("lastName"), "Kelly_Demo"),
          q.eq(q.field("lastName"), "Walsh_Demo"),
          q.eq(q.field("lastName"), "Byrne_Demo"),
          q.eq(q.field("lastName"), "Doherty_Demo"),
          q.eq(q.field("lastName"), "Guardian_Demo")
        )
      )
      .collect();

    const playerIds = demoPlayers.map((p) => p._id);
    const playerNames = demoPlayers.map((p) => `${p.firstName} ${p.lastName}`);

    // Find demo organization
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
    });

    if (!org) {
      return {
        found: false,
        counts: {
          players: 0,
          teams: 0,
          passports: 0,
          assessments: 0,
          goals: 0,
          medicalProfiles: 0,
          injuries: 0,
          guardianLinks: 0,
          guardianIdentities: 0,
          coachAssignments: 0,
        },
        playerNames: [],
        teamNames: [],
      };
    }

    const orgId = org._id as string;

    // Count demo teams
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 100 },
        where: [{ field: "organizationId", value: orgId, operator: "eq" }],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped records
    const demoTeams = teamsResult.page.filter((t: any) =>
      t.name.startsWith("Demo ")
    );
    // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped records
    const teamNames = demoTeams.map((t: any) => t.name);

    // Count passports
    let passportCount = 0;
    let assessmentCount = 0;
    let goalCount = 0;
    for (const playerId of playerIds) {
      const passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();
      passportCount += passports.length;

      for (const passport of passports) {
        const assessments = await ctx.db
          .query("skillAssessments")
          .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
          .collect();
        assessmentCount += assessments.length;

        const goals = await ctx.db
          .query("passportGoals")
          .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
          .collect();
        goalCount += goals.length;
      }
    }

    // Count injuries
    let injuryCount = 0;
    for (const playerId of playerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();
      injuryCount += injuries.length;
    }

    // Count medical profiles (via legacy players)
    const legacyPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .filter((q) =>
        q.or(
          q.eq(q.field("name"), "Sean O'Brien_Demo"),
          q.eq(q.field("name"), "Cian Murphy_Demo"),
          q.eq(q.field("name"), "Aoife Kelly_Demo"),
          q.eq(q.field("name"), "Roisin Walsh_Demo"),
          q.eq(q.field("name"), "Conor Byrne_Demo"),
          q.eq(q.field("name"), "Niamh Doherty_Demo")
        )
      )
      .collect();

    let medicalCount = 0;
    for (const player of legacyPlayers) {
      const profile = await ctx.db
        .query("medicalProfiles")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .first();
      if (profile) {
        medicalCount += 1;
      }
    }

    // Count guardian links and identities
    let guardianLinkCount = 0;
    for (const playerId of playerIds) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
        .collect();
      guardianLinkCount += links.length;
    }

    const demoGuardians = await ctx.db
      .query("guardianIdentities")
      .filter((q) => q.eq(q.field("createdFrom"), "demo_seed"))
      .collect();

    // Count coach assignments
    let coachAssignmentCount = 0;
    if (orgId) {
      const coachAssignments = await ctx.db
        .query("coachAssignments")
        .filter((q) => q.eq(q.field("organizationId"), orgId))
        .collect();
      coachAssignmentCount = coachAssignments.length;
    }

    return {
      found: true,
      counts: {
        players: demoPlayers.length,
        teams: demoTeams.length,
        passports: passportCount,
        assessments: assessmentCount,
        goals: goalCount,
        medicalProfiles: medicalCount,
        injuries: injuryCount,
        guardianLinks: guardianLinkCount,
        guardianIdentities: demoGuardians.length,
        coachAssignments: coachAssignmentCount,
      },
      playerNames,
      teamNames,
    };
  },
});

/**
 * Cleanup all demo club data
 */
export const cleanupDemoClub = mutation({
  args: {
    confirmDelete: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    deleted: v.object({
      players: v.number(),
      teams: v.number(),
      passports: v.number(),
      assessments: v.number(),
      goals: v.number(),
      medicalProfiles: v.number(),
      injuries: v.number(),
      guardianLinks: v.number(),
      guardianIdentities: v.number(),
      legacyPlayers: v.number(),
      enrollments: v.number(),
      teamAssignments: v.number(),
      coachAssignments: v.number(),
    }),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmDelete) {
      return {
        success: false,
        deleted: {
          players: 0,
          teams: 0,
          passports: 0,
          assessments: 0,
          goals: 0,
          medicalProfiles: 0,
          injuries: 0,
          guardianLinks: 0,
          guardianIdentities: 0,
          legacyPlayers: 0,
          enrollments: 0,
          teamAssignments: 0,
          coachAssignments: 0,
        },
        message: "Cleanup cancelled - confirmDelete must be true",
      };
    }

    console.log("🗑️  Starting Demo Club cleanup...");

    const stats = {
      players: 0,
      teams: 0,
      passports: 0,
      assessments: 0,
      goals: 0,
      medicalProfiles: 0,
      injuries: 0,
      guardianLinks: 0,
      guardianIdentities: 0,
      legacyPlayers: 0,
      enrollments: 0,
      teamAssignments: 0,
      coachAssignments: 0,
    };

    try {
      // Find demo players by _Demo suffix
      const demoPlayers = await ctx.db
        .query("playerIdentities")
        .filter((q) =>
          q.or(
            q.eq(q.field("lastName"), "O'Brien_Demo"),
            q.eq(q.field("lastName"), "Murphy_Demo"),
            q.eq(q.field("lastName"), "Kelly_Demo"),
            q.eq(q.field("lastName"), "Walsh_Demo"),
            q.eq(q.field("lastName"), "Byrne_Demo"),
            q.eq(q.field("lastName"), "Doherty_Demo")
          )
        )
        .collect();

      const playerIds = demoPlayers.map((p) => p._id);

      // Find demo organization
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
      });

      const orgId = org?._id as string | undefined;

      // 1. Delete skill assessments
      console.log("  📊 Deleting skill assessments...");
      for (const playerId of playerIds) {
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
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
        }
      }

      // 2. Delete goals
      console.log("  🎯 Deleting goals...");
      for (const playerId of playerIds) {
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
          )
          .collect();

        for (const passport of passports) {
          const goals = await ctx.db
            .query("passportGoals")
            .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
            .collect();

          for (const goal of goals) {
            await ctx.db.delete(goal._id);
            stats.goals += 1;
          }
        }
      }

      // 3. Delete injuries
      console.log("  🩹 Deleting injuries...");
      for (const playerId of playerIds) {
        const injuries = await ctx.db
          .query("playerInjuries")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
          )
          .collect();

        for (const injury of injuries) {
          await ctx.db.delete(injury._id);
          stats.injuries += 1;
        }
      }

      // 4. Delete medical profiles (via legacy players)
      console.log("  🏥 Deleting medical profiles...");
      if (orgId) {
        const legacyPlayers = await ctx.db
          .query("players")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
          .filter((q) =>
            q.or(
              q.eq(q.field("name"), "Sean O'Brien_Demo"),
              q.eq(q.field("name"), "Cian Murphy_Demo"),
              q.eq(q.field("name"), "Aoife Kelly_Demo"),
              q.eq(q.field("name"), "Roisin Walsh_Demo"),
              q.eq(q.field("name"), "Conor Byrne_Demo"),
              q.eq(q.field("name"), "Niamh Doherty_Demo")
            )
          )
          .collect();

        for (const player of legacyPlayers) {
          const profile = await ctx.db
            .query("medicalProfiles")
            .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
            .first();

          if (profile) {
            await ctx.db.delete(profile._id);
            stats.medicalProfiles += 1;
          }

          await ctx.db.delete(player._id);
          stats.legacyPlayers += 1;
        }
      }

      // 5. Delete team assignments
      console.log("  👥 Deleting team assignments...");
      for (const playerId of playerIds) {
        const assignments = await ctx.db
          .query("teamPlayerIdentities")
          .filter((q) => q.eq(q.field("playerIdentityId"), playerId))
          .collect();

        for (const assignment of assignments) {
          await ctx.db.delete(assignment._id);
          stats.teamAssignments += 1;
        }
      }

      // 6. Delete sport passports
      console.log("  📋 Deleting sport passports...");
      for (const playerId of playerIds) {
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
          )
          .collect();

        for (const passport of passports) {
          await ctx.db.delete(passport._id);
          stats.passports += 1;
        }
      }

      // 7. Delete org enrollments
      console.log("  📝 Deleting enrollments...");
      for (const playerId of playerIds) {
        const enrollments = await ctx.db
          .query("orgPlayerEnrollments")
          .filter((q) => q.eq(q.field("playerIdentityId"), playerId))
          .collect();

        for (const enrollment of enrollments) {
          await ctx.db.delete(enrollment._id);
          stats.enrollments += 1;
        }
      }

      // 8. Delete guardian links
      console.log("  🔗 Deleting guardian links...");
      for (const playerId of playerIds) {
        const links = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .collect();

        for (const link of links) {
          await ctx.db.delete(link._id);
          stats.guardianLinks += 1;
        }
      }

      // 9. Delete demo guardian identities
      console.log("  👨‍👩‍👧 Deleting guardian identities...");
      const demoGuardians = await ctx.db
        .query("guardianIdentities")
        .filter((q) => q.eq(q.field("createdFrom"), "demo_seed"))
        .collect();

      for (const guardian of demoGuardians) {
        // Delete org guardian profiles for this guardian
        const profiles = await ctx.db
          .query("orgGuardianProfiles")
          .withIndex("by_guardianIdentityId", (q) =>
            q.eq("guardianIdentityId", guardian._id)
          )
          .collect();

        for (const profile of profiles) {
          await ctx.db.delete(profile._id);
        }

        await ctx.db.delete(guardian._id);
        stats.guardianIdentities += 1;
      }

      // Also delete the pending guardian
      const pendingGuardian = await ctx.db
        .query("guardianIdentities")
        .filter((q) => q.eq(q.field("lastName"), "Guardian_Demo"))
        .first();

      if (pendingGuardian) {
        await ctx.db.delete(pendingGuardian._id);
        stats.guardianIdentities += 1;
      }

      // 10. Delete player identities
      console.log("  👶 Deleting player identities...");
      for (const player of demoPlayers) {
        await ctx.db.delete(player._id);
        stats.players += 1;
      }

      // 11. Delete coach assignments
      console.log("  🏋️ Deleting coach assignments...");
      if (orgId) {
        const coachAssignments = await ctx.db
          .query("coachAssignments")
          .filter((q) => q.eq(q.field("organizationId"), orgId))
          .collect();

        for (const assignment of coachAssignments) {
          await ctx.db.delete(assignment._id);
          stats.coachAssignments += 1;
        }
      }

      // 12. Delete demo teams
      console.log("  ⚽ Deleting demo teams...");
      if (orgId) {
        const teamsResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "team",
            paginationOpts: { cursor: null, numItems: 100 },
            where: [{ field: "organizationId", value: orgId, operator: "eq" }],
          }
        );

        for (const team of teamsResult.page) {
          // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped records
          if ((team as any).name.startsWith("Demo ")) {
            await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
              input: {
                model: "team",
                where: [{ field: "_id", value: team._id, operator: "eq" }],
              },
            });
            stats.teams += 1;
          }
        }
      }

      console.log("✅ Demo Club cleanup complete");
      console.log(
        `  Deleted: ${stats.players} players, ${stats.teams} teams, ${stats.passports} passports`
      );
      console.log(
        `  Deleted: ${stats.assessments} assessments, ${stats.goals} goals`
      );
      console.log(
        `  Deleted: ${stats.medicalProfiles} medical profiles, ${stats.injuries} injuries`
      );
      console.log(
        `  Deleted: ${stats.guardianLinks} guardian links, ${stats.guardianIdentities} guardian identities`
      );
      console.log(`  Deleted: ${stats.coachAssignments} coach assignments`);

      return {
        success: true,
        deleted: stats,
      };
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      return {
        success: false,
        deleted: stats,
        message: String(error),
      };
    }
  },
});
