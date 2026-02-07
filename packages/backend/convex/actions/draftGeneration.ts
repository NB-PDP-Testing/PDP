/**
 * Draft Generation - Phase 6
 *
 * Generates insight drafts from resolved claims with confidence scoring
 * and auto-confirm gate logic for trusted coaches.
 *
 * Called after entity resolution completes.
 */

"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

// Sensitive insight types that NEVER auto-confirm
const SENSITIVE_TYPES = ["injury", "wellbeing", "recovery"];

// ── Helper: find the resolved player from entity resolutions ────

type ResolutionRecord = {
  mentionType: string;
  status: string;
  resolvedEntityId?: Id<"playerIdentities">;
  resolvedEntityName?: string;
  candidates: Array<{ score: number }>;
};

function findPlayerResolution(
  resolutions: ResolutionRecord[]
): ResolutionRecord | undefined {
  return resolutions.find(
    (r) =>
      r.mentionType === "player_name" &&
      (r.status === "auto_resolved" || r.status === "user_resolved")
  );
}

// ── Helper: calculate confidence scores ─────────────────────────

function calculateConfidence(
  extractionConfidence: number,
  resolution: ResolutionRecord
): {
  aiConfidence: number;
  resolutionConfidence: number;
  overallConfidence: number;
} {
  const aiConfidence = Math.max(0, Math.min(1, extractionConfidence));

  let resolutionConfidence = 1.0;
  if (resolution.status === "auto_resolved") {
    resolutionConfidence =
      resolution.candidates.length > 0 ? resolution.candidates[0].score : 1.0;
  }

  const overallConfidence = Math.max(
    0,
    Math.min(1, aiConfidence * resolutionConfidence)
  );

  return { aiConfidence, resolutionConfidence, overallConfidence };
}

// ── Helper: auto-confirm gate logic ─────────────────────────────

type TrustLevelData = {
  currentLevel: number;
  preferredLevel?: number | null;
  insightConfidenceThreshold?: number | null;
  insightAutoApplyPreferences?: {
    skills: boolean;
    attendance: boolean;
    goals: boolean;
    performance: boolean;
  } | null;
};

function checkAutoApplyAllowed(
  topic: string,
  prefs: TrustLevelData["insightAutoApplyPreferences"]
): boolean {
  if (!prefs) {
    return false;
  }
  if (topic === "skill_rating" || topic === "skill_progress") {
    return prefs.skills;
  }
  if (topic === "attendance") {
    return prefs.attendance;
  }
  if (topic === "development_milestone") {
    return prefs.goals;
  }
  if (topic === "performance") {
    return prefs.performance;
  }
  return false;
}

function requiresConfirmation(
  topic: string,
  overallConfidence: number,
  trustLevel: TrustLevelData
): boolean {
  const isSensitive = SENSITIVE_TYPES.includes(topic);
  if (isSensitive) {
    return true;
  }

  const effectiveLevel = Math.min(
    trustLevel.currentLevel,
    trustLevel.preferredLevel ?? 3
  );
  if (effectiveLevel < 2) {
    return true;
  }

  const threshold = trustLevel.insightConfidenceThreshold ?? 0.85;
  if (overallConfidence < threshold) {
    return true;
  }

  return !checkAutoApplyAllowed(topic, trustLevel.insightAutoApplyPreferences);
}

// ── Helper: build resolution Map ────────────────────────────────

function buildResolutionMap(
  resolutions: ResolutionRecord[]
): Map<string, ResolutionRecord[]> {
  const map = new Map<string, ResolutionRecord[]>();
  for (const resolution of resolutions) {
    const claimId = (resolution as Record<string, unknown>).claimId as string;
    const existing = map.get(claimId) ?? [];
    existing.push(resolution);
    map.set(claimId, existing);
  }
  return map;
}

/**
 * Generate insight drafts from resolved claims.
 * Called after entity resolution completes (Phase 5).
 */
