import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Emergency Contacts Model
 *
 * CRUD operations for adult player emergency contacts.
 * Adult players manage their own emergency contacts (instead of guardians).
 */

// Get all emergency contacts for a player
export const getForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Sort by priority
    return contacts.sort((a, b) => a.priority - b.priority);
  },
});

// Get all emergency contacts for a player (by priority)
export const getByPriority = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_priority", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect(),
});

// Get ICE contacts (priority 1 or 2) for a player
export const getICEContacts = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_priority", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Return only priority 1 and 2 (ICE contacts)
    return contacts.filter((c) => c.priority <= 2);
  },
});

// Get emergency contacts for multiple players (for coaches/match day)
export const getForPlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  handler: async (ctx, args) => {
    const result: Record<string, any[]> = {};

    for (const playerId of args.playerIdentityIds) {
      const contacts = await ctx.db
        .query("playerEmergencyContacts")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
        .collect();

      result[playerId] = contacts.sort((a, b) => a.priority - b.priority);
    }

    return result;
  },
});

// Get all emergency contacts for an organization (for coaches match day view)
export const getForOrganization = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all adult player enrollments for this org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get player identities for these enrollments (only adults)
    const result = [];

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player || player.playerType !== "adult") {
        continue;
      }

      const contacts = await ctx.db
        .query("playerEmergencyContacts")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      result.push({
        player: {
          _id: player._id,
          name: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          ageGroup: enrollment.ageGroup,
        },
        contacts: contacts.sort((a, b) => a.priority - b.priority),
        hasICE: contacts.some((c) => c.priority <= 2),
      });
    }

    return result;
  },
});

// Create a new emergency contact
export const create = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    relationship: v.string(),
    priority: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify player exists and is an adult
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Get existing contacts to manage priority
    const existingContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // If this priority conflicts, shift other contacts
    for (const contact of existingContacts) {
      if (contact.priority >= args.priority) {
        await ctx.db.patch(contact._id, {
          priority: contact.priority + 1,
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    const contactId = await ctx.db.insert("playerEmergencyContacts", {
      playerIdentityId: args.playerIdentityId,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      email: args.email,
      relationship: args.relationship,
      priority: args.priority,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return contactId;
  },
});

// Update an emergency contact
export const update = mutation({
  args: {
    contactId: v.id("playerEmergencyContacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    relationship: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName;
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName;
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone;
    }
    if (args.email !== undefined) {
      updates.email = args.email;
    }
    if (args.relationship !== undefined) {
      updates.relationship = args.relationship;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.contactId, updates);

    return { success: true };
  },
});

// Update priority of a contact
export const updatePriority = mutation({
  args: {
    contactId: v.id("playerEmergencyContacts"),
    newPriority: v.number(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const oldPriority = contact.priority;
    if (oldPriority === args.newPriority) {
      return { success: true };
    }

    // Get all contacts for this player
    const allContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", contact.playerIdentityId)
      )
      .collect();

    const now = Date.now();

    if (args.newPriority < oldPriority) {
      // Moving up: shift contacts between newPriority and oldPriority down
      for (const c of allContacts) {
        if (
          c._id !== args.contactId &&
          c.priority >= args.newPriority &&
          c.priority < oldPriority
        ) {
          await ctx.db.patch(c._id, {
            priority: c.priority + 1,
            updatedAt: now,
          });
        }
      }
    } else {
      // Moving down: shift contacts between oldPriority and newPriority up
      for (const c of allContacts) {
        if (
          c._id !== args.contactId &&
          c.priority > oldPriority &&
          c.priority <= args.newPriority
        ) {
          await ctx.db.patch(c._id, {
            priority: c.priority - 1,
            updatedAt: now,
          });
        }
      }
    }

    // Update the target contact's priority
    await ctx.db.patch(args.contactId, {
      priority: args.newPriority,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Delete an emergency contact
export const remove = mutation({
  args: {
    contactId: v.id("playerEmergencyContacts"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const deletedPriority = contact.priority;
    const playerIdentityId = contact.playerIdentityId;

    // Delete the contact
    await ctx.db.delete(args.contactId);

    // Reorder remaining contacts to fill the gap
    const remainingContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .collect();

    const now = Date.now();
    for (const c of remainingContacts) {
      if (c.priority > deletedPriority) {
        await ctx.db.patch(c._id, { priority: c.priority - 1, updatedAt: now });
      }
    }

    return { success: true };
  },
});

// Reorder all contacts for a player (bulk priority update)
export const reorderAll = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    contactOrder: v.array(v.id("playerEmergencyContacts")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update each contact with its new priority (1-based)
    for (let i = 0; i < args.contactOrder.length; i++) {
      const contactId = args.contactOrder[i];
      await ctx.db.patch(contactId, {
        priority: i + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Check if a player has any emergency contacts
export const hasContacts = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    return contacts !== null;
  },
});

// Get count of emergency contacts for a player
export const getCount = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    return contacts.length;
  },
});
