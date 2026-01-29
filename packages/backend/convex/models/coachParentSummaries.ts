import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";
import { decideAutoApproval } from "../lib/autoApprovalDecision";

// ============================================================
// VALIDATORS
// ============================================================

const summaryValidator = v.object({
  _id: v.id("coachParentSummaries"),
  _creationTime: v.number(),
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),
  coachId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  sportId: v.id("sports"),
  privateInsight: v.object({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("neutral"),
      v.literal("concern")
    ),
  }),
  publicSummary: v.object({
    content: v.string(),
    confidenceScore: v.number(),
    generatedAt: v.number(),
  }),
  sensitivityCategory: v.union(
    v.literal("normal"),
    v.literal("injury"),
    v.literal("behavior")
  ),
  sensitivityConfidence: v.optional(v.number()),
  sensitivityReason: v.optional(v.string()),
  status: v.union(
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("suppressed"),
    v.literal("auto_approved"),
    v.literal("delivered"),
    v.literal("viewed")
  ),
  createdAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),
  scheduledDeliveryAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),
  viewedBy: v.optional(v.string()),
  acknowledgedAt: v.optional(v.number()),
  acknowledgedBy: v.optional(v.string()),
  wouldAutoApprove: v.optional(v.boolean()),
  autoApprovalDecision: v.optional(
    v.object({
      shouldAutoApprove: v.boolean(),
      tier: v.string(),
      reason: v.string(),
      decidedAt: v.number(),
    })
  ),
});

const playerIdentityValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
  playerType: v.union(v.literal("youth"), v.literal("adult")),
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("guardian_verified"),
    v.literal("self_verified"),
    v.literal("document_verified")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

const sportValidator = v.object({
  _id: v.id("sports"),
  _creationTime: v.number(),
  code: v.string(),
  name: v.string(),
  governingBody: v.optional(v.string()),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all guardians for a player
 * Returns array of guardian identities with their link details
 * @internal - Helper function for use within this module
 */
export async function getGuardiansForPlayer(
  ctx: QueryCtx | MutationCtx,
  playerIdentityId: Id<"playerIdentities">
) {
  // Get all guardian-player links for this player
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
    .collect();

  // Fetch full guardian identity for each link
  const guardians = await Promise.all(
    links.map(async (link) => {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      return {
        link,
        guardian,
      };
    })
  );

  // Filter out any null guardians (should not happen, but be safe)
  return guardians.filter((g) => g.guardian !== null) as Array<{
    link: (typeof links)[0];
    guardian: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  }>;
}

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * Create a parent summary record after AI generates it
 * @internal - Called by AI processing actions only
 */
export const createParentSummary = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    privateInsight: v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(),
      sentiment: v.union(
        v.literal("positive"),
        v.literal("neutral"),
        v.literal("concern")
      ),
    }),
    publicSummary: v.object({
      content: v.string(),
      confidenceScore: v.number(),
      generatedAt: v.number(),
    }),
    sensitivityCategory: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    sensitivityReason: v.optional(v.string()),
    sensitivityConfidence: v.optional(v.number()),
    sportId: v.id("sports"),
  },
  returns: v.id("coachParentSummaries"),
  handler: async (ctx, args) => {
    // Fetch the voice note to get coachId and orgId
    const voiceNote = await ctx.db.get(args.voiceNoteId);
    if (!voiceNote) {
      throw new Error("Voice note not found");
    }

    // Verify coachId exists (required for parent summaries)
    if (!voiceNote.coachId) {
      throw new Error(
        "Cannot create parent summary: voice note has no coachId. This is likely a legacy note."
      );
    }

    // Fetch coach's trust level to determine if eligible for auto-approval (Phase 2)
    // Note: Trust levels are platform-wide (not per-org)
    // coachId is guaranteed to exist due to check above
    const coachId = voiceNote.coachId as string;
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    // Determine auto-approval decision
    let status: "pending_review" | "auto_approved" = "pending_review";
    let autoApprovalDecision:
      | {
          shouldAutoApprove: boolean;
          reason: string;
          tier: "auto_send" | "manual_review" | "flagged";
          decidedAt: number;
        }
      | undefined;
    let approvedAt: number | undefined;
    let approvedBy: string | undefined;
    let scheduledDeliveryAt: number | undefined;

    if (trustLevel) {
      // Make auto-approval decision based on trust level and summary properties
      const decision = decideAutoApproval(
        {
          currentLevel: trustLevel.currentLevel,
          preferredLevel: trustLevel.preferredLevel,
          confidenceThreshold: trustLevel.confidenceThreshold,
          personalizedThreshold: trustLevel.personalizedThreshold, // Phase 4: Use AI-learned threshold if available
        },
        {
          confidenceScore: args.publicSummary.confidenceScore,
          sensitivityCategory: args.sensitivityCategory,
        }
      );

      autoApprovalDecision = decision;

      // If auto-approved, set status and schedule delivery with 1-hour revoke window
      if (decision.shouldAutoApprove) {
        status = "auto_approved";
        approvedAt = Date.now();
        approvedBy = "system:auto";
        scheduledDeliveryAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
      }
    }

    // Create the summary record
    const summaryId = await ctx.db.insert("coachParentSummaries", {
      voiceNoteId: args.voiceNoteId,
      insightId: args.insightId,
      coachId, // Required field - verified above
      playerIdentityId: args.playerIdentityId,
      organizationId: voiceNote.orgId,
      sportId: args.sportId,
      privateInsight: args.privateInsight,
      publicSummary: args.publicSummary,
      sensitivityCategory: args.sensitivityCategory,
      sensitivityReason: args.sensitivityReason,
      sensitivityConfidence: args.sensitivityConfidence,
      status,
      createdAt: Date.now(),
      autoApprovalDecision,
      approvedAt,
      approvedBy,
      scheduledDeliveryAt,
    });

    return summaryId;
  },
});

