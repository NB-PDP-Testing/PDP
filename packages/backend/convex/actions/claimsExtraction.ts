"use node";

/**
 * Claims Extraction Action - v2 Pipeline (Phase 4)
 *
 * Segments voice note transcripts into atomic claims using GPT-4
 * structured output. Runs in parallel with v1 buildInsights — no regression.
 *
 * Each claim = one observation about one entity (player/team/coach).
 * 15 topic categories, best-effort entity resolution.
 */

import { v } from "convex/values";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";

// ── AI model config (reuses v1 pattern from voiceNotes.ts) ───

const DEFAULT_MODEL_INSIGHTS = "gpt-4o";

async function getAIConfig(
  ctx: ActionCtx,
  feature: "voice_transcription" | "voice_insights",
  organizationId?: string
): Promise<{
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}> {
  try {
    const dbConfig = await ctx.runQuery(
      internal.models.aiModelConfig.getConfigForFeatureInternal,
      { feature, organizationId }
    );

    if (dbConfig) {
      return {
        modelId: dbConfig.modelId,
        maxTokens: dbConfig.maxTokens,
        temperature: dbConfig.temperature,
      };
    }
  } catch (error) {
    console.warn(
      `Failed to get AI config from database for ${feature}, using fallback:`,
      error
    );
  }

  return {
    modelId: process.env.OPENAI_MODEL_INSIGHTS || DEFAULT_MODEL_INSIGHTS,
  };
}

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }
  return new OpenAI({ apiKey });
}

// ── Zod schema for structured output ──────────────────────────

const claimsExtractionSchema = z.object({
  summary: z.string().describe("Brief summary of the entire voice note"),
  claims: z.array(
    z.object({
      sourceText: z.string().describe("Exact quote from transcript"),
      topic: z.enum([
        "injury",
        "skill_rating",
        "skill_progress",
        "behavior",
        "performance",
        "attendance",
        "wellbeing",
        "recovery",
        "development_milestone",
        "physical_development",
        "parent_communication",
        "tactical",
        "team_culture",
        "todo",
        "session_plan",
      ]),
      title: z.string().describe("Short descriptive title"),
      description: z.string().describe("Detailed description"),
      recommendedAction: z.string().nullable(),
      timeReference: z.string().nullable(),
      entityMentions: z.array(
        z.object({
          mentionType: z.enum([
            "player_name",
            "team_name",
            "group_reference",
            "coach_name",
          ]),
          rawText: z.string(),
          position: z.number(),
        })
      ),
      severity: z.enum(["low", "medium", "high", "critical"]).nullable(),
      sentiment: z
        .enum(["positive", "neutral", "negative", "concerned"])
        .nullable(),
      skillName: z.string().nullable(),
      skillRating: z.number().min(1).max(5).nullable(),
      extractionConfidence: z.number().min(0).max(1),
      playerId: z.string().nullable(),
      playerName: z.string().nullable(),
      teamId: z.string().nullable(),
      teamName: z.string().nullable(),
      assigneeUserId: z.string().nullable(),
      assigneeName: z.string().nullable(),
    })
  ),
});

// ── Player type from coach context ────────────────────────────

type RosterPlayer = {
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  ageGroup: string;
  sport: string;
};

// ── System prompt builder ─────────────────────────────────────

