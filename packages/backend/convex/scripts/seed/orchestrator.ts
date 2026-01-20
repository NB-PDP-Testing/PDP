/**
 * Production Demo Seeding Orchestrator (Better Auth Integrated)
 *
 * CRITICAL: This script uses Better Auth adapter for all organization/member operations.
 * Users MUST be created through Better Auth sign-up flow before running this script.
 *
 * Prerequisites:
 * 1. User signs up through web UI (email/password or OAuth)
 * 2. User is made platform staff via bootstrapPlatformStaff script
 * 3. Then run this script with their email
 *
 * Creates:
 * - Demo Club organization (via Better Auth adapter)
 * - 6 teams across 3 sports and age groups
 * - 10 players (3 beginner, 4 developing, 3 advanced)
 * - Realistic passport data with assessments and goals
 * - 35-40 training session plans
 */

import { v } from "convex/values";
import { api, components, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import type { PlayerStage } from "./helpers/playerStages";

/**
 * Demo organization configuration
 */
const DEMO_ORG = {
  name: "Demo Club",
  slug: "demo-club",
  colors: ["#2563eb", "#7c3aed", "#db2777"], // Blue, Purple, Pink
  supportedSports: ["soccer", "gaa_football", "rugby"],
};

/**
 * Demo teams configuration
 */
const DEMO_TEAMS = [
  {
    name: "U8 Soccer",
    sport: "soccer",
    ageGroup: "u8",
    gender: "Boys" as const,
  },
  {
    name: "U10 GAA Girls",
    sport: "gaa_football",
    ageGroup: "u10",
    gender: "Girls" as const,
  },
  {
    name: "U10 Rugby",
    sport: "rugby",
    ageGroup: "u10",
    gender: "Boys" as const,
  },
  {
    name: "U12 Soccer Girls",
    sport: "soccer",
    ageGroup: "u12",
    gender: "Girls" as const,
  },
  {
    name: "U12 GAA",
    sport: "gaa_football",
    ageGroup: "u12",
    gender: "Boys" as const,
  },
  {
    name: "U14 Soccer Girls",
    sport: "soccer",
    ageGroup: "u14",
    gender: "Girls" as const,
  },
  {
    name: "U14 Rugby",
    sport: "rugby",
    ageGroup: "u14",
    gender: "Boys" as const,
  },
  {
    name: "U14 GAA",
    sport: "gaa_football",
    ageGroup: "u14",
    gender: "Boys" as const,
  },
  {
    name: "U16 GAA",
    sport: "gaa_football",
    ageGroup: "u16",
    gender: "Girls" as const,
  },
  {
    name: "U16 Rugby",
    sport: "rugby",
    ageGroup: "u16",
    gender: "Boys" as const,
  },
  {
    name: "U16 Soccer",
    sport: "soccer",
    ageGroup: "u16",
    gender: "Boys" as const,
  },
  {
    name: "U18 Soccer",
    sport: "soccer",
    ageGroup: "u18",
    gender: "Boys" as const,
  },
  {
    name: "U18 GAA",
    sport: "gaa_football",
    ageGroup: "u18",
    gender: "Girls" as const,
  },
];

/**
 * Demo players configuration - 10 players across stages
 */
const DEMO_PLAYERS = [
  // BEGINNER (3 players)
  {
    firstName: "Liam",
    lastName: "Beginner",
    dateOfBirth: "2018-05-12", // U8
    gender: "male" as const,
    stage: "beginner" as PlayerStage,
    sport: "soccer",
    ageGroup: "u8",
    teams: ["U8 Soccer"],
  },
  {
    firstName: "Emma",
    lastName: "Novice",
    dateOfBirth: "2016-09-22", // U10
    gender: "female" as const,
    stage: "beginner" as PlayerStage,
    sport: "gaa_football",
    ageGroup: "u10",
    teams: ["U10 GAA Girls"],
  },
  {
    firstName: "Noah",
    lastName: "Starter",
    dateOfBirth: "2016-11-05", // U10
    gender: "male" as const,
    stage: "beginner" as PlayerStage,
    sport: "rugby",
    ageGroup: "u10",
    teams: ["U10 Rugby"],
  },

  // DEVELOPING (4 players)
  {
    firstName: "Sophia",
    lastName: "Progress",
    dateOfBirth: "2014-03-18", // U12
    gender: "female" as const,
    stage: "developing" as PlayerStage,
    sport: "soccer",
    ageGroup: "u12",
    teams: ["U12 Soccer Girls"],
  },
  {
    firstName: "Oliver",
    lastName: "Growth",
    dateOfBirth: "2014-07-09", // U12
    gender: "male" as const,
    stage: "developing" as PlayerStage,
    sport: "gaa_football",
    ageGroup: "u12",
    teams: ["U12 GAA", "U14 GAA"], // Playing up
  },
  {
    firstName: "Ava",
    lastName: "Improving",
    dateOfBirth: "2012-01-25", // U14
    gender: "female" as const,
    stage: "developing" as PlayerStage,
    sport: "soccer",
    ageGroup: "u14",
    teams: ["U14 Soccer Girls"],
  },
  {
    firstName: "Ethan",
    lastName: "Developing",
    dateOfBirth: "2012-10-14", // U14
    gender: "male" as const,
    stage: "developing" as PlayerStage,
    sport: "rugby",
    ageGroup: "u14",
    teams: ["U14 Rugby"],
  },

  // ADVANCED (3 players)
  {
    firstName: "Mason",
    lastName: "Elite",
    dateOfBirth: "2008-04-03", // U18
    gender: "male" as const,
    stage: "advanced" as PlayerStage,
    sport: "soccer",
    ageGroup: "u18",
    teams: ["U18 Soccer", "U16 Soccer"], // Also mentoring U16
  },
  {
    firstName: "Isabella",
    lastName: "Advanced",
    dateOfBirth: "2010-06-17", // U16
    gender: "female" as const,
    stage: "advanced" as PlayerStage,
    sport: "gaa_football",
    ageGroup: "u16",
    teams: ["U16 GAA", "U18 GAA", "U14 GAA"], // Playing up + mentoring
  },
  {
    firstName: "Lucas",
    lastName: "Expert",
    dateOfBirth: "2010-12-28", // U16
    gender: "male" as const,
    stage: "advanced" as PlayerStage,
    sport: "rugby",
    ageGroup: "u16",
    teams: ["U16 Rugby"],
  },
];

/**
 * Main seeding function - creates complete demo environment
 *
 * IMPORTANT: User must already exist (signed up via Better Auth)
 */
export const seedProductionDemo = mutation({
  args: {
    ownerEmail: v.string(), // Email of EXISTING user who will own demo org
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
        sessions: v.number(),
        medicalProfiles: v.number(),
        injuries: v.number(),
      })
    ),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log("🌱 Starting production demo seed...");
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
      sessions: 0,
      medicalProfiles: 0,
      injuries: 0,
    };

    try {
      // 1. Find existing user via Better Auth adapter
      console.log("\n👤 Step 1: Finding user...");
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: args.ownerEmail, operator: "eq" }],
      });

      if (!user) {
        return {
          success: false,
          message: `User ${args.ownerEmail} not found. Please sign up through the web UI first, then run bootstrapPlatformStaff script.`,
        };
      }

      console.log(`  ✓ Found user: ${user.name || user.email}`);

      // 2. Verify user is platform staff
      if (!user.isPlatformStaff) {
        return {
          success: false,
          message: `User ${args.ownerEmail} is not platform staff. Run: npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "${args.ownerEmail}"}'`,
        };
      }

      console.log("  ✓ User is platform staff");

      // 3. Check if demo org already exists (idempotent)
      console.log("\n🏢 Step 2: Checking for existing demo organization...");
      const existingOrg = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "organization",
          where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
        }
      );

      let orgId: string;

      if (existingOrg) {
        console.log(
          `  ✓ Demo organization already exists: ${existingOrg.name}`
        );
        orgId = existingOrg._id as string;

        // Check if user is already a member
        const membership = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "member",
            where: [
              { field: "userId", value: user._id, operator: "eq" },
              {
                field: "organizationId",
                value: orgId,
                operator: "eq",
                connector: "AND",
              },
            ],
          }
        );

        if (!(membership || args.dryRun)) {
          // Add user as owner
          await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
              model: "member",
              data: {
                userId: user._id,
                organizationId: orgId,
                role: "owner",
                functionalRoles: ["admin", "coach"],
                activeFunctionalRole: "admin",
                createdAt: Date.now(),
              },
            },
          });
          console.log(`  ✓ Added ${args.ownerEmail} as owner`);
        } else if (membership) {
          console.log(
            `  ✓ ${args.ownerEmail} is already a member (role: ${membership.role})`
          );
        }
      } else if (args.dryRun) {
        console.log("  [DRY RUN] Would create organization");
        orgId = "dry-run-org-id";
      } else {
        // Create demo organization via Better Auth adapter
        console.log(`  ⚡ Creating demo organization: ${DEMO_ORG.name}...`);

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
                  createdBy: "Production Demo Seed",
                }),
              },
            },
          }
        );

        orgId = orgResult._id as string;
        console.log(`  ✅ Created organization: ${DEMO_ORG.name}`);

        // Add user as owner via Better Auth adapter
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "member",
            data: {
              userId: user._id,
              organizationId: orgId,
              role: "owner",
              functionalRoles: ["admin", "coach"],
              activeFunctionalRole: "admin",
              createdAt: Date.now(),
            },
          },
        });

        console.log(`  ✅ Added ${args.ownerEmail} as owner`);
      }

      // 4. Create teams
      console.log("\n⚽ Step 3: Creating teams...");
      const teamMap: Record<string, string> = {};
      const createdTeamIds: string[] = [];

      // Query all existing teams once (more efficient than querying in loop)
      const existingTeamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 100 },
          where: [{ field: "organizationId", value: orgId, operator: "eq" }],
        }
      );
      const existingTeamsMap = new Map(
        existingTeamsResult.page.map((team: any) => [team.name, team])
      );

      for (const teamConfig of DEMO_TEAMS) {
        // Check if team exists
        const existingTeam = existingTeamsMap.get(teamConfig.name);

        if (existingTeam) {
          console.log(`    ✓ Team exists: ${teamConfig.name}`);
          teamMap[teamConfig.name] = existingTeam._id as string;
          createdTeamIds.push(existingTeam._id as string);
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
          createdTeamIds.push(teamId);
          console.log(`    ✅ Created team: ${teamConfig.name}`);
          stats.teams += 1;
        }
      }

      // 5. Create players with enrollments
      console.log("\n👶 Step 4: Creating players...");
      const createdPlayerIdentityIds: Id<"playerIdentities">[] = [];

      for (const playerConfig of DEMO_PLAYERS) {
        // Check if player exists
        const existing = await ctx.db
          .query("playerIdentities")
          .filter((q) =>
            q.and(
              q.eq(q.field("firstName"), playerConfig.firstName),
              q.eq(q.field("lastName"), playerConfig.lastName),
              q.eq(q.field("dateOfBirth"), playerConfig.dateOfBirth)
            )
          )
          .first();

        let playerIdentityId: Id<"playerIdentities">;
        let _isNewPlayer = false;

        if (existing) {
          console.log(
            `    ✓ Player exists: ${playerConfig.firstName} ${playerConfig.lastName} - updating enrollment`
          );
          playerIdentityId = existing._id;
        } else if (args.dryRun) {
          console.log(
            `    [DRY RUN] Would create player: ${playerConfig.firstName} ${playerConfig.lastName}`
          );
          continue; // Skip rest in dry run
        } else {
          _isNewPlayer = true;
          // Create player identity
          const result = await ctx.runMutation(
            api.models.playerIdentities.findOrCreatePlayer,
            {
              firstName: playerConfig.firstName,
              lastName: playerConfig.lastName,
              dateOfBirth: playerConfig.dateOfBirth,
              gender: playerConfig.gender,
              createdFrom: "Production Demo Seed",
            }
          );

          playerIdentityId = result.playerIdentityId;
          console.log(
            `    ✅ Created player: ${playerConfig.firstName} ${playerConfig.lastName} (${playerConfig.stage})`
          );
          stats.players += 1;
        }

        // Track player identity ID for test user linking
        createdPlayerIdentityIds.push(playerIdentityId);

        if (!args.dryRun) {
          // Enroll in organization with sport (for both new and existing players)
          await ctx.runMutation(api.models.orgPlayerEnrollments.enrollPlayer, {
            playerIdentityId,
            organizationId: orgId,
            ageGroup: playerConfig.ageGroup,
            season: "2026",
            sportCode: playerConfig.sport,
            status: "active" as const,
          });

          // Assign to teams
          for (const teamName of playerConfig.teams) {
            const teamId = teamMap[teamName];
            if (teamId) {
              // Check if already assigned
              const existingAssignment = await ctx.db
                .query("teamPlayerIdentities")
                .withIndex("by_team_and_player", (q) =>
                  q
                    .eq("teamId", teamId)
                    .eq("playerIdentityId", playerIdentityId)
                )
                .first();

              if (!existingAssignment) {
                const now = Date.now();
                await ctx.db.insert("teamPlayerIdentities", {
                  teamId,
                  playerIdentityId,
                  organizationId: orgId,
                  status: "active" as const,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          }

          // 6. Generate passport data for this player
          console.log(
            `      📋 Generating passport data (${playerConfig.stage})...`
          );
          const passportResult = await ctx.runMutation(
            internal.scripts.seed.passports.seedPassportForPlayer,
            {
              playerIdentityId: playerIdentityId as string,
              organizationId: orgId,
              sportCode: playerConfig.sport,
              stage: playerConfig.stage,
              playerName: `${playerConfig.firstName} ${playerConfig.lastName}`,
              ageGroup: playerConfig.ageGroup,
            }
          );

          stats.passports += 1;
          stats.assessments += passportResult.assessmentCount;
          stats.goals += passportResult.goalCount;

          console.log(
            `      ✅ Passport: ${passportResult.assessmentCount} assessments, ${passportResult.goalCount} goals`
          );
        }
      }

      // 7. Create session plans
      console.log("\n🏋️ Step 5: Creating session plans...");

      if (args.dryRun) {
        console.log("  [DRY RUN] Would create 38 session plans");
      } else {
        const sessionResult = await ctx.runMutation(
          api.seed.sessionPlansSeed.seedSessionPlans,
          {
            organizationId: orgId,
            coachId: user._id,
            coachName: user.name || "Demo Coach",
            count: 38,
          }
        );

        stats.sessions = sessionResult.created;
        console.log(`  ✅ Created ${sessionResult.created} session plans`);
      }

      // Step 6: Assign owner as coach and guardian
      console.log("\n👥 Step 6: Assigning owner as coach and guardian...");

      // Create coach assignments for owner on all teams
      const allTeamIds = createdTeamIds.map((id) => id as string);
      await ctx.db.insert("coachAssignments", {
        userId: user._id as string,
        organizationId: orgId,
        teams: allTeamIds,
        ageGroups: ["U8", "U10", "U12", "U14", "U16", "U18"],
        sport: "soccer", // Primary sport
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log(`  ✅ Assigned as coach to ${allTeamIds.length} teams`);

      // Create or find guardian identity for owner
      const existingGuardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_userId", (q) => q.eq("userId", user._id as string))
        .first();

      let guardianIdentityId: Id<"guardianIdentities">;

      if (existingGuardian) {
        guardianIdentityId = existingGuardian._id;
        console.log("  ✓ Guardian identity exists");
      } else {
        // Extract first and last name from owner user
        const nameParts = (user.name || "Owner User").split(" ");
        const firstName = nameParts[0] || "Owner";
        const lastName = nameParts.slice(1).join(" ") || "User";

        guardianIdentityId = await ctx.db.insert("guardianIdentities", {
          firstName,
          lastName,
          email: args.ownerEmail,
          userId: user._id as string,
          verificationStatus: "email_verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdFrom: "seeding",
        });
        console.log("  ✅ Created guardian identity");
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
        console.log("  ✅ Created organization guardian profile");
      }

      // Link owner as guardian to all players
      const playersToLink = createdPlayerIdentityIds;
      let linkedCount = 0;
      for (const playerIdentityId of playersToLink) {
        // Check if link already exists
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
            consentedToSharing: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          linkedCount += 1;
        }
      }
      console.log(`  ✅ Linked as guardian to ${linkedCount} players`);

      // Step 7: Create medical profiles
      console.log("\n🏥 Step 7: Creating medical profiles...");

      const bloodTypes = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
        null,
      ];
      const commonAllergies = [
        "Peanuts",
        "Shellfish",
        "Lactose",
        "Pollen",
        "Bee stings",
      ];
      const commonMedications = ["Inhaler (Asthma)", "EpiPen", "Insulin"];
      const commonConditions = ["Asthma", "Type 1 Diabetes", "Mild allergies"];

      for (let i = 0; i < createdPlayerIdentityIds.length; i++) {
        const playerIdentityId = createdPlayerIdentityIds[i];
        const playerConfig = DEMO_PLAYERS[i];

        if (!args.dryRun) {
          // Varied medical profiles - some minimal, some detailed
          const hasAllergies = Math.random() > 0.6; // 40% have allergies
          const hasMedications = Math.random() > 0.8; // 20% on medications
          const hasConditions = Math.random() > 0.85; // 15% have conditions

          const allergies = hasAllergies
            ? [
                commonAllergies[
                  Math.floor(Math.random() * commonAllergies.length)
                ],
              ]
            : [];
          const medications = hasMedications
            ? [
                commonMedications[
                  Math.floor(Math.random() * commonMedications.length)
                ],
              ]
            : [];
          const conditions = hasConditions
            ? [
                commonConditions[
                  Math.floor(Math.random() * commonConditions.length)
                ],
              ]
            : [];

          await ctx.runMutation(api.models.medicalProfiles.upsertForIdentity, {
            playerIdentityId,
            organizationId: orgId,
            ageGroup: playerConfig.ageGroup,
            sport: playerConfig.sport,
            bloodType:
              bloodTypes[Math.floor(Math.random() * bloodTypes.length)] ??
              undefined,
            allergies,
            medications,
            conditions,
            doctorName: Math.random() > 0.7 ? "Dr. Smith" : undefined,
            doctorPhone: Math.random() > 0.7 ? "+1 555-0100" : undefined,
            emergencyContact1Name: "Emergency Contact 1",
            emergencyContact1Phone: "+1 555-0101",
            emergencyContact2Name:
              Math.random() > 0.5 ? "Emergency Contact 2" : undefined,
            emergencyContact2Phone:
              Math.random() > 0.5 ? "+1 555-0102" : undefined,
            lastMedicalCheck: Math.random() > 0.6 ? "2025-09-01" : undefined,
            insuranceCovered: Math.random() > 0.3, // 70% have insurance
            notes: hasConditions
              ? "Please see coach notes for specific accommodations"
              : undefined,
          });

          stats.medicalProfiles = (stats.medicalProfiles || 0) + 1;
        }
      }
      console.log(
        `  ✅ Created ${createdPlayerIdentityIds.length} medical profiles`
      );

      // Step 8: Create injury records (historical and current)
      console.log("\n🩹 Step 8: Creating injury records...");

      const injuryTypes = [
        "Sprain",
        "Strain",
        "Contusion",
        "Minor fracture",
        "Overuse injury",
      ];
      const bodyParts = [
        "Ankle",
        "Knee",
        "Hamstring",
        "Shoulder",
        "Wrist",
        "Calf",
      ];

      for (let i = 0; i < createdPlayerIdentityIds.length; i++) {
        const playerIdentityId = createdPlayerIdentityIds[i];
        const playerConfig = DEMO_PLAYERS[i];

        if (!args.dryRun) {
          // Injury distribution based on player stage
          let injuryCount = 0;
          if (playerConfig.stage === "beginner") {
            // No injuries for beginners (too new)
            injuryCount = 0;
          } else if (playerConfig.stage === "developing") {
            // 50% chance of 1 healed injury
            injuryCount = Math.random() > 0.5 ? 1 : 0;
          } else if (playerConfig.stage === "advanced") {
            // 1-2 healed injuries, 30% chance of 1 recovering
            injuryCount = Math.random() > 0.5 ? 2 : 1;
            if (Math.random() > 0.7) {
              injuryCount += 1; // Add a recovering injury
            }
          }

          for (let j = 0; j < injuryCount; j++) {
            const isRecovering =
              j === injuryCount - 1 &&
              playerConfig.stage === "advanced" &&
              Math.random() > 0.7;
            const daysAgo = isRecovering
              ? 14
              : 60 + Math.floor(Math.random() * 120); // Recovering = 2 weeks ago, healed = 2-6 months ago
            const injuryDate = new Date(
              Date.now() - daysAgo * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0];

            const injuryType =
              injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
            const bodyPart =
              bodyParts[Math.floor(Math.random() * bodyParts.length)];
            const severity = isRecovering ? "moderate" : "minor";
            const status = isRecovering ? "recovering" : "healed";

            await ctx.db.insert("playerInjuries", {
              playerIdentityId,
              injuryType,
              bodyPart,
              side: Math.random() > 0.5 ? "left" : "right",
              dateOccurred: injuryDate,
              dateReported: injuryDate,
              severity,
              status,
              description: `${injuryType} of ${bodyPart.toLowerCase()} during ${Math.random() > 0.5 ? "training" : "match"}`,
              mechanism: `Landed awkwardly after ${Math.random() > 0.5 ? "jump" : "tackle"}`,
              treatment:
                status === "healed"
                  ? "RICE protocol, physiotherapy"
                  : "Rest and ice, ongoing physiotherapy",
              medicalProvider:
                Math.random() > 0.6 ? "Club Physiotherapist" : undefined,
              expectedReturn: isRecovering
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                : undefined,
              actualReturn:
                status === "healed"
                  ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  : undefined,
              daysOut: isRecovering ? 14 : 21,
              returnToPlayProtocol: isRecovering
                ? [
                    {
                      id: "1",
                      step: 1,
                      description: "Light training",
                      completed: true,
                      completedDate: new Date(
                        Date.now() - 7 * 24 * 60 * 60 * 1000
                      )
                        .toISOString()
                        .split("T")[0],
                    },
                    {
                      id: "2",
                      step: 2,
                      description: "Full training",
                      completed: false,
                    },
                    {
                      id: "3",
                      step: 3,
                      description: "Match ready",
                      completed: false,
                    },
                  ]
                : undefined,
              occurredDuring: Math.random() > 0.5 ? "training" : "match",
              occurredAtOrgId: orgId,
              sportCode: playerConfig.sport,
              isVisibleToAllOrgs: true,
              reportedBy: user._id,
              reportedByRole: "coach",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });

            stats.injuries = (stats.injuries || 0) + 1;
          }
        }
      }
      console.log(`  ✅ Created ${stats.injuries || 0} injury records`);

      // Summary
      console.log(`\n${"=".repeat(60)}`);
      console.log("✅ Production Demo Seed Complete!");
      console.log("=".repeat(60));
      console.log(`Teams:          ${stats.teams} created`);
      console.log(`Players:        ${stats.players} created`);
      console.log(`Passports:      ${stats.passports} created`);
      console.log(`Assessments:    ${stats.assessments} created`);
      console.log(`Goals:          ${stats.goals} created`);
      console.log(`Sessions:       ${stats.sessions} created`);
      console.log(`Medical:        ${stats.medicalProfiles} profiles created`);
      console.log(`Injuries:       ${stats.injuries} records created`);
      console.log("=".repeat(60));
      console.log(`\nDemo Organization: ${DEMO_ORG.name}`);
      console.log(`Slug: ${DEMO_ORG.slug}`);
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

/**
 * Verification query - check status of demo data
 */
export const verifyProductionDemo = query({
  args: {},
  returns: v.object({
    orgExists: v.boolean(),
    orgId: v.optional(v.string()),
    teamCount: v.number(),
    playerCount: v.number(),
    passportCount: v.number(),
    assessmentCount: v.number(),
    goalCount: v.number(),
    sessionCount: v.number(),
    medicalProfileCount: v.number(),
    injuryCount: v.number(),
    memberCount: v.number(),
    stageDistribution: v.object({
      beginner: v.number(),
      developing: v.number(),
      advanced: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Find demo org via Better Auth adapter
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
    });

    if (!org) {
      return {
        orgExists: false,
        teamCount: 0,
        playerCount: 0,
        passportCount: 0,
        assessmentCount: 0,
        goalCount: 0,
        sessionCount: 0,
        medicalProfileCount: 0,
        injuryCount: 0,
        memberCount: 0,
        stageDistribution: { beginner: 0, developing: 0, advanced: 0 },
      };
    }

    const orgId = org._id as string;

    // Count teams via Better Auth adapter
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [{ field: "organizationId", value: orgId, operator: "eq" }],
      }
    );

    // Count members via Better Auth adapter
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [{ field: "organizationId", value: orgId, operator: "eq" }],
      }
    );

    // Count players (enrollments)
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    // Count passports
    const passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    // Count assessments
    const assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    // Count goals
    const goals = await ctx.db
      .query("passportGoals")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    // Count session plans (session plans don't have Better Auth model, use direct query)
    const sessions = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();

    // Count injuries (for players in this org)
    let injuryCount = 0;
    for (const enrollment of enrollments) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      // Count injuries that occurred at this org
      injuryCount += injuries.filter((i) => i.occurredAtOrgId === orgId).length;
    }

    // Count medical profiles (via legacy player records)
    let medicalProfileCount = 0;
    const legacyPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    for (const legacyPlayer of legacyPlayers) {
      const medicalProfile = await ctx.db
        .query("medicalProfiles")
        .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
        .first();

      if (medicalProfile) {
        medicalProfileCount += 1;
      }
    }

    // Determine stage distribution based on assessment count
    let beginner = 0;
    let developing = 0;
    let advanced = 0;

    for (const passport of passports) {
      const assessmentCount = passport.assessmentCount || 0;
      if (assessmentCount <= 1) {
        beginner += 1;
      } else if (assessmentCount <= 7) {
        developing += 1;
      } else {
        advanced += 1;
      }
    }

    return {
      orgExists: true,
      orgId,
      teamCount: teamsResult.page.length,
      playerCount: enrollments.length,
      passportCount: passports.length,
      assessmentCount: assessments.length,
      goalCount: goals.length,
      sessionCount: sessions.length,
      medicalProfileCount,
      injuryCount,
      memberCount: membersResult.page.length,
      stageDistribution: { beginner, developing, advanced },
    };
  },
});