// ============================================================
// PUBLIC MUTATIONS
// ============================================================

/**
 * Approve a summary for delivery to parents
 * Only the coach who created the voice note can approve
 */
export const approveSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.null(),
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

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary (strict ownership)
    if (summary.coachId !== userId) {
      throw new Error(
        "Only the coach who created this note can approve this summary"
      );
    }

    // Update the summary status
    await ctx.db.patch(args.summaryId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: userId,
    });

    // Track preview mode statistics (Phase 5)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", summary.coachId))
      .first();

    if (
      trustLevel?.previewModeStats &&
      !trustLevel.previewModeStats.completedAt
    ) {
      // Calculate if this summary would have been auto-approved
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.confidenceThreshold ?? 0.7;
      const wouldAutoApprove =
        summary.sensitivityCategory === "normal" &&
        effectiveLevel >= 2 &&
        summary.publicSummary.confidenceScore >= threshold;

      // Update preview mode stats
      const newSuggestions =
        trustLevel.previewModeStats.wouldAutoApproveSuggestions +
        (wouldAutoApprove ? 1 : 0);
      const newApproved =
        trustLevel.previewModeStats.coachApprovedThose +
        (wouldAutoApprove ? 1 : 0);
      const agreementRate =
        newSuggestions > 0 ? newApproved / newSuggestions : 0;

      await ctx.db.patch(trustLevel._id, {
        previewModeStats: {
          ...trustLevel.previewModeStats,
          wouldAutoApproveSuggestions: newSuggestions,
          coachApprovedThose: newApproved,
          agreementRate,
          completedAt: newSuggestions >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Update coach trust metrics (platform-wide)
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      action: "approved",
    });

    return null;
  },
});

/**
 * Approve an injury summary with required checklist
 * Injury summaries require extra due diligence before approval
 */
export const approveInjurySummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    checklist: v.object({
      personallyObserved: v.boolean(),
      severityAccurate: v.boolean(),
      noMedicalAdvice: v.boolean(),
    }),
  },
  returns: v.null(),
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

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary (strict ownership)
    if (summary.coachId !== userId) {
      throw new Error(
        "Only the coach who created this note can approve this summary"
      );
    }

    // Validate all checklist items are true
    if (
      !(
        args.checklist.personallyObserved &&
        args.checklist.severityAccurate &&
        args.checklist.noMedicalAdvice
      )
    ) {
      throw new Error(
        "All checklist items must be confirmed before approving injury summary"
      );
    }

    // Insert checklist record for audit trail
    await ctx.db.insert("injuryApprovalChecklist", {
      summaryId: args.summaryId,
      coachId: userId,
      personallyObserved: args.checklist.personallyObserved,
      severityAccurate: args.checklist.severityAccurate,
      noMedicalAdvice: args.checklist.noMedicalAdvice,
      completedAt: Date.now(),
    });

    // Update the summary status
    await ctx.db.patch(args.summaryId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: userId,
    });

    // Update coach trust metrics (platform-wide)
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      action: "approved",
    });

    return null;
  },
});

/**
 * Suppress a summary so it never reaches parents
 * Only the coach who created the voice note can suppress
 */
