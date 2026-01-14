import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

/**
 * Migration Script: Legacy Data to Identity System
 *
 * This script migrates data from legacy tables to the new identity-based tables:
 * - injuries → playerInjuries
 * - developmentGoals → passportGoals
 * - players.coachNotes → orgPlayerEnrollments.coachNotes
 *
 * Matching is done by:
 * 1. Player name (firstName + lastName)
 * 2. Date of birth (if available)
 * 3. Organization (for org-specific data)
 */

// ============================================================
// HELPER: Find matching playerIdentity for a legacy player
// ============================================================

async function findMatchingPlayerIdentity(
  ctx: any,
  legacyPlayer: any
): Promise<Id<"playerIdentities"> | null> {
  // Parse legacy player name into first/last
  const nameParts = legacyPlayer.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

  // Try to find by name and DOB first (most accurate)
  if (legacyPlayer.dateOfBirth) {
    const exactMatch = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q: any) =>
        q
          .eq("firstName", firstName)
          .eq("lastName", lastName)
          .eq("dateOfBirth", legacyPlayer.dateOfBirth)
      )
      .first();

    if (exactMatch) {
      return exactMatch._id;
    }
  }

  // Fall back to name-only matching
  const nameMatches = await ctx.db
    .query("playerIdentities")
    .withIndex("by_name_dob", (q: any) =>
      q.eq("firstName", firstName).eq("lastName", lastName)
    )
    .collect();

  if (nameMatches.length === 1) {
    return nameMatches[0]._id;
  }

  // If multiple matches, try to narrow down by other criteria
  if (nameMatches.length > 1 && legacyPlayer.organizationId) {
    // Find which identity has an enrollment in this org
    for (const identity of nameMatches) {
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q: any) =>
          q
            .eq("playerIdentityId", identity._id)
            .eq("organizationId", legacyPlayer.organizationId)
        )
        .first();

      if (enrollment) {
        return identity._id;
      }
    }
  }

  return null;
}

// ============================================================
// QUERY: Get migration status/preview
// ============================================================

export const getMigrationPreview = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Count legacy records
    const injuriesQuery = ctx.db.query("injuries");
    const goalsQuery = ctx.db.query("developmentGoals");
    const playersQuery = ctx.db.query("players");

    const allInjuries = await injuriesQuery.collect();
    const allGoals = await goalsQuery.collect();

    let players;
    if (args.organizationId) {
      players = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q: any) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    } else {
      players = await playersQuery.collect();
    }

    // Count players with coach notes
    const playersWithNotes = players.filter((p: any) => p.coachNotes?.trim());

    // Filter injuries and goals by players in scope
    const playerIds = new Set(players.map((p: any) => p._id));
    const injuries = allInjuries.filter((i: any) => playerIds.has(i.playerId));
    const goals = allGoals.filter((g: any) => playerIds.has(g.playerId));

    // Count existing records in new system
    const existingInjuries = await ctx.db.query("playerInjuries").collect();
    const existingGoals = await ctx.db.query("passportGoals").collect();

    // Try to match players to identities
    let matchedPlayers = 0;
    const unmatchedPlayers: { name: string; dob?: string; org: string }[] = [];

    for (const player of players.slice(0, 100)) {
      // Limit to first 100 for preview
      const match = await findMatchingPlayerIdentity(ctx, player);
      if (match) {
        matchedPlayers += 1;
      } else {
        unmatchedPlayers.push({
          name: player.name,
          dob: player.dateOfBirth,
          org: player.organizationId,
        });
      }
    }

    return {
      legacy: {
        injuries: injuries.length,
        goals: goals.length,
        playersWithNotes: playersWithNotes.length,
        totalPlayers: players.length,
      },
      existing: {
        playerInjuries: existingInjuries.length,
        passportGoals: existingGoals.length,
      },
      matching: {
        sampleSize: Math.min(players.length, 100),
        matched: matchedPlayers,
        unmatched: unmatchedPlayers.length,
        unmatchedSamples: unmatchedPlayers.slice(0, 10),
      },
    };
  },
});

// ============================================================
// MUTATION: Migrate injuries
// ============================================================

