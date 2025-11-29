"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

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
            "Category: injury, skill_progress, behavior, performance, attendance, team_culture"
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

      // Transcribe with OpenAI
      const client = getOpenAI();
      const file = await OpenAI.toFile(audioBuffer, "voice-note.webm");
      const transcription = await client.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
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

      // Get players for context
      const players = await ctx.runQuery(
        internal.models.players.getPlayersByOrgId,
        { orgId: note.orgId }
      );

      // Build roster context for AI
      const rosterContext = players.length
        ? players
            .map(
              (player) =>
                `- ${player.name} (ID: ${player._id})${
                  player.ageGroup ? `, Age Group: ${player.ageGroup}` : ""
                }${player.sport ? `, Sport: ${player.sport}` : ""}`
            )
            .join("\n")
        : "No roster context provided.";

      // Call OpenAI to extract insights
      const client = getOpenAI();
      const response = await client.responses.create({
        model: "gpt-4o",
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
4. Categorize insights (injury, skill_progress, behavior, performance, attendance, team_culture)
5. Suggest concrete actions the coach should take

Team Roster:
${rosterContext}

Important:
- Always try to match mentioned player names to the roster and include their exact ID
- If a player name doesn't match the roster exactly, still extract the insight with the playerName field
- Include insights about the whole team with playerName and playerId as null
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
      const resolvedInsights = parsed.data.insights.map((insight) => {
        const matchedPlayer = findMatchingPlayer(insight, players);
        return {
          id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          playerId: matchedPlayer?._id ?? undefined,
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

function findMatchingPlayer(
  insight: z.infer<typeof insightSchema>["insights"][number],
  players: Array<{ _id: Id<"players">; name: string }>
) {
  if (!players.length) {
    return;
  }

  // Try to match by ID first
  if (insight.playerId) {
    const matchById = players.find(
      (player) => player._id === (insight.playerId as Id<"players">)
    );
    if (matchById) {
      return matchById;
    }
  }

  // Try to match by name
  const name = insight.playerName;
  if (name !== null && typeof name === "string") {
    // Exact match
    const exactMatch = players.find(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Partial match (name contains the search term)
    const partialMatch = players.find(
      (player) =>
        player.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(player.name.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch;
    }
  }

  return;
}