export const generateDrafts = internalAction({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get artifact
    const artifact = await ctx.runQuery(
      internal.models.voiceNoteArtifacts.getArtifactById,
      { _id: args.artifactId }
    );

    if (!artifact) {
      console.warn(`[generateDrafts] Artifact not found: ${args.artifactId}`);
      return null;
    }

    // 2. Determine organizationId from artifact
    if (artifact.orgContextCandidates.length === 0) {
      console.warn(
        `[generateDrafts] No org context for artifact: ${args.artifactId}`
      );
      return null;
    }
    const organizationId = artifact.orgContextCandidates[0].organizationId;

    // 3. Get all claims for this artifact
    const claims = await ctx.runQuery(
      internal.models.voiceNoteClaims.getClaimsByArtifact,
      { artifactId: args.artifactId }
    );

    if (claims.length === 0) {
      console.info(
        `[generateDrafts] No claims for artifact: ${args.artifactId}`
      );
      return null;
    }

    // 4. Get entity resolutions and build lookup map
    const resolutions = await ctx.runQuery(
      internal.models.voiceNoteEntityResolutions.getResolutionsByArtifact,
      { artifactId: args.artifactId }
    );
    const resolutionsByClaimId = buildResolutionMap(
      resolutions as unknown as ResolutionRecord[]
    );

    // 5. Get coach trust level
    const trustLevel = await ctx.runQuery(
      internal.models.coachTrustLevels.getCoachTrustLevelInternal,
      { coachId: artifact.senderUserId }
    );

    // 6. Process each claim into drafts
    const drafts: Array<{
      draftId: string;
      artifactId: Id<"voiceNoteArtifacts">;
      claimId: Id<"voiceNoteClaims">;
      playerIdentityId: Id<"playerIdentities">;
      resolvedPlayerName: string | undefined;
      insightType:
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
      title: string;
      description: string;
      evidence: {
        transcriptSnippet: string;
        timestampStart: number | undefined;
      };
      displayOrder: number;
      aiConfidence: number;
      resolutionConfidence: number;
      overallConfidence: number;
      requiresConfirmation: boolean;
      status: "pending" | "confirmed";
      organizationId: string;
      coachUserId: string;
      confirmedAt: number | undefined;
      appliedAt: undefined;
      createdAt: number;
      updatedAt: number;
    }> = [];
    let displayOrder = 1; // 1-indexed per ADR-VN2-028

    for (const claim of claims) {
      const claimResolutions =
        resolutionsByClaimId.get(claim._id as unknown as string) ?? [];
      const playerResolution = findPlayerResolution(claimResolutions);

      if (!playerResolution?.resolvedEntityId) {
        continue;
      }

      const confidence = calculateConfidence(
        claim.extractionConfidence,
        playerResolution
      );
      const needsConfirmation = requiresConfirmation(
        claim.topic,
        confidence.overallConfidence,
        trustLevel as TrustLevelData
      );

      const now = Date.now();
      drafts.push({
        draftId: crypto.randomUUID(),
        artifactId: args.artifactId,
        claimId: claim._id,
        playerIdentityId: playerResolution.resolvedEntityId,
        resolvedPlayerName: playerResolution.resolvedEntityName,
        insightType: claim.topic,
        title: claim.title,
        description: claim.description,
        evidence: {
          transcriptSnippet: claim.sourceText,
          timestampStart: claim.timestampStart,
        },
        displayOrder,
        aiConfidence: confidence.aiConfidence,
        resolutionConfidence: confidence.resolutionConfidence,
        overallConfidence: confidence.overallConfidence,
        requiresConfirmation: needsConfirmation,
        status: needsConfirmation ? "pending" : "confirmed",
        organizationId,
        coachUserId: artifact.senderUserId,
        confirmedAt: needsConfirmation ? undefined : now,
        appliedAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
      displayOrder += 1;
    }

    // 7. If no drafts, exit
    if (drafts.length === 0) {
      console.info(
        `[generateDrafts] No drafts created for artifact: ${args.artifactId}`
      );
      return null;
    }

    // 8. Insert drafts
    const draftIds = await ctx.runMutation(
      internal.models.insightDrafts.createDrafts,
      { drafts }
    );

    console.info(
      `[generateDrafts] Created ${draftIds.length} drafts for artifact ${args.artifactId}`
    );

    // 9. Schedule auto-confirmed drafts for application
    const autoConfirmedDrafts = drafts.filter((d) => d.status === "confirmed");
    for (const draft of autoConfirmedDrafts) {
      await ctx.scheduler.runAfter(
        0,
        internal.models.insightDrafts.applyDraft,
        { draftId: draft.draftId }
      );
    }

    if (autoConfirmedDrafts.length > 0) {
      console.info(
        `[generateDrafts] Scheduled ${autoConfirmedDrafts.length} auto-confirmed drafts for application`
      );
    }

    return null;
  },
});
