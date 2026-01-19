import { v } from "convex/values";
import { api } from "../_generated/api";
import { mutation, query } from "../_generated/server";

// ============================================================
// PASSPORT COMPARISON SYSTEM
// Coach passport comparison views for analyzing local vs shared data
// ============================================================

// ============================================================
// TYPE VALIDATORS
// ============================================================

const skillValidator = v.object({
  skillCode: v.string(),
  skillName: v.string(),
  rating: v.number(),
  assessmentDate: v.optional(v.string()),
  category: v.optional(v.string()),
});

const goalValidator = v.object({
  goalId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  status: v.string(),
  category: v.string(),
  progress: v.number(),
});

const sharedElementsValidator = v.object({
  basicProfile: v.boolean(),
  skillRatings: v.boolean(),
  skillHistory: v.boolean(),
  developmentGoals: v.boolean(),
  coachNotes: v.boolean(),
  benchmarkData: v.boolean(),
  attendanceRecords: v.boolean(),
  injuryHistory: v.boolean(),
  medicalSummary: v.boolean(),
  contactInfo: v.boolean(),
});

const recommendationValidator = v.object({
  type: v.union(
    v.literal("investigate"),
    v.literal("align"),
    v.literal("leverage"),
    v.literal("explore")
  ),
  title: v.string(),
  description: v.string(),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  skillCode: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get comparison data between local assessments and shared passport data
 *
 * This is the primary query for the coach passport comparison feature.
 * It fetches both local (your org's) assessments and shared (other orgs') data,
 * then computes insights about agreements, divergences, and recommendations.
 *
 * @param playerIdentityId - The player to compare
 * @param consentId - The consent record authorizing access to shared data
 * @param organizationId - Your organization ID (for local data)
 */
export const getComparisonData = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    consentId: v.id("passportShareConsents"),
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      player: v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.optional(v.string()),
        gender: v.optional(v.string()),
      }),

      local: v.object({
        organizationName: v.string(),
        sport: v.optional(v.string()),
        skills: v.array(skillValidator),
        goals: v.array(goalValidator),
        lastUpdated: v.number(),
      }),

      shared: v.object({
        sourceOrgs: v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            sport: v.optional(v.string()),
          })
        ),
        sport: v.optional(v.string()),
        skills: v.optional(v.array(skillValidator)),
        goals: v.optional(v.array(goalValidator)),
        sharedElements: sharedElementsValidator,
        lastUpdated: v.number(),
      }),

      insights: v.object({
        sportsMatch: v.boolean(),
        agreementCount: v.number(),
        divergenceCount: v.number(),
        agreements: v.array(
          v.object({
            skillName: v.string(),
            skillCode: v.string(),
            localRating: v.number(),
            sharedRating: v.number(),
            delta: v.number(),
          })
        ),
        divergences: v.array(
          v.object({
            skillName: v.string(),
            skillCode: v.string(),
            localRating: v.number(),
            sharedRating: v.number(),
            delta: v.number(),
          })
        ),
        blindSpots: v.object({
          localOnly: v.array(v.string()),
          sharedOnly: v.array(v.string()),
        }),
        recommendations: v.array(recommendationValidator),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // ============================================================
    // STEP 1: Validate consent access
    // ============================================================

    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      return null;
    }

    // Validate consent is active and not expired
    if (consent.status !== "active") {
      return null;
    }

    const now = Date.now();
    if (consent.expiresAt < now) {
      return null;
    }

    // Validate coach acceptance
    if (consent.coachAcceptanceStatus !== "accepted") {
      return null;
    }

    // Validate player matches
    if (consent.playerIdentityId !== args.playerIdentityId) {
      return null;
    }

    // ============================================================
    // STEP 2: Get player identity
    // ============================================================

    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      return null;
    }

    // ============================================================
    // STEP 3: Get local data (your organization's assessments)
    // ============================================================

    // Get local organization name
    const localOrg: { name?: string } | null = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: args.organizationId }
    );
    const localOrgName: string = localOrg?.name || "Your Organization";

    // Get local sport passport(s) for this player
    const localPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .collect();

    // Use the first active passport
    const localPassport = localPassports.find((p) => p.status === "active");
    const localSportCode = localPassport?.sportCode;

    // Get local skill assessments
    let localSkills: Array<{
      skillCode: string;
      skillName: string;
      rating: number;
      assessmentDate?: string;
      category?: string;
    }> = [];
    let localLastUpdated = 0;

    if (localPassport) {
      const localAssessments = await ctx.db
        .query("skillAssessments")
        .withIndex("by_passportId", (q) =>
          q.eq("passportId", localPassport._id)
        )
        .order("desc")
        .collect();

      // Get latest for each skill
      const latestBySkill = new Map<
        string,
        (typeof localAssessments)[number]
      >();
      for (const assessment of localAssessments) {
        if (!latestBySkill.has(assessment.skillCode)) {
          latestBySkill.set(assessment.skillCode, assessment);
          if (assessment.createdAt > localLastUpdated) {
            localLastUpdated = assessment.createdAt;
          }
        }
      }

      // Get skill definitions for names and categories
      const skillDefinitions = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode", (q) => q.eq("sportCode", localSportCode!))
        .collect();

      const skillDefMap = new Map(
        skillDefinitions.map((s) => [
          s.code,
          { name: s.name, categoryId: s.categoryId },
        ])
      );

      // Get category names
      const categoryIds = [
        ...new Set(skillDefinitions.map((s) => s.categoryId)),
      ];
      const categories = await Promise.all(
        categoryIds.map((id) => ctx.db.get(id))
      );
      const categoryMap = new Map(
        categories
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((c) => [c._id, c.name])
      );

      localSkills = Array.from(latestBySkill.entries()).map(
        ([skillCode, assessment]) => {
          const skillDef = skillDefMap.get(skillCode);
          return {
            skillCode,
            skillName: skillDef?.name || skillCode,
            rating: assessment.rating,
            assessmentDate: assessment.assessmentDate,
            category: skillDef?.categoryId
              ? categoryMap.get(skillDef.categoryId) || undefined
              : undefined,
          };
        }
      );
    }

    // Get local goals
    let localGoals: Array<{
      goalId: string;
      title: string;
      description?: string;
      status: string;
      category: string;
      progress: number;
    }> = [];

    if (localPassport) {
      const goals = await ctx.db
        .query("passportGoals")
        .withIndex("by_passportId", (q) =>
          q.eq("passportId", localPassport._id)
        )
        .collect();

      localGoals = goals.map((g) => ({
        goalId: g._id,
        title: g.title,
        description: g.description,
        status: g.status,
        category: g.category,
        progress: g.progress,
      }));
    }

    // ============================================================
    // STEP 4: Get shared data (from consent)
    // ============================================================

    // Determine source organizations
    let sourceOrgIds: string[] = [];
    if (consent.sourceOrgMode === "all_enrolled") {
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
      sourceOrgIds = enrollments.map((e) => e.organizationId);
    } else {
      sourceOrgIds = consent.sourceOrgIds || [];
    }

    // Fetch org details
    const sourceOrgs: Array<{
      id: string;
      name: string;
      sport: string | undefined;
    }> = await Promise.all(
      sourceOrgIds.map(async (orgId: string) => {
        const org: { name?: string } | null = await ctx.runQuery(
          api.models.organizations.getOrganization,
          { organizationId: orgId }
        );
        // Get sport from enrollment or passport
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("organizationId", orgId)
          )
          .first();
        return {
          id: orgId,
          name: org?.name || "Unknown Organization",
          sport: enrollment?.sport || undefined,
        };
      })
    );

    // Get shared skills from source orgs (if skillRatings is shared)
    let sharedSkills:
      | Array<{
          skillCode: string;
          skillName: string;
          rating: number;
          assessmentDate?: string;
          category?: string;
        }>
      | undefined;
    let sharedLastUpdated = 0;
    let sharedSportCode: string | undefined;

    if (consent.sharedElements.skillRatings && sourceOrgIds.length > 0) {
      // Get passports from source orgs
      const sharedPassports = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      const sourcePassports = sharedPassports.filter(
        (p) => sourceOrgIds.includes(p.organizationId) && p.status === "active"
      );

      if (sourcePassports.length > 0) {
        // Use first passport for sport code
        sharedSportCode = sourcePassports[0].sportCode;

        // Get assessments from all source passports
        const allSharedAssessments: Array<{
          skillCode: string;
          rating: number;
          assessmentDate: string;
          createdAt: number;
        }> = [];

        for (const passport of sourcePassports) {
          const assessments = await ctx.db
            .query("skillAssessments")
            .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
            .order("desc")
            .collect();

          allSharedAssessments.push(
            ...assessments.map((a) => ({
              skillCode: a.skillCode,
              rating: a.rating,
              assessmentDate: a.assessmentDate,
              createdAt: a.createdAt,
            }))
          );
        }

        // Get latest for each skill (aggregate across source orgs)
        const latestBySkill = new Map<
          string,
          { rating: number; assessmentDate: string; createdAt: number }
        >();
        for (const assessment of allSharedAssessments) {
          const existing = latestBySkill.get(assessment.skillCode);
          if (!existing || assessment.createdAt > existing.createdAt) {
            latestBySkill.set(assessment.skillCode, {
              rating: assessment.rating,
              assessmentDate: assessment.assessmentDate,
              createdAt: assessment.createdAt,
            });
            if (assessment.createdAt > sharedLastUpdated) {
              sharedLastUpdated = assessment.createdAt;
            }
          }
        }

        // Get skill definitions for names
        if (sharedSportCode) {
          const skillDefinitions = await ctx.db
            .query("skillDefinitions")
            .withIndex("by_sportCode", (q) =>
              q.eq("sportCode", sharedSportCode!)
            )
            .collect();

          const skillDefMap = new Map(
            skillDefinitions.map((s) => [s.code, { name: s.name }])
          );

          sharedSkills = Array.from(latestBySkill.entries()).map(
            ([skillCode, data]) => ({
              skillCode,
              skillName: skillDefMap.get(skillCode)?.name || skillCode,
              rating: data.rating,
              assessmentDate: data.assessmentDate,
            })
          );
        }
      }
    }

    // Get shared goals (if developmentGoals is shared)
    let sharedGoals:
      | Array<{
          goalId: string;
          title: string;
          description?: string;
          status: string;
          category: string;
          progress: number;
        }>
      | undefined;

    if (consent.sharedElements.developmentGoals && sourceOrgIds.length > 0) {
      const allGoals = await ctx.db
        .query("passportGoals")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      const sourceGoals = allGoals.filter(
        (g) =>
          sourceOrgIds.includes(g.organizationId) &&
          (consent.sharedElements.coachNotes ? true : g.isShareable !== false)
      );

      sharedGoals = sourceGoals.map((g) => ({
        goalId: g._id,
        title: g.title,
        description: g.description,
        status: g.status,
        category: g.category,
        progress: g.progress,
      }));
    }

    // ============================================================
    // STEP 5: Compute insights
    // ============================================================

    const sportsMatch = localSportCode === sharedSportCode;

    // Build skill comparison maps
    const localSkillMap = new Map(localSkills.map((s) => [s.skillCode, s]));
    const sharedSkillMap = new Map(
      (sharedSkills || []).map((s) => [s.skillCode, s])
    );

    // Find overlapping skills
    const allSkillCodes = new Set([
      ...localSkillMap.keys(),
      ...sharedSkillMap.keys(),
    ]);

    const agreements: Array<{
      skillName: string;
      skillCode: string;
      localRating: number;
      sharedRating: number;
      delta: number;
    }> = [];

    const divergences: Array<{
      skillName: string;
      skillCode: string;
      localRating: number;
      sharedRating: number;
      delta: number;
    }> = [];

    const localOnly: string[] = [];
    const sharedOnly: string[] = [];

    // Divergence threshold (skills with > 1.0 rating difference are divergent)
    const DIVERGENCE_THRESHOLD = 1.0;

    for (const skillCode of allSkillCodes) {
      const local = localSkillMap.get(skillCode);
      const shared = sharedSkillMap.get(skillCode);

      if (local && shared) {
        const delta = Math.abs(local.rating - shared.rating);
        const comparison = {
          skillName: local.skillName || shared.skillName,
          skillCode,
          localRating: local.rating,
          sharedRating: shared.rating,
          delta,
        };

        if (delta <= DIVERGENCE_THRESHOLD) {
          agreements.push(comparison);
        } else {
          divergences.push(comparison);
        }
      } else if (local && !shared) {
        localOnly.push(local.skillName);
      } else if (!local && shared) {
        sharedOnly.push(shared.skillName);
      }
    }

    // Sort divergences by delta (highest first)
    divergences.sort((a, b) => b.delta - a.delta);

    // Generate recommendations
    const recommendations: Array<{
      type: "investigate" | "align" | "leverage" | "explore";
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      skillCode?: string;
    }> = [];

    // High divergence skills need investigation
    for (const divergence of divergences.slice(0, 3)) {
      const isLocalHigher = divergence.localRating > divergence.sharedRating;
      recommendations.push({
        type: "investigate",
        title: `Review ${divergence.skillName} assessment`,
        description: isLocalHigher
          ? `Your rating (${divergence.localRating}) is ${divergence.delta.toFixed(1)} points higher than shared data (${divergence.sharedRating}). Consider discussing with the player or observing in match situations.`
          : `Shared data shows higher rating (${divergence.sharedRating}) than your assessment (${divergence.localRating}). The player may have developed this skill at their other club.`,
        priority: divergence.delta > 2 ? "high" : "medium",
        skillCode: divergence.skillCode,
      });
    }

    // Blind spots in shared data
    if (sharedOnly.length > 0) {
      recommendations.push({
        type: "explore",
        title: "Explore new skill assessments",
        description: `The other organization has assessed skills you haven't evaluated yet: ${sharedOnly.slice(0, 3).join(", ")}${sharedOnly.length > 3 ? ` and ${sharedOnly.length - 3} more` : ""}.`,
        priority: sharedOnly.length > 5 ? "medium" : "low",
      });
    }

    // Strong agreements are leverage points
    const strongAgreements = agreements.filter((a) => a.delta <= 0.5);
    if (strongAgreements.length > 0) {
      recommendations.push({
        type: "leverage",
        title: "Build on consistent strengths",
        description: `${strongAgreements.length} skills show strong agreement between assessments. These are reliable data points for development planning.`,
        priority: "low",
      });
    }

    // Cross-sport notice
    if (!sportsMatch && localSportCode && sharedSportCode) {
      recommendations.push({
        type: "align",
        title: "Cross-sport comparison",
        description: `Comparing ${localSportCode} (your org) with ${sharedSportCode} (shared). Focus on universal skills (physical, mental) for meaningful comparison.`,
        priority: "medium",
      });
    }

    // ============================================================
    // STEP 6: Return comparison data
    // ============================================================

    return {
      player: {
        firstName: playerIdentity.firstName,
        lastName: playerIdentity.lastName,
        dateOfBirth: playerIdentity.dateOfBirth,
        gender: playerIdentity.gender,
      },

      local: {
        organizationName: localOrgName,
        sport: localSportCode,
        skills: localSkills,
        goals: localGoals,
        lastUpdated: localLastUpdated || Date.now(),
      },

      shared: {
        sourceOrgs,
        sport: sharedSportCode,
        skills: sharedSkills,
        goals: sharedGoals,
        sharedElements: consent.sharedElements,
        lastUpdated: sharedLastUpdated || consent.consentedAt,
      },

      insights: {
        sportsMatch,
        agreementCount: agreements.length,
        divergenceCount: divergences.length,
        agreements,
        divergences,
        blindSpots: {
          localOnly,
          sharedOnly,
        },
        recommendations,
      },
    };
  },
});

