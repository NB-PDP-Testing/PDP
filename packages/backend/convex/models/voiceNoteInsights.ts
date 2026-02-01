import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// CONSTANTS
// ============================================================

// Regex patterns for parsing skill ratings (top-level for performance)
// Match rating with optional "/5" and any punctuation or end
const RATING_PATTERN = /(\d+)(?:\/5)?/;
const SKILL_PATTERN_1 = /Set\s+.+?'s\s+(\w+)(?:\s+skill)?(?:\s+(?:to|rating))/i;
const SKILL_PATTERN_2 = /Set\s+(\w+)\s+skill\s+rating\s+to/i; // "Set tackling skill rating to 4/5"
const SKILL_PATTERN_3 = /Set\s+(\w+)\s+skill\s+to/i;
const SKILL_PATTERN_4 = /Set\s+(\w+)\s+to\s+\d+/i; // "Set tackling to 4"
const SKILL_PATTERN_5 = /^(.+?):\s*\d+/;

// Helper function to parse skill rating from various AI-generated formats
// Handles: "Kicking: 5", "Set kicking skill rating to 4/5", "Set kicking skill to 5/5", "Set Sinead's kicking to 5/5", "Set tackling to 4/5"
function parseSkillRating(recommendedUpdate: string): {
  success: boolean;
  skillName?: string;
  rating?: number;
  error?: string;
} {
  // Extract rating: find "N/5" or "N" before end of string
  const ratingMatch = recommendedUpdate.match(RATING_PATTERN);
  if (!ratingMatch) {
    return {
      success: false,
      error: `No rating found in: "${recommendedUpdate}"`,
    };
  }
  const rating = Number.parseInt(ratingMatch[1], 10);

  if (rating < 1 || rating > 5) {
    return {
      success: false,
      error: `Invalid rating ${rating} (must be 1-5)`,
    };
  }

  // Extract skill name - try multiple patterns
  let skillName: string | undefined;

  // Pattern 1: "Set X's SKILL to/rating N" → capture SKILL
  let match = recommendedUpdate.match(SKILL_PATTERN_1);
  if (match) {
    skillName = match[1];
  }

  // Pattern 2: "Set SKILL skill rating to N" → capture SKILL
  if (!skillName) {
    match = recommendedUpdate.match(SKILL_PATTERN_2);
    if (match) {
      skillName = match[1];
    }
  }

  // Pattern 3: "Set SKILL skill to N" → capture SKILL
  if (!skillName) {
    match = recommendedUpdate.match(SKILL_PATTERN_3);
    if (match) {
      skillName = match[1];
    }
  }

  // Pattern 4: "Set SKILL to N" (without "skill" word) → capture SKILL
  if (!skillName) {
    match = recommendedUpdate.match(SKILL_PATTERN_4);
    if (match) {
      skillName = match[1];
    }
  }

  // Pattern 5: "SKILL: N" (original format) → capture SKILL
  if (!skillName) {
    match = recommendedUpdate.match(SKILL_PATTERN_5);
    if (match) {
      skillName = match[1].trim();
    }
  }

  if (!skillName) {
    return {
      success: false,
      error: `Could not extract skill name from: "${recommendedUpdate}"`,
    };
  }

  // Capitalize first letter
  skillName =
    skillName.charAt(0).toUpperCase() + skillName.slice(1).toLowerCase();

  return {
    success: true,
    skillName,
    rating,
  };
}

// ============================================================
// VALIDATORS
// ============================================================

const insightValidator = v.object({
  _id: v.id("voiceNoteInsights"),
  _creationTime: v.number(),
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.string(),
  recommendedUpdate: v.optional(v.string()),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  confidenceScore: v.number(),
  wouldAutoApply: v.boolean(),
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed"),
    v.literal("auto_applied")
  ),
  appliedAt: v.optional(v.number()),
  appliedBy: v.optional(v.string()),
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),
  organizationId: v.string(),
  coachId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// PUBLIC QUERIES
// ============================================================

/**
 * Get pending insights for coach with wouldAutoApply calculation
 * Phase 7.1: Shows which insights AI would auto-apply at current trust level
 */
