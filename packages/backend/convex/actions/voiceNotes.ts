"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";

/**
 * AI Model Configuration for Voice Notes
 *
 * Configuration is read from the database (aiModelConfig table) with:
 * - Platform-wide defaults
 * - Optional per-organization overrides
 *
 * Falls back to environment variables if database config is not available:
 * - OPENAI_MODEL_TRANSCRIPTION: Model for audio transcription (default: gpt-4o-mini-transcribe)
 * - OPENAI_MODEL_INSIGHTS: Model for extracting insights from transcription (default: gpt-4o)
 */
const DEFAULT_MODEL_TRANSCRIPTION = "gpt-4o-mini-transcribe";
const DEFAULT_MODEL_INSIGHTS = "gpt-4o";

/**
 * Get AI config from database with fallback to env vars
 */
async function getAIConfig(
  ctx: ActionCtx,
  feature: "voice_transcription" | "voice_insights",
  organizationId?: string
): Promise<{
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}> {
  // Try to get config from database
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

  // Fallback to environment variables
  if (feature === "voice_transcription") {
    return {
      modelId:
        process.env.OPENAI_MODEL_TRANSCRIPTION || DEFAULT_MODEL_TRANSCRIPTION,
    };
  }

  return {
    modelId: process.env.OPENAI_MODEL_INSIGHTS || DEFAULT_MODEL_INSIGHTS,
  };
}

// Schema for AI-extracted insights
const insightSchema = z.object({
  summary: z.string().describe("A brief summary of the voice note content"),
  insights: z
    .array(
      z.object({
        title: z.string().describe("A short title for the insight"),
        description: z.string().describe("Detailed description of the insight"),
        playerName: z
          .string()
          .nullable()
          .describe("Name of the player this insight is about, if any"),
        playerId: z
          .string()
          .nullable()
          .describe("ID of the player from the roster, if matched"),
        category: z
          .string()
          .nullable()
          .describe(
            "Category: injury, skill_rating, skill_progress, behavior, performance, attendance, team_culture, todo. Use 'skill_rating' when the coach mentions a specific skill rating (e.g., 'hand_pass is now 4/5'). Use 'todo' for action items the coach needs to do (e.g., 'need to order cones', 'schedule parent meeting', 'book pitch')."
          ),
        recommendedUpdate: z
          .string()
          .nullable()
          .describe("Suggested action or update based on this insight"),
      })
    )
    .min(0),
});

/**
 * Transcribe audio from storage and update the voice note
 * Called after a voice note with audio is created
 */