export const migrateInjuries = mutation({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    const results = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as { playerId: string; playerName: string; error: string }[],
    };

    // Get players in scope
    let players;
    if (args.organizationId) {
      players = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q: any) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    } else {
      players = await ctx.db.query("players").collect();
    }

    const playerMap = new Map(players.map((p: any) => [p._id, p]));

    // Get all injuries
    const allInjuries = await ctx.db.query("injuries").collect();
    const injuriesToMigrate = allInjuries.filter((i: any) =>
      playerMap.has(i.playerId)
    );

    for (const injury of injuriesToMigrate.slice(0, batchSize)) {
      results.processed += 1;

      const legacyPlayer = playerMap.get(injury.playerId);
      if (!legacyPlayer) {
        results.skipped += 1;
        continue;
      }

      // Find matching player identity
      const playerIdentityId = await findMatchingPlayerIdentity(
        ctx,
        legacyPlayer
      );

      if (!playerIdentityId) {
        results.errors.push({
          playerId: injury.playerId,
          playerName: legacyPlayer.name,
          error: "No matching playerIdentity found",
        });
        results.skipped += 1;
        continue;
      }

      // Check if already migrated (by player + date + body part)
      const existing = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q: any) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .filter((q: any) =>
          q.and(
            q.eq(q.field("dateOccurred"), injury.dateOccurred),
            q.eq(q.field("bodyPart"), injury.bodyPart)
          )
        )
        .first();

      if (existing) {
        results.skipped += 1;
        continue;
      }

      if (!args.dryRun) {
        // Map severity (legacy uses capitalized, new uses lowercase)
        const severityMap: Record<
          string,
          "minor" | "moderate" | "severe" | "long_term"
        > = {
          Minor: "minor",
          Moderate: "moderate",
          Severe: "severe",
        };

        // Map status
        const statusMap: Record<
          string,
          "active" | "recovering" | "cleared" | "healed"
        > = {
          Active: "active",
          Recovering: "recovering",
          Healed: "healed",
        };

        // Create new injury record
        await ctx.db.insert("playerInjuries", {
          playerIdentityId,
          injuryType: injury.injuryType,
          bodyPart: injury.bodyPart,
          dateOccurred: injury.dateOccurred,
          dateReported: injury.dateReported,
          severity: severityMap[injury.severity] || "moderate",
          status: statusMap[injury.status] || "active",
          description: injury.description,
          treatment: injury.treatment || undefined,
          expectedReturn: injury.expectedReturn || undefined,
          actualReturn: injury.actualReturn || undefined,
          daysOut: injury.daysOut || undefined,
          returnToPlayProtocol: injury.returnToPlayProtocol?.map(
            (step: any) => ({
              ...step,
              step: 0, // Add step number
              clearedBy: undefined,
            })
          ),
          occurredDuring: injury.relatedToMatch
            ? "match"
            : injury.relatedToTraining
              ? "training"
              : undefined,
          occurredAtOrgId: legacyPlayer.organizationId,
          sportCode: legacyPlayer.sport?.toLowerCase().replace(/\s+/g, "_"),
          isVisibleToAllOrgs: true,
          reportedByRole: "coach",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      results.migrated += 1;
    }

    return {
      ...results,
      dryRun: args.dryRun,
      remaining: injuriesToMigrate.length - results.processed,
    };
  },
});

// ============================================================
// MUTATION: Migrate development goals
// ============================================================

