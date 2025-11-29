import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ============ VALIDATORS ============

const insightValidator = v.object({
  id: v.string(),
  playerId: v.optional(v.id("players")),
  playerName: v.optional(v.string()),
  title: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  recommendedUpdate: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed")
  ),
  appliedDate: v.optional(v.string()),
});

const noteTypeValidator = v.union(
  v.literal("training"),
  v.literal("match"),
  v.literal("general")
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// ============ QUERIES ============

/**
 * Get all voice notes for an organization
 */
export const getAllVoiceNotes = query({
  args: {
    orgId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
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
    orgId: v.id("organization"),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.id("organization"),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
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
    orgId: v.id("organization"),
  },
  returns: v.array(
    v.object({
      noteId: v.id("voiceNotes"),
      insight: insightValidator,
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
 * Create a typed voice note (no audio, just text)
 * Schedules AI insights extraction immediately
 */
export const createTypedNote = mutation({
  args: {
    orgId: v.id("organization"),
    coachId: v.optional(v.string()),
    noteText: v.string(),
    noteType: noteTypeValidator,
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
      transcription: args.noteText,
      transcriptionStatus: "completed",
      insights: [],
      insightsStatus: "pending",
    });

    // Schedule AI insights extraction
    await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, {
      noteId,
    });

    return noteId;
  },
});

/**
 * Create a voice note with audio recording
 * Schedules transcription which will then schedule insights extraction
 */
export const createRecordedNote = mutation({
  args: {
    orgId: v.id("organization"),
    coachId: v.optional(v.string()),
    audioStorageId: v.id("_storage"),
    noteType: noteTypeValidator,
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
      audioStorageId: args.audioStorageId,
      transcriptionStatus: "pending",
      insights: [],
      insightsStatus: "pending",
    });

    // Schedule transcription (which will then schedule insights)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.voiceNotes.transcribeAudio,
      { noteId }
    );

    return noteId;
  },
});

/**
 * Generate an upload URL for audio storage
 */
export const generateUploadUrl = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/**
 * Update insight status (apply or dismiss)
 */
export const updateInsightStatus = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    status: v.union(v.literal("applied"), v.literal("dismissed")),
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
    const note = await ctx.db.get(args.noteId);
    if (note?.audioStorageId) {
      await ctx.storage.delete(note.audioStorageId);
    }
    await ctx.db.delete(args.noteId);
    return null;
  },
});

// ============ INTERNAL QUERIES ============

/**
 * Get a note by ID (for internal use by actions)
 */
export const getNote = internalQuery({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNotes"),
      orgId: v.id("organization"),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.noteId),
});

// ============ INTERNAL MUTATIONS ============

/**
 * Update transcription status and content
 */
export const updateTranscription = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    transcription: v.optional(v.string()),
    status: statusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      transcriptionStatus: args.status,
    };

    if (args.transcription !== undefined) {
      updates.transcription = args.transcription;
    }

    if (args.error !== undefined) {
      updates.transcriptionError = args.error;
    }

    await ctx.db.patch(args.noteId, updates);
    return null;
  },
});

/**
 * Update insights status and content
 */
export const updateInsights = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    summary: v.optional(v.string()),
    insights: v.optional(v.array(insightValidator)),
    status: statusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      insightsStatus: args.status,
    };

    if (args.summary !== undefined) {
      updates.summary = args.summary;
    }

    if (args.insights !== undefined) {
      updates.insights = args.insights;
    }

    if (args.error !== undefined) {
      updates.insightsError = args.error;
    }

    await ctx.db.patch(args.noteId, updates);
    return null;
  },
});