export const transcribeAudio = internalAction({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the voice note
    const note = await ctx.runQuery(internal.models.voiceNotes.getNote, {
      noteId: args.noteId,
    });

    if (!note) {
      console.error("Voice note not found:", args.noteId);
      return null;
    }

    if (!note.audioStorageId) {
      console.error("Voice note has no audio:", args.noteId);
      await ctx.runMutation(internal.models.voiceNotes.updateTranscription, {
        noteId: args.noteId,
        transcription: "",
        status: "failed",
        error: "No audio file attached",
      });
      return null;
    }

    try {
      // Mark as processing
      await ctx.runMutation(internal.models.voiceNotes.updateTranscription, {
        noteId: args.noteId,
        status: "processing",
      });

      // Get the audio URL from storage
      const audioUrl = await ctx.storage.getUrl(note.audioStorageId);
      if (!audioUrl) {
        throw new Error("Failed to get audio URL from storage");
      }

      // Download the audio
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      // Get model config from database with fallback
      const config = await getAIConfig(ctx, "voice_transcription", note.orgId);

      // Transcribe with OpenAI
      const client = getOpenAI();
      const file = await OpenAI.toFile(audioBuffer, "voice-note.webm");
      const transcription = await client.audio.transcriptions.create({
        model: config.modelId,
        file,
      });

      // Update with transcription
      await ctx.runMutation(internal.models.voiceNotes.updateTranscription, {
        noteId: args.noteId,
        transcription: transcription.text,
        status: "completed",
      });

      // Schedule insights extraction
      await ctx.scheduler.runAfter(
        0,
        internal.actions.voiceNotes.buildInsights,
        {
          noteId: args.noteId,
        }
      );
    } catch (error) {
      console.error("Transcription failed:", error);
      await ctx.runMutation(internal.models.voiceNotes.updateTranscription, {
        noteId: args.noteId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return null;
  },
});

/**
 * Build insights from transcription using AI
 * Called after transcription completes or directly for typed notes
 */
export const buildInsights = internalAction({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the voice note
    const note = await ctx.runQuery(internal.models.voiceNotes.getNote, {
      noteId: args.noteId,
    });

    if (!note) {
      console.error("Voice note not found:", args.noteId);
      return null;
    }

    const transcription = note.transcription;
    if (!transcription) {
      console.error("Voice note has no transcription:", args.noteId);
      await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
        noteId: args.noteId,
        summary: "",
        insights: [],
        status: "failed",
        error: "No transcription available",
      });
      return null;
    }

    try {
      // Mark as processing
      await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
        noteId: args.noteId,
        status: "processing",
      });

      // Get players for context (scoped to coach's assigned teams)
      // This ensures voice note matching only considers players the coach actually works with
      const players = note.coachId
        ? await ctx.runQuery(
            internal.models.orgPlayerEnrollments
              .getPlayersForCoachTeamsInternal,
            { organizationId: note.orgId, coachUserId: note.coachId }
          )
        : await ctx.runQuery(
            internal.models.orgPlayerEnrollments.getPlayersForOrgInternal,
            { organizationId: note.orgId }
          );

      // Build roster context for AI (JSON format for reliable parsing)
      const rosterContext = players.length
        ? JSON.stringify(
            players.map((player: any) => ({
              id: player.playerIdentityId,
              firstName: player.firstName,
              lastName: player.lastName,
              fullName: `${player.firstName} ${player.lastName}`,
              ageGroup: player.ageGroup || "Unknown",
              sport: player.sport || "Unknown",
            })),
            null,
            2
          )
        : "[]";

      // Get model config from database with fallback
      const config = await getAIConfig(ctx, "voice_insights", note.orgId);

      // Call OpenAI to extract insights
      const client = getOpenAI();
      const response = await client.responses.create({
        model: config.modelId,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `You are an expert sports coaching assistant that analyzes coach voice notes and extracts actionable insights.

Your task is to:
1. Summarize the key points from the voice note
2. Extract specific insights about individual players or the team
3. Match player names to the roster when possible
4. Categorize insights:
   - injury: physical injuries, knocks, strains (PLAYER-SPECIFIC)
   - skill_rating: when coach mentions a specific numeric rating/score for a skill (PLAYER-SPECIFIC)
   - skill_progress: general skill improvement comments without specific numeric ratings (PLAYER-SPECIFIC)
   - behavior: attitude, effort, teamwork issues (PLAYER-SPECIFIC)
   - performance: match/training performance observations (PLAYER-SPECIFIC)
   - attendance: presence/absence at sessions (PLAYER-SPECIFIC)
   - team_culture: team morale, culture, collective behavior (TEAM-WIDE, no player)
   - todo: action items the coach needs to do - NOT about players (e.g., "order new cones", "book pitch", "schedule parent meeting", "prepare training plan")
5. Suggest concrete actions the coach should take

CATEGORIZATION RULES:
- If it's about a specific player → must have playerName
- If it's about the whole team → use team_culture, playerName should be null
- If it's a task/action for the coach to do → use todo, playerName should be null
- skill_rating: include the rating number in recommendedUpdate (e.g., "Set to 3/5")

Team Roster (JSON array):
${rosterContext}

CRITICAL PLAYER MATCHING INSTRUCTIONS:
- When you identify a player name in the voice note, find them in the roster JSON above
- Use the EXACT "id" field from the matching roster entry as the playerId in your response
- Match by comparing the mentioned name to "fullName", "firstName", or "lastName" fields
- If you find a match, you MUST include the "id" as the playerId

MATCHING EXAMPLES:
Example 1: Voice note says "Clodagh Barlow injured her hand"
  Roster has: {"id": "mx7fsvhh...", "fullName": "Clodagh Barlow", ...}
  Return: {"playerName": "Clodagh Barlow", "playerId": "mx7fsvhh..."}

Example 2: Voice note says "Sinead had a great session"
  Roster has: {"id": "abc123", "firstName": "Sinead", "lastName": "Haughey", ...}
  Return: {"playerName": "Sinead Haughey", "playerId": "abc123"}

Example 3: Voice note says "John improved his passing" but John is not in roster
  Return: {"playerName": "John", "playerId": null}

IMPORTANT:
- If a player name doesn't match the roster, still extract with playerName but set playerId to null
- For team_culture and todo categories, both playerName and playerId should be null
- Be specific and actionable in your recommendations`,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Voice note (${note.type} session):\n\n${transcription}`,
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(insightSchema, "insights"),
        },
      });

      // Parse the response
      const outputText = Array.isArray(response.output_text)
        ? response.output_text.join("\n")
        : ((response.output_text as string | undefined) ?? "");
      const parsed = insightSchema.safeParse(JSON.parse(outputText || "{}"));

      if (!parsed.success) {
        throw new Error(`Failed to parse AI response: ${parsed.error.message}`);
      }

      // Resolve player IDs and build insights array
      // Now using playerIdentityId for the new identity system
      const resolvedInsights = parsed.data.insights.map((insight) => {
        const matchedPlayer = findMatchingPlayer(insight, players);
        return {
          id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          playerIdentityId: matchedPlayer?.playerIdentityId ?? undefined,
          playerName: matchedPlayer?.name ?? insight.playerName ?? undefined,
          title: insight.title,
          description: insight.description,
          category: insight.category ?? undefined,
          recommendedUpdate: insight.recommendedUpdate ?? undefined,
          status: "pending" as const,
        };
      });

      // Update the note with insights
      await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
        noteId: args.noteId,
        summary: parsed.data.summary,
        insights: resolvedInsights,
        status: "completed",
      });

      // Log summary of matching results
      const matchedCount = resolvedInsights.filter(
        (i) => i.playerIdentityId
      ).length;
      const unmatchedCount = resolvedInsights.filter(
        (i) => !i.playerIdentityId && i.playerName
      ).length;
      console.log(
        `[Voice Note ${args.noteId}] Insights: ${resolvedInsights.length} total, ${matchedCount} matched to players, ${unmatchedCount} unmatched with names`
      );

      // Check if parent summaries are enabled for this coach
      const parentSummariesEnabled = await ctx.runQuery(
        internal.models.coachTrustLevels.isParentSummariesEnabled,
        {
          coachId: note.coachId || "",
          organizationId: note.orgId,
        }
      );

      console.log(
        `[Voice Note ${args.noteId}] Parent summaries enabled: ${parentSummariesEnabled} (coachId: ${note.coachId || "MISSING"})`
      );

      // Schedule parent summary generation for each insight with a player
      // Phase 3: Injury and behavior categories now flow through with manual review required
      if (parentSummariesEnabled) {
        const insightsWithPlayers = resolvedInsights.filter(
          (i) => i.playerIdentityId
        );
        console.log(
          `[Voice Note ${args.noteId}] Scheduling parent summaries for ${insightsWithPlayers.length}/${resolvedInsights.length} insights`
        );

        for (const insight of resolvedInsights) {
          if (insight.playerIdentityId) {
            console.log(
              `[Parent Summary] Scheduling: "${insight.title}" for player ${insight.playerName} (category: ${insight.category})`
            );
            await ctx.scheduler.runAfter(
              0,
              internal.actions.coachParentSummaries.processVoiceNoteInsight,
              {
                voiceNoteId: args.noteId,
                insightId: insight.id,
                insightTitle: insight.title,
                insightDescription: insight.description,
                playerIdentityId: insight.playerIdentityId,
                organizationId: note.orgId,
                coachId: note.coachId || undefined,
              }
            );
          } else if (insight.playerName) {
            // Log insights that have a player name but couldn't be matched
            console.warn(
              `[Parent Summary] ⚠️ SKIPPED: "${insight.title}" - player "${insight.playerName}" not matched to team. No parent summary will be created.`
            );
          }
        }
      } else {
        console.log(
          `[Parent Summary] ⚠️ DISABLED: Coach has disabled parent summaries. ${resolvedInsights.filter((i) => i.playerIdentityId).length} insights will be captured without parent summaries.`
        );
      }
    } catch (error) {
      console.error("Failed to build insights:", error);
      await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
        noteId: args.noteId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return null;
  },
});

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Player type from identity system
type PlayerFromOrg = {
  _id: Id<"playerIdentities">;
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  name: string;
  ageGroup: string;
  sport: string | null;
};

function findMatchingPlayer(
  insight: z.infer<typeof insightSchema>["insights"][number],
  players: PlayerFromOrg[]
): PlayerFromOrg | undefined {
  const searchName = insight.playerName;

  if (!players.length) {
    console.log(
      `[Player Matching] No players in roster to match against for insight: "${insight.title}"`
    );
    return;
  }

  // Try to match by ID first (from AI response)
  if (insight.playerId) {
    const matchById = players.find(
      (player) => player.playerIdentityId === insight.playerId
    );
    if (matchById) {
      console.log(
        `[Player Matching] ✅ Matched by ID: ${matchById.name} (${insight.playerId})`
      );
      return matchById;
    }
    console.log(
      `[Player Matching] ID "${insight.playerId}" not found in roster`
    );
  }

  // Try to match by name
  if (searchName !== null && typeof searchName === "string") {
    const normalizedSearch = searchName.toLowerCase().trim();

    // Exact full name match
    const exactMatch = players.find(
      (player) => player.name.toLowerCase() === normalizedSearch
    );
    if (exactMatch) {
      console.log(
        `[Player Matching] ✅ Exact match: "${searchName}" → ${exactMatch.name}`
      );
      return exactMatch;
    }

    // First name + Last name match
    const nameMatch = players.find((player) => {
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
      return fullName === normalizedSearch;
    });
    if (nameMatch) {
      console.log(
        `[Player Matching] ✅ Full name match: "${searchName}" → ${nameMatch.name}`
      );
      return nameMatch;
    }

    // First name only match - check for duplicates!
    const firstNameMatches = players.filter(
      (player) => player.firstName.toLowerCase() === normalizedSearch
    );
    if (firstNameMatches.length === 1) {
      console.log(
        `[Player Matching] ✅ First name match: "${searchName}" → ${firstNameMatches[0].name}`
      );
      return firstNameMatches[0];
    }
    if (firstNameMatches.length > 1) {
      // Multiple players with same first name - log and skip (ambiguous)
      console.warn(
        `[Player Matching] ⚠️ AMBIGUOUS: "${searchName}" matches ${firstNameMatches.length} players: ${firstNameMatches.map((p) => `${p.name} (${p.ageGroup})`).join(", ")}. Skipping match - please use full name.`
      );
      // Don't return - let it fall through to partial match or fail
    }

    // Partial match (name contains the search term) - also check for duplicates
    const partialMatches = players.filter(
      (player) =>
        player.name.toLowerCase().includes(normalizedSearch) ||
        normalizedSearch.includes(player.name.toLowerCase())
    );
    if (partialMatches.length === 1) {
      console.log(
        `[Player Matching] ✅ Partial match: "${searchName}" → ${partialMatches[0].name}`
      );
      return partialMatches[0];
    }
    if (partialMatches.length > 1) {
      console.warn(
        `[Player Matching] ⚠️ AMBIGUOUS partial: "${searchName}" matches ${partialMatches.length} players: ${partialMatches.map((p) => p.name).join(", ")}. Skipping.`
      );
    }

    // No match found - log helpful debug info
    console.warn(
      `[Player Matching] ❌ No match for "${searchName}". Roster has ${players.length} players: ${players
        .slice(0, 10)
        .map((p) => p.firstName)
        .join(", ")}${players.length > 10 ? "..." : ""}`
    );
  } else {
    console.log(
      `[Player Matching] No player name provided for insight: "${insight.title}"`
    );
  }

  return;
}

/**
 * AI fallback to correct player name in insight text
 * Called when pattern matching fails to find the wrong name
 * Uses GPT to intelligently rewrite the text with the correct name
 */
export const correctInsightPlayerName = internalAction({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    wrongName: v.string(),
    correctName: v.string(),
    originalTitle: v.string(),
    originalDescription: v.string(),
    originalRecommendedUpdate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(
      `[AI Name Correction] Starting for "${args.wrongName}" -> "${args.correctName}"`
    );

    const openai = getOpenAI();

    const prompt = `You are correcting a player name in sports coaching feedback.

The voice transcription incorrectly heard the player's name as "${args.wrongName}" but the correct name is "${args.correctName}".

Please rewrite the following text, replacing any instance of the wrong name (or similar variations) with the correct name. Keep everything else exactly the same.

Title: ${args.originalTitle}
Description: ${args.originalDescription}${args.originalRecommendedUpdate ? `\nRecommendedUpdate: ${args.originalRecommendedUpdate}` : ""}

Respond in JSON format:
{
  "title": "corrected title with correct player name",
  "description": "corrected description with correct player name",${args.originalRecommendedUpdate ? '\n  "recommendedUpdate": "corrected recommendedUpdate with correct player name",' : ""}
  "wasModified": true/false (whether any changes were made)
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("[AI Name Correction] No response from AI");
        return null;
      }

      const result = JSON.parse(content);

      if (result.wasModified) {
        console.log(
          `[AI Name Correction] Successfully corrected: "${args.originalTitle}" -> "${result.title}"`
        );

        // Update the insight in the database
        await ctx.runMutation(
          internal.models.voiceNotes.updateInsightContentInternal,
          {
            noteId: args.noteId,
            insightId: args.insightId,
            title: result.title,
            description: result.description,
            recommendedUpdate: result.recommendedUpdate,
          }
        );
      } else {
        console.log(
          `[AI Name Correction] AI found no changes needed for "${args.originalTitle}"`
        );
      }
    } catch (error) {
      console.error("[AI Name Correction] Error:", error);
    }

    return null;
  },
});