export const migrateGoals = mutation({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    const results = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as { playerId: string; playerName: string; error: string }[],
    };

    // Get players in scope
    let players;
    if (args.organizationId) {
      players = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q: any) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    } else {
      players = await ctx.db.query("players").collect();
    }

    const playerMap = new Map(players.map((p: any) => [p._id, p]));

    // Get all goals
    const allGoals = await ctx.db.query("developmentGoals").collect();
    const goalsToMigrate = allGoals.filter((g: any) =>
      playerMap.has(g.playerId)
    );

    for (const goal of goalsToMigrate.slice(0, batchSize)) {
      results.processed += 1;

      const legacyPlayer = playerMap.get(goal.playerId);
      if (!legacyPlayer) {
        results.skipped += 1;
        continue;
      }

      // Find matching player identity
      const playerIdentityId = await findMatchingPlayerIdentity(
        ctx,
        legacyPlayer
      );

      if (!playerIdentityId) {
        results.errors.push({
          playerId: goal.playerId,
          playerName: legacyPlayer.name,
          error: "No matching playerIdentity found",
        });
        results.skipped += 1;
        continue;
      }

      // Find sport passport for this player
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q: any) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (!passport) {
        results.errors.push({
          playerId: goal.playerId,
          playerName: legacyPlayer.name,
          error: "No sportPassport found for player",
        });
        results.skipped += 1;
        continue;
      }

      // Check if already migrated (by title + player)
      const existing = await ctx.db
        .query("passportGoals")
        .withIndex("by_playerIdentityId", (q: any) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .filter((q: any) => q.eq(q.field("title"), goal.title))
        .first();

      if (existing) {
        results.skipped += 1;
        continue;
      }

      if (!args.dryRun) {
        // Map category (legacy uses capitalized)
        const categoryMap: Record<
          string,
          "technical" | "tactical" | "physical" | "mental" | "social"
        > = {
          Technical: "technical",
          Physical: "physical",
          Mental: "mental",
          Team: "social", // Map Team → social
        };

        // Map priority
        const priorityMap: Record<string, "high" | "medium" | "low"> = {
          High: "high",
          Medium: "medium",
          Low: "low",
        };

        // Map status
        const statusMap: Record<
          string,
          "not_started" | "in_progress" | "completed" | "on_hold" | "cancelled"
        > = {
          "Not Started": "not_started",
          "In Progress": "in_progress",
          Completed: "completed",
          "On Hold": "on_hold",
        };

        // Combine coach notes into single string
        const coachNotesString = goal.coachNotes
          ?.map((n: any) => `[${n.date}] ${n.note}`)
          .join("\n\n");

        // Combine player notes into single string
        const playerNotesString = goal.playerNotes
          ?.map((n: any) => `[${n.date}] ${n.note}`)
          .join("\n\n");

        await ctx.db.insert("passportGoals", {
          passportId: passport._id,
          playerIdentityId,
          organizationId: legacyPlayer.organizationId,
          title: goal.title,
          description: goal.description,
          category: categoryMap[goal.category] || "technical",
          priority: priorityMap[goal.priority] || "medium",
          status: statusMap[goal.status] || "not_started",
          progress: goal.progress || 0,
          targetDate: goal.targetDate || undefined,
          completedDate: goal.completedDate || undefined,
          linkedSkills: goal.linkedSkills || [],
          milestones: goal.milestones || [],
          parentActions: goal.parentActions || [],
          parentCanView: true,
          coachNotes: coachNotesString || undefined,
          playerNotes: playerNotesString || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      results.migrated += 1;
    }

    return {
      ...results,
      dryRun: args.dryRun,
      remaining: goalsToMigrate.length - results.processed,
    };
  },
});

// ============================================================
// MUTATION: Migrate coach notes
// ============================================================

export const migrateCoachNotes = mutation({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    const results = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as { playerId: string; playerName: string; error: string }[],
    };

    // Get players with coach notes
    let players;
    if (args.organizationId) {
      players = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q: any) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    } else {
      players = await ctx.db.query("players").collect();
    }

    const playersWithNotes = players.filter((p: any) => p.coachNotes?.trim());

    for (const player of playersWithNotes.slice(0, batchSize)) {
      results.processed += 1;

      // Find matching player identity
      const playerIdentityId = await findMatchingPlayerIdentity(ctx, player);

      if (!playerIdentityId) {
        results.errors.push({
          playerId: player._id,
          playerName: player.name,
          error: "No matching playerIdentity found",
        });
        results.skipped += 1;
        continue;
      }

      // Find enrollment for this player in this org
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q: any) =>
          q
            .eq("playerIdentityId", playerIdentityId)
            .eq("organizationId", player.organizationId)
        )
        .first();

      if (!enrollment) {
        results.errors.push({
          playerId: player._id,
          playerName: player.name,
          error: "No enrollment found in orgPlayerEnrollments",
        });
        results.skipped += 1;
        continue;
      }

      // Skip if enrollment already has notes
      if (enrollment.coachNotes?.trim()) {
        results.skipped += 1;
        continue;
      }

      if (!args.dryRun) {
        await ctx.db.patch(enrollment._id, {
          coachNotes: player.coachNotes,
          updatedAt: Date.now(),
        });
      }

      results.migrated += 1;
    }

    return {
      ...results,
      dryRun: args.dryRun,
      remaining: playersWithNotes.length - results.processed,
    };
  },
});

// ============================================================
// MUTATION: Run all migrations
// ============================================================

export const runAllMigrations = mutation({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
  },
  handler: async (_ctx, _args) => {
    // Note: This is for reference - in practice, run each migration separately
    // to avoid timeouts and allow for error correction
    return {
      message: "Please run each migration separately:",
      steps: [
        "1. getMigrationPreview - Check what will be migrated",
        "2. migrateInjuries - Migrate injuries first",
        "3. migrateGoals - Migrate development goals",
        "4. migrateCoachNotes - Migrate coach notes",
      ],
      note: "Run with dryRun: true first to verify",
    };
  },
});