export const suppressSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    reason: v.optional(v.string()), // Optional text explanation (Phase 4)
    feedback: v.optional(
      v.object({
        wasInaccurate: v.boolean(),
        wasTooSensitive: v.boolean(),
        timingWasWrong: v.boolean(),
        otherReason: v.optional(v.string()),
      })
    ), // Optional structured feedback (Phase 4)
  },
  returns: v.null(),
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

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary
    if (summary.coachId !== userId) {
      throw new Error("Only the coach can suppress this summary");
    }

    // Phase 4: Determine override type for learning signal
    // Only track as override if confidence was high (>=70%)
    // Suppressing low confidence summaries is normal, not an override
    const confidenceScore = summary.publicSummary.confidenceScore;
    const overrideType: "coach_rejected_high_confidence" | undefined =
      confidenceScore >= 0.7 ? "coach_rejected_high_confidence" : undefined;

    // Update the summary status with override tracking
    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
      overrideType,
      overrideReason: args.reason,
      overrideFeedback: args.feedback,
    });

    // Track preview mode statistics (Phase 5)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", summary.coachId))
      .first();

    if (
      trustLevel?.previewModeStats &&
      !trustLevel.previewModeStats.completedAt
    ) {
      // Calculate if this summary would have been auto-approved
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.confidenceThreshold ?? 0.7;
      const wouldAutoApprove =
        summary.sensitivityCategory === "normal" &&
        effectiveLevel >= 2 &&
        summary.publicSummary.confidenceScore >= threshold;

      // Update preview mode stats
      // When suppressing: increment suggestions if would auto-approve, increment coachRejectedThose
      const newSuggestions =
        trustLevel.previewModeStats.wouldAutoApproveSuggestions +
        (wouldAutoApprove ? 1 : 0);
      const newRejected =
        trustLevel.previewModeStats.coachRejectedThose +
        (wouldAutoApprove ? 1 : 0);
      const agreementRate =
        newSuggestions > 0
          ? trustLevel.previewModeStats.coachApprovedThose / newSuggestions
          : 0;

      await ctx.db.patch(trustLevel._id, {
        previewModeStats: {
          ...trustLevel.previewModeStats,
          wouldAutoApproveSuggestions: newSuggestions,
          coachRejectedThose: newRejected,
          agreementRate,
          completedAt: newSuggestions >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Update coach trust metrics (platform-wide)
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      action: "suppressed",
    });

    return null;
  },
});

/**
 * Revoke auto-approved summary (Phase 2)
 * Coach can revoke within 1-hour window before parent views
 * Safety net for supervised automation
 */
export const revokeSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get the user ID
    const userId = user?._id;
    if (!userId) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      return {
        success: false,
        error: "Summary not found",
      };
    }

    // Verify coach owns this summary
    if (summary.coachId !== userId) {
      return {
        success: false,
        error: "Not authorized",
      };
    }

    // Check if summary is auto-approved (only auto-approved can be revoked)
    if (summary.status !== "auto_approved") {
      return {
        success: false,
        error: "Only auto-approved summaries can be revoked",
      };
    }

    // Check if parent has already viewed the summary
    const view = await ctx.db
      .query("parentSummaryViews")
      .withIndex("by_summary", (q) => q.eq("summaryId", args.summaryId))
      .first();

    if (view) {
      return {
        success: false,
        error: "Summary already viewed by parent",
      };
    }

    // Revoke the summary (mark as suppressed with revocation metadata)
    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
      revokedAt: Date.now(),
      revokedBy: userId,
      revocationReason: args.reason ?? "Coach override",
    });

    // Update trust metrics (revocation counts as suppression)
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      action: "suppressed",
    });

    return {
      success: true,
    };
  },
});

/**
 * Edit the public summary content before approval
 * Allows coach to modify the AI-generated parent summary
 * Only available for pending_review summaries
 */
export const editSummaryContent = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    newContent: v.string(),
  },
  returns: v.null(),
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

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary
    if (summary.coachId !== userId) {
      throw new Error("Only the coach can edit this summary");
    }

    // Only allow editing of pending_review summaries
    if (summary.status !== "pending_review") {
      throw new Error("Can only edit summaries that are pending review");
    }

    // Update the public summary content
    await ctx.db.patch(args.summaryId, {
      publicSummary: {
        ...summary.publicSummary,
        content: args.newContent,
      },
    });

    return null;
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get pending summaries for a coach to review
 * Only returns summaries for voice notes created by this coach
 */
