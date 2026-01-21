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
  deliveredAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),
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

    // Determine initial status based on sensitivity category
    // INJURY and BEHAVIOR categories NEVER auto-approve (even in future phases)
    let status: "pending_review" | "auto_approved" = "pending_review";

    if (args.sensitivityCategory === "injury") {
      console.log(
        "Auto-approval blocked: injury sensitivity requires manual review"
      );
      status = "pending_review";
    } else if (args.sensitivityCategory === "behavior") {
      console.log(
        "Auto-approval blocked: behavior sensitivity requires manual review"
      );
      status = "pending_review";
    }
    // Future Phase 5: Normal category may auto-approve based on trust level
    // For now, all summaries go to pending_review

    // Create the summary record
    const summaryId = await ctx.db.insert("coachParentSummaries", {
      voiceNoteId: args.voiceNoteId,
      insightId: args.insightId,
      coachId: voiceNote.coachId, // Required field - always present
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

    // Get the user ID (use _id or userId depending on what's available)
    const userId = user.userId || user._id;
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

    // Update coach trust metrics
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      organizationId: summary.organizationId,
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

    // Get the user ID (use _id or userId depending on what's available)
    const userId = user.userId || user._id;
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

    // Update coach trust metrics
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      organizationId: summary.organizationId,
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID (use _id or userId depending on what's available)
    const userId = user.userId || user._id;
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

    // Update the summary status
    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
    });

    // Update coach trust metrics
    await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
      coachId: summary.coachId,
      organizationId: summary.organizationId,
      action: "suppressed",
    });

    return null;
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

    // Get the user ID (use _id or userId depending on what's available)
    const userId = user.userId || user._id;
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
    })
  ),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get userId with fallback to _id
    const userId = user.userId || user._id;

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
        return {
          ...summary,
          player,
          sport,
        };
      })
    );

    return summariesWithInfo;
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

    // For each child, get summaries grouped by sport
    const childrenWithSummaries = await Promise.all(
      links.map(async (link) => {
        const player = await ctx.db.get(link.playerIdentityId);
        if (!player) {
          return null;
        }

        // Get all summaries for this player (query each status separately)
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

        const viewedSummaries = await ctx.db
          .query("coachParentSummaries")
          .withIndex("by_player_org_status", (q) =>
            q
              .eq("playerIdentityId", link.playerIdentityId)
              .eq("organizationId", args.organizationId)
              .eq("status", "viewed")
          )
          .collect();

        const playerSummaries = [
          ...approvedSummaries,
          ...deliveredSummaries,
          ...viewedSummaries,
        ];

        // Group by sport
        const sportMap = new Map<string, typeof playerSummaries>();
        for (const summary of playerSummaries) {
          const sportId = summary.sportId;
          if (!sportMap.has(sportId)) {
            sportMap.set(sportId, []);
          }
          const sportSummaries = sportMap.get(sportId);
          if (sportSummaries) {
            sportSummaries.push(summary);
          }
        }

        // Convert to array with sport info and enrich with coach names
        const sportGroups = await Promise.all(
          Array.from(sportMap.entries()).map(
            async ([sportId, sportSummaries]) => {
              const sport = await ctx.db.get(sportId as Id<"sports">);
              const unreadCount = sportSummaries.filter(
                (s) => !s.viewedAt
              ).length;

              // Enrich summaries with coach names
              const enrichedSummaries = await Promise.all(
                sportSummaries.map(async (summary) => {
                  let coachName = "Unknown Coach";

                  if (summary.coachId) {
                    try {
                      const coachResult = await ctx.runQuery(
                        components.betterAuth.adapter.findOne,
                        {
                          model: "user",
                          where: [
                            {
                              field: "_id",
                              value: summary.coachId,
                              operator: "eq",
                            },
                          ],
                        }
                      );

                      if (coachResult) {
                        const coach = coachResult as {
                          firstName?: string;
                          lastName?: string;
                        };
                        if (coach.firstName || coach.lastName) {
                          coachName =
                            `${coach.firstName || ""} ${coach.lastName || ""}`.trim();
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Failed to fetch coach name for ${summary.coachId}:`,
                        error
                      );
                    }
                  }

                  return {
                    ...summary,
                    coachName,
                  };
                })
              );

              return {
                sport,
                summaries: enrichedSummaries,
                unreadCount,
              };
            }
          )
        );

        return {
          player,
          sportGroups,
        };
      })
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

    // Build passport URL
    const url = `/orgs/${summary.organizationId}/parents/children/${summary.playerIdentityId}/passport?section=${section}`;

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
      coachFirstName: v.string(),
      orgName: v.string(),
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

    // Fetch coach and org names (Better Auth tables)
    // Better Auth tables aren't in our schema, use raw db access
    const coach = (await (ctx.db as any).get(summary.coachId)) || null;
    const org = (await (ctx.db as any).get(summary.organizationId)) || null;

    return {
      content: summary.publicSummary.content,
      playerFirstName: player.firstName,
      coachFirstName: coach?.firstName || "Coach",
      orgName: org?.name || "Organization",
      generatedAt: summary.publicSummary.generatedAt,
    };
  },
});
