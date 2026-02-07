"use node";

/**
 * Entity Resolution Action - Phase 5
 *
 * Resolves entity mentions in claims to actual players/teams/coaches.
 * Runs after claims extraction (Phase 4) for unresolved claims.
 *
 * Enhancements included:
 * - E1: Trust-adaptive auto-resolve threshold
 * - E2: Feature flag gating (checked at integration point)
 * - E4: Rich matchReason on candidates
 * - E5: Coach alias learning (check first, skip fuzzy if alias exists)
 * - E6: Batch same-name resolution (group by rawText)
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import {
  ALIAS_TO_CANONICAL,
  levenshteinSimilarity,
} from "../lib/stringMatching";

// ── Types ────────────────────────────────────────────────────

type MentionType =
  | "player_name"
  | "team_name"
  | "group_reference"
  | "coach_name";
type ResolutionStatus =
  | "auto_resolved"
  | "needs_disambiguation"
  | "user_resolved"
  | "unresolved";
type EntityType = "player" | "team" | "coach";

type Candidate = {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  score: number;
  matchReason: string;
};

type ResolutionRecord = {
  claimId: Id<"voiceNoteClaims">;
  artifactId: Id<"voiceNoteArtifacts">;
  mentionIndex: number;
  mentionType: MentionType;
  rawText: string;
  candidates: Candidate[];
  status: ResolutionStatus;
  resolvedEntityId?: string;
  resolvedEntityName?: string;
  resolvedAt?: number;
  organizationId: string;
  createdAt: number;
};

type MentionGroup = Array<{
  claimId: Id<"voiceNoteClaims">;
  mentionIndex: number;
}>;

type SimilarPlayerResult = {
  playerId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  similarity: number;
  ageGroup: string;
  sport: string | null;
};

type TeamInfo = {
  id: string;
  name: string;
  ageGroup?: string;
  sport?: string;
};

type CoachInfo = {
  id: string;
  name: string;
};

// ── Default threshold fallback ───────────────────────────────

const DEFAULT_AUTO_RESOLVE_THRESHOLD = 0.9;

// ── Main action ──────────────────────────────────────────────

export const resolveEntities = internalAction({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Get artifact for org + coach context
      const artifact = await ctx.runQuery(
        internal.models.voiceNoteArtifacts.getArtifactById,
        { _id: args.artifactId }
      );
      if (!artifact) {
        console.info(
          `[entityResolution] Artifact not found: ${args.artifactId}`
        );
        return null;
      }

      const organizationId = artifact.orgContextCandidates[0]?.organizationId;
      const coachUserId = artifact.senderUserId;

      if (!organizationId) {
        console.info("[entityResolution] No organization context on artifact");
        return null;
      }

      // 2. [E2] Feature flag already checked at integration point
      // (claimsExtraction.ts checks shouldUseEntityResolution before scheduling)

      // 3. Get claims with status='extracted' that Phase 4 couldn't resolve
      const claims = await ctx.runQuery(
        internal.models.voiceNoteClaims.getClaimsByArtifactAndStatus,
        { artifactId: args.artifactId, status: "extracted" }
      );

      // 4. Filter to claims without resolvedPlayerIdentityId
      const unresolvedClaims = claims.filter(
        (c) => !c.resolvedPlayerIdentityId
      );

      if (unresolvedClaims.length === 0) {
        console.info(
          "[entityResolution] All claims already resolved by Phase 4"
        );
        return null;
      }

      // 5. [E1] Get coach trust level for personalized threshold
      const autoResolveThreshold = await getAutoResolveThreshold(
        ctx,
        coachUserId
      );

      // 6. Gather coach context for team/coach matching
      const coachContext = await ctx.runQuery(
        internal.lib.coachContext.gatherCoachContext,
        { organizationId, coachUserId }
      );

      // 7-12. Process all entity types
      const resolutions = await processEntityMentions(ctx, {
        unresolvedClaims,
        artifactId: args.artifactId,
        organizationId,
        coachUserId,
        autoResolveThreshold,
        teams: coachContext.teams,
        coaches: coachContext.coaches,
      });

      if (resolutions.length === 0) {
        console.info("[entityResolution] No entity mentions to resolve");
        return null;
      }

      // 13. Store all resolutions
      await ctx.runMutation(
        internal.models.voiceNoteEntityResolutions.storeResolutions,
        { resolutions }
      );

      // 14. Update claim statuses based on resolution outcomes
      await updateClaimStatuses(ctx, unresolvedClaims, resolutions);

      // Log summary
      const counts = countResolutionStatuses(resolutions);
      console.info(
        `[entityResolution] Processed ${resolutions.length} resolutions: ` +
          `${counts.autoResolved} auto, ${counts.needsDisambiguation} disambig, ` +
          `${counts.unresolved} unresolved, ${counts.aliasHits} alias hits`
      );
    } catch (error) {
      console.error("[entityResolution] Failed:", error);
    }

    return null;
  },
});

// ── Get personalized threshold [E1] ──────────────────────────

async function getAutoResolveThreshold(
  ctx: ActionCtx,
  coachUserId: string
): Promise<number> {
  try {
    const trustData = await ctx.runQuery(
      internal.models.coachTrustLevels.getCoachTrustLevelInternal,
      { coachId: coachUserId }
    );
    return (
      trustData?.insightConfidenceThreshold ?? DEFAULT_AUTO_RESOLVE_THRESHOLD
    );
  } catch {
    return DEFAULT_AUTO_RESOLVE_THRESHOLD;
  }
}

// ── Process all entity mentions ──────────────────────────────

type ProcessOpts = {
  unresolvedClaims: Array<{
    _id: Id<"voiceNoteClaims">;
    entityMentions: Array<{
      mentionType: string;
      rawText: string;
      position: number;
    }>;
  }>;
  artifactId: Id<"voiceNoteArtifacts">;
  organizationId: string;
  coachUserId: string;
  autoResolveThreshold: number;
  teams: TeamInfo[];
  coaches: CoachInfo[];
};

type OtherMention = {
  claimId: Id<"voiceNoteClaims">;
  mentionIndex: number;
  mentionType: MentionType;
  rawText: string;
};

async function processEntityMentions(
  ctx: ActionCtx,
  opts: ProcessOpts
): Promise<ResolutionRecord[]> {
  const now = Date.now();

  // [E6] Group player_name mentions by normalized rawText
  const { playerMentionGroups, otherMentions } = groupMentionsByType(
    opts.unresolvedClaims
  );

  // [E5] Resolve player mentions via aliases first, then fuzzy
  const aliasResolutions = await resolvePlayerAliases(
    ctx,
    playerMentionGroups,
    opts,
    now
  );

  const aliasResolvedKeys = new Set(aliasResolutions.map((r) => r.rawText));

  const fuzzyResolutions = await resolvePlayerFuzzy(ctx, {
    playerMentionGroups,
    aliasResolvedKeys,
    opts,
    now,
  });

  // Resolve team/coach/group mentions
  const otherResolutions = resolveOtherMentions(otherMentions, opts, now);

  return [...aliasResolutions, ...fuzzyResolutions, ...otherResolutions];
}

// ── Group mentions by type ──────────────────────────────────

function groupMentionsByType(claims: ProcessOpts["unresolvedClaims"]): {
  playerMentionGroups: Map<string, MentionGroup>;
  otherMentions: OtherMention[];
} {
  const playerMentionGroups = new Map<string, MentionGroup>();
  const otherMentions: OtherMention[] = [];

  for (const claim of claims) {
    for (let idx = 0; idx < claim.entityMentions.length; idx += 1) {
      const mention = claim.entityMentions[idx];
      const mentionType = mention.mentionType as MentionType;

      if (mentionType === "player_name") {
        const key = mention.rawText.toLowerCase().trim();
        const group = playerMentionGroups.get(key) ?? [];
        group.push({ claimId: claim._id, mentionIndex: idx });
        playerMentionGroups.set(key, group);
      } else {
        otherMentions.push({
          claimId: claim._id,
          mentionIndex: idx,
          mentionType,
          rawText: mention.rawText,
        });
      }
    }
  }

  return { playerMentionGroups, otherMentions };
}

// ── [E5] Resolve player names via coach aliases ─────────────

async function resolvePlayerAliases(
  ctx: ActionCtx,
  playerMentionGroups: Map<string, MentionGroup>,
  opts: ProcessOpts,
  now: number
): Promise<ResolutionRecord[]> {
  const resolutions: ResolutionRecord[] = [];

  for (const rawText of playerMentionGroups.keys()) {
    const alias = await ctx.runQuery(
      internal.models.coachPlayerAliases.lookupAlias,
      {
        coachUserId: opts.coachUserId,
        organizationId: opts.organizationId,
        rawText,
      }
    );

    if (!alias) {
      continue;
    }

    const mentions = playerMentionGroups.get(rawText) ?? [];
    for (const { claimId, mentionIndex } of mentions) {
      resolutions.push({
        claimId,
        artifactId: opts.artifactId,
        mentionIndex,
        mentionType: "player_name",
        rawText,
        candidates: [
          {
            entityType: "player",
            entityId: alias.resolvedEntityId,
            entityName: alias.resolvedEntityName,
            score: 1.0,
            matchReason: "coach_alias",
          },
        ],
        status: "auto_resolved",
        resolvedEntityId: alias.resolvedEntityId,
        resolvedEntityName: alias.resolvedEntityName,
        resolvedAt: now,
        organizationId: opts.organizationId,
        createdAt: now,
      });
    }

    // Increment alias useCount
    await ctx.runMutation(internal.models.coachPlayerAliases.storeAlias, {
      coachUserId: opts.coachUserId,
      organizationId: opts.organizationId,
      rawText,
      resolvedEntityId: alias.resolvedEntityId,
      resolvedEntityName: alias.resolvedEntityName,
    });
  }

  return resolutions;
}

// ── Resolve player names via fuzzy matching ─────────────────

async function resolvePlayerFuzzy(
  ctx: ActionCtx,
  params: {
    playerMentionGroups: Map<string, MentionGroup>;
    aliasResolvedKeys: Set<string>;
    opts: ProcessOpts;
    now: number;
  }
): Promise<ResolutionRecord[]> {
  const { playerMentionGroups, aliasResolvedKeys, opts, now } = params;
  const resolutions: ResolutionRecord[] = [];

  // Query once per remaining unique player name
  const candidateMap = new Map<string, SimilarPlayerResult[]>();
  for (const rawText of playerMentionGroups.keys()) {
    if (aliasResolvedKeys.has(rawText)) {
      continue;
    }
    const results = await ctx.runQuery(
      internal.models.orgPlayerEnrollments.findSimilarPlayers,
      {
        organizationId: opts.organizationId,
        coachUserId: opts.coachUserId,
        searchName: rawText,
        limit: 5,
      }
    );
    candidateMap.set(rawText, results);
  }

  // Build player name resolutions with [E4] rich matchReason
  const coachTeamIds = new Set(opts.teams.map((t) => t.id));

  for (const [rawText, mentions] of playerMentionGroups.entries()) {
    if (aliasResolvedKeys.has(rawText)) {
      continue;
    }

    const record = buildPlayerResolution(
      rawText,
      candidateMap.get(rawText) ?? [],
      coachTeamIds,
      opts.autoResolveThreshold
    );

    for (const { claimId, mentionIndex } of mentions) {
      resolutions.push({
        claimId,
        artifactId: opts.artifactId,
        mentionIndex,
        mentionType: "player_name",
        rawText,
        candidates: record.candidates,
        status: record.status,
        ...(record.resolvedEntityId && {
          resolvedEntityId: record.resolvedEntityId,
          resolvedEntityName: record.resolvedEntityName,
          resolvedAt: now,
        }),
        organizationId: opts.organizationId,
        createdAt: now,
      });
    }
  }

  return resolutions;
}

// ── Build resolution for a single player name ───────────────

function buildPlayerResolution(
  rawText: string,
  candidates: SimilarPlayerResult[],
  coachTeamIds: Set<string>,
  autoResolveThreshold: number
): {
  candidates: Candidate[];
  status: ResolutionStatus;
  resolvedEntityId?: string;
  resolvedEntityName?: string;
} {
  const enrichedCandidates: Candidate[] = candidates.map((c) => ({
    entityType: "player" as const,
    entityId: c.playerId as string,
    entityName: c.fullName,
    score: c.similarity,
    matchReason: computeMatchReason(rawText, c, coachTeamIds),
  }));

  if (
    enrichedCandidates.length === 1 &&
    enrichedCandidates[0].score >= autoResolveThreshold
  ) {
    return {
      candidates: enrichedCandidates,
      status: "auto_resolved",
      resolvedEntityId: enrichedCandidates[0].entityId,
      resolvedEntityName: enrichedCandidates[0].entityName,
    };
  }

  if (enrichedCandidates.length > 0) {
    return { candidates: enrichedCandidates, status: "needs_disambiguation" };
  }

  return { candidates: enrichedCandidates, status: "unresolved" };
}

// ── Resolve team/coach/group mentions ───────────────────────

function resolveOtherMentions(
  otherMentions: OtherMention[],
  opts: ProcessOpts,
  now: number
): ResolutionRecord[] {
  const resolutions: ResolutionRecord[] = [];

  for (const mention of otherMentions) {
    const match = resolveNonPlayerMention(mention, opts);
    resolutions.push({
      claimId: mention.claimId,
      artifactId: opts.artifactId,
      mentionIndex: mention.mentionIndex,
      mentionType: mention.mentionType,
      rawText: mention.rawText,
      candidates: match ? [match] : [],
      status: match ? "auto_resolved" : "unresolved",
      ...(match && {
        resolvedEntityId: match.entityId,
        resolvedEntityName: match.entityName,
        resolvedAt: now,
      }),
      organizationId: opts.organizationId,
      createdAt: now,
    });
  }

  return resolutions;
}

// ── Resolve a single non-player mention ─────────────────────

function resolveNonPlayerMention(
  mention: OtherMention,
  opts: ProcessOpts
): Candidate | null {
  if (mention.mentionType === "team_name") {
    return resolveTeamName(mention.rawText, opts.teams);
  }
  if (mention.mentionType === "coach_name") {
    return resolveCoachName(mention.rawText, opts.coaches);
  }
  return null;
}

// ── Compute rich matchReason [E4] ────────────────────────────

function computeMatchReason(
  rawText: string,
  candidate: SimilarPlayerResult,
  _coachTeamIds: Set<string>
): string {
  const normalizedSearch = rawText.toLowerCase().trim();
  const normalizedName = candidate.fullName.toLowerCase().trim();
  const nameParts = normalizedName.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const searchParts = normalizedSearch.split(" ");

  let reason = "partial_match";

  // Check Irish alias first
  const searchCanonical = ALIAS_TO_CANONICAL.get(searchParts[0]);
  const nameCanonical = ALIAS_TO_CANONICAL.get(firstName);
  if (searchCanonical && nameCanonical && searchCanonical === nameCanonical) {
    reason = candidate.similarity >= 0.95 ? "irish_alias" : "irish_alias+fuzzy";
  } else if (searchParts[0] === firstName) {
    reason = "exact_first_name";
  } else if (
    normalizedSearch === lastName ||
    (searchParts.length > 0 && searchParts.includes(lastName))
  ) {
    reason = "last_name_match";
  } else if (
    levenshteinSimilarity(
      [...searchParts].reverse().join(" "),
      normalizedName
    ) > 0.85
  ) {
    reason = "reversed_name";
  } else if (candidate.similarity >= 0.7) {
    reason = "fuzzy_full_name";
  } else if (levenshteinSimilarity(searchParts[0] ?? "", firstName) >= 0.7) {
    reason = "fuzzy_first_name";
  }

  // Team context badge removed: SimilarPlayerResult lacks teamId so we cannot
  // verify if the candidate is actually on the coach's team. Will be re-added
  // once SimilarPlayerResult includes teamIds for accurate matching.

  return reason;
}

// ── Resolve team_name mentions ───────────────────────────────

function resolveTeamName(rawText: string, teams: TeamInfo[]): Candidate | null {
  const normalized = rawText.toLowerCase().trim();

  for (const team of teams) {
    if (team.name.toLowerCase().trim() === normalized) {
      return {
        entityType: "team",
        entityId: team.id,
        entityName: team.name,
        score: 1.0,
        matchReason: "exact_team_name",
      };
    }
  }

  // Fuzzy team name match
  for (const team of teams) {
    const similarity = levenshteinSimilarity(
      normalized,
      team.name.toLowerCase().trim()
    );
    if (similarity >= 0.8) {
      return {
        entityType: "team",
        entityId: team.id,
        entityName: team.name,
        score: similarity,
        matchReason: "fuzzy_team_name",
      };
    }
  }

  return null;
}

// ── Resolve coach_name mentions ──────────────────────────────

function resolveCoachName(
  rawText: string,
  coaches: CoachInfo[]
): Candidate | null {
  const normalized = rawText.toLowerCase().trim();

  for (const coach of coaches) {
    if (coach.name.toLowerCase().trim() === normalized) {
      return {
        entityType: "coach",
        entityId: coach.id,
        entityName: coach.name,
        score: 1.0,
        matchReason: "exact_coach_name",
      };
    }
  }

  // Fuzzy coach name match
  for (const coach of coaches) {
    const similarity = levenshteinSimilarity(
      normalized,
      coach.name.toLowerCase().trim()
    );
    if (similarity >= 0.8) {
      return {
        entityType: "coach",
        entityId: coach.id,
        entityName: coach.name,
        score: similarity,
        matchReason: "fuzzy_coach_name",
      };
    }
  }

  return null;
}

// ── Update claim statuses based on resolutions ───────────────

async function updateClaimStatuses(
  ctx: ActionCtx,
  claims: Array<{ _id: Id<"voiceNoteClaims">; claimId: string }>,
  resolutions: ResolutionRecord[]
): Promise<void> {
  // Group resolutions by claimId
  const resolutionsByClaimId = new Map<string, ResolutionRecord[]>();
  for (const r of resolutions) {
    const key = r.claimId as string;
    const group = resolutionsByClaimId.get(key) ?? [];
    group.push(r);
    resolutionsByClaimId.set(key, group);
  }

  for (const claim of claims) {
    const claimResolutions =
      resolutionsByClaimId.get(claim._id as string) ?? [];
    if (claimResolutions.length === 0) {
      continue;
    }

    const allAutoResolved = claimResolutions.every(
      (r) => r.status === "auto_resolved"
    );

    const newStatus: "resolved" | "needs_disambiguation" = allAutoResolved
      ? "resolved"
      : "needs_disambiguation";

    await ctx.runMutation(internal.models.voiceNoteClaims.updateClaimStatus, {
      claimId: claim.claimId,
      status: newStatus,
    });
  }
}

// ── Count resolution outcomes for logging ────────────────────

function countResolutionStatuses(resolutions: ResolutionRecord[]): {
  autoResolved: number;
  needsDisambiguation: number;
  unresolved: number;
  aliasHits: number;
} {
  let autoResolved = 0;
  let needsDisambiguation = 0;
  let unresolved = 0;
  let aliasHits = 0;

  for (const r of resolutions) {
    if (r.status === "auto_resolved") {
      autoResolved += 1;
      if (
        r.candidates.length === 1 &&
        r.candidates[0].matchReason === "coach_alias"
      ) {
        aliasHits += 1;
      }
    } else if (r.status === "needs_disambiguation") {
      needsDisambiguation += 1;
    } else if (r.status === "unresolved") {
      unresolved += 1;
    }
  }

  return { autoResolved, needsDisambiguation, unresolved, aliasHits };
}