export const getCoachPendingSummaries = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      ...summaryValidator.fields,
      player: v.union(playerIdentityValidator, v.null()),
      sport: v.union(sportValidator, v.null()),
      wouldAutoApprove: v.boolean(),
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

    // Get coach trust level for wouldAutoApprove calculation
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .first();

    // Calculate effective trust level and threshold
    const effectiveLevel = trustLevel
      ? Math.min(
          trustLevel.currentLevel,
          trustLevel.preferredLevel ?? trustLevel.currentLevel
        )
      : 0;
    const threshold = trustLevel?.confidenceThreshold ?? 0.7;

    // Query summaries by coach with pending_review status
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach_org_status", (q) =>
        q
          .eq("coachId", userId)
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .collect();

    // Fetch player info and sport info for each summary
    const summariesWithInfo = await Promise.all(
      summaries.map(async (summary) => {
        const player = await ctx.db.get(summary.playerIdentityId);
        const sport = await ctx.db.get(summary.sportId);

        // Calculate if this summary would auto-approve at current trust level
        // Level 0/1: Never auto-approve (always false)
        // Level 2: Auto-approve if normal category AND confidence >= threshold
        // Level 3: Auto-approve if normal category (regardless of confidence)
        // Sensitive categories (injury, behavior): NEVER auto-approve
        const wouldAutoApprove =
          summary.sensitivityCategory === "normal" &&
          effectiveLevel >= 2 &&
          summary.publicSummary.confidenceScore >= threshold;

        return {
          ...summary,
          player,
          sport,
          wouldAutoApprove,
        };
      })
    );

    return summariesWithInfo;
  },
});

/**
 * Get auto-approved summaries (Phase 2)
 * Shows recently auto-approved messages with revoke option
 * Includes pending delivery, delivered, viewed, and revoked summaries from last 7 days
 */
export const getAutoApprovedSummaries = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachParentSummaries"),
      playerName: v.string(),
      summaryContent: v.string(),
      confidenceScore: v.number(),
      approvedAt: v.optional(v.number()),
      scheduledDeliveryAt: v.optional(v.number()),
      status: v.string(),
      viewedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
      isRevocable: v.boolean(),
      autoApprovalDecision: v.optional(
        v.object({
          shouldAutoApprove: v.boolean(),
          reason: v.string(),
          tier: v.union(
            v.literal("auto_send"),
            v.literal("manual_review"),
            v.literal("flagged")
          ),
          decidedAt: v.number(),
        })
      ),
      acknowledgedAt: v.optional(v.number()),
      acknowledgedByName: v.optional(v.string()),
      viewedByName: v.optional(v.string()),
      approvalMethod: v.union(v.literal("auto"), v.literal("manual")),
      privateInsight: v.object({
        title: v.string(),
        description: v.string(),
        category: v.string(),
        sentiment: v.union(
          v.literal("positive"),
          v.literal("neutral"),
          v.literal("concern")
        ),
      }),
    })
  ),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user._id;

    // Query summaries from last 30 days that were approved (auto or manual)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    console.log("[getAutoApprovedSummaries] Debug info:", {
      userId,
      organizationId: args.organizationId,
      thirtyDaysAgo: new Date(thirtyDaysAgo).toISOString(),
    });

    // Get all summaries for this coach in this org
    const allSummaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach_org_status", (q) =>
        q.eq("coachId", userId).eq("organizationId", args.organizationId)
      )
      .collect();

    console.log(
      `[getAutoApprovedSummaries] Found ${allSummaries.length} total summaries for this coach+org`
    );

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const s of allSummaries) {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    }
    console.log("[getAutoApprovedSummaries] Status breakdown:", statusCounts);

    // Filter for all approved summaries (auto + manual) from last 30 days
    const recentApproved = allSummaries.filter((summary) => {
      // Must have been created in last 30 days
      if (summary._creationTime < thirtyDaysAgo) {
        return false;
      }

      // Include summaries that have been approved (auto or manual)
      // Statuses: approved, auto_approved, delivered, viewed
      // Also include suppressed if it was revoked (coach canceled auto-approval)
      return (
        summary.status === "approved" ||
        summary.status === "auto_approved" ||
        summary.status === "delivered" ||
        summary.status === "viewed" ||
        (summary.status === "suppressed" && summary.revokedAt !== undefined)
      );
    });

    console.log(
      `[getAutoApprovedSummaries] After filtering: ${recentApproved.length} recent approved summaries`
    );

    // Enrich with player info and calculate isRevocable
    const enrichedSummaries = await Promise.all(
      recentApproved.map(async (summary) => {
        const player = await ctx.db.get(summary.playerIdentityId);
        const playerName = player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown Player";

        // Check if parent has viewed
        const hasViewed = summary.viewedAt !== undefined;

        // Calculate isRevocable: auto_approved status, not viewed, within delivery window
        const isRevocable =
          summary.status === "auto_approved" &&
          !hasViewed &&
          summary.scheduledDeliveryAt !== undefined &&
          Date.now() < summary.scheduledDeliveryAt;

        // Get acknowledgment info if acknowledged
        let acknowledgedByName: string | undefined;
        if (summary.acknowledgedBy) {
          // Get the Better Auth user - acknowledgedBy is the user _id
          const betterAuthUser = await ctx.db.get(
            summary.acknowledgedBy as any
          );

          if (betterAuthUser) {
            // Use the name field from Better Auth user table
            acknowledgedByName =
              (betterAuthUser as any).name ||
              (betterAuthUser as any).email ||
              "Parent";
          }
        }

        // Get viewed by info if viewed
        let viewedByName: string | undefined;
        if (summary.viewedBy) {
          // Get the Better Auth user - viewedBy is the user _id
          const betterAuthUser = await ctx.db.get(summary.viewedBy as any);

          if (betterAuthUser) {
            // Use the name field from Better Auth user table
            viewedByName =
              (betterAuthUser as any).name ||
              (betterAuthUser as any).email ||
              "Parent";
          }
        }

        // Determine approval method (auto vs manual)
        const approvalMethod =
          summary.autoApprovalDecision?.shouldAutoApprove === true
            ? ("auto" as const)
            : ("manual" as const);

        return {
          _id: summary._id,
          playerName,
          summaryContent: summary.publicSummary.content,
          confidenceScore: summary.publicSummary.confidenceScore,
          approvedAt: summary.approvedAt,
          scheduledDeliveryAt: summary.scheduledDeliveryAt,
          status: summary.status,
          viewedAt: summary.viewedAt,
          revokedAt: summary.revokedAt,
          isRevocable,
          autoApprovalDecision: summary.autoApprovalDecision,
          acknowledgedAt: summary.acknowledgedAt,
          acknowledgedByName,
          viewedByName,
          approvalMethod,
          privateInsight: summary.privateInsight,
        };
      })
    );

    // Sort by creation time (newest first)
    return enrichedSummaries.sort((a, b) => {
      const aTime = a.approvedAt ?? 0;
      const bTime = b.approvedAt ?? 0;
      return bTime - aTime;
    });
  },
});

