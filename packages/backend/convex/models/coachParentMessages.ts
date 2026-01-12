import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
// Auth component will be imported when we add queries/mutations

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get coach assignment for a user in an organization
 * Returns the coach assignment record if found, null otherwise
 * @internal - Helper function for use within this module
 */
export async function getCoachAssignmentForOrg(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string
) {
  const assignment = await ctx.db
    .query("coachAssignments")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", orgId)
    )
    .first();

  return assignment || null;
}

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
    .withIndex("by_playerIdentityId", (q) =>
      q.eq("playerIdentityId", playerIdentityId)
    )
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

/**
 * Log an audit event for message activity
 * Creates an entry in the messageAuditLog table
 * @internal - Helper function for use within this module
 */
export async function logAuditEvent(
  ctx: MutationCtx,
  data: {
    messageId: Id<"coachParentMessages">;
    organizationId: string;
    action:
      | "created"
      | "edited"
      | "sent"
      | "viewed"
      | "acknowledged"
      | "deleted"
      | "exported"
      | "flagged"
      | "reviewed";
    actorId: string;
    actorType: "coach" | "parent" | "admin" | "system";
    actorName: string;
    details?: {
      previousContent?: string;
      newContent?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    };
  }
) {
  await ctx.db.insert("messageAuditLog", {
    messageId: data.messageId,
    organizationId: data.organizationId,
    action: data.action,
    actorId: data.actorId,
    actorType: data.actorType,
    actorName: data.actorName,
    details: data.details,
    timestamp: Date.now(),
  });
}

// ============================================================
// QUERIES
// ============================================================

// Queries will be added in subsequent stories

// ============================================================
// MUTATIONS
// ============================================================

// Mutations will be added in subsequent stories
