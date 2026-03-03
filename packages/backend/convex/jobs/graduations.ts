/**
 * Player Graduation Scheduled Jobs (Onboarding Phase 7)
 *
 * These internal mutations are called by cron jobs to manage player graduation:
 * - Detect players who have turned 18 and create graduation records
 * - Send 30-day and 7-day pre-birthday notifications to parents and child players
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

// 18 years in milliseconds (accounting for leap years with 365.25)
const EIGHTEEN_YEARS_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Detect players who have turned 18 and create graduation records
 *
 * This job runs daily at 6 AM UTC to:
 * 1. Find players with dateOfBirth <= 18 years ago
 * 2. Check they don't already have userId set (not yet claimed)
 * 3. Check no graduation record exists
 * 4. Create a pending graduation record for guardians to see
 */
export const detectPlayerGraduations = internalMutation({
  args: {},
  returns: v.object({ created: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const eighteenYearsAgo = now - EIGHTEEN_YEARS_MS;

    // Convert to ISO date string for comparison with dateOfBirth field
    const cutoffDate = new Date(eighteenYearsAgo).toISOString().split("T")[0];

    // Get all youth players - we need to filter in memory since dateOfBirth is a string
    // In production, you might want to paginate this
    const allYouthPlayers = await ctx.db
      .query("playerIdentities")
      .withIndex("by_playerType", (q) => q.eq("playerType", "youth"))
      .collect();

    // Filter to players who are 18+ and not yet claimed
    const eligiblePlayers = allYouthPlayers.filter((player) => {
      // Compare ISO date strings (works because YYYY-MM-DD format is lexicographically sortable)
      return (
        player.dateOfBirth <= cutoffDate && // 18 or older
        !player.userId // Not yet claimed
      );
    });

    let created = 0;
    let skipped = 0;

    for (const player of eligiblePlayers) {
      // Check if graduation record already exists
      const existing = await ctx.db
        .query("playerGraduations")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      // Get organization ID from the player's enrollment
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", player._id)
        )
        .first();

      if (!enrollment) {
        // Player has no enrollment, skip
        skipped += 1;
        continue;
      }

      // Calculate when they turned 18
      const dob = new Date(player.dateOfBirth).getTime();
      const turnedEighteenAt = dob + EIGHTEEN_YEARS_MS;

      // Create graduation record
      await ctx.db.insert("playerGraduations", {
        playerIdentityId: player._id,
        organizationId: enrollment.organizationId,
        dateOfBirth: dob,
        turnedEighteenAt,
        status: "pending",
      });

      created += 1;

      // Notify guardians of this player
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      for (const link of guardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian?.userId) {
          continue;
        }

        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: guardian.userId,
            organizationId: enrollment.organizationId,
            type: "age_transition_available",
            title: `${player.firstName} ${player.lastName} Has Turned 18`,
            message: `${player.firstName} is now eligible to claim their own PlayerARC account. Send them an invite from your parent dashboard.`,
            link: `/orgs/${enrollment.organizationId}/parents`,
            targetRole: "parent",
          }
        );
      }
    }

    console.log(
      `[graduations] Created ${created} graduation records, skipped ${skipped}`
    );

    return { created, skipped };
  },
});

/**
 * Send 30-day and 7-day pre-birthday notifications to parents and child players
 *
 * Runs daily at 6 AM UTC. For each youth player who will turn 18 in exactly 30 or 7
 * days, sends an in-app notification to:
 *   - Each parent/guardian linked to the player
 *   - The child themselves (if they have a platform account via userId)
 *
 * Guards against duplicate notifications: checks for an existing notification of the
 * same type for this player in the last 25 days (for 30-day) or last 5 days (for 7-day).
 */
