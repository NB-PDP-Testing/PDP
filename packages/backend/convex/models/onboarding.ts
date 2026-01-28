/**
 * Onboarding orchestration queries and mutations
 *
 * This module provides the backend logic for the OnboardingOrchestrator component.
 * It evaluates what onboarding tasks a user needs to complete and returns them
 * in priority order.
 *
 * Task types:
 * - gdpr_consent: User needs to accept/re-accept GDPR policy (Priority 0 - always first)
 * - accept_invitation: User has pending org invitations
 * - guardian_claim: User has claimable guardian identities (email match, no userId)
 * - child_linking: User has pending child acknowledgements
 * - welcome: First login to organization (future)
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { authComponent } from "../auth";

// Task type definitions
const onboardingTaskValidator = v.object({
  type: v.union(
    v.literal("gdpr_consent"),
    v.literal("accept_invitation"),
    v.literal("guardian_claim"),
    v.literal("child_linking"),
    v.literal("welcome")
  ),
  priority: v.number(),
  data: v.any(),
});

/**
 * Get all pending onboarding tasks for the current user.
 *
 * This query evaluates the user's context and determines what onboarding
 * steps they need to complete. Tasks are returned in priority order.
 *
 * Priority order:
 * 0. gdpr_consent (priority 0) - GDPR consent required FIRST
 * 1. accept_invitation (priority 1) - Pending org invitations
 * 2. guardian_claim (priority 2) - Claimable guardian identities
 * 3. child_linking (priority 3) - Pending child acknowledgements
 * 4. welcome (priority 4) - First login welcome (future)
 */