/**
 * Reset function - removes all demo data using Better Auth adapter
 */
export const resetProductionDemo = mutation({
  args: {
    confirmReset: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    deleted: v.object({
      players: v.number(),
      teams: v.number(),
      organizations: v.number(),
      members: v.number(),
      passports: v.number(),
      assessments: v.number(),
      goals: v.number(),
      sessions: v.number(),
      injuries: v.number(),
      medicalProfiles: v.number(),
    }),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmReset) {
      return {
        success: false,
        deleted: {
          players: 0,
          teams: 0,
          organizations: 0,
          members: 0,
          passports: 0,
          assessments: 0,
          goals: 0,
          sessions: 0,
        },
        message: "Reset cancelled - confirmReset must be true",
      };
    }

    console.log("🗑️  Starting demo data cleanup...");

    const stats = {
      players: 0,
      teams: 0,
      organizations: 0,
      members: 0,
      passports: 0,
      assessments: 0,
      goals: 0,
      sessions: 0,
      injuries: 0,
      medicalProfiles: 0,
    };

    try {
      // Find demo org via Better Auth adapter
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "slug", value: DEMO_ORG.slug, operator: "eq" }],
      });

      if (!org) {
        console.log("  ℹ️  No demo organization found");
        return {
          success: true,
          deleted: stats,
          message: "No demo data to delete",
        };
      }

      const orgId = org._id as string;

      // Delete in reverse order of dependencies

      // 1. Delete goals
      const goals = await ctx.db
        .query("passportGoals")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const goal of goals) {
        await ctx.db.delete(goal._id);
        stats.goals += 1;
      }

      // 2. Delete assessments
      const assessments = await ctx.db
        .query("skillAssessments")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const assessment of assessments) {
        await ctx.db.delete(assessment._id);
        stats.assessments += 1;
      }

      // 3. Delete passports
      const passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const passport of passports) {
        await ctx.db.delete(passport._id);
        stats.passports += 1;
      }

      // 4. Delete session plans
      const sessions = await ctx.db
        .query("sessionPlans")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete(session._id);
        stats.sessions += 1;
      }

      // 5. Delete team assignments
      const teamAssignments = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const assignment of teamAssignments) {
        await ctx.db.delete(assignment._id);
      }

      // 6. Get enrollments first (needed for injury and medical cleanup)
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      // 7. Delete injuries (for players in this org)
      for (const enrollment of enrollments) {
        const injuries = await ctx.db
          .query("playerInjuries")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
          )
          .collect();

        for (const injury of injuries) {
          // Only delete injuries that occurred at this org
          if (injury.occurredAtOrgId === orgId) {
            await ctx.db.delete(injury._id);
            stats.injuries = (stats.injuries || 0) + 1;
          }
        }
      }

      // 8. Delete medical profiles (via legacy player records)
      // Need to find legacy player records first
      const legacyPlayers = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();

      for (const legacyPlayer of legacyPlayers) {
        const medicalProfile = await ctx.db
          .query("medicalProfiles")
          .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
          .first();

        if (medicalProfile) {
          await ctx.db.delete(medicalProfile._id);
          stats.medicalProfiles = (stats.medicalProfiles || 0) + 1;
        }

        // Delete the legacy player record
        await ctx.db.delete(legacyPlayer._id);
      }

      // 9. Delete enrollments
      for (const enrollment of enrollments) {
        await ctx.db.delete(enrollment._id);
        stats.players += 1;
      }

      // 10. Delete organization using Better Auth adapter (cascades teams and members)
      console.log("  🏢 Deleting organization via Better Auth adapter...");
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "organization",
          where: [{ field: "_id", value: orgId, operator: "eq" }],
        },
      });
      stats.organizations += 1;

      // Note: Better Auth adapter automatically deletes associated teams and members
      // Count them for stats
      const teamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 1000 },
          where: [{ field: "organizationId", value: orgId, operator: "eq" }],
        }
      );
      stats.teams = teamsResult.page.length;

      const membersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
          paginationOpts: { cursor: null, numItems: 1000 },
          where: [{ field: "organizationId", value: orgId, operator: "eq" }],
        }
      );
      stats.members = membersResult.page.length;

      console.log("✅ Demo data cleanup complete");
      console.log(
        `  Deleted: ${stats.organizations} orgs, ${stats.teams} teams, ${stats.members} members, ${stats.players} players`
      );
      console.log(
        `  Deleted: ${stats.passports} passports, ${stats.assessments} assessments, ${stats.goals} goals`
      );
      console.log(
        `  Deleted: ${stats.sessions} session plans, ${stats.injuries} injuries, ${stats.medicalProfiles} medical profiles`
      );

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