// ============================================================
// COACH COMPARISON PREFERENCES
// ============================================================

/**
 * Get coach comparison preferences
 */
export const getComparisonPreferences = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      defaultViewMode: v.union(
        v.literal("insights"),
        v.literal("split"),
        v.literal("overlay")
      ),
      highlightDivergence: v.boolean(),
      divergenceThreshold: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!prefs?.coachComparisonSettings) {
      return null;
    }

    return prefs.coachComparisonSettings;
  },
});

/**
 * Save coach comparison preferences
 */
export const saveComparisonPreferences = mutation({
  args: {
    userId: v.string(),
    defaultViewMode: v.union(
      v.literal("insights"),
      v.literal("split"),
      v.literal("overlay")
    ),
    highlightDivergence: v.boolean(),
    divergenceThreshold: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (prefs) {
      await ctx.db.patch(prefs._id, {
        coachComparisonSettings: {
          defaultViewMode: args.defaultViewMode,
          highlightDivergence: args.highlightDivergence,
          divergenceThreshold: args.divergenceThreshold,
        },
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId: args.userId,
        coachComparisonSettings: {
          defaultViewMode: args.defaultViewMode,
          highlightDivergence: args.highlightDivergence,
          divergenceThreshold: args.divergenceThreshold,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return true;
  },
});
