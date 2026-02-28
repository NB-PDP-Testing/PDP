/**
 * Daily Wellness Dispatch Cron Jobs (Phase 8 — US-P8-007)
 *
 * Runs every 15 minutes to check if any org's dispatch window has arrived,
 * then dispatches wellness check messages to all opted-in players via their
 * correct channel (WhatsApp Flows or SMS/conversational).
 *
 * Architecture:
 *  - checkWellnessDispatch: 15-min cron entry point. Checks time windows.
 *  - dispatchWellnessForOrg: Per-org action. Deduplicates and dispatches.
 *  - dispatchWellnessBatch: Rate-limited batch processor (≤50 players/min).
 */

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";
import type { WellnessDispatchPlayer } from "../lib/wellnessDispatchService";
import { sendWellnessCheck } from "../lib/wellnessDispatchService";

// Maximum players to dispatch per batch to stay within rate limits
const DISPATCH_BATCH_SIZE = 50;
// Delay between batches (1 minute in ms) to avoid Twilio/Meta rate limits
const BATCH_DELAY_MS = 60 * 1000;

// Maps Intl weekday names to the config's active day keys
const WEEKDAY_MAP: Record<string, string> = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

// ============================================================
// HELPERS: Timezone-aware time window checking
// ============================================================

type LocalDateInfo = {
  localHour: number;
  localMinute: number;
  localDate: string; // YYYY-MM-DD
  localDayKey: string; // "mon", "tue", etc.
};

function getLocalDateInfo(timezone: string): LocalDateInfo {
  const now = new Date();

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const hourStr = timeParts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = timeParts.find((p) => p.type === "minute")?.value ?? "0";

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = dateParts.find((p) => p.type === "year")?.value ?? "2000";
  const month = dateParts.find((p) => p.type === "month")?.value ?? "01";
  const day = dateParts.find((p) => p.type === "day")?.value ?? "01";
  const localDate = `${year}-${month}-${day}`;

  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(now);

  return {
    localHour: Number.parseInt(hourStr, 10),
    localMinute: Number.parseInt(minuteStr, 10),
    localDate,
    localDayKey:
      WEEKDAY_MAP[weekdayName] ?? weekdayName.toLowerCase().slice(0, 3),
  };
}

function isInDispatchWindow(
  localHour: number,
  localMinute: number,
  dispatchTime: string // "HH:MM"
): boolean {
  const parts = dispatchTime.split(":");
  const targetHour = Number.parseInt(parts[0] ?? "0", 10);
  const targetMinute = Number.parseInt(parts[1] ?? "0", 10);
  const localTotal = localHour * 60 + localMinute;
  const targetTotal = targetHour * 60 + targetMinute;
  // Within the 15-minute window starting at dispatch time
  return localTotal >= targetTotal && localTotal < targetTotal + 15;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================
// INTERNAL QUERY: Get orgs with WhatsApp dispatch enabled
// ============================================================

export const getEnabledOrgConfigs = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.string(),
      dispatchTime: v.optional(v.string()),
      dispatchTimezone: v.optional(v.string()),
      dispatchActiveDays: v.optional(v.array(v.string())),
      dispatchTargetTeamIds: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx) => {
    const configs = await ctx.db.query("wellnessOrgConfig").collect();
    return configs
      .filter((c) => c.whatsappEnabled === true)
      .map((c) => ({
        organizationId: c.organizationId,
        dispatchTime: c.dispatchTime,
        dispatchTimezone: c.dispatchTimezone,
        dispatchActiveDays: c.dispatchActiveDays,
        dispatchTargetTeamIds: c.dispatchTargetTeamIds,
      }));
  },
});

// ============================================================
// CRON ENTRY POINT: runs every 15 minutes
// ============================================================

/**
 * Check all orgs with WhatsApp wellness enabled and dispatch to those
 * whose configured dispatch time falls within this 15-minute window.
 */