function buildSystemPrompt(opts: {
  rosterJson: string;
  teamsJson: string;
  coachesJson: string;
}): string {
  return `You are an expert sports coaching assistant that analyzes coach voice notes and extracts atomic claims.

CRITICAL RULES:
1. ONE CLAIM per entity mention. If "John and Sarah both played well", that's TWO claims.
2. Claims must be ATOMIC - each captures ONE observation about ONE entity (player/team/coach).
3. sourceText must be the EXACT transcript quote for that specific claim.

CATEGORIZATION (15 topics):
- injury: Physical injuries, knocks, strains (PLAYER-SPECIFIC, set severity)
- skill_rating: Specific numeric rating/score for a skill (PLAYER-SPECIFIC, set skillName + skillRating 1-5)
- skill_progress: General skill improvement without numbers (PLAYER-SPECIFIC)
- behavior: Attitude, effort, teamwork, discipline (PLAYER-SPECIFIC)
- performance: Match/training performance observations (PLAYER-SPECIFIC)
- attendance: Presence/absence at sessions (PLAYER-SPECIFIC)
- wellbeing: Mental health, stress, anxiety, emotional state (PLAYER-SPECIFIC, set severity)
- recovery: Rehab progress, return-to-play status (PLAYER-SPECIFIC, distinct from initial injury)
- development_milestone: Achievements, selections, personal bests (PLAYER-SPECIFIC)
- physical_development: Growth spurts, conditioning, fitness benchmarks (PLAYER-SPECIFIC)
- parent_communication: Things to discuss with parents (PLAYER-SPECIFIC)
- tactical: Position changes, formations, role assignments (PLAYER or TEAM)
- team_culture: Team morale, collective behavior (TEAM-WIDE, no specific player)
- todo: Action items for coaches (COACH, no player)
- session_plan: Training focus areas, drill ideas (TEAM or NONE)

TITLE FORMAT RULES:
- For PLAYER-SPECIFIC topics: ALWAYS include the player's name in the title
  Format: "{Player Name}'s {Skill/Topic} {Action/Status}"
  Examples: "Niamh's Tackling Improvement", "Sinead's Tackling Skill Rating"
- For TEAM-WIDE topics: Use team name if available, otherwise "Team" prefix
- For TODO topics: Start with action verb: "Order New Equipment", "Schedule Parent Meeting"
- For SESSION_PLAN: Start with "Plan:" or describe focus area

PLAYER MATCHING INSTRUCTIONS:
- The roster JSON below is an array of player objects with "id", "firstName", "lastName", "fullName" fields
- Compare the mentioned name to "fullName" first (exact or partial match)
- If only a first name is mentioned, check "firstName" for matches
- When you find a match, copy the EXACT "id" field value into playerId
- If no match found, set playerId to null but still include playerName

TEAM MATCHING INSTRUCTIONS:
- ONLY match team_culture/tactical insights to a team if the EXACT team name is mentioned
- Look for EXPLICIT team names matching the "name" field in Coach's Teams JSON
- If the team name is not explicitly mentioned, leave teamId and teamName as null
- When in doubt, leave null and let the coach classify manually

TODO ASSIGNMENT INSTRUCTIONS:
- ONLY assign TODOs when you can EXPLICITLY identify who should do it:
  * First-person pronouns ("I need to", "I'll", "I should") → Assign to recording coach (first coach in list)
  * Specific coach name ("John should") → Match to coaches list
- If NONE of the above: leave assigneeUserId and assigneeName as null
  * Bare phrases ("Organize match", "Sort jerseys") → null
  * Generic pronouns ("we need to", "someone should") → null

ENTITY MENTION RULES:
- For each entity referenced in a claim, add to entityMentions:
  - "player_name": Any player name mentioned
  - "team_name": Any team name mentioned
  - "group_reference": Groups like "the twins", "the midfielders"
  - "coach_name": Any coach name mentioned
- position: approximate character offset in the source text

SEVERITY (for injury/wellbeing):
- low: Minor issue, can continue playing
- medium: Needs attention but not urgent
- high: Needs immediate attention
- critical: Medical emergency, stop activity

SENTIMENT:
- positive: Good news, improvement, praise
- neutral: Factual observation, no emotional tone
- negative: Bad news, decline, criticism
- concerned: Worry, uncertainty about the situation

Team Roster (JSON array - players):
${opts.rosterJson}

Coach's Teams (JSON array):
${opts.teamsJson}

Coaches on Same Teams (JSON array - for TODO assignment):
${opts.coachesJson}`;
}

// ── Deterministic player matching ─────────────────────────────

function findMatchingPlayerFromRoster(
  claim: z.infer<typeof claimsExtractionSchema>["claims"][number],
  players: RosterPlayer[]
): RosterPlayer | undefined {
  if (!players.length) {
    return;
  }

  // Try ID match first (from AI)
  if (claim.playerId) {
    const matchById = players.find(
      (p) => p.playerIdentityId === claim.playerId
    );
    if (matchById) {
      return matchById;
    }
  }

  const searchName = claim.playerName;
  if (!searchName) {
    return;
  }

  const normalizedSearch = searchName.toLowerCase().trim();

  // Exact full name
  const exactMatch = players.find(
    (p) => p.fullName.toLowerCase() === normalizedSearch
  );
  if (exactMatch) {
    return exactMatch;
  }

  // First + last name concatenation
  const nameMatch = players.find(
    (p) => `${p.firstName} ${p.lastName}`.toLowerCase() === normalizedSearch
  );
  if (nameMatch) {
    return nameMatch;
  }

  // First name only (unambiguous)
  const firstNameMatches = players.filter(
    (p) => p.firstName.toLowerCase() === normalizedSearch
  );
  if (firstNameMatches.length === 1) {
    return firstNameMatches[0];
  }

  // Partial match (unambiguous)
  const partialMatches = players.filter(
    (p) =>
      p.fullName.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(p.fullName.toLowerCase())
  );
  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return;
}

