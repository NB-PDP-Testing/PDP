/**
 * Retention Enforcement Scheduled Jobs (Phase 9 — US-P9-006)
 *
 * GDPR Article 5(1)(e) Storage Limitation — automated enforcement.
 *
 * Two cron entry points:
 *  - enforceRetentionPolicy: Nightly at 02:00 UTC. Soft-delete + hard-delete pipeline.
 *  - sendWeeklyRetentionDigest: Every Monday at 08:00 UTC. Summary log for admins.
 *
 * EXEMPT TABLES (never processed here):
 *  - erasureRequests (Article 5(2) accountability record)
 *  - parentChildAuthorizationLogs (Children First Act 2015 — 7-year safeguarding retention)
 *
 * Soft-delete → hard-delete pipeline:
 *  Phase 1: retentionExpiresAt < now AND retentionExpired !== true → set retentionExpired=true
 *  Phase 2: retentionExpired === true AND retentionExpiredAt < now - 30 days → ctx.db.delete()
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const BATCH_SIZE = 200;
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// ============================================================
// PHASE 1: SOFT-DELETE (flag expired records)
// ============================================================

/**
 * Soft-delete daily wellness check records whose retention period has expired.
 * Returns the number of records soft-deleted this run.
 */
export const softDeleteExpiredWellnessRecords = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    let softDeletedCount = 0;

    // Find records where retentionExpiresAt has passed but not yet soft-deleted.
    // We collect all records and filter in memory — Convex does not support
    // querying for undefined-valued index fields without a type cast, so a full
    // collect + filter is the cleanest approach. For large tables a dedicated
    // by_org_and_retentionExpiresAt index would be a future optimisation.
    const candidates = await ctx.db.query("dailyPlayerHealthChecks").collect();

    const expired = candidates.filter(
      (r) =>
        r.retentionExpiresAt !== undefined &&
        r.retentionExpiresAt < now &&
        !r.retentionExpired
    );

    const batch = expired.slice(0, BATCH_SIZE);

    for (const record of batch) {
      await ctx.db.patch(record._id, {
        retentionExpired: true,
        retentionExpiredAt: now,
      });
      softDeletedCount += 1;
    }

    return softDeletedCount;
  },
});

// ============================================================
// PHASE 2: HARD-DELETE (permanent removal after 30-day grace)
// ============================================================

/**
 * Hard-delete wellness records that were soft-deleted more than 30 days ago.
 * Returns the number of records permanently deleted this run.
 */
export const hardDeleteGracePeriodExpiredWellnessRecords = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const graceCutoff = now - GRACE_PERIOD_MS;
    let hardDeletedCount = 0;

    // Find records soft-deleted more than 30 days ago
    const candidates = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_retention_expired", (q) => q.eq("retentionExpired", true))
      .collect();

    const toDelete = candidates
      .filter(
        (r) =>
          r.retentionExpiredAt !== undefined &&
          r.retentionExpiredAt < graceCutoff
      )
      .slice(0, BATCH_SIZE);

    for (const record of toDelete) {
      await ctx.db.delete(record._id);
      hardDeletedCount += 1;
    }

    return hardDeletedCount;
  },
});

/**
 * Hard-delete expired whatsappWellnessSessions.
 * Sessions have a natural `expiresAt` field (set at 8h after creation).
 * We delete sessions that expired more than 30 days ago to comply with
 * GDPR Article 5 and the configured communicationDays retention period.
 * Returns the number of sessions deleted.
 */
export const hardDeleteExpiredWellnessSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const graceCutoff = Date.now() - GRACE_PERIOD_MS;
    let deletedCount = 0;

    // Sessions naturally expire after 8 hours. We delete after 30-day grace.
    // There's no org-by-org index, so we scan all abandoned/expired sessions.
    const sessions = await ctx.db
      .query("whatsappWellnessSessions")
      .withIndex("by_player_and_date", (q) =>
        q.gte("playerIdentityId", "" as never)
      )
      .collect();

    const toDelete = sessions
      .filter((s) => s.expiresAt < graceCutoff)
      .slice(0, BATCH_SIZE);

    for (const session of toDelete) {
      await ctx.db.delete(session._id);
      deletedCount += 1;
    }

    return deletedCount;
  },
});

// ============================================================
// CRON ENTRY POINT: NIGHTLY ENFORCEMENT
// ============================================================

/**
 * Nightly retention enforcement (02:00 UTC).
 * Runs both soft-delete and hard-delete phases, then logs a summary.
 */
