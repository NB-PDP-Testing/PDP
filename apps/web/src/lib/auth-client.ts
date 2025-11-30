import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, coach, member, owner, parent } from "./accessControl";

export const authClient = createAuthClient({
  plugins: [
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
