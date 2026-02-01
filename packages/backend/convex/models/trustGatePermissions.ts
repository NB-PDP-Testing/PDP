/**
 * Trust Gate Permission System (P8 Week 1.5)
 *
 * 3-tier permission hierarchy:
 * 1. Individual Coach Override (highest priority)
 * 2. Admin Blanket Override
 * 3. Organization Default Setting (lowest priority)
 *
 * Platform staff can:
 * - Enable/disable trust gates at org level
 * - Delegate control to org admins
 * - Enable coach override requests
 *
 * Org admins (if delegated) can:
 * - Set blanket override for all coaches
 * - Grant individual coach overrides
 * - Review coach override requests
 *
 * Coaches (if enabled) can:
 * - Request override access
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";

/**
 * Check if trust gates are active for a specific coach
 * Returns the final gate status and which rule determined it
 */
export const areTrustGatesActive = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    gatesActive: v.boolean(),
    source: v.string(), // "coach_override" | "admin_blanket" | "org_default"
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get organization settings via Better Auth component
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // PRIORITY 1: Individual Coach Override (highest)
    if (coachPrefs?.trustGateOverride === true) {
      return {
        gatesActive: false,
        source: "coach_override",
        reason: coachPrefs.overrideReason,
      };
    }

    // PRIORITY 2: Admin Blanket Override
    if (org.adminOverrideTrustGates !== undefined) {
      return {
        gatesActive: !org.adminOverrideTrustGates,
        source: "admin_blanket",
      };
    }

    // PRIORITY 3: Org Default Setting
    const gatesEnabled = org.voiceNotesTrustGatesEnabled ?? true; // Conservative default

    return {
      gatesActive: gatesEnabled,
      source: "org_default",
    };
  },
});

/**
 * Comprehensive access check for coach parent communication
 * Includes all blocking logic, self-service, and trust levels
 *
 * Priority order (highest to lowest):
 * 1. Admin blanket block → no access
 * 2. Individual admin block → no access
 * 3. Coach self-disabled → no access
 * 4. Gates disabled → access
 * 5. Admin blanket override → access
 * 6. Trust Level 2+ → access
 * 7. Individual override → access
 * 8. Default → no access
 */
export const checkCoachParentAccess = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    hasAccess: v.boolean(),
    reason: v.string(),
    canRequest: v.boolean(), // Can coach request access?
    canToggle: v.boolean(), // Can coach toggle on/off?
  }),
  handler: async (ctx, args) => {
    // Get organization settings
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get coach preferences
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // Get coach trust level
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", args.coachId))
      .first();

    const currentLevel = trustLevel?.currentLevel ?? 0;

    // PRIORITY 1: Admin blanket block (highest - blocks EVERYONE)
    if (org.adminBlanketBlock === true) {
      return {
        hasAccess: false,
        reason: "Admin has disabled parent communication for all coaches",
        canRequest: false,
        canToggle: false,
      };
    }

    // PRIORITY 2: Individual admin block
    if (coachPref?.adminBlockedFromAI === true) {
      return {
        hasAccess: false,
        reason: coachPref.blockReason || "Admin blocked your access",
        canRequest: false,
        canToggle: false,
      };
    }

    // PRIORITY 3: Coach self-disabled (coach chose to hide)
    if (coachPref?.aiControlRightsEnabled === false) {
      return {
        hasAccess: false,
        reason: "You disabled this feature in your settings",
        canRequest: false,
        canToggle: true, // Can toggle back on
      };
    }

    // PRIORITY 4: Gates disabled (everyone gets access)
    if (org.voiceNotesTrustGatesEnabled === false) {
      return {
        hasAccess: true,
        reason: "Trust gates disabled by platform staff",
        canRequest: false,
        canToggle: true, // Can still toggle off if they want
      };
    }

    // PRIORITY 5: Admin blanket override (everyone gets access)
    if (org.adminOverrideTrustGates === true) {
      return {
        hasAccess: true,
        reason: "Admin granted access to all coaches",
        canRequest: false,
        canToggle: true, // Can toggle off if they want
      };
    }

    // PRIORITY 6: Trust Level 2+ (earned access)
    if (currentLevel >= 2) {
      return {
        hasAccess: true,
        reason: "Trust Level 2+",
        canRequest: false,
        canToggle: true, // Can toggle off if they want
      };
    }

    // PRIORITY 7: Individual override (admin approved)
    if (coachPref?.trustGateOverride === true) {
      // Check if expired
      if (
        coachPref.overrideExpiresAt &&
        coachPref.overrideExpiresAt < Date.now()
      ) {
        return {
          hasAccess: false,
          reason: "Your override access has expired",
          canRequest: org.allowCoachOverrides ?? false,
          canToggle: false,
        };
      }

      return {
        hasAccess: true,
        reason:
          coachPref.overrideReason || "Admin granted you temporary access",
        canRequest: false,
        canToggle: true, // Can toggle off if they want
      };
    }

    // PRIORITY 8: Default - no access
    return {
      hasAccess: false,
      reason: "Requires Trust Level 2 or admin approval",
      canRequest: org.allowCoachOverrides ?? false,
      canToggle: false,
    };
  },
});

