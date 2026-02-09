import { v } from "convex/values";
import { query } from "../_generated/server";

// Usage: npx -w packages/backend convex run scripts/v2MigrationStatus '{"organizationId": "..."}'

export const v2MigrationStatus = query({
  args: { organizationId: v.string() },
  returns: v.object({
    voiceNotes: v.object({ total: v.number() }),
    artifacts: v.object({ total: v.number() }),
    gap: v.number(),
    transcripts: v.number(),
    claims: v.number(),
    entityResolutions: v.object({ total: v.number() }),
    drafts: v.object({
      pending: v.number(),
      confirmed: v.number(),
      rejected: v.number(),
      applied: v.number(),
    }),
    featureFlags: v.object({
      voice_notes_v2: v.boolean(),
      entity_resolution_v2: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    // Voice notes count (has by_orgId index)
    const voiceNotes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.organizationId))
      .collect();

    // Artifacts count — batch fetch via voiceNoteId link (uses by_voiceNoteId index)
    const uniqueNoteIds = [...new Set(voiceNotes.map((vn) => vn._id))];
    const artifactResults = await Promise.all(
      uniqueNoteIds.map((noteId) =>
        ctx.db
          .query("voiceNoteArtifacts")
          .withIndex("by_voiceNoteId", (q) => q.eq("voiceNoteId", noteId))
          .collect()
      )
    );
    const orgArtifacts = artifactResults.flat();

    // Transcripts count — batch fetch via artifactId (uses by_artifactId index)
    const uniqueArtifactIds = [...new Set(orgArtifacts.map((a) => a._id))];
    const transcriptResults = await Promise.all(
      uniqueArtifactIds.map((artifactId) =>
        ctx.db
          .query("voiceNoteTranscripts")
          .withIndex("by_artifactId", (q) => q.eq("artifactId", artifactId))
          .collect()
      )
    );
    const transcriptCount = transcriptResults.flat().length;

    // Claims count (has by_org_and_coach index, use org prefix)
    const claims = await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_org_and_coach", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Entity resolutions count (has by_org_and_status index, use org prefix)
    const entityResolutions = await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Drafts by status (has by_org_and_coach_and_status index, use org prefix)
    const allDrafts = await ctx.db
      .query("insightDrafts")
      .withIndex("by_org_and_coach_and_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const draftCounts = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
      applied: 0,
    };
    for (const draft of allDrafts) {
      if (draft.status === "pending") {
        draftCounts.pending += 1;
      } else if (draft.status === "confirmed") {
        draftCounts.confirmed += 1;
      } else if (draft.status === "rejected") {
        draftCounts.rejected += 1;
      } else if (draft.status === "applied") {
        draftCounts.applied += 1;
      }
    }

    // Feature flags (direct query with composite index)
    const v2Flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q
          .eq("featureKey", "voice_notes_v2")
          .eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();

    const erFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q
          .eq("featureKey", "entity_resolution_v2")
          .eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();

    return {
      voiceNotes: { total: voiceNotes.length },
      artifacts: { total: orgArtifacts.length },
      gap: voiceNotes.length - orgArtifacts.length,
      transcripts: transcriptCount,
      claims: claims.length,
      entityResolutions: { total: entityResolutions.length },
      drafts: draftCounts,
      featureFlags: {
        voice_notes_v2: v2Flag?.enabled ?? false,
        entity_resolution_v2: erFlag?.enabled ?? false,
      },
    };
  },
});
