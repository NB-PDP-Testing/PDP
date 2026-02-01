import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// ============================================================
// INJURY NOTIFICATION HELPERS
// Phase 1 - Issue #261
//
// These helpers determine who to notify when injuries are
// reported or updated, and create the appropriate notifications.
// ============================================================

type InjurySeverity = "minor" | "moderate" | "severe" | "long_term";
type InjuryStatus = "active" | "recovering" | "cleared" | "healed";
type ReportedByRole = "guardian" | "player" | "coach" | "admin";

/**
 * Get all guardians (parents) linked to a player who should be notified
 * Returns user IDs of guardians who have accepted the link
 */
export async function getGuardianUserIdsForPlayer(
  ctx: MutationCtx,
  playerIdentityId: Id<"playerIdentities">
): Promise<string[]> {
  // Get all guardian-player links for this player
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
    .collect();

  const userIds: string[] = [];

  // Batch fetch all guardian identities
  const guardianIds = links.map((link) => link.guardianIdentityId);
  const guardians = await Promise.all(guardianIds.map((id) => ctx.db.get(id)));

  // Create a map for O(1) lookup
  const guardianMap = new Map<string, (typeof guardians)[0]>();
  for (const guardian of guardians) {
    if (guardian) {
      guardianMap.set(guardian._id, guardian);
    }
  }

  for (const link of links) {
    // Only include guardians who have accepted the link (acknowledged)
    // and have a linked user account
    if (link.declinedByUserId) {
      continue; // Skip declined links
    }

    const guardian = guardianMap.get(link.guardianIdentityId);
    if (guardian?.userId) {
      userIds.push(guardian.userId);
    }
  }

  return userIds;
}

/**
 * Get all coaches assigned to teams that a player belongs to
 * Returns user IDs of coaches in the specified organization
 */
export async function getCoachUserIdsForPlayer(
  ctx: MutationCtx,
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
): Promise<string[]> {
  // 1. Get player's team assignments
  const teamAssignments = await ctx.db
    .query("teamPlayerIdentities")
    .withIndex("by_playerIdentityId", (q) =>
      q.eq("playerIdentityId", playerIdentityId)
    )
    .collect();

  // Filter to only active assignments in this org
  const activeTeamIds = teamAssignments
    .filter((t) => t.status === "active" && t.organizationId === organizationId)
    .map((t) => t.teamId);

  if (activeTeamIds.length === 0) {
    return [];
  }

  // 2. Get all coach assignments in this org
  const coachAssignments = await ctx.db
    .query("coachAssignments")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId)
    )
    .collect();

  // 3. Find coaches assigned to any of the player's teams
  const coachUserIds = new Set<string>();

  for (const assignment of coachAssignments) {
    // Check if this coach is assigned to any of the player's teams
    const hasMatchingTeam = assignment.teams.some((teamId) =>
      activeTeamIds.includes(teamId)
    );

    if (hasMatchingTeam) {
      coachUserIds.add(assignment.userId);
    }
  }

  return Array.from(coachUserIds);
}

/**
 * Get admin user IDs for an organization
 * Returns user IDs of members with admin or owner role
 * Calls internal query in members.ts which has access to Better Auth components
 */
export async function getAdminUserIdsForOrg(
  ctx: MutationCtx,
  organizationId: string
): Promise<string[]> {
  // Call internal query that has access to Better Auth adapter
  const adminIds = await ctx.runQuery(
    internal.models.members.getAdminUserIdsForOrg,
    { organizationId }
  );

  console.log("[getAdminUserIdsForOrg] Admin IDs found:", adminIds.length);

  return adminIds;
}

/**
 * Notify relevant parties when a new injury is reported
 *
 * Who gets notified depends on who reported:
 * - Coach reports → Parents get notified
 * - Parent reports → Coaches get notified
 * - Severe injury → Admins also get notified
 */