/**
 * Get feature flag status for an organization with aggregated coach data
 */
export const getOrgFeatureFlagStatus = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    voiceNotesTrustGatesEnabled: v.boolean(),
    allowAdminDelegation: v.boolean(),
    allowCoachOverrides: v.boolean(),
    adminOverrideTrustGates: v.optional(v.boolean()),
    adminOverrideSetBy: v.optional(v.string()),
    adminOverrideSetAt: v.optional(v.number()),
    totalCoaches: v.number(),
    coachesWithAccess: v.number(),
    activeOverrides: v.array(
      v.object({
        coachId: v.string(),
        coachName: v.string(),
        overrideReason: v.optional(v.string()),
        grantedBy: v.optional(v.string()),
        grantedAt: v.optional(v.number()),
        expiresAt: v.optional(v.number()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get organization via Better Auth component
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get all coaches in org (members with functional role "coach")
    const allMembersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [{ field: "organizationId", value: args.organizationId }],
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
      }
    );

    const allMembers = allMembersResult.page as BetterAuthDoc<"member">[];

    const coaches = allMembers.filter((m) =>
      m.functionalRoles?.includes("coach")
    );

    // Get all coach preferences with overrides
    const allPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeOverridePrefs = allPrefs.filter(
      (p) => p.trustGateOverride === true
    );

    // Build active overrides list with coach names
    const activeOverrides = await Promise.all(
      activeOverridePrefs.map(async (pref) => {
        const user = (await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "userId", value: pref.coachId }],
          }
        )) as BetterAuthDoc<"user"> | null;

        return {
          coachId: pref.coachId,
          coachName: user?.name || "Unknown",
          overrideReason: pref.overrideReason,
          grantedBy: pref.overrideGrantedBy,
          grantedAt: pref.overrideGrantedAt,
          expiresAt: pref.overrideExpiresAt,
        };
      })
    );

    // Calculate coaches with access
    let coachesWithAccess = 0;

    // If admin blanket override is ON (gates disabled), all coaches have access
    if (org.adminOverrideTrustGates === true) {
      coachesWithAccess = coaches.length;
    }
    // If admin blanket override is OFF (gates forced ON), only override coaches have access
    else if (org.adminOverrideTrustGates === false) {
      coachesWithAccess = activeOverridePrefs.length;
    }
    // Otherwise use org default
    else {
      const gatesEnabled = org.voiceNotesTrustGatesEnabled ?? true;
      if (gatesEnabled) {
        // Gates enabled - only override coaches have access (trust level check happens in UI)
        coachesWithAccess = activeOverridePrefs.length;
      } else {
        // Gates disabled at org level - all coaches have access
        coachesWithAccess = coaches.length;
      }
    }

    return {
      voiceNotesTrustGatesEnabled: org.voiceNotesTrustGatesEnabled ?? true,
      allowAdminDelegation: org.allowAdminDelegation ?? false,
      allowCoachOverrides: org.allowCoachOverrides ?? false,
      adminOverrideTrustGates: org.adminOverrideTrustGates,
      adminOverrideSetBy: org.adminOverrideSetBy,
      adminOverrideSetAt: org.adminOverrideSetAt,
      totalCoaches: coaches.length,
      coachesWithAccess,
      activeOverrides,
    };
  },
});

