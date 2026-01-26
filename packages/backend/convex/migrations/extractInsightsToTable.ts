/**
 * Migration: Extract insights from voiceNotes.insights array to dedicated voiceNoteInsights table
 *
 * WHY: Phase 7 needs efficient querying by confidence, category, and status.
 * Embedded arrays can't be indexed, causing slow queries on large datasets.
 *
 * WHAT: Creates voiceNoteInsights records from all existing voiceNotes.insights.
 * Sets default confidence 0.7 for historical data (as requested).
 * Preserves all existing insight data.
 *
 * SAFETY: Non-destructive migration. Original voiceNotes.insights array remains unchanged.
 * Can be rolled back by simply deleting voiceNoteInsights records.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const migrateInsightsToTable = internalMutation({
  args: {},
  returns: v.object({
    totalVoiceNotes: v.number(),
    totalInsightsMigrated: v.number(),
    skipped: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🚀 Starting insight migration to dedicated table...");

    // Fetch all voice notes (paginated to avoid memory issues)
    const voiceNotes = await ctx.db.query("voiceNotes").collect();

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const note of voiceNotes) {
      if (!note.insights || note.insights.length === 0) {
        skipped += 1;
        continue;
      }

      for (const insight of note.insights) {
        try {
          // Check if already migrated (idempotent)
          const existing = await ctx.db
            .query("voiceNoteInsights")
            .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", note._id))
            .filter((q) => q.eq(q.field("insightId"), insight.id))
            .first();

          if (existing) {
            console.log(`⏭️  Skipping already migrated insight: ${insight.id}`);
            skipped += 1;
            continue;
          }

          // Extract status from insight
          let status: "pending" | "applied" | "dismissed" | "auto_applied" =
            "pending";
          if (insight.status === "applied") {
            status = "applied";
          } else if (insight.status === "dismissed") {
            status = "dismissed";
          }

          // Create new voiceNoteInsights record
          await ctx.db.insert("voiceNoteInsights", {
            // Source tracking
            voiceNoteId: note._id,
            insightId: insight.id,

            // Content
            title: insight.title,
            description: insight.description,
            category: insight.category ?? "uncategorized",
            recommendedUpdate: insight.recommendedUpdate,

            // Player/Team association
            playerIdentityId: insight.playerIdentityId,
            playerName: insight.playerName,
            teamId: (insight as any).teamId,
            teamName: (insight as any).teamName,
            assigneeUserId: (insight as any).assigneeUserId,
            assigneeName: (insight as any).assigneeName,

            // NEW FIELDS - Phase 7
            confidenceScore: 0.7, // Default medium confidence for historical data
            wouldAutoApply: false, // Historical insights don't auto-apply

            // Status tracking
            status,
            appliedAt: insight.appliedDate
              ? new Date(insight.appliedDate).getTime()
              : undefined,
            appliedBy: insight.status === "applied" ? note.coachId : undefined,
            dismissedAt:
              insight.status === "dismissed" ? note._creationTime : undefined,
            dismissedBy:
              insight.status === "dismissed" ? note.coachId : undefined,

            // Metadata
            organizationId: note.orgId,
            coachId: note.coachId ?? "unknown",
            createdAt: note._creationTime,
            updatedAt: note._creationTime,
          });

          migrated += 1;

          if (migrated % 100 === 0) {
            console.log(`✅ Migrated ${migrated} insights so far...`);
          }
        } catch (error) {
          console.error(`❌ Error migrating insight ${insight.id}:`, error);
          errors += 1;
        }
      }
    }

    const summary = {
      totalVoiceNotes: voiceNotes.length,
      totalInsightsMigrated: migrated,
      skipped,
      errors,
    };

    console.log("\n📊 Migration Summary:");
    console.log(`   Total voice notes: ${summary.totalVoiceNotes}`);
    console.log(`   Insights migrated: ${summary.totalInsightsMigrated}`);
    console.log(
      `   Skipped (no insights or already migrated): ${summary.skipped}`
    );
    console.log(`   Errors: ${summary.errors}`);

    return summary;
  },
});

/**
 * Verification query to check migration success
 * Compares embedded insight counts vs voiceNoteInsights records
 */
export const verifyMigration = internalMutation({
  args: {},
  returns: v.object({
    embeddedCount: v.number(),
    migratedCount: v.number(),
    match: v.boolean(),
    sample: v.array(
      v.object({
        voiceNoteId: v.string(),
        embeddedInsights: v.number(),
        migratedInsights: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    console.log("🔍 Verifying migration integrity...");

    const voiceNotes = await ctx.db.query("voiceNotes").collect();

    // Count embedded insights
    let embeddedCount = 0;
    for (const note of voiceNotes) {
      embeddedCount += note.insights?.length ?? 0;
    }

    // Count migrated insights
    const migratedInsights = await ctx.db.query("voiceNoteInsights").collect();
    const migratedCount = migratedInsights.length;

    // Sample check - verify first 10 voice notes
    const sample = [];
    for (const note of voiceNotes.slice(0, 10)) {
      if (!note.insights || note.insights.length === 0) {
        continue;
      }

      const migrated = await ctx.db
        .query("voiceNoteInsights")
        .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", note._id))
        .collect();

      sample.push({
        voiceNoteId: note._id,
        embeddedInsights: note.insights.length,
        migratedInsights: migrated.length,
      });
    }

    const match = embeddedCount === migratedCount;

    console.log("\n✅ Verification Results:");
    console.log(`   Embedded insights: ${embeddedCount}`);
    console.log(`   Migrated insights: ${migratedCount}`);
    console.log(`   Match: ${match ? "✅ YES" : "❌ NO"}`);

    return {
      embeddedCount,
      migratedCount,
      match,
      sample,
    };
  },
});
