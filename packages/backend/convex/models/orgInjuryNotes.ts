import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const noteTypeValidator = v.union(
  v.literal("observation"),
  v.literal("training_restriction"),
  v.literal("progress_update"),
  v.literal("clearance"),
  v.literal("follow_up")
);

const addedByRoleValidator = v.union(
  v.literal("coach"),
  v.literal("admin"),
  v.literal("medical_officer")
);

// Note validator for return types
const injuryNoteValidator = v.object({
  _id: v.id("orgInjuryNotes"),
  _creationTime: v.number(),
  injuryId: v.id("playerInjuries"),
  organizationId: v.string(),
  note: v.string(),
  noteType: noteTypeValidator,
  addedBy: v.string(),
  addedByName: v.string(),
  addedByRole: addedByRoleValidator,
  isPrivate: v.boolean(),
  createdAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get note by ID
 */
export const getNoteById = query({
  args: { noteId: v.id("orgInjuryNotes") },
  returns: v.union(injuryNoteValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.noteId),
});

/**
 * Get all notes for an injury
 */
export const getNotesForInjury = query({
  args: {
    injuryId: v.id("playerInjuries"),
    includePrivate: v.optional(v.boolean()),
  },
  returns: v.array(injuryNoteValidator),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("orgInjuryNotes")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", args.injuryId))
      .order("desc")
      .collect();

    if (!args.includePrivate) {
      return notes.filter((n) => !n.isPrivate);
    }

    return notes;
  },
});

/**
 * Get notes for an injury from a specific organization
 */
export const getOrgNotesForInjury = query({
  args: {
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),
    includePrivate: v.optional(v.boolean()),
  },
  returns: v.array(injuryNoteValidator),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("orgInjuryNotes")
      .withIndex("by_org_and_injury", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("injuryId", args.injuryId)
      )
      .order("desc")
      .collect();

    if (!args.includePrivate) {
      return notes.filter((n) => !n.isPrivate);
    }

    return notes;
  },
});

/**
 * Get all notes for an organization
 */
export const getNotesForOrg = query({
  args: {
    organizationId: v.string(),
    noteType: v.optional(noteTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(injuryNoteValidator),
  handler: async (ctx, args) => {
    // Get all notes for injuries where org has notes
    // This is a workaround since we can't efficiently query by org alone
    const notes = await ctx.db
      .query("orgInjuryNotes")
      .withIndex("by_org_and_injury", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    let filtered = notes;

    if (args.noteType) {
      filtered = filtered.filter((n) => n.noteType === args.noteType);
    }

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

/**
 * Get latest note for each injury in an org
 */
export const getLatestNotesForOrg = query({
  args: { organizationId: v.string() },
  returns: v.array(injuryNoteValidator),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("orgInjuryNotes")
      .withIndex("by_org_and_injury", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Get latest for each injury
    const latestByInjury = new Map<string, (typeof notes)[number]>();
    for (const note of notes) {
      const key = note.injuryId;
      if (!latestByInjury.has(key)) {
        latestByInjury.set(key, note);
      }
    }

    return Array.from(latestByInjury.values());
  },
});

/**
 * Get clearance notes for an injury
 */
export const getClearanceNotesForInjury = query({
  args: { injuryId: v.id("playerInjuries") },
  returns: v.array(injuryNoteValidator),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("orgInjuryNotes")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", args.injuryId))
      .collect();

    return notes.filter((n) => n.noteType === "clearance");
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Add a note to an injury
 */
export const addNote = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),
    note: v.string(),
    noteType: noteTypeValidator,
    addedBy: v.string(),
    addedByName: v.string(),
    addedByRole: addedByRoleValidator,
    isPrivate: v.optional(v.boolean()),
  },
  returns: v.id("orgInjuryNotes"),
  handler: async (ctx, args) => {
    // Verify injury exists
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      throw new Error("Injury not found");
    }

    return await ctx.db.insert("orgInjuryNotes", {
      injuryId: args.injuryId,
      organizationId: args.organizationId,
      note: args.note,
      noteType: args.noteType,
      addedBy: args.addedBy,
      addedByName: args.addedByName,
      addedByRole: args.addedByRole,
      isPrivate: args.isPrivate ?? false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Add a training restriction note
 */
export const addTrainingRestriction = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),
    restriction: v.string(),
    addedBy: v.string(),
    addedByName: v.string(),
    addedByRole: addedByRoleValidator,
  },
  returns: v.id("orgInjuryNotes"),
  handler: async (ctx, args) => {
    // Verify injury exists
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      throw new Error("Injury not found");
    }

    return await ctx.db.insert("orgInjuryNotes", {
      injuryId: args.injuryId,
      organizationId: args.organizationId,
      note: args.restriction,
      noteType: "training_restriction",
      addedBy: args.addedBy,
      addedByName: args.addedByName,
      addedByRole: args.addedByRole,
      isPrivate: false, // Restrictions should be visible
      createdAt: Date.now(),
    });
  },
});

/**
 * Add a clearance note
 */
export const addClearance = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),
    clearanceNote: v.string(),
    addedBy: v.string(),
    addedByName: v.string(),
    addedByRole: addedByRoleValidator,
  },
  returns: v.id("orgInjuryNotes"),
  handler: async (ctx, args) => {
    // Verify injury exists
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      throw new Error("Injury not found");
    }

    return await ctx.db.insert("orgInjuryNotes", {
      injuryId: args.injuryId,
      organizationId: args.organizationId,
      note: args.clearanceNote,
      noteType: "clearance",
      addedBy: args.addedBy,
      addedByName: args.addedByName,
      addedByRole: args.addedByRole,
      isPrivate: false, // Clearances should be visible
      createdAt: Date.now(),
    });
  },
});

/**
 * Add a progress update
 */
export const addProgressUpdate = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),
    update: v.string(),
    addedBy: v.string(),
    addedByName: v.string(),
    addedByRole: addedByRoleValidator,
    isPrivate: v.optional(v.boolean()),
  },
  returns: v.id("orgInjuryNotes"),
  handler: async (ctx, args) => {
    // Verify injury exists
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      throw new Error("Injury not found");
    }

    return await ctx.db.insert("orgInjuryNotes", {
      injuryId: args.injuryId,
      organizationId: args.organizationId,
      note: args.update,
      noteType: "progress_update",
      addedBy: args.addedBy,
      addedByName: args.addedByName,
      addedByRole: args.addedByRole,
      isPrivate: args.isPrivate ?? false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete a note (hard delete)
 */
export const deleteNote = mutation({
  args: { noteId: v.id("orgInjuryNotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.noteId);
    if (!existing) {
      throw new Error("Note not found");
    }

    await ctx.db.delete(args.noteId);
    return null;
  },
});