export const getPendingInsights = query({
  args: {
    organizationId: v.string(),
    coachId: v.optional(v.string()), // Optional: defaults to authenticated user
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      )
    ), // Optional: defaults to "pending"
  },
  returns: v.array(insightValidator),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id;
    const coachId = args.coachId || userId;

    // Get coach trust level for wouldAutoApply calculation
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    // Calculate effective trust level and threshold
    // effectiveLevel is the LOWER of currentLevel and preferredLevel
    // This ensures coaches can't bypass safety by having high currentLevel if they prefer lower
    const effectiveLevel = trustLevel
      ? Math.min(
          trustLevel.currentLevel,
          trustLevel.preferredLevel ?? trustLevel.currentLevel
        )
      : 0;
    const threshold = trustLevel?.insightConfidenceThreshold ?? 0.7;

    // Query insights by coach and org with status filter
    const status = args.status || "pending";
    const insights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_coach_org_status", (q) =>
        q
          .eq("coachId", coachId)
          .eq("organizationId", args.organizationId)
          .eq("status", status)
      )
      .collect();

    // Calculate wouldAutoApply for each insight
    const insightsWithPrediction = insights.map((insight) => {
      // Calculate if this insight would auto-apply at current trust level
      // Level 0/1: Never auto-apply (always false)
      // Level 2+: Auto-apply if NOT injury/medical AND confidence >= threshold
      // Injury/medical categories: NEVER auto-apply (safety guardrail)
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      return {
        ...insight,
        wouldAutoApply,
      };
    });

    return insightsWithPrediction;
  },
});

/**
 * Get auto-applied insights with audit details (Phase 7.2)
 * Returns insights that were auto-applied by AI with undo capability
 */
export const getAutoAppliedInsights = query({
  args: {
    organizationId: v.string(),
    coachId: v.optional(v.string()), // Optional: defaults to authenticated user
  },
  returns: v.array(
    v.object({
      // Insight data
      _id: v.id("voiceNoteInsights"),
      _creationTime: v.number(),
      voiceNoteId: v.id("voiceNotes"),
      insightId: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.string(),
      recommendedUpdate: v.optional(v.string()),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      playerName: v.optional(v.string()),
      teamId: v.optional(v.string()),
      teamName: v.optional(v.string()),
      assigneeUserId: v.optional(v.string()),
      assigneeName: v.optional(v.string()),
      confidenceScore: v.number(),
      wouldAutoApply: v.boolean(),
      status: v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      ),
      appliedAt: v.optional(v.number()),
      appliedBy: v.optional(v.string()),
      organizationId: v.string(),
      coachId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      // Audit trail data
      auditRecordId: v.id("autoAppliedInsights"),
      autoAppliedByAI: v.boolean(),
      fieldChanged: v.optional(v.string()),
      previousValue: v.optional(v.string()),
      newValue: v.string(),
      undoneAt: v.optional(v.number()),
      undoReason: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id;
    const coachId = args.coachId || userId;

    // Query auto-applied insights for this coach and org
    const insights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_coach_org_status", (q) =>
        q
          .eq("coachId", coachId)
          .eq("organizationId", args.organizationId)
          .eq("status", "auto_applied")
      )
      .collect();

    // Join with autoAppliedInsights table to get audit details
    const insightsWithAudit = await Promise.all(
      insights.map(async (insight) => {
        const auditRecord = await ctx.db
          .query("autoAppliedInsights")
          .withIndex("by_insight", (q) => q.eq("insightId", insight._id))
          .first();

        if (!auditRecord) {
          // Race condition: Insight marked as auto_applied but processVoiceNoteInsight hasn't run yet
          // Skip this insight until the audit record is created
          return null;
        }

        return {
          ...insight,
          auditRecordId: auditRecord._id,
          autoAppliedByAI: auditRecord.autoAppliedByAI,
          fieldChanged: auditRecord.fieldChanged,
          previousValue: auditRecord.previousValue,
          newValue: auditRecord.newValue,
          undoneAt: auditRecord.undoneAt,
          undoReason: auditRecord.undoReason,
        };
      })
    );

    // Filter out null values (insights without audit records yet)
    const validInsights = insightsWithAudit.filter(
      (insight) => insight !== null
    );

    // Sort by appliedAt descending (most recent first)
    validInsights.sort((a, b) => {
      const aTime = a.appliedAt || 0;
      const bTime = b.appliedAt || 0;
      return bTime - aTime;
    });

    return validInsights;
  },
});

