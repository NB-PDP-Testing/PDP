import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Delete User and All Related Data
 *
 * This script deletes a user and all their associated data from the database.
 * Use with caution - this is irreversible!
 *
 * Usage:
 * npx convex run scripts/deleteUser:deleteUserByEmail '{"email": "user@example.com", "dryRun": true}' --prod
 *
 * Set dryRun: false to actually delete the data
 */
export const deleteUserByEmail = internalMutation({
  args: {
    email: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    deletedRecords: v.object({
      user: v.number(),
      sessions: v.number(),
      members: v.number(),
      invitations: v.number(),
      coachAssignments: v.number(),
      parentPlayerLinks: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const email = args.email.toLowerCase().trim();

    console.log(`[DeleteUser] ${dryRun ? "DRY RUN" : "EXECUTING"}: Deleting user ${email}`);

    let deletedRecords = {
      user: 0,
      sessions: 0,
      members: 0,
      invitations: 0,
      coachAssignments: 0,
      parentPlayerLinks: 0,
    };

    // 1. Find the user
    const users = await ctx.db.query("user").collect();
    const user = users.find(u => u.email.toLowerCase() === email);

    if (!user) {
      console.log(`[DeleteUser] ❌ User not found: ${email}`);
      return {
        success: false,
        message: `User not found: ${email}`,
        deletedRecords,
      };
    }

    console.log(`[DeleteUser] ✓ Found user: ${user.id} (${user.email})`);

    // 2. Delete sessions
    const sessions = await ctx.db.query("session").collect();
    const userSessions = sessions.filter(s => s.userId === user.id);

    console.log(`[DeleteUser] Found ${userSessions.length} sessions to delete`);

    if (!dryRun) {
      for (const session of userSessions) {
        await ctx.db.delete(session._id);
        deletedRecords.sessions++;
      }
    } else {
      deletedRecords.sessions = userSessions.length;
    }

    // 3. Delete organization memberships
    const members = await ctx.db.query("member").collect();
    const userMembers = members.filter(m => m.userId === user.id);

    console.log(`[DeleteUser] Found ${userMembers.length} organization memberships to delete`);

    if (!dryRun) {
      for (const member of userMembers) {
        await ctx.db.delete(member._id);
        deletedRecords.members++;
      }
    } else {
      deletedRecords.members = userMembers.length;
    }

    // 4. Delete pending invitations
    const invitations = await ctx.db.query("invitation").collect();
    const userInvitations = invitations.filter(
      i => i.email.toLowerCase() === email
    );

    console.log(`[DeleteUser] Found ${userInvitations.length} invitations to delete`);

    if (!dryRun) {
      for (const invitation of userInvitations) {
        await ctx.db.delete(invitation._id);
        deletedRecords.invitations++;
      }
    } else {
      deletedRecords.invitations = userInvitations.length;
    }

    // 5. Delete coach team assignments (if coachAssignments table exists)
    try {
      const coachAssignments = await ctx.db.query("coachAssignments").collect();
      const userCoachAssignments = coachAssignments.filter(
        ca => ca.userId === user.id
      );

      console.log(`[DeleteUser] Found ${userCoachAssignments.length} coach assignments to delete`);

      if (!dryRun) {
        for (const assignment of userCoachAssignments) {
          await ctx.db.delete(assignment._id);
          deletedRecords.coachAssignments++;
        }
      } else {
        deletedRecords.coachAssignments = userCoachAssignments.length;
      }
    } catch (error) {
      console.log(`[DeleteUser] No coachAssignments table or error: ${error}`);
    }

    // 6. Delete parent-player links (if guardianPlayerLinks table exists)
    try {
      const guardianLinks = await ctx.db.query("guardianPlayerLinks").collect();
      const userGuardianLinks = guardianLinks.filter(
        gl => gl.guardianUserId === user.id
      );

      console.log(`[DeleteUser] Found ${userGuardianLinks.length} parent-player links to delete`);

      if (!dryRun) {
        for (const link of userGuardianLinks) {
          await ctx.db.delete(link._id);
          deletedRecords.parentPlayerLinks++;
        }
      } else {
        deletedRecords.parentPlayerLinks = userGuardianLinks.length;
      }
    } catch (error) {
      console.log(`[DeleteUser] No guardianPlayerLinks table or error: ${error}`);
    }

    // 7. Finally, delete the user
    console.log(`[DeleteUser] Deleting user record: ${user.id}`);

    if (!dryRun) {
      await ctx.db.delete(user._id);
      deletedRecords.user = 1;
    } else {
      deletedRecords.user = 1;
    }

    const summary = dryRun
      ? `DRY RUN: Would delete user ${email} and ${deletedRecords.sessions + deletedRecords.members + deletedRecords.invitations + deletedRecords.coachAssignments + deletedRecords.parentPlayerLinks} related records`
      : `Successfully deleted user ${email} and all related data`;

    console.log(`[DeleteUser] ✅ ${summary}`);
    console.log(`[DeleteUser] Deleted records:`, deletedRecords);

    return {
      success: true,
      message: summary,
      deletedRecords,
    };
  },
});