// ── Claim record type for storeClaims ─────────────────────────

type ClaimRecord = {
  claimId: string;
  artifactId: Id<"voiceNoteArtifacts">;
  sourceText: string;
  topic: z.infer<typeof claimsExtractionSchema>["claims"][number]["topic"];
  title: string;
  description: string;
  recommendedAction?: string;
  timeReference?: string;
  entityMentions: Array<{
    mentionType: "player_name" | "team_name" | "group_reference" | "coach_name";
    rawText: string;
    position: number;
  }>;
  resolvedPlayerIdentityId?: Id<"playerIdentities">;
  resolvedPlayerName?: string;
  resolvedTeamId?: string;
  resolvedTeamName?: string;
  resolvedAssigneeUserId?: string;
  resolvedAssigneeName?: string;
  severity?: "low" | "medium" | "high" | "critical";
  sentiment?: "positive" | "neutral" | "negative" | "concerned";
  skillName?: string;
  skillRating?: number;
  extractionConfidence: number;
  organizationId: string;
  coachUserId: string;
  status: "extracted";
  createdAt: number;
  updatedAt: number;
};

// ── Resolve a single claim's player reference ─────────────────

async function resolveClaimPlayer(
  ctx: ActionCtx,
  opts: {
    claim: z.infer<typeof claimsExtractionSchema>["claims"][number];
    players: RosterPlayer[];
    organizationId: string;
    coachUserId: string;
  }
): Promise<{ id?: Id<"playerIdentities">; name?: string }> {
  // Deterministic match first
  const matched = findMatchingPlayerFromRoster(opts.claim, opts.players);
  if (matched) {
    return { id: matched.playerIdentityId, name: matched.fullName };
  }

  // Fuzzy fallback
  if (opts.claim.playerName) {
    const fuzzyResults = await ctx.runQuery(
      internal.models.orgPlayerEnrollments.findSimilarPlayers,
      {
        organizationId: opts.organizationId,
        coachUserId: opts.coachUserId,
        searchName: opts.claim.playerName,
        limit: 1,
      }
    );

    if (fuzzyResults.length > 0 && fuzzyResults[0].similarity >= 0.85) {
      return {
        id: fuzzyResults[0].playerId as Id<"playerIdentities">,
        name: fuzzyResults[0].fullName,
      };
    }
  }

  return {};
}

// ── Build a ClaimRecord from parsed AI output ─────────────────

function buildClaimRecord(opts: {
  claim: z.infer<typeof claimsExtractionSchema>["claims"][number];
  artifactId: Id<"voiceNoteArtifacts">;
  player: { id?: Id<"playerIdentities">; name?: string };
  organizationId: string;
  coachUserId: string;
  now: number;
}): ClaimRecord {
  return {
    claimId: `claim_${opts.now}_${crypto.randomUUID().slice(0, 8)}`,
    artifactId: opts.artifactId,
    sourceText: opts.claim.sourceText,
    topic: opts.claim.topic,
    title: opts.claim.title,
    description: opts.claim.description,
    recommendedAction: opts.claim.recommendedAction ?? undefined,
    timeReference: opts.claim.timeReference ?? undefined,
    entityMentions: opts.claim.entityMentions,
    resolvedPlayerIdentityId: opts.player.id,
    resolvedPlayerName: opts.player.name,
    resolvedTeamId: opts.claim.teamId ?? undefined,
    resolvedTeamName: opts.claim.teamName ?? undefined,
    resolvedAssigneeUserId: opts.claim.assigneeUserId ?? undefined,
    resolvedAssigneeName: opts.claim.assigneeName ?? undefined,
    severity: opts.claim.severity ?? undefined,
    sentiment: opts.claim.sentiment ?? undefined,
    skillName: opts.claim.skillName ?? undefined,
    skillRating: opts.claim.skillRating ?? undefined,
    extractionConfidence: opts.claim.extractionConfidence,
    organizationId: opts.organizationId,
    coachUserId: opts.coachUserId,
    status: "extracted" as const,
    createdAt: opts.now,
    updatedAt: opts.now,
  };
}

