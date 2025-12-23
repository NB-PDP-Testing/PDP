import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// ============================================================
// PLAYER ACCESS POLICIES (Organization Settings)
// ============================================================

/**
 * Get organization's player access policy
 */
export const getOrgPolicy = query({
  args: { organizationId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerAccessPolicies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
  },
});

/**
 * Create or update organization's player access policy
 */
export const upsertOrgPolicy = mutation({
  args: {
    organizationId: v.string(),
    isEnabled: v.boolean(),
    minimumAge: v.number(),
    requireGuardianApproval: v.boolean(),
    requireCoachRecommendation: v.optional(v.boolean()),
    defaultVisibility: v.object({
      skillRatings: v.boolean(),
      skillHistory: v.boolean(),
      publicCoachNotes: v.boolean(),
      benchmarkComparison: v.boolean(),
      practiceRecommendations: v.boolean(),
      developmentGoals: v.boolean(),
      injuryStatus: v.boolean(),
    }),
    notifyGuardianOnLogin: v.boolean(),
    trackPlayerViews: v.boolean(),
  },
  returns: v.id("playerAccessPolicies"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("playerAccessPolicies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: args.isEnabled,
        minimumAge: args.minimumAge,
        requireGuardianApproval: args.requireGuardianApproval,
        requireCoachRecommendation: args.requireCoachRecommendation,
        defaultVisibility: args.defaultVisibility,
        notifyGuardianOnLogin: args.notifyGuardianOnLogin,
        trackPlayerViews: args.trackPlayerViews,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("playerAccessPolicies", {
      organizationId: args.organizationId,
      isEnabled: args.isEnabled,
      minimumAge: args.minimumAge,
      requireGuardianApproval: args.requireGuardianApproval,
      requireCoachRecommendation: args.requireCoachRecommendation,
      defaultVisibility: args.defaultVisibility,
      notifyGuardianOnLogin: args.notifyGuardianOnLogin,
      trackPlayerViews: args.trackPlayerViews,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================================
// PLAYER ACCESS GRANTS (Guardian Permissions)
// ============================================================

/**
 * Get access grant for a player in an organization
 */
export const getAccessGrant = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerAccessGrants")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();
  },
});

/**
 * Get all access grants for a guardian
 */
export const getGrantsByGuardian = query({
  args: { guardianIdentityId: v.id("guardianIdentities") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("playerAccessGrants")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    // Enrich with player info
    const enriched = [];
    for (const grant of grants) {
      const player = await ctx.db.get(grant.playerIdentityId);
      enriched.push({
        ...grant,
        playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown",
        playerDateOfBirth: player?.dateOfBirth,
      });
    }

    return enriched;
  },
});

/**
 * Get all access grants for a player
 */
export const getGrantsForPlayer = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerAccessGrants")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();
  },
});

/**
 * Create or update an access grant
 */
export const upsertAccessGrant = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
    isEnabled: v.boolean(),
    visibilityOverrides: v.optional(
      v.object({
        skillRatings: v.optional(v.boolean()),
        skillHistory: v.optional(v.boolean()),
        publicCoachNotes: v.optional(v.boolean()),
        parentNotes: v.optional(v.boolean()),
        benchmarkComparison: v.optional(v.boolean()),
        practiceRecommendations: v.optional(v.boolean()),
        developmentGoals: v.optional(v.boolean()),
        injuryStatus: v.optional(v.boolean()),
        medicalNotes: v.optional(v.boolean()),
        attendanceRecords: v.optional(v.boolean()),
      })
    ),
    notifyOnLogin: v.boolean(),
    notifyOnViewSensitive: v.boolean(),
    grantedBy: v.string(),
  },
  returns: v.id("playerAccessGrants"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("playerAccessGrants")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: args.isEnabled,
        visibilityOverrides: args.visibilityOverrides,
        notifyOnLogin: args.notifyOnLogin,
        notifyOnViewSensitive: args.notifyOnViewSensitive,
        revokedAt: args.isEnabled ? undefined : now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("playerAccessGrants", {
      playerIdentityId: args.playerIdentityId,
      guardianIdentityId: args.guardianIdentityId,
      organizationId: args.organizationId,
      isEnabled: args.isEnabled,
      visibilityOverrides: args.visibilityOverrides,
      notifyOnLogin: args.notifyOnLogin,
      notifyOnViewSensitive: args.notifyOnViewSensitive,
      grantedAt: now,
      grantedBy: args.grantedBy,
      updatedAt: now,
    });
  },
});

/**
 * Revoke an access grant
 */