export const enforceRetentionPolicy = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const errors: string[] = [];
    let softDeletedCount = 0;
    let hardDeletedCount = 0;
    const tablesProcessed: string[] = [];

    // Phase 1: Soft-delete expired wellness records
    try {
      const count = await ctx.db
        .query("dailyPlayerHealthChecks")
        .collect()
        .then(async (candidates) => {
          const graceCutoff = now;
          const expired = candidates
            .filter(
              (r) =>
                r.retentionExpiresAt !== undefined &&
                r.retentionExpiresAt < graceCutoff &&
                !r.retentionExpired
            )
            .slice(0, BATCH_SIZE);

          for (const record of expired) {
            await ctx.db.patch(record._id, {
              retentionExpired: true,
              retentionExpiredAt: now,
            });
          }
          return expired.length;
        });

      softDeletedCount += count;
      if (count > 0) {
        tablesProcessed.push("dailyPlayerHealthChecks:soft_delete");
      }
    } catch (err) {
      errors.push(
        `dailyPlayerHealthChecks soft-delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Phase 2: Hard-delete wellness records past grace period
    try {
      const graceCutoff = now - GRACE_PERIOD_MS;
      const count = await ctx.db
        .query("dailyPlayerHealthChecks")
        .withIndex("by_retention_expired", (q) =>
          q.eq("retentionExpired", true)
        )
        .collect()
        .then(async (candidates) => {
          const toDelete = candidates
            .filter(
              (r) =>
                r.retentionExpiredAt !== undefined &&
                r.retentionExpiredAt < graceCutoff
            )
            .slice(0, BATCH_SIZE);

          for (const record of toDelete) {
            await ctx.db.delete(record._id);
          }
          return toDelete.length;
        });

      hardDeletedCount += count;
      if (count > 0) {
        tablesProcessed.push("dailyPlayerHealthChecks:hard_delete");
      }
    } catch (err) {
      errors.push(
        `dailyPlayerHealthChecks hard-delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Phase 2b: Hard-delete expired whatsapp wellness sessions (natural expiry + grace)
    try {
      const graceCutoff = now - GRACE_PERIOD_MS;
      const sessions = await ctx.db
        .query("whatsappWellnessSessions")
        .withIndex("by_org_and_date", (q) => q.gte("organizationId", ""))
        .collect();

      const toDelete = sessions
        .filter((s) => s.expiresAt < graceCutoff)
        .slice(0, BATCH_SIZE);

      for (const session of toDelete) {
        await ctx.db.delete(session._id);
      }

      hardDeletedCount += toDelete.length;
      if (toDelete.length > 0) {
        tablesProcessed.push("whatsappWellnessSessions:hard_delete");
      }
    } catch (err) {
      errors.push(
        `whatsappWellnessSessions hard-delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Log the run
    await ctx.db.insert("retentionCronLogs", {
      runAt: now,
      softDeletedCount,
      hardDeletedCount,
      tablesProcessed,
      errors: errors.length > 0 ? errors : undefined,
    });

    if (errors.length > 0) {
      console.error(
        `[RetentionEnforcement] Run at ${new Date(now).toISOString()} completed with errors:`,
        errors
      );
    } else {
      console.log(
        `[RetentionEnforcement] Run at ${new Date(now).toISOString()}: soft-deleted=${softDeletedCount}, hard-deleted=${hardDeletedCount}`
      );
    }

    return null;
  },
});

// ============================================================
// WEEKLY DIGEST QUERY
// ============================================================

/**
 * Query retention cron logs for the past 7 days.
 * Used by the weekly digest job to summarise enforcement activity.
 */
export const getWeeklyRetentionSummary = internalQuery({
  args: {},
  returns: v.object({
    totalSoftDeleted: v.number(),
    totalHardDeleted: v.number(),
    runCount: v.number(),
    errorCount: v.number(),
  }),
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("retentionCronLogs")
      .withIndex("by_runAt", (q) => q.gte("runAt", sevenDaysAgo))
      .collect();

    return {
      totalSoftDeleted: logs.reduce((sum, l) => sum + l.softDeletedCount, 0),
      totalHardDeleted: logs.reduce((sum, l) => sum + l.hardDeletedCount, 0),
      runCount: logs.length,
      errorCount: logs.filter((l) => l.errors && l.errors.length > 0).length,
    };
  },
});

// ============================================================
// CRON ENTRY POINT: WEEKLY DIGEST
// ============================================================

/**
 * Weekly retention digest (every Monday at 08:00 UTC).
 * Summarises the past 7 days of enforcement activity to the console.
 * In-app notification delivery requires org-level admin lookup and
 * is marked as a future enhancement — see PRODUCT-GAPS.md.
 */
export const sendWeeklyRetentionDigest = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("retentionCronLogs")
      .withIndex("by_runAt", (q) => q.gte("runAt", sevenDaysAgo))
      .collect();

    const totalSoftDeleted = logs.reduce(
      (sum, l) => sum + l.softDeletedCount,
      0
    );
    const totalHardDeleted = logs.reduce(
      (sum, l) => sum + l.hardDeletedCount,
      0
    );
    const errorCount = logs.filter(
      (l) => l.errors && l.errors.length > 0
    ).length;

    if (totalSoftDeleted === 0 && totalHardDeleted === 0) {
      console.log("[RetentionDigest] No records processed in the last 7 days.");
      return null;
    }

    console.log(
      `[RetentionDigest] Weekly summary: soft-deleted=${totalSoftDeleted}, hard-deleted=${totalHardDeleted}, runs=${logs.length}, error_runs=${errorCount}`
    );

    return null;
  },
});