// ── Sync v2 artifact status → v1 voiceNote (best-effort) ──────

async function syncVoiceNoteStatus(
  ctx: ActionCtx,
  artifactId: Id<"voiceNoteArtifacts">,
  status: "processing" | "completed" | "failed",
  opts?: {
    error?: string;
    summary?: string;
    insights?: Array<{
      id: string;
      playerIdentityId?: Id<"playerIdentities">;
      playerName?: string;
      title: string;
      description: string;
      category?: string;
      recommendedUpdate?: string;
      confidence?: number;
      status: "pending" | "applied" | "dismissed" | "auto_applied";
      teamId?: string;
      teamName?: string;
      assigneeUserId?: string;
      assigneeName?: string;
    }>;
  }
): Promise<void> {
  try {
    const artifact = await ctx.runQuery(
      internal.models.voiceNoteArtifacts.getArtifactById,
      { _id: artifactId }
    );
    if (artifact?.voiceNoteId) {
      await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
        noteId: artifact.voiceNoteId,
        status,
        error: opts?.error,
        summary: opts?.summary,
        insights: opts?.insights,
      });
    }
  } catch (syncError) {
    console.error("[syncVoiceNoteStatus] Failed:", syncError);
  }
}

// ── Mark artifact as failed (best-effort) ─────────────────────

async function markArtifactFailed(
  ctx: ActionCtx,
  artifactId: Id<"voiceNoteArtifacts">
): Promise<void> {
  try {
    const artifact = await ctx.runQuery(
      internal.models.voiceNoteArtifacts.getArtifactById,
      { _id: artifactId }
    );
    if (artifact) {
      await ctx.runMutation(
        internal.models.voiceNoteArtifacts.updateArtifactStatus,
        { artifactId: artifact.artifactId, status: "failed" }
      );
    }
    // Also sync failure to v1 voiceNote so UI shows error
    await syncVoiceNoteStatus(ctx, artifactId, "failed", {
      error: "v2 claims extraction failed",
    });
  } catch {
    // Ignore secondary failure
  }
}

// ── extractClaims (internalAction) ────────────────────────────