export const getOnboardingTasks = query({
  args: {},
  returns: v.array(onboardingTaskValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userEmail = identity.email;
    const userId = identity.subject;
    if (!userEmail) {
      return [];
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    const tasks: Array<{
      type:
        | "gdpr_consent"
        | "accept_invitation"
        | "guardian_claim"
        | "child_linking"
        | "welcome";
      priority: number;
      data: unknown;
    }> = [];

    // =================================================================
    // Task 0: Check GDPR consent status
    // Priority 0 - GDPR must be accepted before anything else
    // =================================================================
    const user = await authComponent.safeGetAuthUser(ctx);
    if (user) {
      // Get current effective GDPR version
      const now = Date.now();
      const allVersions = await ctx.db
        .query("gdprVersions")
        .withIndex("by_version")
        .order("desc")
        .collect();

      const effectiveVersion = allVersions.find(
        (version) => version.effectiveDate <= now
      );

      if (effectiveVersion) {
        const userVersion = user.gdprConsentVersion;
        const needsConsent =
          userVersion === undefined || userVersion < effectiveVersion.version;

        if (needsConsent) {
          tasks.push({
            type: "gdpr_consent",
            priority: 0,
            data: {
              currentVersion: effectiveVersion.version,
              userVersion: userVersion ?? null,
            },
          });
        }
      }
    }

    // =================================================================
    // Task 1: Check for pending invitations
    // Priority 1 - User needs to accept/reject org invitations
    // =================================================================
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
        where: [
          {
            field: "email",
            value: normalizedEmail,
            operator: "eq",
          },
          {
            field: "status",
            value: "pending",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const now = Date.now();
    const pendingInvitations = invitationsResult.page.filter(
      (inv: { expiresAt: number }) => inv.expiresAt > now
    );

    if (pendingInvitations.length > 0) {
      // Enrich invitations with organization names
      const enrichedInvitations = await Promise.all(
        pendingInvitations.map(
          async (inv: {
            _id: string;
            organizationId: string;
            role: string;
            expiresAt: number;
            metadata?: {
              suggestedFunctionalRoles?: string[];
              suggestedPlayerLinks?: Array<{ id: string; name?: string }>;
            };
          }) => {
            const org = await ctx.runQuery(
              components.betterAuth.adapter.findOne,
              {
                model: "organization",
                where: [
                  {
                    field: "_id",
                    value: inv.organizationId,
                    operator: "eq",
                  },
                ],
              }
            );

            return {
              invitationId: inv._id,
              organizationId: inv.organizationId,
              organizationName:
                (org as { name?: string } | null)?.name ||
                "Unknown Organization",
              role: inv.role,
              expiresAt: inv.expiresAt,
              functionalRoles: inv.metadata?.suggestedFunctionalRoles || [],
              playerLinks: inv.metadata?.suggestedPlayerLinks || [],
            };
          }
        )
      );

      tasks.push({
        type: "accept_invitation",
        priority: 1,
        data: {
          invitations: enrichedInvitations,
        },
      });
    }

    // =================================================================
    // Task 2: Check for claimable guardian identities
    // Priority 2 - User has guardian profiles matching their email that need claiming
    // =================================================================
    const matchingGuardians = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    if (matchingGuardians.length > 0) {
      // Enrich guardian data with children info
      const guardiansWithChildren = await Promise.all(
        matchingGuardians.map(async (guardian) => {
          // Get linked children (excluding declined links)
          const links = await ctx.db
            .query("guardianPlayerLinks")
            .withIndex("by_guardian", (q) =>
              q.eq("guardianIdentityId", guardian._id)
            )
            .filter((q) => q.neq(q.field("declinedByUserId"), userId))
            .collect();

          const children = await Promise.all(
            links.map(async (link) => {
              const player = await ctx.db.get(link.playerIdentityId);
              if (!player) {
                return null;
              }

              return {
                playerIdentityId: player._id,
                firstName: player.firstName,
                lastName: player.lastName,
                relationship: link.relationship,
              };
            })
          );

          // Get organizations where children are enrolled
          const orgSet = new Set<string>();
          for (const link of links) {
            const enrollments = await ctx.db
              .query("orgPlayerEnrollments")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", link.playerIdentityId)
              )
              .collect();

            for (const enrollment of enrollments) {
              orgSet.add(enrollment.organizationId);
            }
          }

          // Get org names
          const organizations = await Promise.all(
            Array.from(orgSet).map(async (orgId) => {
              const org = await ctx.runQuery(
                components.betterAuth.adapter.findOne,
                {
                  model: "organization",
                  where: [
                    {
                      field: "_id",
                      value: orgId,
                      operator: "eq",
                    },
                  ],
                }
              );

              return {
                organizationId: orgId,
                organizationName:
                  (org as { name?: string } | null)?.name || "Unknown",
              };
            })
          );

          return {
            guardianIdentity: guardian,
            children: children.filter(Boolean),
            organizations,
          };
        })
      );

      // Only include guardians that have at least one child
      const guardiansWithLinkedChildren = guardiansWithChildren.filter(
        (g) => g.children.length > 0
      );

      if (guardiansWithLinkedChildren.length > 0) {
        tasks.push({
          type: "guardian_claim",
          priority: 2,
          data: {
            identities: guardiansWithLinkedChildren,
          },
        });
      }
    }

    // =================================================================
    // Task 3: Check for pending child acknowledgements
    // Priority 3 - User has claimed guardian identity but has children that need acknowledgement
    // =================================================================
    // Find guardian identity for this user
    const userGuardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (userGuardian) {
      // Find links where acknowledgedByParentAt is undefined (not yet acknowledged)
      const pendingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", userGuardian._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("acknowledgedByParentAt"), undefined),
            q.eq(q.field("declinedByUserId"), undefined)
          )
        )
        .collect();

      if (pendingLinks.length > 0) {
        // Enrich with player details
        const pendingChildren = await Promise.all(
          pendingLinks.map(async (link) => {
            const player = await ctx.db.get(link.playerIdentityId);
            if (!player) {
              return null;
            }

            // Get enrollments to find org
            const enrollment = await ctx.db
              .query("orgPlayerEnrollments")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", link.playerIdentityId)
              )
              .first();

            let organizationName = "Unknown";
            if (enrollment) {
              const org = await ctx.runQuery(
                components.betterAuth.adapter.findOne,
                {
                  model: "organization",
                  where: [
                    {
                      field: "_id",
                      value: enrollment.organizationId,
                      operator: "eq",
                    },
                  ],
                }
              );
              organizationName =
                (org as { name?: string } | null)?.name || "Unknown";
            }

            return {
              linkId: link._id,
              playerIdentityId: player._id,
              firstName: player.firstName,
              lastName: player.lastName,
              relationship: link.relationship,
              organizationId: enrollment?.organizationId,
              organizationName,
            };
          })
        );

        const validPendingChildren = pendingChildren.filter(Boolean);

        if (validPendingChildren.length > 0) {
          tasks.push({
            type: "child_linking",
            priority: 3,
            data: {
              guardianIdentityId: userGuardian._id,
              pendingChildren: validPendingChildren,
            },
          });
        }
      }
    }

    // =================================================================
    // Task 4: Welcome message (Future - Phase 2)
    // Priority 4 - First login to organization
    // =================================================================
    // TODO: Implement in Phase 2
    // Check if user has never visited the org before (no flow progress records)
    // If first login, add welcome task

    // Sort tasks by priority
    tasks.sort((a, b) => a.priority - b.priority);

    return tasks;
  },
});