// ============================================================
// PUBLIC MUTATIONS
// ============================================================

/**
 * Apply an insight (Phase 7.1: Track preview mode statistics)
 */
export const applyInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.id("voiceNoteInsights"),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Get the insight
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    // Verify user is the coach for this insight
    if (insight.coachId !== userId) {
      throw new Error("Only the coach who created this insight can apply it");
    }

    // Track preview mode statistics (Phase 7.1)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", insight.coachId))
      .first();

    if (
      trustLevel?.insightPreviewModeStats &&
      !trustLevel.insightPreviewModeStats.completedAt
    ) {
      // Calculate if this insight would have been auto-applied
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      // Update preview mode stats
      const newInsights =
        trustLevel.insightPreviewModeStats.wouldAutoApplyInsights +
        (wouldAutoApply ? 1 : 0);
      const newApplied =
        trustLevel.insightPreviewModeStats.coachAppliedThose +
        (wouldAutoApply ? 1 : 0);
      const agreementRate = newInsights > 0 ? newApplied / newInsights : 0;

      await ctx.db.patch(trustLevel._id, {
        insightPreviewModeStats: {
          ...trustLevel.insightPreviewModeStats,
          wouldAutoApplyInsights: newInsights,
          coachAppliedThose: newApplied,
          agreementRate,
          completedAt: newInsights >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Apply the insight in voiceNoteInsights table
    await ctx.db.patch(args.insightId, {
      status: "applied",
      appliedAt: Date.now(),
      appliedBy: userId,
    });

    // Also update the embedded insights array in voiceNotes document
    const voiceNote = await ctx.db.get(insight.voiceNoteId);
    if (voiceNote) {
      const updatedInsights = voiceNote.insights.map((embeddedInsight: any) => {
        if (embeddedInsight.id === insight.insightId) {
          return {
            ...embeddedInsight,
            status: "applied",
            appliedAt: Date.now(),
            appliedBy: userId,
          };
        }
        return embeddedInsight;
      });

      await ctx.db.patch(insight.voiceNoteId, {
        insights: updatedInsights,
      });
    }

    return args.insightId;
  },
});

/**
 * Dismiss an insight (Phase 7.1: Track preview mode statistics)
 */
export const dismissInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.id("voiceNoteInsights"),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Get the insight
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    // Verify user is the coach for this insight
    if (insight.coachId !== userId) {
      throw new Error("Only the coach who created this insight can dismiss it");
    }

    // Track preview mode statistics (Phase 7.1)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", insight.coachId))
      .first();

    if (
      trustLevel?.insightPreviewModeStats &&
      !trustLevel.insightPreviewModeStats.completedAt
    ) {
      // Calculate if this insight would have been auto-applied
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      // Update preview mode stats - increment dismissed count
      const newInsights =
        trustLevel.insightPreviewModeStats.wouldAutoApplyInsights +
        (wouldAutoApply ? 1 : 0);
      const newDismissed =
        trustLevel.insightPreviewModeStats.coachDismissedThose +
        (wouldAutoApply ? 1 : 0);
      // Don't increment coachAppliedThose for dismissals
      const currentApplied =
        trustLevel.insightPreviewModeStats.coachAppliedThose;
      const agreementRate = newInsights > 0 ? currentApplied / newInsights : 0;

      await ctx.db.patch(trustLevel._id, {
        insightPreviewModeStats: {
          ...trustLevel.insightPreviewModeStats,
          wouldAutoApplyInsights: newInsights,
          coachDismissedThose: newDismissed,
          agreementRate,
          completedAt: newInsights >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Dismiss the insight in voiceNoteInsights table
    await ctx.db.patch(args.insightId, {
      status: "dismissed",
      dismissedAt: Date.now(),
      dismissedBy: userId,
    });

    // Also update the embedded insights array in voiceNotes document
    const voiceNote = await ctx.db.get(insight.voiceNoteId);
    if (voiceNote) {
      const updatedInsights = voiceNote.insights.map((embeddedInsight: any) => {
        if (embeddedInsight.id === insight.insightId) {
          return {
            ...embeddedInsight,
            status: "dismissed",
            dismissedAt: Date.now(),
            dismissedBy: userId,
          };
        }
        return embeddedInsight;
      });

      await ctx.db.patch(insight.voiceNoteId, {
        insights: updatedInsights,
      });
    }

    return args.insightId;
  },
});

// ============================================================
// PHASE 7.2: AUTO-APPLY MUTATIONS
// ============================================================

/**
 * Auto-apply a skill insight to player profile (Phase 7.2)
 * Requires Level 2+ trust and high confidence score
 */
export const autoApplyInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.object({
    success: v.boolean(),
    appliedInsightId: v.optional(v.id("autoAppliedInsights")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Get authenticated coach userId
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }
    const userId = user._id;
    if (!userId) {
      return { success: false, message: "User ID not found" };
    }

    // 2. Fetch insight from voiceNoteInsights table
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      return { success: false, message: "Insight not found" };
    }

    // 3. Validate insight belongs to this coach
    if (insight.coachId !== userId) {
      return {
        success: false,
        message: "Only the coach who created this insight can auto-apply it",
      };
    }

    // 4. Fetch coach trust level from coachTrustLevels
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .first();

    if (!trustLevel) {
      return { success: false, message: "Trust level not found for coach" };
    }

    // 5. Calculate effectiveLevel = Math.min(currentLevel, preferredLevel ?? currentLevel)
    const effectiveLevel = Math.min(
      trustLevel.currentLevel,
      trustLevel.preferredLevel ?? trustLevel.currentLevel
    );

    // 6. Validate trust requirements
    if (effectiveLevel < 2) {
      return {
        success: false,
        message:
          "Level 2+ required for auto-apply (current: Level " +
          effectiveLevel +
          ")",
      };
    }

    const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
    if (insight.confidenceScore < threshold) {
      return {
        success: false,
        message: `Confidence ${insight.confidenceScore} below threshold ${threshold}`,
      };
    }

    if (insight.category !== "skill") {
      return {
        success: false,
        message: "Only skill insights can be auto-applied in Phase 7.2",
      };
    }

    if (insight.status !== "pending") {
      return {
        success: false,
        message: `Insight already ${insight.status}`,
      };
    }

    // 7. Get player from orgPlayerEnrollments using insight.playerId
    // NOTE: The schema shows playerIdentityId, not playerId
    if (!insight.playerIdentityId) {
      return {
        success: false,
        message: "Insight missing playerIdentityId",
      };
    }

    const playerIdentityId = insight.playerIdentityId;

    // We need the player's sportPassport to update skillAssessments
    const sportPassport = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", insight.organizationId)
      )
      .first();

    if (!sportPassport) {
      return {
        success: false,
        message: "Sport passport not found for player",
      };
    }

    // 9. Extract skill name and new rating from insight.recommendedUpdate
    // Parse format: 'Skill: Rating' (e.g., 'Passing: 4')
    if (!insight.recommendedUpdate) {
      return {
        success: false,
        message: "Insight missing recommendedUpdate",
      };
    }

    const parseResult = parseSkillRating(insight.recommendedUpdate);
    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error || "Failed to parse skill rating",
      };
    }

    const skillName = parseResult.skillName ?? "";
    const newRating = parseResult.rating ?? 0;

    // Get current skill assessment (previousValue)
    // Note: skillCode needs to be determined from skillName
    // For now, we'll use skillName as skillCode (should ideally map through skillDefinitions)
    const currentAssessment = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", sportPassport._id).eq("skillCode", skillName)
      )
      .first();

    const previousRating = currentAssessment?.rating;

    // 10. Update player.skillRatings with new rating
    // Create or update skill assessment
    if (currentAssessment) {
      // Update existing assessment
      await ctx.db.patch(currentAssessment._id, {
        rating: newRating,
        previousRating,
        assessmentDate: new Date().toISOString().split("T")[0],
        assessmentType: "training",
        assessedBy: userId,
        assessorRole: "coach",
      });
    } else {
      // Create new assessment
      await ctx.db.insert("skillAssessments", {
        passportId: sportPassport._id,
        playerIdentityId,
        sportCode: sportPassport.sportCode,
        skillCode: skillName,
        organizationId: insight.organizationId,
        rating: newRating,
        previousRating: undefined,
        assessmentDate: new Date().toISOString().split("T")[0],
        assessmentType: "training",
        assessedBy: userId,
        assessorRole: "coach",
        createdAt: Date.now(),
      });
    }

    // 11. Create autoAppliedInsights audit record
    // Note: playerId field is deprecated and expects Id<"orgPlayerEnrollments">
    // We need to get the enrollment record for this player
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", insight.organizationId)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        message: "Player enrollment not found",
      };
    }

    const auditRecordId = await ctx.db.insert("autoAppliedInsights", {
      insightId: insight._id,
      voiceNoteId: insight.voiceNoteId,
      playerId: enrollment._id,
      playerIdentityId,
      coachId: userId,
      organizationId: insight.organizationId,
      category: insight.category,
      confidenceScore: insight.confidenceScore,
      insightTitle: insight.title,
      insightDescription: insight.description,
      appliedAt: Date.now(),
      autoAppliedByAI: true,
      changeType: "skill_rating",
      targetTable: "skillAssessments",
      targetRecordId: currentAssessment?._id,
      fieldChanged: skillName,
      previousValue: previousRating?.toString() ?? "none",
      newValue: newRating.toString(),
    });

    // 12. Update insight status in voiceNoteInsights table
    await ctx.db.patch(args.insightId, {
      status: "auto_applied",
      appliedAt: Date.now(),
      appliedBy: userId,
    });

    // 13. ALSO update the embedded insights array in voiceNotes document
    // This prevents duplicate display in frontend (one in Pending, one in Auto-Applied)
    const voiceNote = await ctx.db.get(insight.voiceNoteId);
    if (voiceNote) {
      const updatedInsights = voiceNote.insights.map((embeddedInsight: any) => {
        if (embeddedInsight.id === insight.insightId) {
          return {
            ...embeddedInsight,
            status: "auto_applied",
            appliedAt: Date.now(),
            appliedBy: userId,
          };
        }
        return embeddedInsight;
      });

      await ctx.db.patch(insight.voiceNoteId, {
        insights: updatedInsights,
      });
    }

    // 14. Return success with audit record ID
    return {
      success: true,
      appliedInsightId: auditRecordId,
      message: `Auto-applied: ${skillName} ${previousRating ?? "none"} → ${newRating}`,
    };
  },
});