/**
 * Get unread summary count for a parent
 * Counts summaries with status approved/delivered and no viewedAt
 */
export const getParentUnreadCount = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) {
      return 0;
    }

    // Get all linked players for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    if (links.length === 0) {
      return 0;
    }

    // Count unread summaries across all linked players
    // Query for approved and delivered statuses separately (no viewedAt)
    let count = 0;
    for (const link of links) {
      const approvedSummaries = await ctx.db
        .query("coachParentSummaries")
        .withIndex("by_player_org_status", (q) =>
          q
            .eq("playerIdentityId", link.playerIdentityId)
            .eq("organizationId", args.organizationId)
            .eq("status", "approved")
        )
        .collect();

      const deliveredSummaries = await ctx.db
        .query("coachParentSummaries")
        .withIndex("by_player_org_status", (q) =>
          q
            .eq("playerIdentityId", link.playerIdentityId)
            .eq("organizationId", args.organizationId)
            .eq("status", "delivered")
        )
        .collect();

      // Count only unread ones (no viewedAt)
      count += approvedSummaries.filter((s) => !s.viewedAt).length;
      count += deliveredSummaries.filter((s) => !s.viewedAt).length;
    }

    return count;
  },
});

/**
 * Get parent summaries grouped by child and sport
 * Returns summaries for all children linked to this parent
 */
