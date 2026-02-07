"use node";

/**
 * v1-to-v2 Voice Notes Migration - Phase 6
 *
 * Backfills historical v1 voiceNotes into v2 artifacts, transcripts, and claims.
 * Supports dry-run mode and batch processing.
 * Idempotent — skips voiceNotes that already have linked artifacts.
 *
 * Trigger from Convex dashboard (Run Action) or via scheduled job.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;

/** Default confidence for migrated data that lacks original AI scores */
const MIGRATION_DEFAULT_CONFIDENCE = 0.8;

// ── Type for migration stats ────────────────────────────────────

type MigrationStats = {
  processed: number;
  artifacts: number;
  transcripts: number;
  claims: number;
  errors: number;
  skipped: number;
};

// ── Map v1 source to v2 sourceChannel ──────────────────────────

function mapSourceChannel(
  source: string | undefined
): "whatsapp_audio" | "whatsapp_text" | "app_recorded" | "app_typed" {
  switch (source) {
    case "whatsapp":
    case "whatsapp_audio":
      return "whatsapp_audio";
    case "whatsapp_text":
      return "whatsapp_text";
    case "app":
    case "app_recorded":
    case "recorded":
      return "app_recorded";
    case "typed":
    case "app_typed":
      return "app_typed";
    default:
      return "whatsapp_audio"; // Safe default for historical data
  }
}

// ── Map v1 insight category to v2 claim topic ──────────────────

type ClaimTopic =
  | "injury"
  | "skill_rating"
  | "skill_progress"
  | "behavior"
  | "performance"
  | "attendance"
  | "wellbeing"
  | "recovery"
  | "development_milestone"
  | "physical_development"
  | "parent_communication"
  | "tactical"
  | "team_culture"
  | "todo"
  | "session_plan";

function mapInsightTopic(category: string | undefined): ClaimTopic {
  switch (category) {
    case "injury":
      return "injury";
    case "skill_rating":
    case "skills":
      return "skill_rating";
    case "skill_progress":
      return "skill_progress";
    case "behavior":
    case "behaviour":
      return "behavior";
    case "performance":
      return "performance";
    case "attendance":
      return "attendance";
    case "wellbeing":
    case "mental_health":
      return "wellbeing";
    case "recovery":
      return "recovery";
    case "development_milestone":
    case "milestone":
      return "development_milestone";
    case "physical_development":
    case "physical":
      return "physical_development";
    case "parent_communication":
    case "parent":
      return "parent_communication";
    case "tactical":
      return "tactical";
    case "team_culture":
    case "team":
      return "team_culture";
    case "todo":
    case "action_item":
      return "todo";
    case "session_plan":
    case "training":
      return "session_plan";
    default:
      return "performance"; // Safe default
  }
}

// ── Type for v1 voice note data used in migration ───────────────

type MigrationVoiceNote = {
  _id: Id<"voiceNotes">;
  coachId?: string;
  orgId?: string;
  source?: string;
  transcription?: string;
  insights?: Record<string, unknown>[];
};

// ── Helper: count dry-run stats ─────────────────────────────────

function countDryRunStats(
  vn: Pick<MigrationVoiceNote, "transcription" | "insights">,
  stats: MigrationStats
): void {
  stats.artifacts += 1;
  if (vn.transcription) {
    stats.transcripts += 1;
  }
  if (vn.insights && vn.insights.length > 0) {
    stats.claims += vn.insights.length;
  }
}

// ── Helper: build claims from v1 insights ───────────────────────

type ClaimData = {
  claimId: string;
  artifactId: Id<"voiceNoteArtifacts">;
  sourceText: string;
  topic: ClaimTopic;
  title: string;
  description: string;
  entityMentions: never[];
  extractionConfidence: number;
  organizationId: string;
  coachUserId: string;
  status: "extracted";
  createdAt: number;
  updatedAt: number;
  resolvedPlayerIdentityId?: Id<"playerIdentities">;
  resolvedPlayerName?: string;
};

function buildClaimFromInsight(
  insight: Record<string, unknown>,
  context: {
    artifactDocId: Id<"voiceNoteArtifacts">;
    orgId: string;
    coachId: string;
    now: number;
  }
): ClaimData {
  const { artifactDocId, orgId, coachId, now } = context;
  const claimData: ClaimData = {
    claimId: crypto.randomUUID(),
    artifactId: artifactDocId,
    sourceText: (insight.description as string) || "",
    topic: mapInsightTopic(insight.category as string | undefined),
    title:
      (insight.title as string) || `${(insight.category as string) || "Note"}`,
    description: (insight.description as string) || "",
    entityMentions: [],
    extractionConfidence: MIGRATION_DEFAULT_CONFIDENCE,
    organizationId: orgId,
    coachUserId: coachId,
    status: "extracted",
    createdAt: now,
    updatedAt: now,
  };

  if (insight.playerIdentityId) {
    claimData.resolvedPlayerIdentityId =
      insight.playerIdentityId as Id<"playerIdentities">;
  }
  if (insight.playerName) {
    claimData.resolvedPlayerName = insight.playerName as string;
  }

  return claimData;
}

// ── Helper: create transcript for a migrated voice note ─────────