/**
 * Internal mutation for auto-applying insights from actions (Phase 7.3 US-009.5)
 * Can be called from actions without authentication context
 */
export const autoApplyInsightInternal = internalMutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    coachId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    appliedInsightId: v.optional(v.id("autoAppliedInsights")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Fetch insight from voiceNoteInsights table
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      return { success: false, message: "Insight not found" };
    }

    // 2. Validate insight belongs to this coach
    if (insight.coachId !== args.coachId) {
      return {
        success: false,
        message: "Insight does not belong to this coach",
      };
    }

    // 3. Check status
    if (insight.status !== "pending") {
      return {
        success: false,
        message: `Insight already ${insight.status}`,
      };
    }

    // 4. CRITICAL VALIDATION: Check if player exists and is in coach's teams
    // Auto-apply should ONLY work for players in teams that the coach coaches
    if (insight.playerName && !insight.playerIdentityId) {
      return {
        success: false,
        message: "Player not matched - requires manual assignment",
      };
    }

    // If playerIdentityId exists, verify player is in a team the coach coaches
    if (insight.playerIdentityId) {
      const playerIdentityId = insight.playerIdentityId; // Type narrowing for TypeScript

      // Get coach's team assignments
      const coachAssignments = await ctx.db
        .query("coachAssignments")
        .withIndex("by_user_and_org", (q) =>
          q
            .eq("userId", args.coachId)
            .eq("organizationId", insight.organizationId)
        )
        .collect();

      // Flatten teams array from all coach assignments
      const coachTeamIds = new Set(coachAssignments.flatMap((a) => a.teams));

      // Get player's team memberships
      const playerTeams = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .collect();

      // Check if player is in any of the coach's teams
      const playerInCoachTeam = playerTeams.some((pt) =>
        coachTeamIds.has(pt.teamId)
      );

      if (!playerInCoachTeam) {
        return {
          success: false,
          message: "Player not in your teams - requires manual review",
        };
      }
    }

    // 5. For non-skill insights, just mark as auto_applied (no data update needed)
    // Only skill_rating insights actually update player data
    if (insight.category !== "skill_rating") {
      // Mark as auto_applied in voiceNoteInsights table
      await ctx.db.patch(args.insightId, {
        status: "auto_applied",
        appliedAt: Date.now(),
        appliedBy: args.coachId,
      });

      // Also update the embedded insights array in voiceNotes document
      const voiceNote = await ctx.db.get(insight.voiceNoteId);
      if (voiceNote) {
        const updatedInsights = voiceNote.insights.map(
          (embeddedInsight: any) => {
            if (embeddedInsight.id === insight.insightId) {
              return {
                ...embeddedInsight,
                status: "auto_applied",
                appliedAt: Date.now(),
                appliedBy: args.coachId,
              };
            }
            return embeddedInsight;
          }
        );

        await ctx.db.patch(insight.voiceNoteId, {
          insights: updatedInsights,
        });
      }

      return {
        success: true,
        message: `Auto-applied ${insight.category} insight (no data update required)`,
      };
    }

    // 5. For skill_rating insights, update player skill data
    if (!insight.playerIdentityId) {
      return {
        success: false,
        message: "Insight missing playerIdentityId",
      };
    }

    const playerIdentityId = insight.playerIdentityId;

    // Get sport passport to update skillAssessments
    const sportPassport = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", insight.organizationId)
      )
      .first();

    if (!sportPassport) {
      return {
        success: false,
        message: "Sport passport not found for player",
      };
    }

    // 6. Extract skill name and new rating from insight.recommendedUpdate
    if (!insight.recommendedUpdate) {
      return {
        success: false,
        message: "Insight missing recommendedUpdate",
      };
    }

    const parseResult = parseSkillRating(insight.recommendedUpdate);
    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error || "Failed to parse skill rating",
      };
    }

    const skillName = parseResult.skillName ?? "";
    const newRating = parseResult.rating ?? 0;

    // Get current skill assessment
    const currentAssessment = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", sportPassport._id).eq("skillCode", skillName)
      )
      .first();

    const previousRating = currentAssessment?.rating;

    // 7. Update player skill rating
    if (currentAssessment) {
      await ctx.db.patch(currentAssessment._id, {
        rating: newRating,
        previousRating,
        assessmentDate: new Date().toISOString().split("T")[0],
        assessmentType: "training",
        assessedBy: args.coachId,
        assessorRole: "coach",
      });
    } else {
      await ctx.db.insert("skillAssessments", {
        passportId: sportPassport._id,
        playerIdentityId,
        sportCode: sportPassport.sportCode,
        skillCode: skillName,
        organizationId: insight.organizationId,
        rating: newRating,
        previousRating: undefined,
        assessmentDate: new Date().toISOString().split("T")[0],
        assessmentType: "training",
        assessedBy: args.coachId,
        assessorRole: "coach",
        createdAt: Date.now(),
      });
    }

    // 8. Create audit record
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", insight.organizationId)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        message: "Player enrollment not found",
      };
    }

    const auditRecordId = await ctx.db.insert("autoAppliedInsights", {
      insightId: insight._id,
      voiceNoteId: insight.voiceNoteId,
      playerId: enrollment._id,
      playerIdentityId,
      coachId: args.coachId,
      organizationId: insight.organizationId,
      category: insight.category,
      confidenceScore: insight.confidenceScore,
      insightTitle: insight.title,
      insightDescription: insight.description,
      appliedAt: Date.now(),
      autoAppliedByAI: true,
      changeType: "skill_rating",
      targetTable: "skillAssessments",
      targetRecordId: currentAssessment?._id,
      fieldChanged: skillName,
      previousValue: previousRating?.toString() ?? "none",
      newValue: newRating.toString(),
    });

    // 9. Mark insight as auto_applied in voiceNoteInsights table
    await ctx.db.patch(args.insightId, {
      status: "auto_applied",
      appliedAt: Date.now(),
      appliedBy: args.coachId,
    });

    // 10. ALSO update the embedded insights array in voiceNotes document
    // This prevents duplicate display in frontend (one in Pending, one in Auto-Applied)
    const voiceNote = await ctx.db.get(insight.voiceNoteId);
    if (voiceNote) {
      const updatedInsights = voiceNote.insights.map((embeddedInsight: any) => {
        if (embeddedInsight.id === insight.insightId) {
          return {
            ...embeddedInsight,
            status: "auto_applied",
            appliedAt: Date.now(),
            appliedBy: args.coachId,
          };
        }
        return embeddedInsight;
      });

      await ctx.db.patch(insight.voiceNoteId, {
        insights: updatedInsights,
      });
    }

    return {
      success: true,
      appliedInsightId: auditRecordId,
      message: `Auto-applied: ${skillName} ${previousRating ?? "none"} → ${newRating}`,
    };
  },
});

