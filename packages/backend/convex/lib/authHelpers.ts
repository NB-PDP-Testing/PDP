import { components } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Require the caller to be authenticated.
 * Returns the userId (identity.subject) or throws.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

/**
 * Verify the user is a member of the given organization.
 * Returns { role, memberId } or throws.
 */
export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  organizationId: string
): Promise<{ role: string; memberId: string }> {
  const memberResult = await ctx.runQuery(
    components.betterAuth.adapter.findMany,
    {
      model: "member",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [
        { field: "userId", value: userId, operator: "eq" },
        { field: "organizationId", value: organizationId, operator: "eq" },
      ],
    }
  );

  const member = memberResult.page[0] as
    | { _id: string; role: string }
    | undefined;

  if (!member) {
    throw new Error("Not a member of this organization");
  }

  return { role: member.role, memberId: member._id };
}

/**
 * Convenience: require auth + org membership in one call.
 * Returns { userId, role, memberId }.
 */
export async function requireAuthAndOrg(
  ctx: QueryCtx | MutationCtx,
  organizationId: string
): Promise<{ userId: string; role: string; memberId: string }> {
  const userId = await requireAuth(ctx);
  const { role, memberId } = await requireOrgMembership(
    ctx,
    userId,
    organizationId
  );
  return { userId, role, memberId };
}
