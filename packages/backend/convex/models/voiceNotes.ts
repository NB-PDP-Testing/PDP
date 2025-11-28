import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// Voice Note Types
const insightTypeValidator = v.union(
  v.literal("goal_progress"),
  v.literal("skill_update"),
  v.literal("injury"),
  v.literal("attendance"),
  v.literal("behavior"),
  v.literal("performance"),
  v.literal("team_insight")
);

const insightStatusValidator = v.union(
  v.literal("pending"),
  v.literal("applied"),
  v.literal("dismissed")
);

const voiceInsightValidator = v.object({
  id: v.string(),
  type: insightTypeValidator,
  playerIds: v.array(v.string()),
  description: v.string(),
  confidence: v.number(),
  suggestedAction: v.string(),
  source: v.optional(v.union(v.literal("pattern"), v.literal("ai"))),
  metadata: v.any(),
  status: insightStatusValidator,
  appliedDate: v.optional(v.string()),
});

// ============ QUERIES ============

/**
 * Get all voice notes for an organization
 */
export const getAllVoiceNotes = query({
  args: {
    orgId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: v.union(
        v.literal("training"),
        v.literal("match"),
        v.literal("general")
      ),
      transcription: v.string(),
      insights: v.array(voiceInsightValidator),
      processed: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    return notes;
  },
});

/**
 * Get voice notes by coach
 */
export const getVoiceNotesByCoach = query({
  args: {
    orgId: v.id("organizations"),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: v.union(
        v.literal("training"),
        v.literal("match"),
        v.literal("general")
      ),
      transcription: v.string(),
      insights: v.array(voiceInsightValidator),
      processed: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId_and_coachId", (q) =>
        q.eq("orgId", args.orgId).eq("coachId", args.coachId)
      )
      .order("desc")
      .collect();

    return notes;
  },
});

/**
 * Get pending insights for an organization
 */
export const getPendingInsights = query({
  args: {
    orgId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      noteId: v.id("voiceNotes"),
      insight: voiceInsightValidator,
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const pendingInsights: Array<{
      noteId: (typeof notes)[0]["_id"];
      insight: (typeof notes)[0]["insights"][0];
    }> = [];

    for (const note of notes) {
      for (const insight of note.insights) {
        if (insight.status === "pending") {
          pendingInsights.push({
            noteId: note._id,
            insight,
          });
        }
      }
    }

    return pendingInsights;
  },
});

// ============ MUTATIONS ============

/**
 * Create a new voice note
 */
export const createVoiceNote = mutation({
  args: {
    orgId: v.id("organizations"),
    coachId: v.optional(v.string()),
    noteText: v.string(),
    noteType: v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("general")
    ),
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
      transcription: args.noteText,
      insights: [],
      processed: false,
    });

    // Schedule AI processing
    await ctx.scheduler.runAfter(
      0,
      internal.models.voiceNotes.processVoiceNoteWithAI,
      {
        noteId,
      }
    );

    return noteId;
  },
});

/**
 * Update insight status
 */
export const updateInsightStatus = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    status: insightStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    const updatedInsights = note.insights.map((insight) => {
      if (insight.id === args.insightId) {
        return {
          ...insight,
          status: args.status,
          appliedDate:
            args.status === "applied" ? new Date().toISOString() : undefined,
        };
      }
      return insight;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    return null;
  },
});

/**
 * Delete a voice note
 */
export const deleteVoiceNote = mutation({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.noteId);
    return null;
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Internal mutation to update note with AI-extracted insights
 */
export const updateNoteWithInsights = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    insights: v.array(voiceInsightValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      insights: args.insights,
      processed: true,
    });

    return null;
  },
});

// ============ ACTIONS ============

/**
 * Process voice note with OpenAI to extract insights
 */
export const processVoiceNoteWithAI = internalAction({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the note
    const note = await ctx.runQuery(internal.models.voiceNotes.getNote, {
      noteId: args.noteId,
    });

    if (!note) {
      throw new Error("Note not found");
    }

    // Get players for context
    const players = await ctx.runQuery(
      internal.models.players.getPlayersByOrgId,
      {
        orgId: note.orgId,
      }
    );

    // Call OpenAI API to extract insights
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      // Mark as processed even if AI fails
      await ctx.runMutation(internal.models.voiceNotes.updateNoteWithInsights, {
        noteId: args.noteId,
        insights: [],
      });
      return null;
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert sports coaching assistant analyzing coach's notes. Extract actionable insights about players.

Available players:
${players.map((p) => `- ${p.name} (${p.ageGroup}, ${p.sport})`).join("\n")}

Extract insights in these categories:
- injury: Physical injuries or concerns
- goal_progress: Progress on skill development
- skill_update: Notable skill observations
- performance: Outstanding performances
- behavior: Attitude and engagement
- attendance: Attendance issues
- team_insight: Team-level observations (no specific player)

Return a JSON array of insights with this structure:
{
  "insights": [
    {
      "type": "injury" | "goal_progress" | "skill_update" | "performance" | "behavior" | "attendance" | "team_insight",
      "playerIds": ["player1", "player2"], // empty array for team insights
      "description": "Brief description",
      "confidence": 0.0-1.0,
      "suggestedAction": "What action to take",
      "metadata": {} // Additional context
    }
  ]
}`,
              },
              {
                role: "user",
                content: note.transcription,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Transform insights to match our schema
      const insights = parsed.insights.map((insight: unknown) => {
        const i = insight as {
          type: string;
          playerIds: string[];
          description: string;
          confidence: number;
          suggestedAction: string;
          metadata: Record<string, unknown>;
        };

        return {
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: i.type,
          playerIds: i.playerIds || [],
          description: i.description,
          confidence: i.confidence,
          suggestedAction: i.suggestedAction,
          source: "ai" as const,
          metadata: {
            ...i.metadata,
            aiModel: "gpt-4o-mini",
          },
          status: "pending" as const,
        };
      });

      // Update note with insights
      await ctx.runMutation(internal.models.voiceNotes.updateNoteWithInsights, {
        noteId: args.noteId,
        insights,
      });
    } catch (error) {
      console.error("Failed to process voice note with AI:", error);
      // Mark as processed even if AI fails
      await ctx.runMutation(internal.models.voiceNotes.updateNoteWithInsights, {
        noteId: args.noteId,
        insights: [],
      });
    }

    return null;
  },
});

/**
 * Internal query to get a note (for actions)
 */
export const getNote = internalQuery({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNotes"),
      orgId: v.id("organizations"),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: v.union(
        v.literal("training"),
        v.literal("match"),
        v.literal("general")
      ),
      transcription: v.string(),
      insights: v.array(voiceInsightValidator),
      processed: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.noteId),
});