export const getParentSummariesByChildAndSport = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      player: playerIdentityValidator,
      sportGroups: v.array(
        v.object({
          sport: v.union(sportValidator, v.null()),
          summaries: v.array(
            v.object({
              ...summaryValidator.fields,
              coachName: v.string(),
            })
          ),
          unreadCount: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) {
      return [];
    }

    // Get all linked players for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    // BATCH FIX: First, fetch all data for all children and collect coach IDs
    // This avoids N+1 on coach lookups

    // Step 1: Fetch all players and summaries in parallel
    const childDataPromises = links.map(async (link) => {
      const player = await ctx.db.get(link.playerIdentityId);
      if (!player) {
        return null;
      }

      // Get all summaries for this player (query each status separately)
      const [approvedSummaries, deliveredSummaries, viewedSummaries] =
        await Promise.all([
          ctx.db
            .query("coachParentSummaries")
            .withIndex("by_player_org_status", (q) =>
              q
                .eq("playerIdentityId", link.playerIdentityId)
                .eq("organizationId", args.organizationId)
                .eq("status", "approved")
            )
            .collect(),
          ctx.db
            .query("coachParentSummaries")
            .withIndex("by_player_org_status", (q) =>
              q
                .eq("playerIdentityId", link.playerIdentityId)
                .eq("organizationId", args.organizationId)
                .eq("status", "delivered")
            )
            .collect(),
          ctx.db
            .query("coachParentSummaries")
            .withIndex("by_player_org_status", (q) =>
              q
                .eq("playerIdentityId", link.playerIdentityId)
                .eq("organizationId", args.organizationId)
                .eq("status", "viewed")
            )
            .collect(),
        ]);

      const playerSummaries = [
        ...approvedSummaries,
        ...deliveredSummaries,
        ...viewedSummaries,
      ];

      return { player, playerSummaries };
    });

    const childData = await Promise.all(childDataPromises);
    const validChildData = childData.filter(
      (d): d is NonNullable<typeof d> => d !== null
    );

    // Step 2: Collect ALL unique coachIds and sportIds from ALL summaries
    const allCoachIds: string[] = [];
    const allSportIds: string[] = [];
    for (const { playerSummaries } of validChildData) {
      for (const summary of playerSummaries) {
        if (summary.coachId) {
          allCoachIds.push(summary.coachId);
        }
        if (summary.sportId) {
          allSportIds.push(summary.sportId);
        }
      }
    }

    const uniqueCoachIds: string[] = [...new Set(allCoachIds)];
    const uniqueSportIds: string[] = [...new Set(allSportIds)];

    // Step 3: Batch fetch ALL coaches and sports in parallel
    const [coachResults, sportResults] = await Promise.all([
      Promise.all(
        uniqueCoachIds.map((coachId: string) =>
          ctx.runQuery(components.betterAuth.adapter.findOne, {
            model: "user",
            where: [{ field: "_id", value: coachId, operator: "eq" }],
          })
        )
      ),
      Promise.all(
        uniqueSportIds.map((sportId: string) =>
          ctx.db.get(sportId as Id<"sports">)
        )
      ),
    ]);

    // Step 4: Create Maps for O(1) lookup
    const coachMap = new Map<string, string>();
    for (const coach of coachResults) {
      if (coach) {
        // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped data
        const coachAny = coach as any;
        const name = coachAny.name || coachAny.email || "Unknown Coach";
        coachMap.set(coachAny._id as string, name);
      }
    }

    const sportMap = new Map<string, (typeof sportResults)[number]>();
    for (let i = 0; i < uniqueSportIds.length; i++) {
      const sportId = uniqueSportIds[i];
      const sport = sportResults[i];
      if (sport) {
        sportMap.set(sportId, sport);
      }
    }

    // Step 5: Map over children, now using pre-fetched coach/sport data (no N+1)
    const childrenWithSummaries = validChildData.map(
      ({ player, playerSummaries }) => {
        // Group summaries by sport
        const summariesBySport = new Map<string, typeof playerSummaries>();
        for (const summary of playerSummaries) {
          const sportId = summary.sportId;
          if (!summariesBySport.has(sportId)) {
            summariesBySport.set(sportId, []);
          }
          const sportSummaries = summariesBySport.get(sportId);
          if (sportSummaries) {
            sportSummaries.push(summary);
          }
        }

        // Convert to array with sport info and enriched coach names
        const sportGroups = Array.from(summariesBySport.entries()).map(
          ([sportId, sportSummaries]) => {
            const sport = sportMap.get(sportId) || null;
            const unreadCount = sportSummaries.filter(
              (s) => !s.acknowledgedAt
            ).length;

            // Enrich summaries with coach names from pre-fetched map
            const enrichedSummaries = sportSummaries.map((summary) => {
              const coachName = summary.coachId
                ? coachMap.get(summary.coachId) || "Unknown Coach"
                : "Unknown Coach";
              return {
                ...summary,
                coachName,
              };
            });

            return {
              sport,
              summaries: enrichedSummaries,
              unreadCount,
            };
          }
        );

        return {
          player,
          sportGroups,
        };
      }
    );

    // Filter out null entries
    return childrenWithSummaries.filter((c) => c !== null);
  },
});

/**
 * Mark a summary as viewed by a parent
 * Creates a view record and updates the summary status
 */
export const markSummaryViewed = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    viewSource: v.union(
      v.literal("dashboard"),
      v.literal("notification_click"),
      v.literal("direct_link")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id || user.userId;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Verify guardian is linked to the summary's player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardianIdentity._id)
          .eq("playerIdentityId", summary.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Not authorized to view this summary");
    }

    // Update summary status and viewedAt
    await ctx.db.patch(args.summaryId, {
      status: "viewed",
      viewedAt: Date.now(),
      viewedBy: userId,
    });

    // Insert parentSummaryViews record
    await ctx.db.insert("parentSummaryViews", {
      summaryId: args.summaryId,
      guardianIdentityId: guardianIdentity._id,
      viewedAt: Date.now(),
      viewSource: args.viewSource,
    });

    return null;
  },
});

/**
 * Track when a parent shares a summary
 */
export const trackShareEvent = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    shareDestination: v.union(
      v.literal("download"),
      v.literal("native_share"),
      v.literal("copy_link")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id || user.userId;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Verify guardian is linked to the summary's player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardianIdentity._id)
          .eq("playerIdentityId", summary.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Not authorized to share this summary");
    }

    // Insert summaryShares record
    await ctx.db.insert("summaryShares", {
      summaryId: args.summaryId,
      guardianIdentityId: guardianIdentity._id,
      sharedAt: Date.now(),
      shareDestination: args.shareDestination,
    });

    return null;
  },
});

