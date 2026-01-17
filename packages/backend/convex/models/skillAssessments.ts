import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const assessmentTypeValidator = v.union(
  v.literal("initial"),
  v.literal("training"),
  v.literal("match"),
  v.literal("trial"),
  v.literal("formal_review"),
  v.literal("self"),
  v.literal("parent"),
  v.literal("import")
);

const assessorRoleValidator = v.union(
  v.literal("coach"),
  v.literal("head_coach"),
  v.literal("assistant_coach"),
  v.literal("parent"),
  v.literal("self"),
  v.literal("admin"),
  v.literal("system")
);

const benchmarkStatusValidator = v.union(
  v.literal("below"),
  v.literal("developing"),
  v.literal("on_track"),
  v.literal("exceeding"),
  v.literal("exceptional")
);

const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

// Assessment validator for return types
const assessmentValidator = v.object({
  _id: v.id("skillAssessments"),
  _creationTime: v.number(),
  passportId: v.id("sportPassports"),
  playerIdentityId: v.id("playerIdentities"),
  sportCode: v.string(),
  skillCode: v.string(),
  organizationId: v.string(),
  rating: v.number(),
  previousRating: v.optional(v.number()),
  assessmentDate: v.string(),
  assessmentType: assessmentTypeValidator,
  assessedBy: v.optional(v.string()),
  assessedByName: v.optional(v.string()),
  assessorRole: v.optional(assessorRoleValidator),
  benchmarkRating: v.optional(v.number()),
  benchmarkLevel: v.optional(v.string()),
  benchmarkDelta: v.optional(v.number()),
  benchmarkStatus: v.optional(benchmarkStatusValidator),
  notes: v.optional(v.string()),
  privateNotes: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  matchId: v.optional(v.string()),
  confidence: v.optional(confidenceValidator),
  createdAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get assessment by ID
 */
export const getAssessmentById = query({
  args: { assessmentId: v.id("skillAssessments") },
  returns: v.union(assessmentValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.assessmentId),
});

/**
 * Get all assessments for a passport
 */
export const getAssessmentsForPassport = query({
  args: {
    passportId: v.id("sportPassports"),
    skillCode: v.optional(v.string()),
  },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    if (args.skillCode) {
      return await ctx.db
        .query("skillAssessments")
        .withIndex("by_skill", (q) =>
          q.eq("passportId", args.passportId).eq("skillCode", args.skillCode!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("skillAssessments")
      .withIndex("by_passportId", (q) => q.eq("passportId", args.passportId))
      .order("desc")
      .collect();
  },
});

/**
 * Get latest assessment for each skill in a passport
 */
export const getLatestAssessmentsForPassport = query({
  args: { passportId: v.id("sportPassports") },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    const allAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_passportId", (q) => q.eq("passportId", args.passportId))
      .order("desc")
      .collect();

    // Get latest for each skill
    const latestBySkill = new Map<string, (typeof allAssessments)[number]>();
    for (const assessment of allAssessments) {
      if (!latestBySkill.has(assessment.skillCode)) {
        latestBySkill.set(assessment.skillCode, assessment);
      }
    }

    return Array.from(latestBySkill.values());
  },
});

/**
 * Get assessment history for a specific skill
 */
export const getSkillHistory = query({
  args: {
    passportId: v.id("sportPassports"),
    skillCode: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", args.passportId).eq("skillCode", args.skillCode)
      )
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

/**
 * Get assessments for a player across all sports
 */
export const getAssessmentsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.optional(v.string()),
  },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    if (args.sportCode) {
      return await ctx.db
        .query("skillAssessments")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("sportCode", args.sportCode!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("skillAssessments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get assessment history for a player with enriched skill names
 */
export const getAssessmentHistory = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.string(),
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("skillAssessments"),
      _creationTime: v.number(),
      passportId: v.id("sportPassports"),
      playerIdentityId: v.id("playerIdentities"),
      sportCode: v.string(),
      skillCode: v.string(),
      skillName: v.string(),
      organizationId: v.string(),
      rating: v.number(),
      previousRating: v.optional(v.number()),
      assessmentDate: v.string(),
      assessmentType: assessmentTypeValidator,
      assessedBy: v.optional(v.string()),
      assessedByName: v.optional(v.string()),
      assessorRole: v.optional(assessorRoleValidator),
      benchmarkRating: v.optional(v.number()),
      benchmarkLevel: v.optional(v.string()),
      benchmarkDelta: v.optional(v.number()),
      benchmarkStatus: v.optional(benchmarkStatusValidator),
      notes: v.optional(v.string()),
      confidence: v.optional(confidenceValidator),
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_player_and_sport", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("sportCode", args.sportCode)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .take(args.limit ?? 100);

    const skillDefinitions = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect();

    const skillMap = new Map(skillDefinitions.map((s) => [s.code, s.name]));

    return assessments.map((assessment) => ({
      ...assessment,
      skillName: skillMap.get(assessment.skillCode) ?? assessment.skillCode,
    }));
  },
});

/**
 * Get assessments by assessor
 */
export const getAssessmentsByAssessor = query({
  args: {
    assessedBy: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    let assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_assessor", (q) => q.eq("assessedBy", args.assessedBy))
      .order("desc")
      .collect();

    if (args.startDate) {
      assessments = assessments.filter(
        (a) => a.assessmentDate >= args.startDate!
      );
    }
    if (args.endDate) {
      assessments = assessments.filter(
        (a) => a.assessmentDate <= args.endDate!
      );
    }

    return assessments;
  },
});

/**
 * Get assessments for organization within date range
 */
export const getOrgAssessments = query({
  args: {
    organizationId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    assessmentType: v.optional(assessmentTypeValidator),
  },
  returns: v.array(assessmentValidator),
  handler: async (ctx, args) => {
    let assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    if (args.startDate) {
      assessments = assessments.filter(
        (a) => a.assessmentDate >= args.startDate!
      );
    }
    if (args.endDate) {
      assessments = assessments.filter(
        (a) => a.assessmentDate <= args.endDate!
      );
    }
    if (args.assessmentType) {
      assessments = assessments.filter(
        (a) => a.assessmentType === args.assessmentType
      );
    }

    return assessments;
  },
});

/**
 * Calculate progress for a skill
 */
export const getSkillProgress = query({
  args: {
    passportId: v.id("sportPassports"),
    skillCode: v.string(),
  },
  returns: v.object({
    currentRating: v.union(v.number(), v.null()),
    previousRating: v.union(v.number(), v.null()),
    firstRating: v.union(v.number(), v.null()),
    totalChange: v.union(v.number(), v.null()),
    recentChange: v.union(v.number(), v.null()),
    assessmentCount: v.number(),
    firstAssessmentDate: v.union(v.string(), v.null()),
    lastAssessmentDate: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", args.passportId).eq("skillCode", args.skillCode)
      )
      .order("asc")
      .collect();

    if (assessments.length === 0) {
      return {
        currentRating: null,
        previousRating: null,
        firstRating: null,
        totalChange: null,
        recentChange: null,
        assessmentCount: 0,
        firstAssessmentDate: null,
        lastAssessmentDate: null,
      };
    }

    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const secondToLast =
      assessments.length > 1 ? assessments[assessments.length - 2] : null;

    if (!last) {
      throw new Error("Failed to get last assessment");
    }

    return {
      currentRating: last.rating,
      previousRating: secondToLast?.rating ?? null,
      firstRating: first.rating,
      totalChange: last.rating - first.rating,
      recentChange: secondToLast ? last.rating - secondToLast.rating : null,
      assessmentCount: assessments.length,
      firstAssessmentDate: first.assessmentDate,
      lastAssessmentDate: last.assessmentDate,
    };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Record a skill assessment
 */
export const recordAssessment = mutation({
  args: {
    passportId: v.id("sportPassports"),
    skillCode: v.string(),
    rating: v.number(),
    assessmentDate: v.string(),
    assessmentType: assessmentTypeValidator,
    assessedBy: v.optional(v.string()),
    assessedByName: v.optional(v.string()),
    assessorRole: v.optional(assessorRoleValidator),
    benchmarkRating: v.optional(v.number()),
    benchmarkLevel: v.optional(v.string()),
    notes: v.optional(v.string()),
    privateNotes: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    confidence: v.optional(confidenceValidator),
  },
  returns: v.id("skillAssessments"),
  handler: async (ctx, args) => {
    // Verify passport exists
    const passport = await ctx.db.get(args.passportId);
    if (!passport) {
      throw new Error("Sport passport not found");
    }

    // Validate rating is 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Get previous rating for this skill
    const previousAssessment = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", args.passportId).eq("skillCode", args.skillCode)
      )
      .order("desc")
      .first();

    // Calculate benchmark delta if benchmark provided
    let benchmarkDelta: number | undefined;
    let benchmarkStatus:
      | "below"
      | "developing"
      | "on_track"
      | "exceeding"
      | "exceptional"
      | undefined;

    if (args.benchmarkRating) {
      benchmarkDelta = args.rating - args.benchmarkRating;

      if (benchmarkDelta < -1) {
        benchmarkStatus = "below";
      } else if (benchmarkDelta < 0) {
        benchmarkStatus = "developing";
      } else if (benchmarkDelta < 0.5) {
        benchmarkStatus = "on_track";
      } else if (benchmarkDelta < 1) {
        benchmarkStatus = "exceeding";
      } else {
        benchmarkStatus = "exceptional";
      }
    }

    const now = Date.now();

    return await ctx.db.insert("skillAssessments", {
      passportId: args.passportId,
      playerIdentityId: passport.playerIdentityId,
      sportCode: passport.sportCode,
      skillCode: args.skillCode,
      organizationId: passport.organizationId,
      rating: args.rating,
      previousRating: previousAssessment?.rating,
      assessmentDate: args.assessmentDate,
      assessmentType: args.assessmentType,
      assessedBy: args.assessedBy,
      assessedByName: args.assessedByName,
      assessorRole: args.assessorRole,
      benchmarkRating: args.benchmarkRating,
      benchmarkLevel: args.benchmarkLevel,
      benchmarkDelta,
      benchmarkStatus,
      notes: args.notes,
      privateNotes: args.privateNotes,
      sessionId: args.sessionId,
      matchId: args.matchId,
      confidence: args.confidence,
      createdAt: now,
    });
  },
});

/**
 * Record multiple assessments at once (batch)
 */
export const recordBatchAssessments = mutation({
  args: {
    passportId: v.id("sportPassports"),
    assessmentDate: v.string(),
    assessmentType: assessmentTypeValidator,
    assessedBy: v.optional(v.string()),
    assessedByName: v.optional(v.string()),
    assessorRole: v.optional(assessorRoleValidator),
    ratings: v.array(
      v.object({
        skillCode: v.string(),
        rating: v.number(),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    created: v.number(),
    assessmentIds: v.array(v.id("skillAssessments")),
  }),
  handler: async (ctx, args) => {
    // Verify passport exists
    const passport = await ctx.db.get(args.passportId);
    if (!passport) {
      throw new Error("Sport passport not found");
    }

    const now = Date.now();
    const assessmentIds: Id<"skillAssessments">[] = [];

    // Get all previous assessments for this passport
    const previousAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_passportId", (q) => q.eq("passportId", args.passportId))
      .order("desc")
      .collect();

    // Create a map of skill -> latest rating
    const latestRatings = new Map<string, number>();
    for (const assessment of previousAssessments) {
      if (!latestRatings.has(assessment.skillCode)) {
        latestRatings.set(assessment.skillCode, assessment.rating);
      }
    }

    for (const { skillCode, rating, notes } of args.ratings) {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error(`Rating for ${skillCode} must be between 1 and 5`);
      }

      const id = await ctx.db.insert("skillAssessments", {
        passportId: args.passportId,
        playerIdentityId: passport.playerIdentityId,
        sportCode: passport.sportCode,
        skillCode,
        organizationId: passport.organizationId,
        rating,
        previousRating: latestRatings.get(skillCode),
        assessmentDate: args.assessmentDate,
        assessmentType: args.assessmentType,
        assessedBy: args.assessedBy,
        assessedByName: args.assessedByName,
        assessorRole: args.assessorRole,
        notes,
        createdAt: now,
      });

      assessmentIds.push(id);
    }

    return {
      created: assessmentIds.length,
      assessmentIds,
    };
  },
});

/**
 * Update assessment notes
 */
export const updateAssessmentNotes = mutation({
  args: {
    assessmentId: v.id("skillAssessments"),
    notes: v.optional(v.string()),
    privateNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.assessmentId);
    if (!existing) {
      throw new Error("Assessment not found");
    }

    const updates: Record<string, unknown> = {};

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    if (args.privateNotes !== undefined) {
      updates.privateNotes = args.privateNotes;
    }

    await ctx.db.patch(args.assessmentId, updates);
    return null;
  },
});

/**
 * Delete an assessment (hard delete)
 */
export const deleteAssessment = mutation({
  args: { assessmentId: v.id("skillAssessments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.assessmentId);
    if (!existing) {
      throw new Error("Assessment not found");
    }

    await ctx.db.delete(args.assessmentId);
    return null;
  },
});

/**
 * Record a skill assessment with auto-benchmark lookup
 * This mutation automatically looks up the appropriate benchmark based on the player's DOB
 */
export const recordAssessmentWithBenchmark = mutation({
  args: {
    passportId: v.id("sportPassports"),
    skillCode: v.string(),
    rating: v.number(),
    assessmentDate: v.string(),
    assessmentType: assessmentTypeValidator,
    assessedBy: v.optional(v.string()),
    assessedByName: v.optional(v.string()),
    assessorRole: v.optional(assessorRoleValidator),
    notes: v.optional(v.string()),
    privateNotes: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    confidence: v.optional(confidenceValidator),
    // Optional level for benchmark lookup, defaults to "recreational"
    benchmarkLevel: v.optional(
      v.union(
        v.literal("recreational"),
        v.literal("competitive"),
        v.literal("development"),
        v.literal("elite")
      )
    ),
  },
  returns: v.object({
    assessmentId: v.id("skillAssessments"),
    benchmarkFound: v.boolean(),
    benchmarkRating: v.optional(v.number()),
    benchmarkStatus: v.optional(
      v.union(
        v.literal("below"),
        v.literal("developing"),
        v.literal("on_track"),
        v.literal("exceeding"),
        v.literal("exceptional")
      )
    ),
    ageGroup: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify passport exists
    const passport = await ctx.db.get(args.passportId);
    if (!passport) {
      throw new Error("Sport passport not found");
    }

    // Validate rating is 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Get player identity to get DOB
    const playerIdentity = await ctx.db.get(passport.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }

    // Calculate age group from DOB
    let ageGroupCode: string | undefined;
    let benchmarkRating: number | undefined;
    let benchmarkDelta: number | undefined;
    let benchmarkStatus:
      | "below"
      | "developing"
      | "on_track"
      | "exceeding"
      | "exceptional"
      | undefined;

    if (playerIdentity.dateOfBirth) {
      const dob = new Date(playerIdentity.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      // Map age to age group code (matches referenceData.ts getAgeGroupFromDOB)
      if (age < 7) {
        ageGroupCode = "u7";
      } else if (age < 8) {
        ageGroupCode = "u8";
      } else if (age < 9) {
        ageGroupCode = "u9";
      } else if (age < 10) {
        ageGroupCode = "u10";
      } else if (age < 11) {
        ageGroupCode = "u11";
      } else if (age < 12) {
        ageGroupCode = "u12";
      } else if (age < 13) {
        ageGroupCode = "u13";
      } else if (age < 14) {
        ageGroupCode = "u14";
      } else if (age < 15) {
        ageGroupCode = "u15";
      } else if (age < 16) {
        ageGroupCode = "u16";
      } else if (age < 17) {
        ageGroupCode = "u17";
      } else if (age < 18) {
        ageGroupCode = "u18";
      } else if (age < 19) {
        ageGroupCode = "u19";
      } else if (age < 20) {
        ageGroupCode = "u20";
      } else if (age < 21) {
        ageGroupCode = "u21";
      } else {
        ageGroupCode = "senior";
      }

      // Look up benchmark
      const level = args.benchmarkLevel ?? "recreational";
      const benchmark = await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_context", (q) =>
          q
            .eq("sportCode", passport.sportCode)
            .eq("skillCode", args.skillCode)
            .eq("ageGroup", ageGroupCode!)
            .eq("gender", "all")
            .eq("level", level)
        )
        .first();

      if (benchmark?.isActive) {
        benchmarkRating = benchmark.expectedRating;
        benchmarkDelta = args.rating - benchmarkRating;

        // Determine status based on thresholds
        if (args.rating < benchmark.minAcceptable) {
          benchmarkStatus = "below";
        } else if (args.rating < benchmark.developingThreshold) {
          benchmarkStatus = "developing";
        } else if (args.rating < benchmark.excellentThreshold) {
          benchmarkStatus = "on_track";
        } else if (args.rating < 5) {
          benchmarkStatus = "exceeding";
        } else {
          benchmarkStatus = "exceptional";
        }
      }
    }

    // Get previous rating for this skill
    const previousAssessment = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", args.passportId).eq("skillCode", args.skillCode)
      )
      .order("desc")
      .first();

    const now = Date.now();

    const assessmentId = await ctx.db.insert("skillAssessments", {
      passportId: args.passportId,
      playerIdentityId: passport.playerIdentityId,
      sportCode: passport.sportCode,
      skillCode: args.skillCode,
      organizationId: passport.organizationId,
      rating: args.rating,
      previousRating: previousAssessment?.rating,
      assessmentDate: args.assessmentDate,
      assessmentType: args.assessmentType,
      assessedBy: args.assessedBy,
      assessedByName: args.assessedByName,
      assessorRole: args.assessorRole,
      benchmarkRating,
      benchmarkLevel: ageGroupCode,
      benchmarkDelta,
      benchmarkStatus,
      notes: args.notes,
      privateNotes: args.privateNotes,
      sessionId: args.sessionId,
      matchId: args.matchId,
      confidence: args.confidence,
      createdAt: now,
    });

    // Auto-update review status for formal reviews and training sessions
    if (
      args.assessmentType === "formal_review" ||
      args.assessmentType === "training"
    ) {
      // Find the player's enrollment in this organization
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", passport.playerIdentityId)
            .eq("organizationId", passport.organizationId)
        )
        .first();

      if (enrollment) {
        // Calculate next review due date (90 days from assessment date)
        const assessmentDateObj = new Date(args.assessmentDate);
        const nextReviewDate = new Date(assessmentDateObj);
        nextReviewDate.setDate(nextReviewDate.getDate() + 90);

        // Update enrollment with review completion
        await ctx.db.patch(enrollment._id, {
          reviewStatus: "Completed",
          lastReviewDate: args.assessmentDate,
          nextReviewDue: nextReviewDate.toISOString().split("T")[0],
        });
      }
    }

    return {
      assessmentId,
      benchmarkFound: benchmarkRating !== undefined,
      benchmarkRating,
      benchmarkStatus,
      ageGroup: ageGroupCode,
    };
  },
});

/**
 * Get club-wide benchmark analytics
 * Returns aggregated stats showing how players compare to benchmarks
 */
export const getClubBenchmarkAnalytics = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get all assessments for this org that have benchmark data
    let assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by sport if provided
    if (args.sportCode) {
      assessments = assessments.filter((a) => a.sportCode === args.sportCode);
    }

    // Filter to only assessments with benchmark data
    assessments = assessments.filter(
      (a) => a.benchmarkStatus !== undefined && a.benchmarkStatus !== null
    );

    // Get unique player IDs to filter by age group if needed
    let playerIds = new Set<Id<"playerIdentities">>();
    for (const a of assessments) {
      playerIds.add(a.playerIdentityId);
    }

    // If age group filter, get enrollments and filter by age group
    if (args.ageGroup) {
      const validPlayerIds = new Set<string>();
      for (const playerId of playerIds) {
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerId)
              .eq("organizationId", args.organizationId)
          )
          .first();
        if (enrollment && enrollment.ageGroup === args.ageGroup) {
          validPlayerIds.add(playerId);
        }
      }
      assessments = assessments.filter((a) =>
        validPlayerIds.has(a.playerIdentityId)
      );
      playerIds = new Set(
        Array.from(validPlayerIds) as Id<"playerIdentities">[]
      );
    }

    // Get latest assessment per player per skill (deduplicate)
    const latestAssessments = new Map<string, (typeof assessments)[number]>();
    for (const a of assessments) {
      const key = `${a.playerIdentityId}_${a.skillCode}`;
      const existing = latestAssessments.get(key);
      if (!existing || a.assessmentDate > existing.assessmentDate) {
        latestAssessments.set(key, a);
      }
    }

    const uniqueAssessments = Array.from(latestAssessments.values());

    // Calculate status distribution
    const statusCounts: Record<string, number> = {
      below: 0,
      developing: 0,
      on_track: 0,
      exceeding: 0,
      exceptional: 0,
    };

    for (const a of uniqueAssessments) {
      if (a.benchmarkStatus) {
        statusCounts[a.benchmarkStatus] =
          (statusCounts[a.benchmarkStatus] || 0) + 1;
      }
    }

    // Calculate skill-level stats
    const skillStats = new Map<
      string,
      {
        below: number;
        developing: number;
        on_track: number;
        exceeding: number;
        exceptional: number;
        total: number;
      }
    >();
    for (const a of uniqueAssessments) {
      if (!a.benchmarkStatus) {
        continue;
      }
      const stats = skillStats.get(a.skillCode) ?? {
        below: 0,
        developing: 0,
        on_track: 0,
        exceeding: 0,
        exceptional: 0,
        total: 0,
      };
      stats[a.benchmarkStatus] += 1;
      stats.total += 1;
      skillStats.set(a.skillCode, stats);
    }

    // Find skills with most players below benchmark (problem areas)
    const skillsNeedingAttention = Array.from(skillStats.entries())
      .map(([skillCode, stats]) => ({
        skillCode,
        belowCount: stats.below + stats.developing,
        totalCount: stats.total,
        belowPercentage:
          stats.total > 0
            ? ((stats.below + stats.developing) / stats.total) * 100
            : 0,
      }))
      .filter((s) => s.belowPercentage > 25) // More than 25% below/developing
      .sort((a, b) => b.belowPercentage - a.belowPercentage)
      .slice(0, 10);

    // Get players needing attention (multiple skills below benchmark)
    const playerBelowCounts = new Map<string, number>();
    for (const a of uniqueAssessments) {
      if (a.benchmarkStatus === "below") {
        playerBelowCounts.set(
          a.playerIdentityId,
          (playerBelowCounts.get(a.playerIdentityId) || 0) + 1
        );
      }
    }

    const playersNeedingAttention: Array<{
      playerIdentityId: string;
      belowCount: number;
      firstName: string;
      lastName: string;
    }> = [];

    for (const [playerId, count] of playerBelowCounts.entries()) {
      if (count >= 2) {
        const player = await ctx.db.get(playerId as Id<"playerIdentities">);
        if (player) {
          playersNeedingAttention.push({
            playerIdentityId: playerId,
            belowCount: count,
            firstName: player.firstName,
            lastName: player.lastName,
          });
        }
      }
    }

    playersNeedingAttention.sort((a, b) => b.belowCount - a.belowCount);

    // Calculate overall "on track" percentage
    const total = uniqueAssessments.length;
    const onTrackOrBetter =
      statusCounts.on_track + statusCounts.exceeding + statusCounts.exceptional;
    const onTrackPercentage = total > 0 ? (onTrackOrBetter / total) * 100 : 0;

    return {
      totalAssessments: uniqueAssessments.length,
      totalPlayers: playerIds.size,
      statusDistribution: statusCounts,
      onTrackPercentage,
      skillsNeedingAttention,
      playersNeedingAttention: playersNeedingAttention.slice(0, 10),
      skillStats: Object.fromEntries(skillStats),
    };
  },
});

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

/**
 * Migrate legacy player skills to new skillAssessments system
 * This reads skills from the legacy `players.skills` Record<string, number>
 * and creates corresponding skillAssessment records linked to sport passports
 */
export const migrateLegacySkillsForPlayer = mutation({
  args: {
    legacyPlayerId: v.id("players"),
    passportId: v.id("sportPassports"),
  },
  returns: v.object({
    migratedCount: v.number(),
    skippedCount: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const errors: string[] = [];
    let migratedCount = 0;
    let skippedCount = 0;

    // Get legacy player
    const legacyPlayer = await ctx.db.get(args.legacyPlayerId);
    if (!legacyPlayer) {
      return {
        migratedCount: 0,
        skippedCount: 0,
        errors: ["Legacy player not found"],
      };
    }

    // Get passport
    const passport = await ctx.db.get(args.passportId);
    if (!passport) {
      return {
        migratedCount: 0,
        skippedCount: 0,
        errors: ["Sport passport not found"],
      };
    }

    // Get skills from legacy player
    const skills = legacyPlayer.skills;
    if (!skills || Object.keys(skills).length === 0) {
      return {
        migratedCount: 0,
        skippedCount: 0,
        errors: ["No skills to migrate"],
      };
    }

    const now = Date.now();
    const assessmentDate = new Date().toISOString().split("T")[0];

    // Migrate each skill
    for (const [skillCode, rating] of Object.entries(skills)) {
      // Skip invalid ratings
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        skippedCount += 1;
        errors.push(`Skipped invalid rating for ${skillCode}: ${rating}`);
        continue;
      }

      // Check if assessment already exists for this skill
      const existing = await ctx.db
        .query("skillAssessments")
        .withIndex("by_skill", (q) =>
          q.eq("passportId", args.passportId).eq("skillCode", skillCode)
        )
        .first();

      if (existing) {
        skippedCount += 1;
        continue;
      }

      // Create assessment
      await ctx.db.insert("skillAssessments", {
        passportId: args.passportId,
        playerIdentityId: passport.playerIdentityId,
        sportCode: passport.sportCode,
        skillCode,
        organizationId: passport.organizationId,
        rating,
        assessmentDate,
        assessmentType: "import",
        assessorRole: "system",
        notes: `Migrated from legacy player record ${args.legacyPlayerId}`,
        createdAt: now,
      });

      migratedCount += 1;
    }

    return { migratedCount, skippedCount, errors };
  },
});

/**
 * Bulk migrate legacy skills for all linked players in an organization
 */
export const bulkMigrateLegacySkills = mutation({
  args: {
    organizationId: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    playersProcessed: v.number(),
    totalMigrated: v.number(),
    totalSkipped: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const errors: string[] = [];
    let playersProcessed = 0;
    let totalMigrated = 0;
    let totalSkipped = 0;

    // Get all legacy players for this organization
    const legacyPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get all player identity links for matching
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Create lookup map by name
    const enrollmentByName = new Map<string, (typeof enrollments)[0]>();
    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (player) {
        const key = `${player.firstName.toLowerCase().trim()} ${player.lastName.toLowerCase().trim()}`;
        enrollmentByName.set(key, enrollment);
      }
    }

    for (const legacyPlayer of legacyPlayers) {
      // Try to find matching enrollment by name
      const nameParts = legacyPlayer.name.trim().split(" ");
      const firstName = nameParts[0]?.toLowerCase() || "";
      const lastName = nameParts.slice(1).join(" ").toLowerCase() || "";
      const key = `${firstName} ${lastName}`;

      const matchedEnrollment = enrollmentByName.get(key);
      if (!matchedEnrollment) {
        errors.push(`No identity match for: ${legacyPlayer.name}`);
        continue;
      }

      // Get passport for this player
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", matchedEnrollment.playerIdentityId)
        )
        .first();

      if (!passport) {
        errors.push(`No passport for: ${legacyPlayer.name}`);
        continue;
      }

      // Skip if no skills to migrate
      if (
        !legacyPlayer.skills ||
        Object.keys(legacyPlayer.skills).length === 0
      ) {
        continue;
      }

      if (args.dryRun) {
        playersProcessed += 1;
        totalMigrated += Object.keys(legacyPlayer.skills).length;
        continue;
      }

      // Migrate skills
      const assessmentDate = new Date().toISOString().split("T")[0];
      const now = Date.now();

      for (const [skillCode, rating] of Object.entries(legacyPlayer.skills)) {
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
          totalSkipped += 1;
          continue;
        }

        // Check if already exists
        const existing = await ctx.db
          .query("skillAssessments")
          .withIndex("by_skill", (q) =>
            q.eq("passportId", passport._id).eq("skillCode", skillCode)
          )
          .first();

        if (existing) {
          totalSkipped += 1;
          continue;
        }

        await ctx.db.insert("skillAssessments", {
          passportId: passport._id,
          playerIdentityId: passport.playerIdentityId,
          sportCode: passport.sportCode,
          skillCode,
          organizationId: passport.organizationId,
          rating,
          assessmentDate,
          assessmentType: "import",
          assessorRole: "system",
          notes: `Migrated from legacy player ${legacyPlayer._id}`,
          createdAt: now,
        });

        totalMigrated += 1;
      }

      playersProcessed += 1;
    }

    return { playersProcessed, totalMigrated, totalSkipped, errors };
  },
});

