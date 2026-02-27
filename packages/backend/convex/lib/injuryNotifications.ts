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

  return adminIds;
}

/**
 * Notify relevant parties when a new injury is reported
 *
 * Who gets notified depends on who reported:
 * - Coach reports → Parents get notified
 * - Parent reports → Coaches get notified
 * - Severe injury → Admins also get notified
 *
 * targetRole is set per-recipient so role-scoped notification
 * filtering works correctly for multi-role users.
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

  const notificationType =
    severity === "severe" || severity === "long_term"
      ? "severe_injury_alert"
      : "injury_reported";

  const title =
    notificationType === "severe_injury_alert"
      ? "Severe Injury Reported"
      : "Injury Reported";

  const message = `${playerName} - ${bodyPart} ${injuryType.toLowerCase()}`;

  const baseFields = {
    organizationId,
    type: notificationType as "severe_injury_alert" | "injury_reported",
    title,
    message,
    relatedInjuryId: injuryId,
    relatedPlayerId: playerIdentityId,
    createdAt: Date.now(),
  };

  // Determine primary recipients based on who reported
  const primaryTargetRole: "coach" | "parent" =
    reportedByRole === "guardian" || reportedByRole === "player"
      ? "coach"
      : "parent";

  let primaryRecipients: string[];
  if (reportedByRole === "guardian" || reportedByRole === "player") {
    primaryRecipients = await getCoachUserIdsForPlayer(
      ctx,
      playerIdentityId,
      organizationId
    );
  } else {
    primaryRecipients = await getGuardianUserIdsForPlayer(
      ctx,
      playerIdentityId
    );
  }

  // Notify primary recipients (coaches or parents) with appropriate targetRole
  const filteredPrimary = [
    ...new Set(primaryRecipients.filter((id) => id !== reportedByUserId)),
  ];
  for (const userId of filteredPrimary) {
    await ctx.db.insert("notifications", {
      ...baseFields,
      userId,
      targetRole: primaryTargetRole,
    });
  }

  // For severe injuries, also notify admins with admin targetRole
  if (severity === "severe" || severity === "long_term") {
    const adminIds = await getAdminUserIdsForOrg(ctx, organizationId);
    const filteredAdmins = [
      ...new Set(adminIds.filter((id) => id !== reportedByUserId)),
    ];
    for (const userId of filteredAdmins) {
      await ctx.db.insert("notifications", {
        ...baseFields,
        userId,
        targetRole: "admin",
      });
    }
  }

  console.log("[notifyInjuryReported] Created notifications for injury");
}

/**
 * Notify relevant parties when an injury status changes
 *
 * Notifies both coaches and parents when:
 * - Status changes to "cleared" (player can return)
 * - Status changes to "healed" (fully recovered)
 *
 * targetRole is set per-recipient type so multi-role users see
 * notifications only in the appropriate role context.
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

  const baseFields = {
    organizationId,
    type: notificationType as "injury_cleared" | "injury_status_changed",
    title,
    message,
    relatedInjuryId: injuryId,
    relatedPlayerId: playerIdentityId,
    createdAt: Date.now(),
  };

  // Notify coaches with coach targetRole
  const filteredCoaches = [
    ...new Set(coachIds.filter((id) => id !== updatedByUserId)),
  ];
  for (const userId of filteredCoaches) {
    await ctx.db.insert("notifications", {
      ...baseFields,
      userId,
      targetRole: "coach",
    });
  }

  // Notify guardians/parents with parent targetRole
  const filteredGuardians = [
    ...new Set(guardianIds.filter((id) => id !== updatedByUserId)),
  ];
  for (const userId of filteredGuardians) {
    await ctx.db.insert("notifications", {
      ...baseFields,
      userId,
      targetRole: "parent",
    });
  }

  console.log(
    `[notifyStatusChanged] Created notifications for status change to ${newStatus}`
  );
}

/**
 * Notify relevant parties when a recovery milestone is completed
 *
 * - If parent completes → notify coaches (targetRole='coach')
 * - If coach completes → notify parents (targetRole='parent')
 */
