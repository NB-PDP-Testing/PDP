import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { auth } from "@pdp/backend/convex/betterAuth/auth";
import {
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, coach, member, owner, parent } from "./accessControl";

// With Convex Better Auth, the convexClient plugin handles routing automatically
// baseURL should be undefined or the current origin (Next.js API routes)
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
        coach,
        parent,
      },
    }),
  ],
});
