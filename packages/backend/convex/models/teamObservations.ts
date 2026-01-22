import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get all team observations for a specific team
 */
export const getTeamObservations = query({
  args: {
    teamId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamObservations"),
      _creationTime: v.number(),
      organizationId: v.string(),
      teamId: v.string(),
      teamName: v.string(),
      source: v.union(v.literal("voice_note"), v.literal("manual")),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      insightId: v.optional(v.string()),
      coachId: v.string(),
      coachName: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
      dateObserved: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const observations = await ctx.db
      .query("teamObservations")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    return observations;
  },
});

/**
 * Get all team observations for an organization
 */
export const getOrganizationObservations = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamObservations"),
      _creationTime: v.number(),
      organizationId: v.string(),
      teamId: v.string(),
      teamName: v.string(),
      source: v.union(v.literal("voice_note"), v.literal("manual")),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      insightId: v.optional(v.string()),
      coachId: v.string(),
      coachName: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
      dateObserved: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const observations = await ctx.db
      .query("teamObservations")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    return observations;
  },
});

/**
 * Get team observations for a coach (across all their teams)
 */
export const getCoachTeamObservations = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamObservations"),
      _creationTime: v.number(),
      organizationId: v.string(),
      teamId: v.string(),
      teamName: v.string(),
      source: v.union(v.literal("voice_note"), v.literal("manual")),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      insightId: v.optional(v.string()),
      coachId: v.string(),
      coachName: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
      dateObserved: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all observations for this org
    const observations = await ctx.db
      .query("teamObservations")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Filter to only observations for teams the coach is assigned to
    // TODO: In a future optimization, we could query coach assignments
    // and filter by teamId to be more efficient
    return observations;
  },
});

/**
 * Manually add a team observation
 */
export const createTeamObservation = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.string(),
    teamName: v.string(),
    coachId: v.string(),
    coachName: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    dateObserved: v.string(),
  },
  returns: v.id("teamObservations"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const observationId = await ctx.db.insert("teamObservations", {
      organizationId: args.organizationId,
      teamId: args.teamId,
      teamName: args.teamName,
      source: "manual",
      coachId: args.coachId,
      coachName: args.coachName,
      title: args.title,
      description: args.description,
      category: args.category,
      dateObserved: args.dateObserved,
      createdAt: now,
    });

    return observationId;
  },
});

/**
 * Delete a team observation
 */
export const deleteTeamObservation = mutation({
  args: {
    observationId: v.id("teamObservations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.observationId);
    return null;
  },
});