/**
 * Undo an auto-applied insight within 1-hour window (Phase 7.2)
 */
export const undoAutoAppliedInsight = mutation({
  args: {
    autoAppliedInsightId: v.id("autoAppliedInsights"),
    undoReason: v.union(
      v.literal("wrong_player"),
      v.literal("wrong_rating"),
      v.literal("insight_incorrect"),
      v.literal("changed_mind"),
      v.literal("duplicate"),
      v.literal("other")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Get authenticated coach userId
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }
    const userId = user._id;
    if (!userId) {
      return { success: false, message: "User ID not found" };
    }

    // 2. Fetch autoAppliedInsights record
    const autoAppliedInsight = await ctx.db.get(args.autoAppliedInsightId);
    if (!autoAppliedInsight) {
      return { success: false, message: "Auto-applied insight not found" };
    }

    // 4. Validate coach owns this insight
    if (autoAppliedInsight.coachId !== userId) {
      return {
        success: false,
        message: "Only the coach who applied this insight can undo it",
      };
    }

    // 5. Validate undo window (1 hour = 3600000ms)
    const elapsed = Date.now() - autoAppliedInsight.appliedAt;
    if (elapsed >= 3_600_000) {
      return {
        success: false,
        message: "Undo window expired (must undo within 1 hour)",
      };
    }

    // 6. Validate not already undone
    if (autoAppliedInsight.undoneAt !== undefined) {
      return {
        success: false,
        message: "Already undone",
      };
    }

    // 7. Get player's sport passport to revert skill assessment
    const sportPassport = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", autoAppliedInsight.playerIdentityId)
          .eq("organizationId", autoAppliedInsight.organizationId)
      )
      .first();

    if (!sportPassport) {
      return {
        success: false,
        message: "Sport passport not found for player",
      };
    }

    // 8. Revert player profile to previousValue
    const skillCode = autoAppliedInsight.fieldChanged;
    if (!skillCode) {
      return {
        success: false,
        message: "Field changed not recorded in audit trail",
      };
    }

    const currentAssessment = await ctx.db
      .query("skillAssessments")
      .withIndex("by_skill", (q) =>
        q.eq("passportId", sportPassport._id).eq("skillCode", skillCode)
      )
      .first();

    if (!currentAssessment) {
      return {
        success: false,
        message: "Skill assessment not found to revert",
      };
    }

    // Parse previousValue
    const previousValue = autoAppliedInsight.previousValue;
    if (!previousValue) {
      return {
        success: false,
        message: "Previous value not recorded in audit trail",
      };
    }

    if (previousValue === "none") {
      // Delete the assessment (it didn't exist before)
      await ctx.db.delete(currentAssessment._id);
    } else {
      // Revert to previous rating
      const previousRating = Number.parseInt(previousValue, 10);
      await ctx.db.patch(currentAssessment._id, {
        rating: previousRating,
        assessmentDate: new Date().toISOString().split("T")[0],
        assessmentType: "training",
        assessedBy: userId,
        assessorRole: "coach",
      });
    }

    // 9. Update autoAppliedInsights record
    await ctx.db.patch(args.autoAppliedInsightId, {
      undoneAt: Date.now(),
      undoReason: args.undoReason,
    });

    // 10. Update original insight in voiceNoteInsights table
    const originalInsight = await ctx.db.get(autoAppliedInsight.insightId);
    if (originalInsight) {
      await ctx.db.patch(autoAppliedInsight.insightId, {
        status: "pending",
        appliedAt: undefined,
        appliedBy: undefined,
      });

      // Also update the embedded insights array in voiceNotes document
      const voiceNote = await ctx.db.get(originalInsight.voiceNoteId);
      if (voiceNote) {
        const updatedInsights = voiceNote.insights.map(
          (embeddedInsight: any) => {
            if (embeddedInsight.id === originalInsight.insightId) {
              return {
                ...embeddedInsight,
                status: "pending",
                appliedAt: undefined,
                appliedBy: undefined,
              };
            }
            return embeddedInsight;
          }
        );

        await ctx.db.patch(originalInsight.voiceNoteId, {
          insights: updatedInsights,
        });
      }
    }

    // 11. Return success message with details
    return {
      success: true,
      message: `Undone: ${skillCode} reverted to ${previousValue}`,
    };
  },
});

