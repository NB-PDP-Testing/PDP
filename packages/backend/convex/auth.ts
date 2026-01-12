import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { ac, admin, member, owner } from "./betterAuth/accessControl";
import authSchema from "./betterAuth/schema";

/**
 * Type for functional roles stored in member.functionalRoles array
 */
type FunctionalRole = "coach" | "parent" | "admin";

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

        // Schema customization: add custom fields to organization and member
        schema: {
          organization: {
            additionalFields: {
              colors: {
                type: "string[]",
                input: true,
                required: false,
              },
              // Social media links
              socialFacebook: {
                type: "string",
                input: true,
                required: false,
              },
              socialTwitter: {
                type: "string",
                input: true,
                required: false,
              },
              socialInstagram: {
                type: "string",
                input: true,
                required: false,
              },
              socialLinkedin: {
                type: "string",
                input: true,
                required: false,
              },
              // Organization website
              website: {
                type: "string",
                input: true,
                required: false,
              },
            },
          },
          member: {
            additionalFields: {
              // Custom functional roles for sports club capabilities
              // Includes: coach, parent, admin, player (for adult players)
              functionalRoles: {
                type: "string[]",
                input: true,
                required: false,
              },
              // Active functional role - which role the user is currently operating as
              activeFunctionalRole: {
                type: "string",
                input: true,
                required: false,
              },
              // Pending role requests awaiting admin approval
              pendingFunctionalRoleRequests: {
                type: "string",
                input: true,
                required: false,
              },
            },
          },
        },

        async allowUserToCreateOrganization(user) {
          const fullUser = await ctx.runQuery(
            components.betterAuth.userFunctions.getUserById,
            { userId: user.id }
          );
          console.log("user", fullUser);
          return fullUser?.isPlatformStaff ?? false;
        },
        // Add access control and organizational roles
        // NOTE: Only hierarchical roles (owner, admin, member) are defined here
        // Functional roles (coach, parent) are stored in member.functionalRoles array
        // See: docs/COMPREHENSIVE_AUTH_PLAN.md for architecture details
        ac,
        roles: {
          owner,
          admin,
          member,
        },
        // Email invitation configuration
        // NOTE: Email sending is handled by updateInvitationMetadata mutation
        // This callback fires before metadata (functional roles, teams, players) exists.
        // See: packages/backend/convex/models/members.ts updateInvitationMetadata
        async sendInvitationEmail(_data) {
          // Email will be sent after metadata is added by the UI
          // No action needed here
        },

        // Organization lifecycle hooks for automatic role assignment
        // See: docs/COMPREHENSIVE_AUTH_PLAN.md for architecture details
        organizationHooks: {
          /**
           * beforeAddMember: Called before a member is added to an organization
           *
           * This hook handles automatic functional role assignment by modifying
           * the member data BEFORE it's saved to the database:
           * 1. Auto-map Better Auth "admin"/"owner" → functional "admin"
           * 2. Auto-assign suggested functional roles from invitation metadata
           *
           * Note: We use beforeAddMember instead of afterAddMember because
           * Better Auth hooks run in a query context (read-only). By using
           * beforeAddMember, we can modify the member data before it's created.
           */
          // biome-ignore lint/suspicious/useAwait: Better Auth hook API requires async signature even when no await is used
          // biome-ignore lint/nursery/noShadow: Better Auth hook parameters (member, user, organization) necessarily shadow module imports
          beforeAddMember: async ({ member, user, organization }) => {
            const betterAuthRole = member.role;

            console.log("[beforeAddMember] Adding member:", {
              userId: member.userId,
              organizationId: organization.id,
              betterAuthRole,
              userEmail: user.email,
            });

            // Build functional roles to assign
            const functionalRolesToAssign: FunctionalRole[] = [];

            // 1. Auto-map Better Auth "admin"/"owner" to functional "admin"
            // This ensures owners and admins always have functional "admin" role
            if (betterAuthRole === "admin" || betterAuthRole === "owner") {
              console.log(
                "[beforeAddMember] Auto-assigning functional 'admin' role for",
                betterAuthRole
              );
              functionalRolesToAssign.push("admin");
            }

            // 2. Check invitation metadata for suggested functional roles
            // Note: This would be handled in afterAcceptInvitation hook
            // which has access to invitation metadata

            // Return modified member data with functional roles
            if (functionalRolesToAssign.length > 0) {
              console.log(
                "[beforeAddMember] Setting functional roles:",
                functionalRolesToAssign
              );
              return {
                data: {
                  ...member,
                  functionalRoles: functionalRolesToAssign,
                },
              };
            }

            // No modifications needed
            return;
          },

          /**
           * afterAddMember: Called after a member is added to an organization
           *
           * This hook logs the completion and can trigger async operations
           * like parent-player linking that don't need to block the response.
           */
          // biome-ignore lint/suspicious/useAwait: Better Auth hook API requires async signature even when no await is used
          // biome-ignore lint/nursery/noShadow: Better Auth hook parameters (member, user, organization) necessarily shadow module imports
          afterAddMember: async ({ member, user, organization }) => {
            console.log("[afterAddMember] Member added successfully:", {
              userId: member.userId,
              organizationId: organization.id,
              role: member.role,
              userEmail: user.email,
            });

            // Note: Parent-player linking will happen when the user
            // accesses the parent dashboard or via the approval flow.
            // The linking is done by the autoLinkParentToChildren mutation
            // which checks player.parentEmail, inferredParentEmail, etc.
            if (user.email) {
              console.log(
                "[afterAddMember] User email available for potential parent linking:",
                user.email
              );
            }

            console.log("[afterAddMember] ✅ Hook complete");
          },

          /**
           * afterAcceptInvitation: Called after a user accepts an invitation
           *
           * Note: We cannot modify member data here as hooks run in read-only
           * context. Functional roles from invitation metadata are synced
           * separately via the invitation acceptance page which calls
           * syncFunctionalRolesFromInvitation mutation.
           *
           * TODO: When Better Auth adds mutation support in hooks, implement
           * auto-assignment here instead.
           */
          // biome-ignore lint/suspicious/useAwait: Better Auth hook API requires async signature even when no await is used
          afterAcceptInvitation: async ({
            invitation,
            // biome-ignore lint/nursery/noShadow: Better Auth hook parameter necessarily shadows module import
            member,
            // biome-ignore lint/correctness/noUnusedFunctionParameters: user parameter required by Better Auth hook API signature
            user,
            // biome-ignore lint/nursery/noShadow: Better Auth hook parameter necessarily shadows module import
            organization,
          }) => {
            // Log for debugging
            const suggestedRoles =
              (invitation.metadata as any)?.suggestedFunctionalRoles || [];

            console.log("[afterAcceptInvitation] Invitation accepted:", {
              invitationId: invitation.id,
              userId: member.userId,
              organizationId: organization.id,
              betterAuthRole: member.role,
              suggestedFunctionalRoles: suggestedRoles,
            });

            if (suggestedRoles.length > 0) {
              console.log(
                "[afterAcceptInvitation] Note: Functional roles",
                suggestedRoles,
                "will be synced via syncFunctionalRolesFromInvitation mutation"
              );
            }

            console.log("[afterAcceptInvitation] ✅ Hook complete");
          },
        },
      }),
    ],
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        prompt: "select_account", // Forces account selection
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
