import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import {
  ac,
  admin,
  coach,
  member,
  owner,
  parent,
} from "./betterAuth/accessControl";
import authSchema from "./betterAuth/schema";
import { sendOrganizationInvitation } from "./utils/email";

// Normalize SITE_URL to remove trailing slash
const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  }
);

export function createAuth(
  ctx: GenericCtx<DataModel>,
  { optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false }
) {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      convex(),
      organization({
        // Enable teams within organizations
        teams: {
          enabled: true,
        },

        async allowUserToCreateOrganization(user) {
          const fullUser = await ctx.runQuery(
            components.betterAuth.userFunctions.getUserById,
            { userId: user.id }
          );
          console.log("user", fullUser);
          return fullUser?.isPlatformStaff ?? false;
        },
        // Add access control and custom roles
        ac,
        roles: {
          owner,
          admin,
          member,
          coach,
          parent,
        },
        // Email invitation configuration
        async sendInvitationEmail(data) {
          const inviteLink = `${siteUrl}/orgs/accept-invitation/${data.id}`;
          await sendOrganizationInvitation({
            email: data.email,
            invitedByUsername: data.inviter.user.name || "Someone",
            invitedByEmail: data.inviter.user.email,
            organizationName: data.organization.name,
            inviteLink,
            role: data.role || undefined,
          });
        },
      }),
    ],
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID as string,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
        // Optional
        tenantId: "common",
        authority: "https://login.microsoftonline.com", // Authentication authority URL
        prompt: "select_account", // Forces account selection
      },
    },
  });
}