/**
 * Get latest skill assessments for coach's team players
 * Returns grouped by player with latest rating for each skill
 */
export const getLatestSkillsForCoachPlayers = query({
  args: {
    organizationId: v.string(),
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      skills: v.record(v.string(), v.number()), // { skillCode: rating }
    })
  ),
  handler: async (ctx, args) => {
    const { organizationId, playerIdentityIds } = args;

    // Fetch assessments for requested players
    // Use by_playerIdentityId index and filter by org (more efficient than full scan)
    const allAssessments = [];

    for (const playerId of playerIdentityIds) {
      const playerAssessments = await ctx.db
        .query("skillAssessments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .filter((q) => q.eq(q.field("organizationId"), organizationId))
        .collect();

      allAssessments.push(...playerAssessments);
    }

    const relevantAssessments = allAssessments;

    // Group by player and skill, keeping only latest
    const latestByPlayerAndSkill = new Map<
      string,
      Map<string, (typeof relevantAssessments)[0]>
    >();

    for (const assessment of relevantAssessments) {
      const playerId = assessment.playerIdentityId;
      const skillCode = assessment.skillCode;

      if (!latestByPlayerAndSkill.has(playerId)) {
        latestByPlayerAndSkill.set(playerId, new Map());
      }

      const playerMap = latestByPlayerAndSkill.get(playerId)!;
      const existing = playerMap.get(skillCode);

      if (
        !existing ||
        new Date(assessment.assessmentDate) > new Date(existing.assessmentDate)
      ) {
        playerMap.set(skillCode, assessment);
      }
    }

    // Convert to return format
    const result = [];
    for (const playerId of playerIdentityIds) {
      const skills: Record<string, number> = {};
      const playerMap = latestByPlayerAndSkill.get(playerId);

      if (playerMap) {
        for (const [skillCode, assessment] of playerMap.entries()) {
          skills[skillCode] = assessment.rating;
        }
      }

      result.push({
        playerIdentityId: playerId,
        skills,
      });
    }

    return result;
  },
});