export async function notifyInjuryReported(
  ctx: MutationCtx,
  args: {
    injuryId: Id<"playerInjuries">;
    playerIdentityId: Id<"playerIdentities">;
    organizationId: string;
    reportedByUserId: string | undefined;
    reportedByRole: ReportedByRole | undefined;
    severity: InjurySeverity;
    playerName: string;
    bodyPart: string;
    injuryType: string;
  }
): Promise<void> {
  const {
    injuryId,
    playerIdentityId,
    organizationId,
    reportedByUserId,
    reportedByRole,
    severity,
    playerName,
    bodyPart,
    injuryType,
  } = args;

  const recipientUserIds: string[] = [];

  console.log("[notifyInjuryReported] Starting notification process:", {
    injuryId,
    playerIdentityId,
    organizationId,
    reportedByUserId,
    reportedByRole,
    severity,
    playerName,
  });

  // Determine who to notify based on who reported
  if (reportedByRole === "guardian" || reportedByRole === "player") {
    // Parent/player reported → notify coaches
    const coachIds = await getCoachUserIdsForPlayer(
      ctx,
      playerIdentityId,
      organizationId
    );
    console.log("[notifyInjuryReported] Coach IDs to notify:", coachIds);
    recipientUserIds.push(...coachIds);
  } else {
    // Coach/admin reported → notify parents
    const guardianIds = await getGuardianUserIdsForPlayer(
      ctx,
      playerIdentityId
    );
    console.log("[notifyInjuryReported] Guardian IDs to notify:", guardianIds);
    recipientUserIds.push(...guardianIds);
  }

  // For severe injuries, also notify admins
  if (severity === "severe" || severity === "long_term") {
    const adminIds = await getAdminUserIdsForOrg(ctx, organizationId);
    console.log(
      "[notifyInjuryReported] Admin IDs to notify (severe):",
      adminIds
    );
    recipientUserIds.push(...adminIds);
  }

  // Remove the reporter from the recipient list (don't notify yourself)
  const filteredRecipients = recipientUserIds.filter(
    (id) => id !== reportedByUserId
  );

  // Remove duplicates
  const uniqueRecipients = [...new Set(filteredRecipients)];

  console.log("[notifyInjuryReported] Final recipients:", {
    allRecipients: recipientUserIds,
    filteredRecipients,
    uniqueRecipients,
    reportedByUserId,
  });

  // Create notifications for each recipient
  const notificationType =
    severity === "severe" || severity === "long_term"
      ? "severe_injury_alert"
      : "injury_reported";

  const title =
    notificationType === "severe_injury_alert"
      ? "Severe Injury Reported"
      : "Injury Reported";

  const message = `${playerName} - ${bodyPart} ${injuryType.toLowerCase()}`;

  // Create notifications in parallel (no link - informational only for now)
  await Promise.all(
    uniqueRecipients.map((userId) =>
      ctx.runMutation(internal.models.notifications.createNotification, {
        userId,
        organizationId,
        type: notificationType,
        title,
        message,
        relatedInjuryId: injuryId,
        relatedPlayerId: playerIdentityId,
      })
    )
  );

  console.log(
    `[notifyInjuryReported] Created ${uniqueRecipients.length} notifications for injury ${injuryId}`
  );
}

/**
 * Notify relevant parties when an injury status changes
 *
 * Notifies both coaches and parents when:
 * - Status changes to "cleared" (player can return)
 * - Status changes to "healed" (fully recovered)
 */
export async function notifyStatusChanged(
  ctx: MutationCtx,
  args: {
    injuryId: Id<"playerInjuries">;
    playerIdentityId: Id<"playerIdentities">;
    organizationId: string;
    updatedByUserId: string | undefined;
    newStatus: InjuryStatus;
    playerName: string;
    bodyPart: string;
  }
): Promise<void> {
  const {
    injuryId,
    playerIdentityId,
    organizationId,
    updatedByUserId,
    newStatus,
    playerName,
    bodyPart,
  } = args;

  // Only send notifications for significant status changes
  if (newStatus !== "cleared" && newStatus !== "healed") {
    // Don't notify for active → recovering (too noisy)
    return;
  }

  // Get all stakeholders (both coaches and parents)
  const [guardianIds, coachIds] = await Promise.all([
    getGuardianUserIdsForPlayer(ctx, playerIdentityId),
    getCoachUserIdsForPlayer(ctx, playerIdentityId, organizationId),
  ]);

  const allRecipients = [...guardianIds, ...coachIds];

  // Remove the updater from the recipient list
  const filteredRecipients = allRecipients.filter(
    (id) => id !== updatedByUserId
  );

  // Remove duplicates
  const uniqueRecipients = [...new Set(filteredRecipients)];

  // Determine notification content
  const notificationType =
    newStatus === "cleared" ? "injury_cleared" : "injury_status_changed";

  const title =
    newStatus === "cleared"
      ? "Player Cleared to Return"
      : "Injury Fully Healed";

  const message =
    newStatus === "cleared"
      ? `${playerName} has been cleared to return to play (${bodyPart})`
      : `${playerName}'s ${bodyPart} injury has fully healed`;

  // Create notifications in parallel (no link - informational only for now)
  await Promise.all(
    uniqueRecipients.map((userId) =>
      ctx.runMutation(internal.models.notifications.createNotification, {
        userId,
        organizationId,
        type: notificationType,
        title,
        message,
        relatedInjuryId: injuryId,
        relatedPlayerId: playerIdentityId,
      })
    )
  );

  console.log(
    `[notifyStatusChanged] Created ${uniqueRecipients.length} notifications for status change to ${newStatus}`
  );
}