/**
 * Get coach override requests for an organization
 */
export const getCoachOverrideRequests = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachOverrideRequests"),
      coachId: v.string(),
      coachName: v.string(),
      featureType: v.string(),
      reason: v.string(),
      status: v.string(),
      requestedAt: v.number(),
      reviewedBy: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      reviewNotes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    let requests: Array<{
      _id: Id<"coachOverrideRequests">;
      coachId: string;
      organizationId: string;
      featureType: string;
      reason: string;
      status: "pending" | "approved" | "denied" | "expired";
      requestedAt: number;
      reviewedBy?: string;
      reviewedAt?: number;
      reviewNotes?: string;
    }>;

    if (args.status) {
      // Query by org + status
      requests = await ctx.db
        .query("coachOverrideRequests")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq(
              "status",
              args.status as "pending" | "approved" | "denied" | "expired"
            )
        )
        .collect();
    } else {
      // Query all for this org
      requests = await ctx.db
        .query("coachOverrideRequests")
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .collect();
    }

    // Enrich with coach names
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const user = (await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "userId", value: req.coachId }],
          }
        )) as BetterAuthDoc<"user"> | null;

        return {
          _id: req._id,
          coachId: req.coachId,
          coachName: user?.name || "Unknown",
          featureType: req.featureType,
          reason: req.reason,
          status: req.status,
          requestedAt: req.requestedAt,
          reviewedBy: req.reviewedBy,
          reviewedAt: req.reviewedAt,
          reviewNotes: req.reviewNotes,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get feature flag status across ALL organizations (platform staff only)
 */
export const getAllOrgsFeatureFlagStatus = query({
  args: {},
  returns: v.array(
    v.object({
      orgId: v.string(),
      orgName: v.string(),
      gatesEnabled: v.boolean(),
      allowAdminDelegation: v.boolean(),
      allowCoachOverrides: v.boolean(),
      adminOverride: v.optional(v.boolean()),
      overridesCount: v.number(),
      pendingRequestsCount: v.number(),
      lastChangedBy: v.optional(v.string()),
      lastChangedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, _args) => {
    // Get current user to verify platform staff (using the correct pattern)
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Get all organizations (using same pattern as getAllUsers)
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        where: [],
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
      }
    );

    const orgs = orgsResult.page as BetterAuthDoc<"organization">[];

    // Build status for each org
    const statuses = await Promise.all(
      orgs.map(async (org) => {
        // Count active overrides
        const prefs = await ctx.db
          .query("coachOrgPreferences")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();

        const overridesCount = prefs.filter(
          (p) => p.trustGateOverride === true
        ).length;

        // Count pending requests
        const requests = await ctx.db
          .query("coachOverrideRequests")
          .withIndex("by_org_status", (q) =>
            q.eq("organizationId", org._id).eq("status", "pending")
          )
          .collect();

        return {
          orgId: org._id,
          orgName: org.name,
          gatesEnabled: org.voiceNotesTrustGatesEnabled ?? true,
          allowAdminDelegation: org.allowAdminDelegation ?? false,
          allowCoachOverrides: org.allowCoachOverrides ?? false,
          adminOverride: org.adminOverrideTrustGates,
          overridesCount,
          pendingRequestsCount: requests.length,
          lastChangedBy: org.adminOverrideSetBy,
          lastChangedAt: org.adminOverrideSetAt,
        };
      })
    );

    return statuses;
  },
});

/**
 * MUTATIONS
 */

/**
 * Platform staff: Set feature flags for an organization
 */
export const setPlatformFeatureFlags = mutation({
  args: {
    organizationId: v.string(),
    allowAdminDelegation: v.optional(v.boolean()),
    allowCoachOverrides: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify platform staff (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Update organization via Better Auth component
    const updates: Record<string, boolean> = {};
    if (args.allowAdminDelegation !== undefined) {
      updates.allowAdminDelegation = args.allowAdminDelegation;
    }
    if (args.allowCoachOverrides !== undefined) {
      updates.allowCoachOverrides = args.allowCoachOverrides;
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: updates,
      },
    });

    return { success: true };
  },
});

