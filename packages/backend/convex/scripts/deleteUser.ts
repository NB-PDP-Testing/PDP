// @ts-nocheck
import type {
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from "convex/server";
import { v } from "convex/values";
import type { DataModel } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

/**
 * Type helper for Better Auth tables (not in Convex schema)
 * These tables are managed by the Better Auth component
 */
type BetterAuthDb = GenericDatabaseReader<DataModel> & {
  query(tableName: "user" | "session" | "member" | "invitation"): any;
};

type BetterAuthDbWriter = GenericDatabaseWriter<DataModel> & {
  query(tableName: "user" | "session" | "member" | "invitation"): any;
  delete(id: string): Promise<void>;
};

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

    console.log(
      `[DeleteUser] ${dryRun ? "DRY RUN" : "EXECUTING"}: Deleting user ${email}`
    );

    const deletedRecords = {
      user: 0,
      sessions: 0,
      members: 0,
      invitations: 0,
      coachAssignments: 0,
      parentPlayerLinks: 0,
    };

    // 1. Find the user
    const users = await (ctx.db as BetterAuthDb).query("user").collect();
    const user = users.find((u: any) => u.email.toLowerCase() === email);

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
    const sessions = await (ctx.db as BetterAuthDb).query("session").collect();
    const userSessions = sessions.filter((s: any) => s.userId === user.id);

    console.log(`[DeleteUser] Found ${userSessions.length} sessions to delete`);

    if (dryRun) {
      deletedRecords.sessions = userSessions.length;
    } else {
      for (const session of userSessions) {
        await ctx.db.delete(session._id);
        deletedRecords.sessions++;
      }
    }

    // 3. Delete organization memberships
    const members = await (ctx.db as BetterAuthDb).query("member").collect();
    const userMembers = members.filter((m: any) => m.userId === user.id);

    console.log(
      `[DeleteUser] Found ${userMembers.length} organization memberships to delete`
    );

    if (dryRun) {
      deletedRecords.members = userMembers.length;
    } else {
      for (const member of userMembers) {
        await ctx.db.delete(member._id);
        deletedRecords.members++;
      }
    }

    // 4. Delete pending invitations
    const invitations = await (ctx.db as BetterAuthDb)
      .query("invitation")
      .collect();
    const userInvitations = invitations.filter(
      (i: any) => i.email.toLowerCase() === email
    );

    console.log(
      `[DeleteUser] Found ${userInvitations.length} invitations to delete`
    );

    if (dryRun) {
      deletedRecords.invitations = userInvitations.length;
    } else {
      for (const invitation of userInvitations) {
        await ctx.db.delete(invitation._id);
        deletedRecords.invitations++;
      }
    }

    // 5. Delete coach team assignments (if coachAssignments table exists)
    try {
      const coachAssignments = await ctx.db.query("coachAssignments").collect();
      const userCoachAssignments = coachAssignments.filter(
        (ca) => ca.userId === user.id
      );

      console.log(
        `[DeleteUser] Found ${userCoachAssignments.length} coach assignments to delete`
      );

      if (dryRun) {
        deletedRecords.coachAssignments = userCoachAssignments.length;
      } else {
        for (const assignment of userCoachAssignments) {
          await ctx.db.delete(assignment._id);
          deletedRecords.coachAssignments++;
        }
      }
    } catch (error) {
      console.log(`[DeleteUser] No coachAssignments table or error: ${error}`);
    }

    // 6. Delete parent-player links (if guardianPlayerLinks table exists)
    try {
      // First, find all guardian identities for this user
      const guardianIdentities = await ctx.db
        .query("guardianIdentities")
        .collect();
      const userGuardianIdentities = guardianIdentities.filter(
        (gi) => gi.userId === user._id
      );
      const guardianIdentityIds = userGuardianIdentities.map((gi) => gi._id);

      // Then find all guardian-player links for those identities
      const guardianLinks = await ctx.db.query("guardianPlayerLinks").collect();
      const userGuardianLinks = guardianLinks.filter((gl) =>
        guardianIdentityIds.includes(gl.guardianIdentityId)
      );

      console.log(
        `[DeleteUser] Found ${userGuardianLinks.length} parent-player links to delete`
      );

      if (dryRun) {
        deletedRecords.parentPlayerLinks = userGuardianLinks.length;
      } else {
        for (const link of userGuardianLinks) {
          await ctx.db.delete(link._id);
          deletedRecords.parentPlayerLinks++;
        }
      }
    } catch (error) {
      console.log(
        `[DeleteUser] No guardianPlayerLinks table or error: ${error}`
      );
    }

    // 7. Finally, delete the user
    console.log(`[DeleteUser] Deleting user record: ${user.id}`);

    if (dryRun) {
      deletedRecords.user = 1;
    } else {
      await ctx.db.delete(user._id);
      deletedRecords.user = 1;
    }

    const summary = dryRun
      ? `DRY RUN: Would delete user ${email} and ${deletedRecords.sessions + deletedRecords.members + deletedRecords.invitations + deletedRecords.coachAssignments + deletedRecords.parentPlayerLinks} related records`
      : `Successfully deleted user ${email} and all related data`;

    console.log(`[DeleteUser] ✅ ${summary}`);
    console.log("[DeleteUser] Deleted records:", deletedRecords);

    return {
      success: true,
      message: summary,
      deletedRecords,
    };
  },
});