export const checkWellnessDispatch = internalAction({
  args: {},
  returns: v.object({
    orgsChecked: v.number(),
    orgsDispatching: v.number(),
  }),
  handler: async (ctx) => {
    let orgsChecked = 0;
    let orgsDispatching = 0;

    const configs = await ctx.runQuery(
      internal.jobs.wellnessDispatch.getEnabledOrgConfigs,
      {}
    );

    for (const config of configs) {
      orgsChecked += 1;

      if (!(config.dispatchTime && config.dispatchTimezone)) {
        continue;
      }

      const activeDays = config.dispatchActiveDays ?? [
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
        "sun",
      ];

      try {
        const { localHour, localMinute, localDate, localDayKey } =
          getLocalDateInfo(config.dispatchTimezone);

        if (!activeDays.includes(localDayKey)) {
          continue;
        }

        if (!isInDispatchWindow(localHour, localMinute, config.dispatchTime)) {
          continue;
        }

        // Schedule per-org dispatch (runs immediately)
        await ctx.scheduler.runAfter(
          0,
          internal.jobs.wellnessDispatch.dispatchWellnessForOrg,
          {
            organizationId: config.organizationId,
            dispatchDate: localDate,
            targetTeamIds: config.dispatchTargetTeamIds ?? [],
          }
        );

        console.log(
          `[WellnessDispatch] Scheduled dispatch for org ${config.organizationId} on ${localDate}`
        );
        orgsDispatching += 1;
      } catch (err) {
        console.error(
          `[WellnessDispatch] Error checking org ${config.organizationId}:`,
          err
        );
      }
    }

    console.log(
      `[WellnessDispatch] Checked ${orgsChecked} orgs, dispatching for ${orgsDispatching}`
    );
    return { orgsChecked, orgsDispatching };
  },
});

// ============================================================
// PER-ORG DISPATCH ACTION
// ============================================================

/**
 * Dispatch wellness checks for all opted-in players in an org.
 * Skips players who already have a check-in or sent record for today.
 * Falls back from WhatsApp Flows to SMS/conversational on Meta API failure.
 * Rate limits to DISPATCH_BATCH_SIZE players per batch.
 */