export async function notifyMilestoneCompleted(
  ctx: MutationCtx,
  args: {
    injuryId: Id<"playerInjuries">;
    playerIdentityId: Id<"playerIdentities">;
    organizationId: string;
    completedByUserId: string;
    completedByRole: ReportedByRole;
    playerName: string;
    milestoneDescription: string;
  }
): Promise<void> {
  const {
    injuryId,
    playerIdentityId,
    organizationId,
    completedByUserId,
    completedByRole,
    playerName,
    milestoneDescription,
  } = args;

  // Determine who to notify and their targetRole
  const recipientTargetRole: "coach" | "parent" =
    completedByRole === "guardian" || completedByRole === "player"
      ? "coach"
      : "parent";

  let recipientIds: string[];
  if (completedByRole === "guardian" || completedByRole === "player") {
    // Parent completed → notify coaches
    recipientIds = await getCoachUserIdsForPlayer(
      ctx,
      playerIdentityId,
      organizationId
    );
  } else {
    // Coach/admin completed → notify parents
    recipientIds = await getGuardianUserIdsForPlayer(ctx, playerIdentityId);
  }

  const filteredRecipients = [
    ...new Set(recipientIds.filter((id) => id !== completedByUserId)),
  ];

  const title = "Recovery Milestone Completed";
  const message = `${playerName} - ${milestoneDescription}`;

  // Create notifications via direct db.insert (avoids ctx.runMutation overhead)
  for (const userId of filteredRecipients) {
    await ctx.db.insert("notifications", {
      userId,
      organizationId,
      type: "milestone_completed",
      title,
      message,
      relatedInjuryId: injuryId,
      relatedPlayerId: playerIdentityId,
      targetRole: recipientTargetRole,
      createdAt: Date.now(),
    });
  }

  console.log(
    `[notifyMilestoneCompleted] Created ${filteredRecipients.length} notifications for milestone completion`
  );
}

/**
 * Notify coaches and parents when medical clearance is received
 *
 * targetRole is set per-recipient type so multi-role users see
 * notifications only in the appropriate role context.
 */
export async function notifyMedicalClearance(
  ctx: MutationCtx,
  args: {
    injuryId: Id<"playerInjuries">;
    playerIdentityId: Id<"playerIdentities">;
    organizationId: string;
    submittedByUserId: string;
    playerName: string;
    bodyPart: string;
  }
): Promise<void> {
  const {
    injuryId,
    playerIdentityId,
    organizationId,
    submittedByUserId,
    playerName,
    bodyPart,
  } = args;

  console.log("[notifyMedicalClearance] Starting notification process");

  // Get coaches and guardians separately to set correct targetRole per recipient
  const [coachIds, guardianIds] = await Promise.all([
    getCoachUserIdsForPlayer(ctx, playerIdentityId, organizationId),
    getGuardianUserIdsForPlayer(ctx, playerIdentityId),
  ]);

  const title = "Medical Clearance Received";
  const message = `${playerName} - medical clearance received for ${bodyPart} injury`;

  const baseFields = {
    organizationId,
    type: "clearance_received" as const,
    title,
    message,
    relatedInjuryId: injuryId,
    relatedPlayerId: playerIdentityId,
    createdAt: Date.now(),
  };

  // Notify coaches with coach targetRole
  const filteredCoaches = [
    ...new Set(coachIds.filter((id) => id !== submittedByUserId)),
  ];
  for (const userId of filteredCoaches) {
    await ctx.db.insert("notifications", {
      ...baseFields,
      userId,
      targetRole: "coach",
    });
  }

  // Notify guardians/parents with parent targetRole
  const filteredGuardians = [
    ...new Set(guardianIds.filter((id) => id !== submittedByUserId)),
  ];
  for (const userId of filteredGuardians) {
    await ctx.db.insert("notifications", {
      ...baseFields,
      userId,
      targetRole: "parent",
    });
  }

  console.log(
    "[notifyMedicalClearance] Created notifications for medical clearance"
  );
}
