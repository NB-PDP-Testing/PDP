import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { ac, coach, member, parent } from "./betterAuth/accessControl";
import authSchema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

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
        // Add access control and custom roles
        ac,
        roles: {
          member,
          coach,
          parent,
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

export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  handler(ctx, _args) {
    return authComponent.getAuthUser(ctx);
  },
});