export const dispatchWellnessForOrg = internalAction({
  args: {
    organizationId: v.string(),
    dispatchDate: v.string(), // YYYY-MM-DD
    targetTeamIds: v.array(v.string()),
  },
  returns: v.object({
    sent: v.number(),
    skipped: v.number(),
    failed: v.number(),
    fallbacks: v.number(),
  }),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: dispatch orchestration requires multiple dedup checks
  handler: async (ctx, args) => {
    const { organizationId, dispatchDate } = args;

    // Get org name for messages
    const org = await ctx.runQuery(api.models.organizations.getOrganization, {
      organizationId,
    });
    const orgName = org?.name ?? "Your Club";

    // Get all opted-in players for this org
    const optedInSettings = await ctx.runQuery(
      internal.models.whatsappWellness.getOptedInPlayers,
      { organizationId }
    );

    if (optedInSettings.length === 0) {
      console.log(
        `[WellnessDispatch] No opted-in players for org ${organizationId}`
      );
      return { sent: 0, skipped: 0, failed: 0, fallbacks: 0 };
    }

    // Build dispatch list: collect IDs to batch-check deduplication
    type DispatchCandidate = {
      settingsId: Id<"playerWellnessSettings">;
      playerIdentityId: Id<"playerIdentities">;
      wellnessChannel: "whatsapp_flows" | "sms_conversational";
      phoneNumber: string;
      lastFlowSentDate?: string;
    };

    const candidates: DispatchCandidate[] = optedInSettings
      .filter(
        (
          s
        ): s is typeof s & {
          wellnessChannel: "whatsapp_flows" | "sms_conversational";
          whatsappNumber: string;
        } =>
          s.wellnessChannel !== undefined &&
          s.whatsappNumber !== undefined &&
          s.whatsappNumber.length > 0
      )
      .map((s) => ({
        settingsId: s._id,
        playerIdentityId: s.playerIdentityId,
        wellnessChannel: s.wellnessChannel,
        phoneNumber: s.whatsappNumber,
        lastFlowSentDate: s.lastFlowSentDate,
      }));

    // Determine which players need dispatching
    const toDispatch: DispatchCandidate[] = [];
    let skipped = 0;

    for (const candidate of candidates) {
      // 1. Check if already checked in today (any channel)
      const existingCheck = await ctx.runQuery(
        internal.models.playerHealthChecks.getTodayHealthCheckInternal,
        {
          playerIdentityId: candidate.playerIdentityId,
          checkDate: dispatchDate,
        }
      );
      if (existingCheck) {
        skipped += 1;
        continue;
      }

      // 2. Channel-specific duplicate check
      if (candidate.wellnessChannel === "whatsapp_flows") {
        // Skip if Flow already sent today
        if (candidate.lastFlowSentDate === dispatchDate) {
          skipped += 1;
          continue;
        }
      } else {
        // sms_conversational: skip if session already exists today
        const existingSession = await ctx.runQuery(
          internal.models.whatsappWellness.getActiveWellnessSession,
          { phoneNumber: candidate.phoneNumber }
        );
        if (existingSession) {
          skipped += 1;
          continue;
        }
      }

      toDispatch.push(candidate);
    }

    if (toDispatch.length === 0) {
      console.log(
        `[WellnessDispatch] All ${skipped} players already handled for org ${organizationId}`
      );
      return { sent: 0, skipped, failed: 0, fallbacks: 0 };
    }

    // Split into batches for rate limiting
    const batches = chunkArray(toDispatch, DISPATCH_BATCH_SIZE);

    if (batches.length === 1) {
      // Single batch — dispatch inline
      const result = await sendBatch(ctx, {
        players: batches[0] ?? [],
        orgName,
        organizationId,
        dispatchDate,
      });
      return {
        sent: result.sent,
        skipped,
        failed: result.failed,
        fallbacks: result.fallbacks,
      };
    }

    // Multiple batches — schedule with staggered delays
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i] ?? [];
      await ctx.scheduler.runAfter(
        i * BATCH_DELAY_MS,
        internal.jobs.wellnessDispatch.dispatchWellnessBatch,
        {
          players: batch.map((c) => ({
            settingsId: c.settingsId,
            playerIdentityId: c.playerIdentityId,
            wellnessChannel: c.wellnessChannel,
            phoneNumber: c.phoneNumber,
          })),
          orgName,
          organizationId,
          dispatchDate,
        }
      );
    }

    console.log(
      `[WellnessDispatch] Org ${organizationId}: scheduled ${batches.length} batches for ${toDispatch.length} players`
    );

    return {
      sent: 0, // Actual counts will be logged by each batch action
      skipped,
      failed: 0,
      fallbacks: 0,
    };
  },
});

// ============================================================
// BATCH DISPATCH ACTION (rate-limited)
// ============================================================

type BatchPlayer = {
  settingsId: Id<"playerWellnessSettings">;
  playerIdentityId: Id<"playerIdentities">;
  wellnessChannel: "whatsapp_flows" | "sms_conversational";
  phoneNumber: string;
};

/**
 * Dispatch wellness checks to a single batch of players.
 * Called by dispatchWellnessForOrg via ctx.scheduler.runAfter for large orgs.
 */