/**
 * Acknowledge a parent summary (mark as read/understood)
 * This is different from "viewed" - it's an explicit user action
 * to mark a message as acknowledged/understood
 */
export const acknowledgeParentSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id || user.userId;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Verify guardian is linked to the summary's player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardianIdentity._id)
          .eq("playerIdentityId", summary.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Not authorized to acknowledge this summary");
    }

    // Update summary with acknowledgment
    await ctx.db.patch(args.summaryId, {
      acknowledgedAt: Date.now(),
      acknowledgedBy: userId,
    });

    return null;
  },
});

/**
 * Acknowledge all summaries for a specific player
 * Batch operation for "mark all as read" functionality
 */
export const acknowledgeAllForPlayer = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    acknowledgedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID
    const userId = user._id || user.userId;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Verify guardian is linked to the player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardianIdentity._id)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error(
        "Not authorized to acknowledge summaries for this player"
      );
    }

    // Find all unacknowledged summaries for this player
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_player_acknowledged", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.or(
            q.eq(q.field("status"), "delivered"),
            q.eq(q.field("status"), "viewed")
          ),
          q.eq(q.field("acknowledgedAt"), undefined)
        )
      )
      .collect();

    // Acknowledge all summaries
    const acknowledgedAt = Date.now();
    await Promise.all(
      summaries.map((summary) =>
        ctx.db.patch(summary._id, {
          acknowledgedAt,
          acknowledgedBy: userId,
        })
      )
    );

    return {
      acknowledgedCount: summaries.length,
    };
  },
});

/**
 * Get passport deep link for a summary
 * Maps insight category to appropriate passport section
 */
export const getPassportLinkForSummary = query({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.object({
    section: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Determine passport section based on insight category and sensitivity
    let section = "overview"; // default

    // Check sensitivityCategory first for injury/behavior
    if (summary.sensitivityCategory === "injury") {
      section = "medical";
    } else if (summary.sensitivityCategory === "behavior") {
      section = "overview";
    } else if (summary.privateInsight?.category) {
      // Map insight category to passport section
      const categoryMap: Record<string, string> = {
        skill_rating: "skills",
        skill_progress: "goals",
        injury: "medical",
        behavior: "overview",
      };
      section = categoryMap[summary.privateInsight.category] || "overview";
    }

    // Build passport URL - parent viewing player passport
    const url = `/orgs/${summary.organizationId}/players/${summary.playerIdentityId}`;

    return { section, url };
  },
});

/**
 * Internal query: Fetch summary data for image generation
 * Fetches summary with player, coach, and org names
 */
export const getSummaryForImage = internalQuery({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.union(
    v.object({
      content: v.string(),
      playerFirstName: v.string(),
      coachName: v.string(),
      orgName: v.string(),
      orgLogo: v.union(v.string(), v.null()),
      generatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      return null;
    }

    // Fetch player
    const player = await ctx.db.get(summary.playerIdentityId);
    if (!player) {
      return null;
    }

    // Fetch coach name using Better Auth adapter
    let coachName = "Your Coach";
    if (summary.coachId) {
      try {
        // Query by _id field (Convex document ID - this is what's actually stored as coachId)
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: summary.coachId, operator: "eq" }],
          }
        );

        if (userResult) {
          // Better Auth stores full name in 'name' field
          if (userResult.name) {
            coachName = `Coach ${userResult.name}`;
          } else if (userResult.email) {
            // Fallback to email if no name
            coachName = `Coach ${userResult.email}`;
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch coach name for ${summary.coachId}:`,
          error
        );
      }
    }

    // Fetch organization name and logo using Better Auth adapter
    let orgName = "Organization";
    let orgLogo: string | null = null;
    if (summary.organizationId) {
      try {
        // Try to find by id first
        let orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "id",
                value: summary.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        // If not found, try by _id (though organizationId should always be the Better Auth id)
        if (!orgResult) {
          orgResult = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: summary.organizationId,
                  operator: "eq",
                },
              ],
            }
          );
        }

        if (orgResult) {
          const org = orgResult as {
            name?: string;
            logo?: string;
          };
          if (org.name) {
            orgName = org.name;
          }
          if (org.logo) {
            orgLogo = org.logo;
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch org name for ${summary.organizationId}:`,
          error
        );
      }
    }

    return {
      content: summary.publicSummary.content,
      playerFirstName: player.firstName,
      coachName,
      orgName,
      orgLogo,
      generatedAt: summary.publicSummary.generatedAt,
    };
  },
});

/**
 * Public query: Get summary data for PDF/sharing
 * Parents can call this to get data needed for generating PDFs
 */
