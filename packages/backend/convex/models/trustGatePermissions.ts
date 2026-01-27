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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
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