export const dispatchWellnessBatch = internalAction({
  args: {
    players: v.array(
      v.object({
        settingsId: v.id("playerWellnessSettings"),
        playerIdentityId: v.id("playerIdentities"),
        wellnessChannel: v.union(
          v.literal("whatsapp_flows"),
          v.literal("sms_conversational")
        ),
        phoneNumber: v.string(),
      })
    ),
    orgName: v.string(),
    organizationId: v.string(),
    dispatchDate: v.string(),
  },
  returns: v.object({
    sent: v.number(),
    failed: v.number(),
    fallbacks: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await sendBatch(ctx, {
      players: args.players,
      orgName: args.orgName,
      organizationId: args.organizationId,
      dispatchDate: args.dispatchDate,
    });
    console.log(
      `[WellnessDispatch] Batch for org ${args.organizationId}: sent=${result.sent} failed=${result.failed} fallbacks=${result.fallbacks}`
    );
    return result;
  },
});

// ============================================================
// PRIVATE: Core batch send logic
// ============================================================

type SendBatchOptions = {
  players: BatchPlayer[];
  orgName: string;
  organizationId: string;
  dispatchDate: string;
};

async function sendBatch(
  ctx: ActionCtx,
  opts: SendBatchOptions
): Promise<{ sent: number; failed: number; fallbacks: number }> {
  const { players, orgName, organizationId, dispatchDate } = opts;
  let sent = 0;
  let failed = 0;
  let fallbacks = 0;

  for (const player of players) {
    // Fetch player name
    const identity = await ctx.runQuery(
      internal.jobs.wellnessDispatch.getPlayerIdentity,
      { playerIdentityId: player.playerIdentityId }
    );

    if (!identity) {
      failed += 1;
      console.warn(
        `[WellnessDispatch] Player identity not found: ${player.playerIdentityId}`
      );
      continue;
    }

    // Fetch enabled dimensions
    const settings = await ctx.runQuery(
      internal.models.whatsappWellness.getWellnessSettings,
      { playerIdentityId: player.playerIdentityId }
    );

    const enabledDimensions = settings?.enabledDimensions ?? [
      "sleepQuality",
      "energyLevel",
      "mood",
      "physicalFeeling",
      "motivation",
    ];

    const dispatchPlayer: WellnessDispatchPlayer = {
      playerIdentityId: player.playerIdentityId,
      phoneNumber: player.phoneNumber,
      playerName: `${identity.firstName} ${identity.lastName}`,
      orgName,
      wellnessChannel: player.wellnessChannel,
      enabledDimensions,
      organizationId,
    };

    let result = await sendWellnessCheck(ctx, dispatchPlayer);

    // If WhatsApp Flows failed, fall back to SMS conversational
    if (!result.sent && player.wellnessChannel === "whatsapp_flows") {
      console.warn(
        `[WellnessDispatch] Flows failed for player ${player.playerIdentityId}, falling back to SMS. Error: ${result.error}`
      );

      const fallbackPlayer: WellnessDispatchPlayer = {
        ...dispatchPlayer,
        wellnessChannel: "sms_conversational",
      };
      result = await sendWellnessCheck(ctx, fallbackPlayer);
      fallbacks += 1;
    }

    if (result.sent) {
      sent += 1;

      // If sent via WhatsApp Flows (primary or no fallback needed), record sent date
      if (
        player.wellnessChannel === "whatsapp_flows" &&
        result.channel === "whatsapp_flows"
      ) {
        await ctx.runMutation(
          internal.models.whatsappWellness.updateFlowSentDate,
          {
            settingsId: player.settingsId,
            sentDate: dispatchDate,
          }
        );
      }
    } else {
      failed += 1;
      console.error(
        `[WellnessDispatch] Failed to send to player ${player.playerIdentityId} via any channel. Error: ${result.error}`
      );
    }
  }

  return { sent, failed, fallbacks };
}

// ============================================================
// INTERNAL QUERY: Get player identity for name resolution
// ============================================================

export const getPlayerIdentity = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      firstName: v.string(),
      lastName: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.db.get(args.playerIdentityId);
    if (!identity) {
      return null;
    }
    return {
      firstName: identity.firstName,
      lastName: identity.lastName,
    };
  },
});