export const revokeAccessGrant = mutation({
  args: { grantId: v.id("playerAccessGrants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.grantId, {
      isEnabled: false,
      revokedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

// ============================================================
// PLAYER ACCOUNT LINKS
// ============================================================

/**
 * Get player account link by user ID
 */
export const getAccountLinkByUserId = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get player account link by player identity ID
 */
export const getAccountLinkByPlayerId = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();
  },
});

/**
 * Create a player account link
 */
export const createAccountLink = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(),
    verificationMethod: v.union(
      v.literal("guardian_verified"),
      v.literal("email_verified"),
      v.literal("code_verified"),
      v.literal("admin_verified")
    ),
    verifiedBy: v.optional(v.string()),
  },
  returns: v.id("playerAccountLinks"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if link already exists
    const existing = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existing) {
      throw new Error("Player already has an account linked");
    }

    return await ctx.db.insert("playerAccountLinks", {
      playerIdentityId: args.playerIdentityId,
      userId: args.userId,
      verificationMethod: args.verificationMethod,
      verifiedAt: now,
      verifiedBy: args.verifiedBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Deactivate a player account link
 */
export const deactivateAccountLink = mutation({
  args: { linkId: v.id("playerAccountLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================
// PLAYER ACCESS LOGS
// ============================================================

/**
 * Log a player access action
 */
export const logAccess = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(),
    organizationId: v.string(),
    action: v.union(
      v.literal("login"),
      v.literal("view_passport"),
      v.literal("view_skill_detail"),
      v.literal("view_skill_history"),
      v.literal("view_coach_notes"),
      v.literal("view_injury"),
      v.literal("view_goals"),
      v.literal("view_recommendations")
    ),
    resourceId: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("playerAccessLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("playerAccessLogs", {
      playerIdentityId: args.playerIdentityId,
      userId: args.userId,
      organizationId: args.organizationId,
      action: args.action,
      resourceId: args.resourceId,
      resourceType: args.resourceType,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get access logs for a player
 */
export const getPlayerAccessLogs = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("playerAccessLogs")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.take(100);
  },
});

/**
 * Get access logs for an organization
 */
export const getOrgAccessLogs = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("playerAccessLogs")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit ?? 100);

    // Enrich with player names
    const enriched = [];
    for (const log of logs) {
      const player = await ctx.db.get(log.playerIdentityId);
      enriched.push({
        ...log,
        playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown",
      });
    }

    return enriched;
  },
});

// ============================================================
// PLAYER SELF-ACCESS DASHBOARD QUERIES
// ============================================================

/**
 * Check if a player has self-access enabled for any org
 */
export const checkPlayerAccess = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Find account link
    const accountLink = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!accountLink || !accountLink.isActive) {
      return { hasAccess: false, reason: "no_account_link" };
    }

    // Get player identity
    const player = await ctx.db.get(accountLink.playerIdentityId);
    if (!player) {
      return { hasAccess: false, reason: "player_not_found" };
    }

    // Get all enrollments for this player
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", accountLink.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Check each org's policy and grants
    const accessibleOrgs = [];

    for (const enrollment of enrollments) {
      const policy = await ctx.db
        .query("playerAccessPolicies")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", enrollment.organizationId)
        )
        .first();

      // If no policy or disabled, skip
      if (!policy || !policy.isEnabled) continue;

      // Check age requirement
      if (player.dateOfBirth) {
        const dob = new Date(player.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < policy.minimumAge) continue;
      }

      // Check guardian approval if required
      if (policy.requireGuardianApproval) {
        const grant = await ctx.db
          .query("playerAccessGrants")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", accountLink.playerIdentityId)
              .eq("organizationId", enrollment.organizationId)
          )
          .first();

        if (!grant || !grant.isEnabled) continue;

        accessibleOrgs.push({
          organizationId: enrollment.organizationId,
          policy,
          grant,
          visibility: { ...policy.defaultVisibility, ...grant.visibilityOverrides },
        });
      } else {
        // No guardian approval required
        accessibleOrgs.push({
          organizationId: enrollment.organizationId,
          policy,
          grant: null,
          visibility: policy.defaultVisibility,
        });
      }
    }

    return {
      hasAccess: accessibleOrgs.length > 0,
      playerIdentityId: accountLink.playerIdentityId,
      playerName: `${player.firstName} ${player.lastName}`,
      accessibleOrgs,
    };
  },
});

/**
 * Get player's passport data for self-view (respecting visibility settings)
 */
