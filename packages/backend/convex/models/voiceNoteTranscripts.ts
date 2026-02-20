/**
 * Voice Note Transcripts - v2 Pipeline
 *
 * Stores detailed transcription data with per-segment confidence scores.
 * Each transcript links to its parent voiceNoteArtifact.
 *
 * All functions are internal (server-to-server only) since transcripts
 * are created by the transcription pipeline, not by clients directly.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

const segmentValidator = v.object({
  text: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  confidence: v.number(),
});

// Regex for word splitting (top-level for performance)
const WORD_SPLIT_REGEX = /\s+/;

/**
 * Store a completed transcription for an artifact.
 * Called after Whisper (or other STT) returns transcription results.
 */
export const createTranscript = internalMutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
    fullText: v.string(),
    segments: v.array(segmentValidator),
    modelUsed: v.string(),
    language: v.string(),
    duration: v.number(),
  },
  returns: v.id("voiceNoteTranscripts"),
  handler: async (ctx, args) => {
    const transcriptId = await ctx.db.insert("voiceNoteTranscripts", {
      artifactId: args.artifactId,
      fullText: args.fullText,
      segments: args.segments,
      modelUsed: args.modelUsed,
      language: args.language,
      duration: args.duration,
      createdAt: Date.now(),
    });

    // Fetch artifact to get organizationId for event logging
    const artifact = await ctx.db.get(args.artifactId);

    // Calculate average confidence score from segments
    const avgConfidence =
      args.segments.length > 0
        ? args.segments.reduce((sum, seg) => sum + seg.confidence, 0) /
          args.segments.length
        : undefined;

    // Fire-and-forget event logging
    await ctx.scheduler.runAfter(
      0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "transcription_completed",
        artifactId: args.artifactId,
        organizationId: artifact?.orgContextCandidates?.[0]?.organizationId,
        pipelineStage: "transcription",
        stageCompletedAt: Date.now(),
        metadata: {
          transcriptDuration: args.duration,
          transcriptWordCount: args.fullText.split(WORD_SPLIT_REGEX).length,
          aiModel: args.modelUsed,
          confidenceScore: avgConfidence,
        },
      }
    );

    return transcriptId;
  },
});

/**
 * Get the transcript for a specific artifact.
 * Returns null if no transcript exists yet (still transcribing).
 */
export const getTranscriptByArtifact = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNoteTranscripts"),
      _creationTime: v.number(),
      artifactId: v.id("voiceNoteArtifacts"),
      fullText: v.string(),
      segments: v.array(segmentValidator),
      modelUsed: v.string(),
      language: v.string(),
      duration: v.number(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteTranscripts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first(),
});
