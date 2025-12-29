import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// Emergency contact validator for return types
const emergencyContactValidator = v.object({
  _id: v.id("playerEmergencyContacts"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  relationship: v.string(),
  priority: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all emergency contacts for a player
 */
export const getEmergencyContacts = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.array(emergencyContactValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_priority", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect(),
});

/**
 * Get emergency contact by ID
 */
export const getEmergencyContactById = query({
  args: { contactId: v.id("playerEmergencyContacts") },
  returns: v.union(emergencyContactValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.contactId),
});

/**
 * Get primary (first priority) emergency contact for a player
 */
export const getPrimaryEmergencyContact = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(emergencyContactValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_priority", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("priority", 1)
      )
      .first(),
});

/**
 * Check if a player has any emergency contacts
 */
export const hasEmergencyContacts = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();
    return contact !== null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Add an emergency contact for a player
 */
export const addEmergencyContact = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    relationship: v.string(),
    priority: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("playerEmergencyContacts"),
  handler: async (ctx, args) => {
    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    // If no priority specified, add as next in line
    let priority = args.priority;
    if (priority === undefined) {
      const existingContacts = await ctx.db
        .query("playerEmergencyContacts")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
      priority = existingContacts.length + 1;
    }

    const now = Date.now();

    return await ctx.db.insert("playerEmergencyContacts", {
      playerIdentityId: args.playerIdentityId,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.trim(),
      email: args.email?.toLowerCase().trim(),
      relationship: args.relationship.trim(),
      priority,
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an emergency contact
 */
export const updateEmergencyContact = mutation({
  args: {
    contactId: v.id("playerEmergencyContacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.contactId);
    if (!existing) {
      throw new Error("Emergency contact not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim();
    }
    if (args.email !== undefined) {
      updates.email = args.email.toLowerCase().trim();
    }
    if (args.relationship !== undefined) {
      updates.relationship = args.relationship.trim();
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes.trim();
    }

    await ctx.db.patch(args.contactId, updates);
    return null;
  },
});

/**
 * Delete an emergency contact
 */
export const deleteEmergencyContact = mutation({
  args: { contactId: v.id("playerEmergencyContacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.contactId);
    if (!existing) {
      throw new Error("Emergency contact not found");
    }

    const playerIdentityId = existing.playerIdentityId;
    const deletedPriority = existing.priority;

    await ctx.db.delete(args.contactId);

    // Reorder remaining contacts to close the gap
    const remainingContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .collect();

    for (const contact of remainingContacts) {
      if (contact.priority > deletedPriority) {
        await ctx.db.patch(contact._id, {
          priority: contact.priority - 1,
          updatedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

/**
 * Reorder emergency contacts by setting new priorities
 */
export const reorderContacts = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    contactOrder: v.array(v.id("playerEmergencyContacts")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    // Verify all contacts belong to this player
    for (const contactId of args.contactOrder) {
      const contact = await ctx.db.get(contactId);
      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }
      if (contact.playerIdentityId !== args.playerIdentityId) {
        throw new Error(`Contact ${contactId} does not belong to this player`);
      }
    }

    // Update priorities based on new order
    const now = Date.now();
    for (let i = 0; i < args.contactOrder.length; i++) {
      await ctx.db.patch(args.contactOrder[i], {
        priority: i + 1,
        updatedAt: now,
      });
    }

    return null;
  },
});

/**
 * Set a contact as primary (priority 1)
 */
export const setPrimaryContact = mutation({
  args: { contactId: v.id("playerEmergencyContacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Emergency contact not found");
    }

    if (contact.priority === 1) {
      // Already primary
      return null;
    }

    // Get all contacts for this player
    const allContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", contact.playerIdentityId)
      )
      .collect();

    const now = Date.now();

    // Shift all contacts with priority less than the current contact's priority up by 1
    for (const c of allContacts) {
      if (c._id === args.contactId) {
        await ctx.db.patch(c._id, { priority: 1, updatedAt: now });
      } else if (c.priority < contact.priority) {
        await ctx.db.patch(c._id, { priority: c.priority + 1, updatedAt: now });
      }
    }

    return null;
  },
});
