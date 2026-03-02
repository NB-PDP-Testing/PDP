/**
 * Breach Register — GDPR Articles 33/34
 *
 * Article 33: Data controllers must notify the DPC within 72 hours of
 * becoming aware of a personal data breach likely to result in a risk to
 * individuals. Article 33(5) requires the controller to maintain records
 * of all breaches regardless of whether notification was required.
 *
 * IMPORTANT: This table is a legal compliance record.
 * It must NEVER be deleted by the retention cron or future erasure processing.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import { requireAuthAndOrg } from "../lib/authHelpers";

// ============================================================
// SHARED VALIDATORS
// ============================================================

const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

const statusValidator = v.union(
  v.literal("detected"),
  v.literal("under_assessment"),
  v.literal("dpc_notified"),
  v.literal("individuals_notified"),
  v.literal("closed")
);

const breachValidator = v.object({
  _id: v.id("breachRegister"),
  _creationTime: v.number(),
  organizationId: v.string(),
  detectedAt: v.number(),
  detectedByUserId: v.string(),
  description: v.string(),
  affectedDataCategories: v.array(v.string()),
  estimatedAffectedCount: v.optional(v.number()),
  severity: severityValidator,
  status: statusValidator,
  dpcNotifiedAt: v.optional(v.number()),
  individualsNotifiedAt: v.optional(v.number()),
  resolutionNotes: v.optional(v.string()),
  closedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * List all breach register records for an org, ordered by detectedAt descending.
 */
export const listBreaches = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(breachValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const breaches = await ctx.db
      .query("breachRegister")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();

    return breaches;
  },
});

/**
 * Get a single breach record by ID.
 */
export const getBreachById = query({
  args: {
    breachId: v.id("breachRegister"),
  },
  returns: v.union(breachValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.breachId),
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Log a new data breach incident.
 * Admin-only — requires admin or owner role in the organisation.
 * Returns the ID of the new breach record.
 */
export const logBreach = mutation({
  args: {
    organizationId: v.string(),
    detectedAt: v.number(),
    description: v.string(),
    affectedDataCategories: v.array(v.string()),
    estimatedAffectedCount: v.optional(v.number()),
    severity: severityValidator,
  },
  returns: v.id("breachRegister"),
  handler: async (ctx, args) => {
    const { userId, role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error("Only admins or owners can log breach incidents");
    }

    const now = Date.now();
    const breachId = await ctx.db.insert("breachRegister", {
      organizationId: args.organizationId,
      detectedAt: args.detectedAt,
      detectedByUserId: userId,
      description: args.description,
      affectedDataCategories: args.affectedDataCategories,
      estimatedAffectedCount: args.estimatedAffectedCount,
      severity: args.severity,
      status: "detected",
      createdAt: now,
      updatedAt: now,
    });

    return breachId;
  },
});

/**
 * Update the status of a breach record.
 * Admin-only — requires admin or owner role in the organisation.
 */
export const updateBreachStatus = mutation({
  args: {
    breachId: v.id("breachRegister"),
    organizationId: v.string(),
    status: statusValidator,
    dpcNotifiedAt: v.optional(v.number()),
    individualsNotifiedAt: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    closedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error("Only admins or owners can update breach status");
    }

    const breach = await ctx.db.get(args.breachId);
    if (!breach) {
      throw new Error("Breach record not found");
    }

    await ctx.db.patch(args.breachId, {
      status: args.status,
      dpcNotifiedAt: args.dpcNotifiedAt ?? breach.dpcNotifiedAt,
      individualsNotifiedAt:
        args.individualsNotifiedAt ?? breach.individualsNotifiedAt,
      resolutionNotes: args.resolutionNotes ?? breach.resolutionNotes,
      closedAt: args.closedAt ?? breach.closedAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});
