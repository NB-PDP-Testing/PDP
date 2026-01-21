/**
 * One-time cleanup script to remove old voice notes and summaries without coachId
 * Run this once to clean up development data
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const cleanupOldVoiceNotes = internalMutation({
  args: {},
  returns: v.object({
    deletedVoiceNotes: v.number(),
    deletedSummaries: v.number(),
  }),
  handler: async (ctx) => {
    let deletedVoiceNotes = 0;
    let deletedSummaries = 0;

    // 1. Find and delete all voice notes without coachId
    const allVoiceNotes = await ctx.db.query("voiceNotes").collect();

    for (const note of allVoiceNotes) {
      if (!note.coachId || note.coachId === "") {
        await ctx.db.delete(note._id);
        deletedVoiceNotes++;
      }
    }

    // 2. Find and delete all summaries without coachId
    const allSummaries = await ctx.db.query("coachParentSummaries").collect();

    for (const summary of allSummaries) {
      if (!summary.coachId || summary.coachId === "") {
        await ctx.db.delete(summary._id);
        deletedSummaries++;
      }
    }

    return { deletedVoiceNotes, deletedSummaries };
  },
});
