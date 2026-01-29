/**
 * Invitation Lifecycle Scheduled Jobs (Phase 6)
 *
 * These internal mutations are called by cron jobs to manage invitation lifecycle:
 * - Mark expired invitations
 * - Auto re-invite for enabled organizations
 * - Send admin alerts
 * - Archive old expired invitations
 * - Cleanup old archived invitations
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Mark expired invitations (runs hourly)
 *
 * Finds all pending invitations past their expiration date and marks them as expired.
 */
export const markExpiredInvitations = internalMutation({
  args: {},
  returns: v.object({ markedCount: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    // Query pending invitations
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000, // Process up to 1000 at a time
        },
        where: [
          {
            field: "status",
            value: "pending",
            operator: "eq",
          },
        ],
      }
    );

    // Filter for expired ones
    const expiredInvitations = invitationsResult.page.filter(
      (inv: { expiresAt: number }) => inv.expiresAt < now
    );

    // Update each to expired status
    let markedCount = 0;
    for (const inv of expiredInvitations) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "invitation",
          where: [{ field: "_id", value: inv._id, operator: "eq" }],
          update: { status: "expired" },
        },
      });
      markedCount += 1;
    }

    console.log(
      `[markExpiredInvitations] Marked ${markedCount} invitations as expired`
    );

    return { markedCount };
  },
});

/**
 * Process auto re-invites for enabled organizations (runs hourly)
 *
 * For organizations with autoReInviteOnExpiration enabled,
 * automatically resends expired invitations up to the max limit.
 */
export const processAutoReInvites = internalMutation({
  args: {},
  returns: v.object({ reInvitedCount: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    // Get organizations with auto re-invite enabled
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: {
          cursor: null,
          numItems: 500,
        },
        where: [],
      }
    );

    const enabledOrgs = orgsResult.page.filter(
      (org: { autoReInviteOnExpiration?: boolean }) =>
        org.autoReInviteOnExpiration === true
    );

    let reInvitedCount = 0;

    for (const org of enabledOrgs) {
      const maxReInvites =
        (org as { maxAutoReInvitesPerInvitation?: number })
          .maxAutoReInvitesPerInvitation ?? 2;
      const expirationDays =
        (org as { invitationExpirationDays?: number })
          .invitationExpirationDays ?? 7;

      // Get expired invitations for this org that can be re-invited
      const invitationsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "invitation",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
          where: [
            {
              field: "organizationId",
              value: (org as { _id: string })._id,
              operator: "eq",
            },
            {
              field: "status",
              value: "expired",
              operator: "eq",
              connector: "AND",
            },
          ],
        }
      );

      const eligibleInvitations = invitationsResult.page.filter(
        (inv: { autoReInviteCount?: number }) =>
          (inv.autoReInviteCount ?? 0) < maxReInvites
      );

      for (const inv of eligibleInvitations) {
        // Calculate new expiration date
        const newExpiresAt = now + expirationDays * 24 * 60 * 60 * 1000;
        const currentReInviteCount =
          (inv as { autoReInviteCount?: number }).autoReInviteCount ?? 0;

        // Update invitation: reset to pending, update expiry, increment count
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "invitation",
            where: [{ field: "_id", value: inv._id, operator: "eq" }],
            update: {
              status: "pending",
              expiresAt: newExpiresAt,
              autoReInviteCount: currentReInviteCount + 1,
            },
          },
        });

        reInvitedCount += 1;

        // TODO: Send notification email about re-invite
      }
    }

    console.log(
      `[processAutoReInvites] Re-invited ${reInvitedCount} invitations`
    );

    return { reInvitedCount };
  },
});

/**
 * Send admin alerts for expired invitations (runs daily)
 *
 * Notifies organization admins about invitations that have expired
 * and are awaiting action.
 */
export const sendAdminExpirationAlerts = internalMutation({
  args: {},
  returns: v.object({ alertsSent: v.number() }),
  handler: async (ctx) => {
    // Get organizations with notifyAdminsOnInvitationRequest enabled
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: {
          cursor: null,
          numItems: 500,
        },
        where: [],
      }
    );

    const enabledOrgs = orgsResult.page.filter(
      (org: { notifyAdminsOnInvitationRequest?: boolean }) =>
        org.notifyAdminsOnInvitationRequest !== false // Default to true
    );

    let alertsSent = 0;

    for (const org of enabledOrgs) {
      // Get recently expired invitations (last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      const expiredResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "invitation",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
          where: [
            {
              field: "organizationId",
              value: (org as { _id: string })._id,
              operator: "eq",
            },
            {
              field: "status",
              value: "expired",
              operator: "eq",
              connector: "AND",
            },
          ],
        }
      );

      // Filter for recently expired
      const recentlyExpired = expiredResult.page.filter(
        (inv: { expiresAt: number }) =>
          inv.expiresAt > oneDayAgo && inv.expiresAt < Date.now()
      );

      if (recentlyExpired.length > 0) {
        // TODO: Send email notification to admin
        // For now, just log
        console.log(
          `[sendAdminExpirationAlerts] Org ${(org as { name?: string }).name}: ${recentlyExpired.length} invitations expired`
        );
        alertsSent += 1;
      }
    }

    console.log(`[sendAdminExpirationAlerts] Sent ${alertsSent} admin alerts`);

    return { alertsSent };
  },
});

/**
 * Archive old expired invitations (runs daily)
 *
 * Moves invitations that have been expired for more than 30 days
 * to the archivedInvitations table.
 */
export const archiveOldInvitations = internalMutation({
  args: {},
  returns: v.object({ archivedCount: v.number() }),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Get expired invitations
    const expiredResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "status",
            value: "expired",
            operator: "eq",
          },
        ],
      }
    );

    // Filter for ones expired more than 30 days ago
    const oldExpired = expiredResult.page.filter(
      (inv: { expiresAt: number }) => inv.expiresAt < thirtyDaysAgo
    );

    let archivedCount = 0;

    for (const inv of oldExpired) {
      const typedInv = inv as {
        _id: string;
        _creationTime: number;
        organizationId: string;
        email: string;
        role?: string;
        metadata?: unknown;
        expiresAt: number;
      };

      // Create archive record
      await ctx.db.insert("archivedInvitations", {
        originalInvitationId: typedInv._id,
        organizationId: typedInv.organizationId,
        email: typedInv.email,
        role: typedInv.role ?? "member",
        metadata: typedInv.metadata,
        createdAt: typedInv._creationTime,
        expiredAt: typedInv.expiresAt,
        archivedAt: now,
        archivedReason: "expired_30_days",
      });

      // Delete original invitation
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "invitation",
          where: [{ field: "_id", value: typedInv._id, operator: "eq" }],
        },
      });

      archivedCount += 1;
    }

    console.log(
      `[archiveOldInvitations] Archived ${archivedCount} old invitations`
    );

    return { archivedCount };
  },
});

/**
 * Cleanup old archived invitations (runs weekly)
 *
 * Deletes archived invitations older than 90 days.
 */
export const cleanupArchivedInvitations = internalMutation({
  args: {},
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    // Get old archived invitations
    const oldArchives = await ctx.db
      .query("archivedInvitations")
      .withIndex("by_archived_at")
      .filter((q) => q.lt(q.field("archivedAt"), ninetyDaysAgo))
      .collect();

    let deletedCount = 0;

    for (const archive of oldArchives) {
      await ctx.db.delete(archive._id);
      deletedCount += 1;
    }

    console.log(
      `[cleanupArchivedInvitations] Deleted ${deletedCount} old archives`
    );

    return { deletedCount };
  },
});
