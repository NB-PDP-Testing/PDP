/**
 * Diagnostic script for the safeGetAuthUser wrong-table bug
 *
 * Run against production:
 *   npx -w packages/backend convex run scripts/diagnoseSafeGetAuthUser:run --prod
 *
 * Run against dev:
 *   npx -w packages/backend convex run scripts/diagnoseSafeGetAuthUser:run
 *
 * Args: email of the affected platform staff user, e.g.:
 *   npx -w packages/backend convex run scripts/diagnoseSafeGetAuthUser:run --prod '{"email":"neil.b@yourmail.com"}'
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

export const run = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // ── 1. Find the betterAuth user by email ──────────────────────────────
    const baUserResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "email", value: args.email, operator: "eq" }],
        paginationOpts: { cursor: null, numItems: 1 },
      }
    );

    const baUser = baUserResult?.page?.[0] ?? null;

    if (!baUser) {
      return { error: `No betterAuth user found for email: ${args.email}` };
    }

    // ── 2. Capture the betterAuth user ID (what safeGetAuthUser gets wrong) ──
    //   baUser._id  = Convex document ID (user table)
    //   baUser.id   = Better Auth string ID (what identity.subject is set to)
    //   baUser.userId = alternate storage of the BA string ID
    const baId: string = (baUser as Record<string, unknown>).id as string;
    const baConvexId: string = (baUser as Record<string, unknown>)
      ._id as string;

    // ── 3. What ctx.db.get(identity.subject) actually returns ─────────────
    // safeGetAuthUser calls ctx.db.get(identity.subject) where subject = baId
    // ctx.db.get() fetches from ANY table — we reproduce that here
    let wrongTableDoc: Record<string, unknown> | null = null;
    let wrongTableError: string | null = null;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: diagnostic script
      wrongTableDoc = (await ctx.db.get(baId as any)) as Record<
        string,
        unknown
      > | null;
    } catch (e) {
      wrongTableError = String(e);
    }

    // ── 4. Check the players table directly for that ID ───────────────────
    // Does this players document have isPlatformStaff on it?
    let playersDoc: Record<string, unknown> | null = null;
    if (wrongTableDoc && wrongTableDoc._id) {
      playersDoc = wrongTableDoc;
    }

    // ── 5. Find sessions for this user ────────────────────────────────────
    const sessions = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "session",
        where: [{ field: "userId", value: baId, operator: "eq" }],
        paginationOpts: { cursor: null, numItems: 5 },
      }
    );

    // ── 6. Summary ────────────────────────────────────────────────────────
    return {
      betterAuthUser: {
        convexDocumentId: baConvexId, // the real Convex _id
        betterAuthStringId: baId, // what identity.subject is set to
        email: baUser.email,
        isPlatformStaff: (baUser as Record<string, unknown>).isPlatformStaff,
        name: baUser.name,
      },
      safeGetAuthUserSimulation: {
        callsDbGetWith: baId,
        result: wrongTableDoc
          ? {
              found: true,
              documentId: wrongTableDoc._id,
              // Convex tells us the table by the ID prefix
              isPlatformStaffOnDoc:
                (wrongTableDoc as Record<string, unknown>).isPlatformStaff ??
                null,
              isActualUserTable: wrongTableDoc._id === baConvexId,
            }
          : { found: false, error: wrongTableError },
      },
      activeSessions: sessions?.page?.length ?? 0,
      diagnosis:
        wrongTableDoc && wrongTableDoc._id !== baConvexId
          ? `⚠️  BUG CONFIRMED: safeGetAuthUser returns the WRONG document. ` +
            `identity.subject="${baId}" decoded to a non-user table document (id=${wrongTableDoc._id}). ` +
            `The betterAuth user's actual Convex _id is "${baConvexId}".`
          : wrongTableDoc && wrongTableDoc._id === baConvexId
            ? "✅ No bug for this user — ctx.db.get(identity.subject) returns the correct user document."
            : `⚠️  ctx.db.get(identity.subject) returned null — safeGetAuthUser would return undefined for this user.`,
    };
  },
});