async function createTranscriptForVn(
  ctx: ActionCtx,
  artifactDocId: Id<"voiceNoteArtifacts">,
  artifactId: string,
  transcription: string
): Promise<void> {
  await ctx.runMutation(internal.models.voiceNoteTranscripts.createTranscript, {
    artifactId: artifactDocId,
    fullText: transcription,
    segments: [],
    modelUsed: "migration",
    language: "en",
    duration: 0,
  });
  await ctx.runMutation(
    internal.models.voiceNoteArtifacts.updateArtifactStatus,
    { artifactId, status: "transcribed" }
  );
}

// ── Helper: create claims for a migrated voice note ─────────────

async function createClaimsForVn(
  ctx: ActionCtx,
  vn: {
    insights: Record<string, unknown>[];
    orgId: string;
    coachId: string;
  },
  artifactDocId: Id<"voiceNoteArtifacts">,
  artifactId: string
): Promise<number> {
  const now = Date.now();
  const claimsToStore: ClaimData[] = [];

  for (const insight of vn.insights) {
    claimsToStore.push(
      buildClaimFromInsight(insight, {
        artifactDocId,
        orgId: vn.orgId,
        coachId: vn.coachId,
        now,
      })
    );
  }

  if (claimsToStore.length > 0) {
    await ctx.runMutation(internal.models.voiceNoteClaims.storeClaims, {
      claims: claimsToStore,
    });
  }

  await ctx.runMutation(
    internal.models.voiceNoteArtifacts.updateArtifactStatus,
    { artifactId, status: "processing" }
  );

  return claimsToStore.length;
}

// ── Main migration action ──────────────────────────────────────

export const migrateVoiceNotesToV2 = internalAction({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    artifacts: v.number(),
    transcripts: v.number(),
    claims: v.number(),
    errors: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = Math.min(
      Math.max(1, args.batchSize ?? DEFAULT_BATCH_SIZE),
      MAX_BATCH_SIZE
    );

    const stats: MigrationStats = {
      processed: 0,
      artifacts: 0,
      transcripts: 0,
      claims: 0,
      errors: 0,
      skipped: 0,
    };

    console.info(
      `[migration] Starting v1→v2 migration (dryRun=${args.dryRun}, batchSize=${batchSize}${args.organizationId ? `, org=${args.organizationId}` : ""})`
    );

    const voiceNotes = await ctx.runQuery(
      internal.models.voiceNotes.getCompletedForMigration,
      {
        organizationId: args.organizationId,
        limit: batchSize,
      }
    );

    console.info(
      `[migration] Found ${voiceNotes.length} voice notes to process`
    );

    for (const vn of voiceNotes as MigrationVoiceNote[]) {
      stats.processed += 1;

      try {
        await processVoiceNote(ctx, vn, args.dryRun, stats);
      } catch (error) {
        stats.errors += 1;
        console.error(
          `[migration] Error processing voiceNote ${vn._id}:`,
          error
        );
      }

      if (stats.processed % 50 === 0) {
        console.info(
          `[migration] Progress: ${stats.processed} processed, ${stats.artifacts} artifacts, ${stats.errors} errors`
        );
      }
    }

    console.info(
      `[migration] Complete: processed=${stats.processed}, artifacts=${stats.artifacts}, ` +
        `transcripts=${stats.transcripts}, claims=${stats.claims}, ` +
        `errors=${stats.errors}, skipped=${stats.skipped}`
    );

    return stats;
  },
});

// ── Helper: process a single voice note ─────────────────────────

async function processVoiceNote(
  ctx: ActionCtx,
  vn: MigrationVoiceNote,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  // Check if already migrated (idempotent)
  const existingArtifacts = await ctx.runQuery(
    internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
    { voiceNoteId: vn._id }
  );

  if (existingArtifacts.length > 0) {
    stats.skipped += 1;
    return;
  }

  if (dryRun) {
    countDryRunStats(vn, stats);
    return;
  }

  // Require coachId for migration
  if (!vn.coachId) {
    console.warn(`[migration] Skipping voiceNote ${vn._id} - missing coachId`);
    stats.skipped += 1;
    return;
  }

  // Create v2 artifact
  const artifactId = crypto.randomUUID();
  const sourceChannel = mapSourceChannel(vn.source);

  const artifactDocId = await ctx.runMutation(
    internal.models.voiceNoteArtifacts.createArtifact,
    {
      artifactId,
      sourceChannel,
      senderUserId: vn.coachId,
      orgContextCandidates: [
        { organizationId: vn.orgId as string, confidence: 1.0 },
      ],
    }
  );
  stats.artifacts += 1;

  // Link artifact to v1 voiceNote
  await ctx.runMutation(internal.models.voiceNoteArtifacts.linkToVoiceNote, {
    artifactId,
    voiceNoteId: vn._id,
  });

  // Create transcript if exists
  if (vn.transcription) {
    await createTranscriptForVn(
      ctx,
      artifactDocId,
      artifactId,
      vn.transcription
    );
    stats.transcripts += 1;
  }

  // Create claims from existing insights
  if (vn.insights && vn.insights.length > 0) {
    const claimCount = await createClaimsForVn(
      ctx,
      {
        insights: vn.insights,
        orgId: vn.orgId as string,
        coachId: vn.coachId,
      },
      artifactDocId,
      artifactId
    );
    stats.claims += claimCount;
  }

  // Update artifact to completed
  await ctx.runMutation(
    internal.models.voiceNoteArtifacts.updateArtifactStatus,
    { artifactId, status: "completed" }
  );
}