export const extractClaims = internalAction({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Get artifact
      const artifact = await ctx.runQuery(
        internal.models.voiceNoteArtifacts.getArtifactById,
        { _id: args.artifactId }
      );

      if (!artifact) {
        console.error(`[extractClaims] Artifact not found: ${args.artifactId}`);
        return null;
      }

      // v2 monitoring: emit claims_extraction_started event
      try {
        await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {
          eventType: "claims_extraction_started",
          artifactId: args.artifactId,
          organizationId:
            artifact.orgContextCandidates?.[0]?.organizationId ?? undefined,
          pipelineStage: "claims_extraction",
          stageStartedAt: Date.now(),
          metadata: {
            aiModel: "gpt-4o",
          },
        });
      } catch (error) {
        console.warn("Failed to log claims_extraction_started event:", error);
      }

      // 2. Set artifact status to processing + sync to voiceNote
      await ctx.runMutation(
        internal.models.voiceNoteArtifacts.updateArtifactStatus,
        { artifactId: artifact.artifactId, status: "processing" }
      );
      await syncVoiceNoteStatus(ctx, args.artifactId, "processing");

      // 3. Get transcript
      const transcript = await ctx.runQuery(
        internal.models.voiceNoteTranscripts.getTranscriptByArtifact,
        { artifactId: args.artifactId }
      );

      if (!transcript) {
        console.error(
          `[extractClaims] No transcript for artifact: ${args.artifactId}`
        );
        await ctx.runMutation(
          internal.models.voiceNoteArtifacts.updateArtifactStatus,
          { artifactId: artifact.artifactId, status: "failed" }
        );
        return null;
      }

      // 4. Determine organization (highest confidence candidate)
      const orgCandidate = [...artifact.orgContextCandidates].sort(
        (a, b) => b.confidence - a.confidence
      )[0];
      if (!orgCandidate) {
        console.error(
          `[extractClaims] No org candidates for artifact: ${args.artifactId}`
        );
        await ctx.runMutation(
          internal.models.voiceNoteArtifacts.updateArtifactStatus,
          { artifactId: artifact.artifactId, status: "failed" }
        );
        return null;
      }
      const organizationId = orgCandidate.organizationId;
      const coachUserId = artifact.senderUserId;

      // 5. Gather coach context + build prompt + get AI config
      const coachContext = await ctx.runQuery(
        internal.lib.coachContext.gatherCoachContext,
        { organizationId, coachUserId }
      );
      const systemPrompt = buildSystemPrompt({
        rosterJson: coachContext.rosterJson,
        teamsJson: coachContext.teamsJson,
        coachesJson: coachContext.coachesJson,
      });
      const config = await getAIConfig(ctx, "voice_insights", organizationId);

      // 6. Call OpenAI with structured output
      const client = getOpenAI();
      const response = await client.responses.create({
        model: config.modelId,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Voice note transcript:\n\n${transcript.fullText}`,
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(claimsExtractionSchema, "claims"),
        },
      });

      // 7. Parse response
      const outputText = Array.isArray(response.output_text)
        ? response.output_text.join("\n")
        : ((response.output_text as string | undefined) ?? "");
      const parsed = claimsExtractionSchema.safeParse(
        JSON.parse(outputText || "{}")
      );

      if (!parsed.success) {
        throw new Error(
          `Failed to parse claims response: ${parsed.error.message}`
        );
      }

      // 8. Resolve + build claims
      const now = Date.now();
      const claimsToStore: ClaimRecord[] = [];

      for (const claim of parsed.data.claims) {
        const player = await resolveClaimPlayer(ctx, {
          claim,
          players: coachContext.players,
          organizationId,
          coachUserId,
        });
        claimsToStore.push(
          buildClaimRecord({
            claim,
            artifactId: args.artifactId,
            player,
            organizationId,
            coachUserId,
            now,
          })
        );
      }

      // 9. Store claims + mark completed
      if (claimsToStore.length > 0) {
        await ctx.runMutation(internal.models.voiceNoteClaims.storeClaims, {
          claims: claimsToStore,
        });

        // 9b. [E2] Schedule entity resolution (feature-flag gated)
        const entityResolutionEnabled = await ctx.runQuery(
          internal.lib.featureFlags.shouldUseEntityResolution,
          { organizationId, userId: coachUserId }
        );

        if (entityResolutionEnabled) {
          await ctx.scheduler.runAfter(
            0,
            internal.actions.entityResolution.resolveEntities,
            { artifactId: args.artifactId }
          );
        }
      }

      await ctx.runMutation(
        internal.models.voiceNoteArtifacts.updateArtifactStatus,
        { artifactId: artifact.artifactId, status: "completed" }
      );

      // Sync completed status + bridge v2 claims → v1 insights for checkAndAutoApply
      const v1Insights = claimsToStore.map((claim) => ({
        id: claim.claimId,
        playerIdentityId: claim.resolvedPlayerIdentityId,
        playerName: claim.resolvedPlayerName,
        title: claim.title,
        description: claim.description,
        category: claim.topic,
        recommendedUpdate: claim.recommendedAction,
        confidence: claim.extractionConfidence,
        status: "pending" as const,
        teamId: claim.resolvedTeamId,
        teamName: claim.resolvedTeamName,
        assigneeUserId: claim.resolvedAssigneeUserId,
        assigneeName: claim.resolvedAssigneeName,
      }));

      await syncVoiceNoteStatus(ctx, args.artifactId, "completed", {
        summary: parsed.data.summary,
        insights: v1Insights,
      });

      console.info(
        `[extractClaims] Extracted ${claimsToStore.length} claims for artifact ${artifact.artifactId}`
      );
    } catch (error) {
      console.error("[extractClaims] Failed:", error);
      await markArtifactFailed(ctx, args.artifactId);

      // v2 monitoring: emit claims_extraction_failed event
      try {
        const artifact = await ctx.runQuery(
          internal.models.voiceNoteArtifacts.getArtifactById,
          { _id: args.artifactId }
        );
        if (artifact) {
          await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {
            eventType: "claims_extraction_failed",
            artifactId: args.artifactId,
            organizationId:
              artifact.orgContextCandidates?.[0]?.organizationId ?? undefined,
            pipelineStage: "claims_extraction",
            stageCompletedAt: Date.now(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            errorCode: "CLAIMS_EXTRACTION_ERROR",
          });
        }
      } catch (logError) {
        console.warn("Failed to log claims_extraction_failed event:", logError);
      }
    }

    return null;
  },
});