/**
 * Platform staff: Enable/disable trust gates for an organization
 */
export const setOrgTrustGatesEnabled = mutation({
  args: {
    organizationId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify platform staff (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Update organization via Better Auth component
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          voiceNotesTrustGatesEnabled: args.enabled,
        },
      },
    });

    return { success: true };
  },
});

/**
 * Admin: Set blanket override for all coaches in organization
 */
export const setAdminBlanketOverride = mutation({
  args: {
    organizationId: v.string(),
    override: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Check if org allows admin delegation
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.allowAdminDelegation) {
      throw new Error("Admin delegation not enabled for this organization");
    }

    // Update organization
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          adminOverrideTrustGates: args.override,
          adminOverrideSetBy: currentUser._id,
          adminOverrideSetAt: Date.now(),
        },
      },
    });

    return { success: true };
  },
});

/**
 * Admin: Grant individual coach override
 */
export const grantCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Check if org allows coach overrides
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.allowCoachOverrides) {
      throw new Error("Coach overrides not enabled for this organization");
    }

    // Get or create coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPrefs) {
      // Update existing
      await ctx.db.patch(coachPrefs._id, {
        trustGateOverride: true,
        overrideGrantedBy: currentUser._id,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
        updatedAt: Date.now(),
      });
    } else {
      // Create new
      await ctx.db.insert("coachOrgPreferences", {
        coachId: args.coachId,
        organizationId: args.organizationId,
        trustGateOverride: true,
        overrideGrantedBy: currentUser._id,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Admin: Revoke individual coach override
 */
export const revokeCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Get coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPrefs) {
      await ctx.db.patch(coachPrefs._id, {
        trustGateOverride: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Coach: Request override access
 */
export const requestCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    requestId: v.id("coachOverrideRequests"),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Verify user is the coach making the request
    if (currentUser._id !== args.coachId) {
      throw new Error("Can only request override for yourself");
    }

    // Check if org allows coach override requests
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    if (!org.allowCoachOverrides) {
      throw new Error(
        "Coach override requests not enabled for this organization"
      );
    }

    // Check if there's already a pending request
    const existingRequest = await ctx.db
      .query("coachOverrideRequests")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("You already have a pending override request");
    }

    // Create request
    const requestId = await ctx.db.insert("coachOverrideRequests", {
      coachId: args.coachId,
      organizationId: args.organizationId,
      featureType: "trust_gates",
      reason: args.reason,
      status: "pending",
      requestedAt: Date.now(),
    });

    return {
      success: true,
      requestId,
    };
  },
});

/**
 * Admin: Review coach override request (approve/deny)
 */
export const reviewCoachOverrideRequest = mutation({
  args: {
    requestId: v.id("coachOverrideRequests"),
    approved: v.boolean(),
    reviewNotes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: request.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: args.approved ? "approved" : "denied",
      reviewedBy: currentUser._id,
      reviewedAt: Date.now(),
      reviewNotes: args.reviewNotes,
    });

    // If approved, grant the override
    if (args.approved) {
      // Get or create coach preferences
      const coachPrefs = await ctx.db
        .query("coachOrgPreferences")
        .withIndex("by_coach_org", (q) =>
          q
            .eq("coachId", request.coachId)
            .eq("organizationId", request.organizationId)
        )
        .first();

      if (coachPrefs) {
        // Update existing
        await ctx.db.patch(coachPrefs._id, {
          trustGateOverride: true,
          overrideGrantedBy: currentUser._id,
          overrideGrantedAt: Date.now(),
          overrideReason: request.reason,
          updatedAt: Date.now(),
        });
      } else {
        // Create new
        await ctx.db.insert("coachOrgPreferences", {
          coachId: request.coachId,
          organizationId: request.organizationId,
          trustGateOverride: true,
          overrideGrantedBy: currentUser._id,
          overrideGrantedAt: Date.now(),
          overrideReason: request.reason,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Admin: Set blanket block for all coaches (opposite of blanket override)
 * Blocks ALL coaches from parent communication regardless of trust level
 */
export const setAdminBlanketBlock = mutation({
  args: {
    organizationId: v.string(),
    blocked: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Check if org allows admin delegation
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org?.allowAdminDelegation) {
      throw new Error(
        "Unauthorized: Organization does not allow admin delegation"
      );
    }

    // Update organization via Better Auth component
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          adminBlanketBlock: args.blocked,
          adminBlanketBlockSetBy: args.blocked ? currentUser._id : undefined,
          adminBlanketBlockSetAt: args.blocked ? Date.now() : undefined,
        },
      },
    });

    return { success: true };
  },
});

/**
 * Admin: Block specific coach from parent communication
 */
export const blockIndividualCoach = mutation({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Check if org allows admin delegation
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org?.allowAdminDelegation) {
      throw new Error(
        "Unauthorized: Organization does not allow admin delegation"
      );
    }

    // Get or create coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPrefs) {
      // Update existing
      await ctx.db.patch(coachPrefs._id, {
        adminBlockedFromAI: true,
        blockReason: args.reason,
        blockedBy: currentUser._id,
        blockedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Create new
      await ctx.db.insert("coachOrgPreferences", {
        coachId: args.coachId,
        organizationId: args.organizationId,
        adminBlockedFromAI: true,
        blockReason: args.reason,
        blockedBy: currentUser._id,
        blockedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Admin: Unblock specific coach
 */
export const unblockIndividualCoach = mutation({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "userId", value: currentUser._id },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Get coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachPrefs) {
      return { success: true }; // Already not blocked
    }

    // Update to unblock
    await ctx.db.patch(coachPrefs._id, {
      adminBlockedFromAI: false,
      blockReason: undefined,
      blockedBy: undefined,
      blockedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Admin: Grant AI Control Rights to specific coach
 * Gives coach ability to toggle their own AI automation settings
 */
export const grantAIControlRights = mutation({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    grantNote: v.optional(v.string()),
    notifyCoach: v.optional(v.boolean()), // For future toast notification
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin (using working pattern with operator)
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          { field: "userId", value: currentUser._id, operator: "eq" },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Check if org allows admin delegation
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org?.allowAdminDelegation) {
      throw new Error(
        "Unauthorized: Organization does not allow admin delegation"
      );
    }

    // Get or create coach preferences
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPref) {
      // Update existing
      await ctx.db.patch(coachPref._id, {
        aiControlRightsEnabled: true,
        grantedBy: currentUser._id,
        grantedAt: Date.now(),
        grantNote: args.grantNote,
        // Clear any previous block
        adminBlockedFromAI: false,
        blockReason: undefined,
        blockedBy: undefined,
        blockedAt: undefined,
        // Clear any previous revoke
        revokedBy: undefined,
        revokedAt: undefined,
        revokeReason: undefined,
        updatedAt: Date.now(),
      });
    } else {
      // Create new with all AI features enabled by default
      await ctx.db.insert("coachOrgPreferences", {
        coachId: args.coachId,
        organizationId: args.organizationId,
        aiControlRightsEnabled: true,
        grantedBy: currentUser._id,
        grantedAt: Date.now(),
        grantNote: args.grantNote,
        // Default all features ON
        aiInsightMatchingEnabled: true,
        autoApplyInsightsEnabled: true,
        parentSummariesEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Admin: Revoke AI Control Rights from specific coach
 * Removes coach's ability to toggle their own AI automation settings
 */
export const revokeAIControlRights = mutation({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    revokeReason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin (using working pattern with operator)
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          { field: "userId", value: currentUser._id, operator: "eq" },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Get coach preferences
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachPref?.aiControlRightsEnabled) {
      return { success: true }; // Already not granted
    }

    // Update to revoke
    await ctx.db.patch(coachPref._id, {
      aiControlRightsEnabled: false,
      revokedBy: currentUser._id,
      revokedAt: Date.now(),
      revokeReason: args.revokeReason,
      // Clear grant fields
      grantedBy: undefined,
      grantedAt: undefined,
      grantNote: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Coach: Toggle their own AI automation control rights on/off
 * Only works if coach already has permission (via trust level, override, etc.)
 */
export const toggleCoachAIControlRights = mutation({
  args: {
    organizationId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get or create coach preferences
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q
          .eq("coachId", currentUser._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPrefs) {
      // Update existing
      await ctx.db.patch(coachPrefs._id, {
        aiControlRightsEnabled: args.enabled,
        updatedAt: Date.now(),
      });
    } else {
      // Create new
      await ctx.db.insert("coachOrgPreferences", {
        coachId: currentUser._id,
        organizationId: args.organizationId,
        aiControlRightsEnabled: args.enabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Get all coaches in org with their complete access status
 * Used by org admin to manage individual coach access
 */
export const getAllCoachesWithAccessStatus = query({
  args: {
    organizationId: v.string(),
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      coachId: v.string(),
      coachName: v.string(),
      teamNames: v.array(v.string()),
      teamCount: v.number(),
      trustLevel: v.number(),
      hasAccess: v.boolean(),
      accessReason: v.string(),
      adminBlockedFromAI: v.boolean(),
      aiControlRightsEnabled: v.boolean(),
      hasOverride: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify admin (using working pattern)
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is org admin
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          { field: "userId", value: currentUser._id, operator: "eq" },
        ],
      }
    )) as BetterAuthDoc<"member"> | null;

    // Check if user has admin access (either Better Auth role or functional role)
    const hasAdminAccess =
      membership &&
      (membership.role === "admin" ||
        membership.role === "owner" ||
        membership.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
      throw new Error("Unauthorized: Admin or owner role required");
    }

    // Get all coaches in org
    const allMembersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
      }
    );

    const allMembers = allMembersResult.page as BetterAuthDoc<"member">[];
    const coaches = allMembers.filter((m) =>
      m.functionalRoles?.includes("coach")
    );

    // Get org settings
    const org = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    })) as BetterAuthDoc<"organization"> | null;

    if (!org) {
      throw new Error("Organization not found");
    }

    // Fetch all teams for this organization (do this once, outside the loop)
    const allTeamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Create maps for both ID and name lookups
    // (coachAssignments.teams may contain either IDs or names depending on storage method)
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );
    const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

    // Build status for each coach
    const coachStatuses = await Promise.all(
      coaches.map(async (member) => {
        // Get coach name
        const user = (await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: member.userId, operator: "eq" }],
          }
        )) as BetterAuthDoc<"user"> | null;

        // Get trust level
        const trustLevel = await ctx.db
          .query("coachTrustLevels")
          .withIndex("by_coach", (q) => q.eq("coachId", member.userId))
          .first();

        // Get coach preferences
        const coachPref = await ctx.db
          .query("coachOrgPreferences")
          .withIndex("by_coach_org", (q) =>
            q
              .eq("coachId", member.userId)
              .eq("organizationId", args.organizationId)
          )
          .first();

        // Get coach team assignments
        const coachAssignment = await ctx.db
          .query("coachAssignments")
          .withIndex("by_user_and_org", (q) =>
            q
              .eq("userId", member.userId)
              .eq("organizationId", args.organizationId)
          )
          .first();

        // Get team names from the pre-fetched maps
        // coachAssignment.teams may contain either team IDs or team names
        const teamIdentifiers = coachAssignment?.teams || [];
        const teamNames = teamIdentifiers.map((identifier) => {
          // Try lookup by ID first, then by name
          const teamById = teamByIdMap.get(identifier);
          if (teamById) {
            return teamById.name;
          }

          const teamByName = teamByNameMap.get(identifier);
          if (teamByName) {
            return teamByName.name;
          }

          return "Unknown Team";
        });

        // Check comprehensive access (same logic as checkCoachParentAccess)
        let hasAccess = false;
        let accessReason = "";

        if (org.adminBlanketBlock === true) {
          hasAccess = false;
          accessReason = "Blocked by blanket block";
        } else if (coachPref?.adminBlockedFromAI === true) {
          hasAccess = false;
          accessReason = "Blocked by admin";
        } else if (coachPref?.aiControlRightsEnabled === false) {
          hasAccess = false;
          accessReason = "Disabled by coach";
        } else if (org.voiceNotesTrustGatesEnabled === false) {
          hasAccess = true;
          accessReason = "Gates disabled";
        } else if (org.adminOverrideTrustGates === true) {
          hasAccess = true;
          accessReason = "Blanket override";
        } else if ((trustLevel?.currentLevel ?? 0) >= 2) {
          hasAccess = true;
          accessReason = `Trust Level ${trustLevel?.currentLevel ?? 0}`;
        } else if (coachPref?.trustGateOverride === true) {
          if (
            coachPref.overrideExpiresAt &&
            coachPref.overrideExpiresAt < Date.now()
          ) {
            hasAccess = false;
            accessReason = "Override expired";
          } else {
            hasAccess = true;
            accessReason = "Individual override";
          }
        } else {
          hasAccess = false;
          accessReason = "No access";
        }

        return {
          coachId: member.userId,
          coachName: user
            ? user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`.trim()
              : user.name || user.email || "Unknown"
            : "Unknown",
          teamNames,
          teamCount: teamNames.length,
          trustLevel: trustLevel?.currentLevel ?? 0,
          hasAccess,
          accessReason,
          adminBlockedFromAI: coachPref?.adminBlockedFromAI ?? false,
          aiControlRightsEnabled: coachPref?.aiControlRightsEnabled ?? false,
          hasOverride: coachPref?.trustGateOverride ?? false,
        };
      })
    );

    // Filter by search query if provided
    if (args.searchQuery) {
      const searchTerm = args.searchQuery.toLowerCase();
      return coachStatuses.filter(
        (coach) =>
          coach.coachName.toLowerCase().includes(searchTerm) ||
          coach.teamNames.some((team) =>
            team.toLowerCase().includes(searchTerm)
          )
      );
    }

    return coachStatuses;
  },
});

/**
 * Get coach's org-specific preferences for notification polling
 * Used by coach to detect when admin grants/revokes rights or blocks access
 */
export const getCoachOrgPreferences = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      aiControlRightsEnabled: v.optional(v.boolean()),
      grantedBy: v.optional(v.string()),
      grantedAt: v.optional(v.number()),
      grantNote: v.optional(v.string()),
      revokedBy: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      revokeReason: v.optional(v.string()),
      adminBlockedFromAI: v.optional(v.boolean()),
      blockReason: v.optional(v.string()),
      blockedBy: v.optional(v.string()),
      blockedAt: v.optional(v.number()),
      // Trust Gate Individual Override
      trustGateOverride: v.optional(v.boolean()),
      // AI feature toggles
      aiInsightMatchingEnabled: v.optional(v.boolean()),
      autoApplyInsightsEnabled: v.optional(v.boolean()),
      parentSummariesEnabled: v.optional(v.boolean()),
      // View preferences
      teamInsightsViewPreference: v.optional(
        v.union(
          v.literal("list"),
          v.literal("board"),
          v.literal("calendar"),
          v.literal("players")
        )
      ),
      // Mobile gesture preferences
      gesturesEnabled: v.optional(v.boolean()),
      swipeRightAction: v.optional(
        v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
      ),
      swipeLeftAction: v.optional(
        v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachPref) {
      return null;
    }

    return {
      aiControlRightsEnabled: coachPref.aiControlRightsEnabled,
      grantedBy: coachPref.grantedBy,
      grantedAt: coachPref.grantedAt,
      grantNote: coachPref.grantNote,
      revokedBy: coachPref.revokedBy,
      revokedAt: coachPref.revokedAt,
      revokeReason: coachPref.revokeReason,
      adminBlockedFromAI: coachPref.adminBlockedFromAI,
      blockReason: coachPref.blockReason,
      blockedBy: coachPref.blockedBy,
      blockedAt: coachPref.blockedAt,
      // Trust Gate Individual Override
      trustGateOverride: coachPref.trustGateOverride,
      // AI feature toggles
      aiInsightMatchingEnabled: coachPref.aiInsightMatchingEnabled,
      autoApplyInsightsEnabled: coachPref.autoApplyInsightsEnabled,
      parentSummariesEnabled: coachPref.parentSummariesEnabled,
      // View preferences
      teamInsightsViewPreference: coachPref.teamInsightsViewPreference,
      // Mobile gesture preferences
      gesturesEnabled: coachPref.gesturesEnabled,
      swipeRightAction: coachPref.swipeRightAction,
      swipeLeftAction: coachPref.swipeLeftAction,
    };
  },
});

/**
 * Coach: Toggle AI feature settings
 * Only works if coach has aiControlRightsEnabled
 */
export const toggleAIFeatureSetting = mutation({
  args: {
    organizationId: v.string(),
    feature: v.union(
      v.literal("aiInsightMatchingEnabled"),
      v.literal("autoApplyInsightsEnabled"),
      v.literal("parentSummariesEnabled")
    ),
    enabled: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get coach preferences
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q
          .eq("coachId", currentUser._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    // Check if coach has AI control rights
    if (!coachPref?.aiControlRightsEnabled) {
      throw new Error(
        "You don't have permission to change AI settings. Contact your admin."
      );
    }

    // Check if admin blocked
    if (coachPref.adminBlockedFromAI) {
      throw new Error("AI access has been blocked by your admin");
    }

    // Update the specific feature
    await ctx.db.patch(coachPref._id, {
      [args.feature]: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update coach org preferences (view preferences, etc.)
 * Used by coaches to persist UI preferences
 */
export const updateCoachOrgPreference = mutation({
  args: {
    organizationId: v.string(),
    teamInsightsViewPreference: v.optional(
      v.union(
        v.literal("list"),
        v.literal("board"),
        v.literal("calendar"),
        v.literal("players")
      )
    ),
    gesturesEnabled: v.optional(v.boolean()),
    swipeRightAction: v.optional(
      v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
    ),
    swipeLeftAction: v.optional(
      v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
    ),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify authenticated
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get or create coach preferences
    const coachPref = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q
          .eq("coachId", currentUser._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPref) {
      // Update existing preferences
      const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
      };

      if (args.teamInsightsViewPreference !== undefined) {
        updates.teamInsightsViewPreference = args.teamInsightsViewPreference;
      }
      if (args.gesturesEnabled !== undefined) {
        updates.gesturesEnabled = args.gesturesEnabled;
      }
      if (args.swipeRightAction !== undefined) {
        updates.swipeRightAction = args.swipeRightAction;
      }
      if (args.swipeLeftAction !== undefined) {
        updates.swipeLeftAction = args.swipeLeftAction;
      }

      await ctx.db.patch(coachPref._id, updates);
    } else {
      // Create new preferences record
      await ctx.db.insert("coachOrgPreferences", {
        coachId: currentUser._id,
        organizationId: args.organizationId,
        teamInsightsViewPreference: args.teamInsightsViewPreference,
        gesturesEnabled: args.gesturesEnabled,
        swipeRightAction: args.swipeRightAction,
        swipeLeftAction: args.swipeLeftAction,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