export const getSummaryForPDF = query({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.union(
    v.object({
      content: v.string(),
      playerFirstName: v.string(),
      coachName: v.string(),
      organizationName: v.string(),
      generatedDate: v.string(),
      category: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx,
    args
  ): Promise<{
    content: string;
    playerFirstName: string;
    coachName: string;
    organizationName: string;
    generatedDate: string;
    category?: string;
  } | null> => {
    // Re-use internal query logic
    const data: {
      content: string;
      playerFirstName: string;
      coachName: string;
      orgName: string;
      orgLogo: string | null;
      generatedAt: number;
    } | null = await ctx.runQuery(
      internal.models.coachParentSummaries.getSummaryForImage,
      args
    );

    if (!data) {
      return null;
    }

    // Format date for display
    const date = new Date(data.generatedAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get summary to extract category
    const summary = await ctx.db.get(args.summaryId);
    const category = summary?.privateInsight?.category;

    return {
      content: data.content,
      playerFirstName: data.playerFirstName,
      coachName: data.coachName,
      organizationName: data.orgName,
      generatedDate: formattedDate,
      category,
    };
  },
});

// ============================================================
// PHASE 7.2: SCHEDULED DELIVERY PROCESSING
// ============================================================

/**
 * Process scheduled deliveries for auto-approved summaries
 * Updates status from "auto_approved" to "delivered" when scheduledDeliveryAt time has passed
 * Called by cron job every 5 minutes
 */
export const processScheduledDeliveries = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;
    let errors = 0;

    console.log(
      `[processScheduledDeliveries] Starting at ${new Date(now).toISOString()}`
    );

    // Query for summaries ready to be delivered
    // Status = auto_approved AND scheduledDeliveryAt <= now
    const autoApprovedSummaries = await ctx.db
      .query("coachParentSummaries")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "auto_approved"),
          q.lte(q.field("scheduledDeliveryAt"), now)
        )
      )
      .collect();

    console.log(
      `[processScheduledDeliveries] Found ${autoApprovedSummaries.length} summaries ready for delivery`
    );

    for (const summary of autoApprovedSummaries) {
      try {
        // Update status to delivered
        await ctx.db.patch(summary._id, {
          status: "delivered",
          deliveredAt: now,
        });

        console.log(
          `[processScheduledDeliveries] ✅ Delivered summary ${summary._id} for player ${summary.playerIdentityId}`
        );
        processed += 1;
      } catch (error) {
        console.error(
          `[processScheduledDeliveries] ❌ Failed to deliver summary ${summary._id}:`,
          error
        );
        errors += 1;
      }
    }

    console.log(
      `[processScheduledDeliveries] Complete: ${processed} processed, ${errors} errors`
    );

    return { processed, errors };
  },
});

// ============================================================
// DEBUG QUERY - Temporary diagnostic tool
// ============================================================

export const debugAutoApprovedTab = query({
  args: {},
  returns: v.object({
    yourUserId: v.string(),
    yourApprovedCount: v.number(),
    totalApprovedCount: v.number(),
    summariesByCoach: v.any(),
    diagnosis: v.string(),
    yourSamples: v.array(
      v.object({
        _id: v.string(),
        status: v.string(),
        coachId: v.string(),
        organizationId: v.string(),
        createdDaysAgo: v.number(),
      })
    ),
  }),
  handler: async (ctx, _args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const yourUserId = user._id;

    // Get all summaries
    const allSummaries = await ctx.db.query("coachParentSummaries").collect();

    const approvedStatuses = [
      "approved",
      "auto_approved",
      "delivered",
      "viewed",
    ];
    const approvedSummaries = allSummaries.filter((s) =>
      approvedStatuses.includes(s.status)
    );

    // Count by coach
    const byCoach: Record<string, number> = {};
    for (const s of approvedSummaries) {
      const coachId = s.coachId || "unknown";
      byCoach[coachId] = (byCoach[coachId] || 0) + 1;
    }

    const yourCount = approvedSummaries.filter(
      (s) => s.coachId === yourUserId
    ).length;

    // Get samples of YOUR approved summaries
    const yourSamples = approvedSummaries
      .filter((s) => s.coachId === yourUserId)
      .slice(0, 5)
      .map((s) => ({
        _id: s._id,
        status: s.status,
        coachId: s.coachId,
        organizationId: s.organizationId,
        createdDaysAgo: Math.floor(
          (Date.now() - s._creationTime) / (24 * 60 * 60 * 1000)
        ),
      }));

    return {
      yourUserId,
      yourApprovedCount: yourCount,
      totalApprovedCount: approvedSummaries.length,
      summariesByCoach: byCoach,
      diagnosis:
        yourCount === 0
          ? "❌ All approved summaries belong to OTHER coaches (not you)"
          : `✅ You have ${yourCount} approved summaries that SHOULD appear in the tab`,
      yourSamples,
    };
  },
});