// ============================================================
// PHASE 7.3: UNDO REASON ANALYTICS (US-013)
// ============================================================

/**
 * Get statistics on undo reasons for AI improvement feedback (Phase 7.3)
 * Analyzes patterns in why coaches undo auto-applied insights
 */
export const getUndoReasonStats = query({
  args: {
    organizationId: v.optional(v.string()),
    timeframeDays: v.optional(v.number()), // Default 30 days
  },
  returns: v.object({
    total: v.number(),
    byReason: v.array(
      v.object({
        reason: v.string(),
        count: v.number(),
        percentage: v.number(),
      })
    ),
    topInsights: v.array(
      v.object({
        insightId: v.id("voiceNoteInsights"),
        title: v.string(),
        reason: v.string(),
        undoneAt: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Calculate timeframe cutoff (default 30 days)
    const timeframeDays = args.timeframeDays ?? 30;
    const cutoffTime = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;

    // Query auto-applied insights - use by_undo_status index to find undone insights
    // Note: by_undo_status index only has undoneAt field, so we can't filter by org in index
    const allAudits = await ctx.db
      .query("autoAppliedInsights")
      .withIndex("by_undo_status")
      .collect();

    // Filter to only undone insights within timeframe and org if provided
    const undoneAudits = allAudits.filter(
      (audit) =>
        audit.undoneAt !== undefined &&
        audit.undoneAt >= cutoffTime &&
        (!args.organizationId || audit.organizationId === args.organizationId)
    );

    const total = undoneAudits.length;

    // Group by reason and count
    const reasonCounts = new Map<string, number>();
    for (const audit of undoneAudits) {
      const reason = audit.undoReason || "unknown";
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }

    // Convert to array with percentages
    const byReason = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Get top 10 most recent undone insights
    const sortedByRecent = [...undoneAudits].sort(
      (a, b) => (b.undoneAt || 0) - (a.undoneAt || 0)
    );

    const top10 = sortedByRecent.slice(0, 10);

    // Fetch insight details for top 10
    const topInsights = await Promise.all(
      top10.map(async (audit) => {
        const insight = await ctx.db.get(audit.insightId);
        return {
          insightId: audit.insightId,
          title: insight?.title || "Unknown",
          reason: audit.undoReason || "unknown",
          undoneAt: audit.undoneAt || 0,
        };
      })
    );

    return {
      total,
      byReason,
      topInsights,
    };
  },
});

/**
 * Get voiceNoteInsights record ID by voiceNoteId and string insightId
 * Used to map embedded insight array IDs to voiceNoteInsights table Convex IDs
 * for features like reactions and suggestions.
 */
export const getInsightRecordId = query({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(), // String ID from embedded array
  },
  returns: v.union(v.id("voiceNoteInsights"), v.null()),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note_and_insight", (q) =>
        q.eq("voiceNoteId", args.voiceNoteId).eq("insightId", args.insightId)
      )
      .first();

    return record?._id ?? null;
  },
});

/**
 * Get all voiceNoteInsights records for a list of voice note IDs
 * Used to batch-fetch insight records for ID mapping in the frontend
 */
export const getInsightsByVoiceNotes = query({
  args: {
    voiceNoteIds: v.array(v.id("voiceNotes")),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNoteInsights"),
      voiceNoteId: v.id("voiceNotes"),
      insightId: v.string(),
      title: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Batch fetch all insights for the given voice notes
    const allInsights = await Promise.all(
      args.voiceNoteIds.map((voiceNoteId) =>
        ctx.db
          .query("voiceNoteInsights")
          .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", voiceNoteId))
          .collect()
      )
    );

    // Flatten and return with only the fields needed for mapping
    return allInsights.flat().map((insight) => ({
      _id: insight._id,
      voiceNoteId: insight.voiceNoteId,
      insightId: insight.insightId,
      title: insight.title,
      status: insight.status,
    }));
  },
});