export const getPlayerSelfViewPassport = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Verify access
    const accessCheck = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!accessCheck || !accessCheck.isActive) {
      return { error: "No access" };
    }

    const playerIdentityId = accessCheck.playerIdentityId;

    // Get policy
    const policy = await ctx.db
      .query("playerAccessPolicies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!policy || !policy.isEnabled) {
      return { error: "Player access not enabled for this organization" };
    }

    // Get grant (if guardian approval required)
    let visibility = policy.defaultVisibility;
    if (policy.requireGuardianApproval) {
      const grant = await ctx.db
        .query("playerAccessGrants")
        .withIndex("by_player_and_org", (q) =>
          q.eq("playerIdentityId", playerIdentityId).eq("organizationId", args.organizationId)
        )
        .first();

      if (!grant || !grant.isEnabled) {
        return { error: "Guardian approval required" };
      }

      visibility = { ...policy.defaultVisibility, ...grant.visibilityOverrides };
    }

    // Get player identity
    const player = await ctx.db.get(playerIdentityId);
    if (!player) {
      return { error: "Player not found" };
    }

    // Get enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q.eq("playerIdentityId", playerIdentityId).eq("organizationId", args.organizationId)
      )
      .first();

    // Get sport passports
    let passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", playerIdentityId)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    if (args.sportCode) {
      passports = passports.filter((p) => p.sportCode === args.sportCode);
    }

    // Build response based on visibility
    const response: Record<string, unknown> = {
      player: {
        firstName: player.firstName,
        lastName: player.lastName,
      },
      enrollment: enrollment
        ? {
            ageGroup: enrollment.ageGroup,
            season: enrollment.season,
          }
        : null,
      passports: [],
    };

    for (const passport of passports) {
      const passportData: Record<string, unknown> = {
        sportCode: passport.sportCode,
        status: passport.status,
        primaryPosition: passport.primaryPosition,
        dominantSide: passport.dominantSide,
      };

      // Skills
      if (visibility.skillRatings) {
        const latestAssessments = await ctx.db
          .query("skillAssessments")
          .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
          .order("desc")
          .collect();

        // Get latest for each skill
        const skillMap = new Map<string, number>();
        const benchmarkMap = new Map<string, { status?: string; delta?: number }>();
        for (const a of latestAssessments) {
          if (!skillMap.has(a.skillCode)) {
            skillMap.set(a.skillCode, a.rating);
            if (visibility.benchmarkComparison && a.benchmarkStatus) {
              benchmarkMap.set(a.skillCode, {
                status: a.benchmarkStatus,
                delta: a.benchmarkDelta,
              });
            }
          }
        }

        passportData.skills = Object.fromEntries(skillMap);
        if (visibility.benchmarkComparison) {
          passportData.benchmarks = Object.fromEntries(benchmarkMap);
        }

        passportData.overallRating = passport.currentOverallRating;
      }

      // Skill history
      if (visibility.skillHistory) {
        const history = await ctx.db
          .query("skillAssessments")
          .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
          .order("desc")
          .take(50);

        passportData.skillHistory = history.map((h) => ({
          skillCode: h.skillCode,
          rating: h.rating,
          date: h.assessmentDate,
          type: h.assessmentType,
        }));
      }

      // Coach notes
      if (visibility.publicCoachNotes && passport.coachNotes) {
        passportData.coachNotes = passport.coachNotes;
      }

      // Goals
      if (visibility.developmentGoals) {
        const goals = await ctx.db
          .query("passportGoals")
          .withIndex("by_passportId", (q) => q.eq("passportId", passport._id))
          .filter((q) => q.eq(q.field("parentCanView"), true))
          .collect();

        passportData.goals = goals.map((g) => ({
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status,
          progress: g.progress,
          targetDate: g.targetDate,
          milestones: g.milestones,
        }));
      }

      // Injury status
      if (visibility.injuryStatus) {
        const activeInjuries = await ctx.db
          .query("playerInjuries")
          .withIndex("by_status", (q) =>
            q.eq("playerIdentityId", playerIdentityId).eq("status", "active")
          )
          .collect();

        passportData.activeInjuries = activeInjuries.map((i) => ({
          injuryType: i.injuryType,
          bodyPart: i.bodyPart,
          severity: i.severity,
          expectedReturn: i.expectedReturn,
        }));
      }

      (response.passports as unknown[]).push(passportData);
    }

    return response;
  },
});

/**
 * Get all sports for a player (for multi-sport dashboard)
 */
export const getPlayerSports = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const accountLink = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!accountLink || !accountLink.isActive) {
      return [];
    }

    const passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", accountLink.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Group by sport with org info
    const sports = [];
    for (const passport of passports) {
      sports.push({
        sportCode: passport.sportCode,
        organizationId: passport.organizationId,
        overallRating: passport.currentOverallRating,
        lastAssessmentDate: passport.lastAssessmentDate,
      });
    }

    return sports;
  },
});
