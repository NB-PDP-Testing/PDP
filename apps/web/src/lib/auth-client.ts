import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { auth } from "@pdp/backend/convex/betterAuth/auth";
import {
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, member, owner } from "./accessControl";

/**
 * Better Auth Client Configuration
 *
 * ARCHITECTURE NOTE:
 * Only hierarchical roles (owner, admin, member) are defined here.
 * Functional roles (coach, parent) are stored in member.functionalRoles array.
 * See: docs/COMPREHENSIVE_AUTH_PLAN.md for architecture details
 */
export const authClient = createAuthClient({
  // Don't set baseURL - let convexClient plugin handle it
  // Or set to current origin for Next.js API routes
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [
    inferAdditionalFields<typeof auth>(),
    convexClient(),
    organizationClient({
      teams: {
        enabled: true,
      },
      ac,
      roles: {
        owner,
        admin,
        member,
      },
      // Infer additional fields (like colors) from auth config
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
  ],
});

// Re-export the useSession hook for convenience
export const useSession = authClient.useSession;