export const detectPreBirthdayNotifications = internalMutation({
  args: {},
  returns: v.object({ sent30Day: v.number(), sent7Day: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    // Target 18th birthday timestamps for each window (±12 hours to catch cron drift)
    const thirtyDaysMs = 30 * DAY_MS;
    const sevenDaysMs = 7 * DAY_MS;
    const windowMs = 12 * 60 * 60 * 1000; // ±12 hours

    // DOB date ranges for players turning 18 in ~30 days
    const dob30Min = new Date(now + thirtyDaysMs - EIGHTEEN_YEARS_MS - windowMs)
      .toISOString()
      .split("T")[0];
    const dob30Max = new Date(now + thirtyDaysMs - EIGHTEEN_YEARS_MS + windowMs)
      .toISOString()
      .split("T")[0];

    // DOB date ranges for players turning 18 in ~7 days
    const dob7Min = new Date(now + sevenDaysMs - EIGHTEEN_YEARS_MS - windowMs)
      .toISOString()
      .split("T")[0];
    const dob7Max = new Date(now + sevenDaysMs - EIGHTEEN_YEARS_MS + windowMs)
      .toISOString()
      .split("T")[0];

    // Dedup thresholds: don't re-send if already sent within these windows
    const dedup30Threshold = now - 25 * DAY_MS;
    const dedup7Threshold = now - 5 * DAY_MS;

    // Get all youth players
    const allYouthPlayers = await ctx.db
      .query("playerIdentities")
      .withIndex("by_playerType", (q) => q.eq("playerType", "youth"))
      .collect();

    // Split into 30-day and 7-day candidates using JS array filter (not Convex .filter())
    const candidates30 = allYouthPlayers.filter(
      (p) => p.dateOfBirth >= dob30Min && p.dateOfBirth <= dob30Max
    );
    const candidates7 = allYouthPlayers.filter(
      (p) => p.dateOfBirth >= dob7Min && p.dateOfBirth <= dob7Max
    );

    let sent30Day = 0;
    let sent7Day = 0;

    // Helper: check if a notification of a given type was already sent for this player
    // recently (to prevent duplicate notifications)
    const alreadySent = async (
      organizationId: string,
      playerId: string,
      type: "age_transition_30_days" | "age_transition_7_days",
      threshold: number
    ): Promise<boolean> => {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", organizationId).eq("type", type)
        )
        .order("desc")
        .collect();

      return existing.some(
        (n) => n.relatedPlayerId === playerId && n.createdAt > threshold
      );
    };

    // Helper: send notifications to parent(s) and child for a player
    const sendBirthdayNotifications = async (
      player: (typeof allYouthPlayers)[number],
      daysUntil: 30 | 7,
      type: "age_transition_30_days" | "age_transition_7_days",
      dedupThreshold: number
    ): Promise<number> => {
      // Get enrollment for org context
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", player._id)
        )
        .first();

      if (!enrollment) {
        return 0;
      }

      const orgId = enrollment.organizationId;

      // Dedup check — if already sent this notification recently, skip
      const duplicate = await alreadySent(
        orgId,
        player._id,
        type,
        dedupThreshold
      );
      if (duplicate) {
        return 0;
      }

      const playerName = `${player.firstName} ${player.lastName}`;
      let notificationsSent = 0;

      // Notify each guardian/parent linked to this player
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      for (const link of guardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian?.userId) {
          continue;
        }

        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: guardian.userId,
            organizationId: orgId,
            type,
            title: `${playerName}'s 18th Birthday in ${daysUntil} Days`,
            message: `In ${daysUntil} days, ${playerName} will turn 18 and gain full control of their account. After that, they'll need to grant you continued access if you'd like to keep viewing their data.`,
            link: `/orgs/${orgId}/parents`,
            targetRole: "parent",
            relatedPlayerId: player._id,
          }
        );
        notificationsSent += 1;
      }

      // Notify the child themselves if they have a platform account
      if (player.userId) {
        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: player.userId,
            organizationId: orgId,
            type,
            title: `Your 18th Birthday in ${daysUntil} Days`,
            message: `In ${daysUntil} days, you'll turn 18 and take full control of your sports account at your club. Get ready!`,
            link: `/orgs/${orgId}/player`,
            targetRole: "player",
            relatedPlayerId: player._id,
          }
        );
        notificationsSent += 1;
      }

      return notificationsSent;
    };

    // Process 30-day notifications
    for (const player of candidates30) {
      const count = await sendBirthdayNotifications(
        player,
        30,
        "age_transition_30_days",
        dedup30Threshold
      );
      if (count > 0) {
        sent30Day += 1;
      }
    }

    // Process 7-day notifications
    for (const player of candidates7) {
      const count = await sendBirthdayNotifications(
        player,
        7,
        "age_transition_7_days",
        dedup7Threshold
      );
      if (count > 0) {
        sent7Day += 1;
      }
    }

    console.log(
      `[graduations] Pre-birthday notifications: ${sent30Day} players notified at 30 days, ${sent7Day} players notified at 7 days`
    );

    return { sent30Day, sent7Day };
  },
});
