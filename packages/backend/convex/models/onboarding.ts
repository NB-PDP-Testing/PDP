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
 * - player_graduation: User has children who turned 18 and can claim their own account
 * - welcome: First login to organization (future)
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Task type definitions
const onboardingTaskValidator = v.object({
  type: v.union(
    v.literal("gdpr_consent"),
    v.literal("accept_invitation"),
    v.literal("profile_completion"), // Phase 0 - Profile completion for guardian matching
    v.literal("guardian_claim"),
    v.literal("child_linking"),
    v.literal("player_graduation"),
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
 * 1.5. profile_completion (priority 1.5) - Collect phone/postcode for guardian matching
 * 2. guardian_claim (priority 2) - Claimable guardian identities
 * 3. child_linking (priority 3) - Pending child acknowledgements
 * 4. player_graduation (priority 4) - Children who turned 18
 * 5. welcome (priority 5) - First login welcome (future)
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
        | "profile_completion"
        | "guardian_claim"
        | "child_linking"
        | "player_graduation"
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
    // Task 1.5: Check for profile completion (Phase 0: Onboarding Sync)
    // Priority 1.5 - Collect phone/postcode/altEmail for multi-signal guardian matching
    // This runs BEFORE guardian_claim to enable better matching with collected signals
    // =================================================================
    if (user) {
      const profileStatus = user.profileCompletionStatus;
      const skipCount = user.profileSkipCount ?? 0;
      const canSkip = skipCount < 3;

      // Show profile completion if status is NOT "completed"
      // - undefined/pending = never completed
      // - skipped = user skipped, but must still complete eventually
      // The canSkip flag controls whether Skip button appears, not the form itself
      const needsProfileCompletion = profileStatus !== "completed";

      if (needsProfileCompletion) {
        tasks.push({
          type: "profile_completion",
          priority: 1.5,
          data: {
            currentPhone: user.phone,
            currentPostcode: user.postcode,
            currentAltEmail: user.altEmail,
            currentAddress: user.address,
            currentAddress2: user.address2,
            currentTown: user.town,
            currentCounty: user.county,
            currentCountry: user.country,
            skipCount,
            canSkip,
            reason:
              "This information helps your club manage your membership and keep your details up to date.",
          },
        });
      }
    }

    // =================================================================
    // Task 2: Check for claimable guardian identities
    // Priority 2 - User has guardian profiles matching their email that need claiming
    // Check both primary email AND alt email (entered during profile completion)
    // Phase 0.8: Only run guardian matching for INVITED users
    // Self-registered users skip this step - matching happens at admin approval time
    // =================================================================
    const wasInvited = user?.wasInvited === true;

    if (wasInvited) {
      const matchingGuardians = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .filter((q) => q.eq(q.field("userId"), undefined))
        .collect();

      // Also check alt email if user has one
      const userAltEmail = user?.altEmail?.toLowerCase().trim();
      if (userAltEmail && userAltEmail !== normalizedEmail) {
        const altEmailMatches = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_email", (q) => q.eq("email", userAltEmail))
          .filter((q) => q.eq(q.field("userId"), undefined))
          .collect();

        // Add any new matches (avoid duplicates)
        const existingIds = new Set(matchingGuardians.map((g) => g._id));
        for (const match of altEmailMatches) {
          if (!existingIds.has(match._id)) {
            matchingGuardians.push(match);
          }
        }
      }

      // Also check phone if user has one (Phase 0: Multi-signal matching)
      // Try multiple phone formats since stored format may differ
      // Strip ALL whitespace first (trim + internal spaces)
      const userPhoneRaw = user?.phone;
      const userPhone = userPhoneRaw?.replace(/\s/g, "");
      console.log("[PHONE DEBUG] userPhoneRaw:", JSON.stringify(userPhoneRaw));
      console.log(
        "[PHONE DEBUG] userPhone (cleaned):",
        JSON.stringify(userPhone)
      );
      if (userPhone && userPhone.length >= 7) {
        // Generate phone format variations to match stored formats
        const phoneFormats = new Set<string>();
        phoneFormats.add(userPhone);

        // Try with leading + if not present
        if (!userPhone.startsWith("+")) {
          phoneFormats.add(`+${userPhone}`);
        }
        // Try without + if present
        if (userPhone.startsWith("+")) {
          phoneFormats.add(userPhone.substring(1));
        }
        // Try digits only (remove all non-digits)
        const digitsOnly = userPhone.replace(/\D/g, "");
        if (digitsOnly.length >= 7) {
          phoneFormats.add(digitsOnly);
          phoneFormats.add(`+${digitsOnly}`);
        }

        console.log("[PHONE DEBUG] phoneFormats:", Array.from(phoneFormats));

        // Query for each format
        const existingIds = new Set(matchingGuardians.map((g) => g._id));
        for (const phoneFormat of phoneFormats) {
          console.log("[PHONE DEBUG] Querying for phone format:", phoneFormat);
          const phoneMatches = await ctx.db
            .query("guardianIdentities")
            .withIndex("by_phone", (q) => q.eq("phone", phoneFormat))
            .filter((q) => q.eq(q.field("userId"), undefined))
            .collect();

          console.log(
            "[PHONE DEBUG] Found",
            phoneMatches.length,
            "matches for",
            phoneFormat
          );

          // Add any new matches (avoid duplicates)
          for (const match of phoneMatches) {
            if (!existingIds.has(match._id)) {
              console.log(
                "[PHONE DEBUG] Adding match:",
                match.firstName,
                match.lastName,
                match.phone
              );
              matchingGuardians.push(match);
              existingIds.add(match._id);
            }
          }
        }
      } else {
        console.log(
          "[PHONE DEBUG] No valid phone to search. userPhone:",
          userPhone
        );
      }

      console.log(
        "[GUARDIAN DEBUG] matchingGuardians count:",
        matchingGuardians.length
      );
      if (matchingGuardians.length > 0) {
        // Enrich guardian data with children info
        const guardiansWithChildren = await Promise.all(
          matchingGuardians.map(async (guardian) => {
            console.log(
              "[GUARDIAN DEBUG] Processing guardian:",
              guardian.firstName,
              guardian.lastName,
              "id:",
              guardian._id
            );

            // Get ALL links first for debugging
            const allLinks = await ctx.db
              .query("guardianPlayerLinks")
              .withIndex("by_guardian", (q) =>
                q.eq("guardianIdentityId", guardian._id)
              )
              .collect();

            console.log(
              "[GUARDIAN DEBUG] All links for guardian:",
              allLinks.length
            );
            for (const link of allLinks) {
              console.log(
                "[GUARDIAN DEBUG] Link:",
                link._id,
                "declinedByUserId:",
                link.declinedByUserId,
                "current userId:",
                userId
              );
            }

            // Get ALL linked children - do NOT filter by decline status
            // Any user matching the guardian's contact details should see all children
            // The admin will handle approval of connections
            const links = await ctx.db
              .query("guardianPlayerLinks")
              .withIndex("by_guardian", (q) =>
                q.eq("guardianIdentityId", guardian._id)
              )
              .collect();

            console.log("[GUARDIAN DEBUG] Filtered links:", links.length);

            const children = await Promise.all(
              links.map(async (link) => {
                console.log(
                  "[GUARDIAN DEBUG] Getting player:",
                  link.playerIdentityId
                );
                const player = await ctx.db.get(link.playerIdentityId);
                console.log(
                  "[GUARDIAN DEBUG] Player found:",
                  player ? `${player.firstName} ${player.lastName}` : "NULL"
                );
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

            const filteredChildren = children.filter(Boolean);
            console.log(
              "[GUARDIAN DEBUG] Children count after filter:",
              filteredChildren.length
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
              children: filteredChildren,
              organizations,
            };
          })
        );

        // Only include guardians that have at least one child
        const guardiansWithLinkedChildren = guardiansWithChildren.filter(
          (g) => g.children.length > 0
        );

        console.log(
          "[GUARDIAN DEBUG] guardiansWithLinkedChildren:",
          guardiansWithLinkedChildren.length
        );

        if (guardiansWithLinkedChildren.length > 0) {
          console.log("[GUARDIAN DEBUG] Adding guardian_claim task!");
          tasks.push({
            type: "guardian_claim",
            priority: 2,
            data: {
              identities: guardiansWithLinkedChildren,
            },
          });
        }
      }
    } // End of wasInvited check for guardian_claim

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
      // Do NOT filter by declinedByUserId - ALL children should be shown to matching users
      const pendingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", userGuardian._id)
        )
        .filter((q) => q.eq(q.field("acknowledgedByParentAt"), undefined))
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
          // Get user's skip count for child linking (Phase 6)
          const skipCount = user?.childLinkingSkipCount ?? 0;

          tasks.push({
            type: "child_linking",
            priority: 3,
            data: {
              guardianIdentityId: userGuardian._id,
              pendingChildren: validPendingChildren,
              skipCount, // Phase 6: Include skip count for UI to show/hide skip button
            },
          });
        }
      }
    }

    // =================================================================
    // Task 4: Check for player graduations (children who turned 18)
    // Priority 4 - Guardian can send claim invitation to adult children
    // =================================================================
    if (userGuardian) {
      // Use the same userGuardian from child_linking check
      // Get all active links for this guardian
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", userGuardian._id)
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), undefined) // Legacy links treated as active
          )
        )
        .collect();

      // Check each linked child for pending graduation records
      const pendingGraduations: Array<{
        graduationId: string;
        playerIdentityId: string;
        playerName: string;
        dateOfBirth: string;
        turnedEighteenAt: number;
        organizationId: string;
        organizationName: string;
      }> = [];

      for (const link of guardianLinks) {
        const player = await ctx.db.get(link.playerIdentityId);
        if (!player) {
          continue;
        }

        // Check if there's a pending graduation record
        const graduation = await ctx.db
          .query("playerGraduations")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();

        if (graduation) {
          // Get organization name
          let organizationName = "Unknown Organization";
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: graduation.organizationId,
                  operator: "eq",
                },
              ],
            }
          );
          if (org) {
            organizationName = (org as { name?: string }).name || "Unknown";
          }

          pendingGraduations.push({
            graduationId: graduation._id,
            playerIdentityId: player._id,
            playerName: `${player.firstName} ${player.lastName}`,
            dateOfBirth: player.dateOfBirth,
            turnedEighteenAt: graduation.turnedEighteenAt,
            organizationId: graduation.organizationId,
            organizationName,
          });
        }
      }

      if (pendingGraduations.length > 0) {
        tasks.push({
          type: "player_graduation",
          priority: 4,
          data: {
            pendingGraduations,
          },
        });
      }
    }

    // =================================================================
    // Task 5: Welcome message (Future - Phase 2)
    // Priority 5 - First login to organization
    // =================================================================
    // TODO: Implement in Phase 2
    // Check if user has never visited the org before (no flow progress records)
    // If first login, add welcome task

    // Sort tasks by priority
    tasks.sort((a, b) => a.priority - b.priority);

    console.log(
      "[TASKS DEBUG] Final tasks being returned:",
      tasks.map((t) => ({ type: t.type, priority: t.priority }))
    );
    console.log(
      "[TASKS DEBUG] User profile status:",
      user?.profileCompletionStatus
    );

    return tasks;
  },
});

/**
 * Increment the child linking skip count for the current user.
 *
 * Called when user clicks "Skip for Now" on the child linking step.
 * Maximum of 3 skips - after that, the user must take action.
 *
 * Returns the new skip count or null if user not found.
 */
export const incrementChildLinkingSkipCount = mutation({
  args: {},
  returns: v.union(v.object({ newSkipCount: v.number() }), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const currentCount =
      (user as { childLinkingSkipCount?: number }).childLinkingSkipCount ?? 0;
    const newCount = currentCount + 1;

    // Update the user record
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id as string, operator: "eq" }],
        update: {
          childLinkingSkipCount: newCount,
          updatedAt: Date.now(),
        },
      },
    });

    return { newSkipCount: newCount };
  },
});

/**
 * Acknowledge the "no children found" state.
 *
 * Called when user clicks "Continue Without Linking" on the NoChildrenFoundStep.
 * Sets noChildrenAcknowledged to true so the step doesn't reappear.
 *
 * Returns success status.
 */
export const acknowledgeNoChildrenFound = mutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    // Update the user record
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id as string, operator: "eq" }],
        update: {
          noChildrenAcknowledged: true,
          updatedAt: Date.now(),
        },
      },
    });

    return { success: true };
  },
});

/**
 * Reset the "no children found" acknowledgement.
 *
 * Called when user wants to retry searching with different details.
 * This allows the NoChildrenFoundStep or profile completion to reappear.
 *
 * Returns success status.
 */
export const resetNoChildrenAcknowledged = mutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    // Update the user record - reset both acknowledgement and profile completion
    // to allow user to re-enter details and retry matching
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id as string, operator: "eq" }],
        update: {
          noChildrenAcknowledged: false,
          profileCompletionStatus: "pending",
          updatedAt: Date.now(),
        },
      },
    });

    return { success: true };
  },
});

// ============ US-019: ONBOARDING STATE MANAGEMENT ============

/**
 * Get onboarding progress for the current user.
 * Returns completion status for each onboarding step.
 *
 * US-019 requirement: getOnboardingProgress(userId) query
 */
export const getOnboardingProgress = query({
  args: {},
  returns: v.union(
    v.object({
      isComplete: v.boolean(),
      gdprConsentComplete: v.boolean(),
      setupComplete: v.boolean(),
      currentStep: v.union(v.string(), v.null()),
      steps: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          completed: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    // Determine completion status for each step
    const gdprConsentComplete = user.gdprConsentVersion !== undefined;
    const setupComplete = user.setupComplete === true;
    const onboardingComplete = user.onboardingComplete === true;

    // Build steps array with completion status
    const steps = [
      {
        id: "gdpr_consent",
        label: "Privacy Consent",
        completed: gdprConsentComplete,
      },
      {
        id: "profile_setup",
        label: "Profile Setup",
        completed: true, // Always complete once user exists
      },
    ];

    // Add owner-specific steps if user is platform staff
    if (user.isPlatformStaff) {
      steps.push(
        {
          id: "org_setup",
          label: "Organization Setup",
          completed: setupComplete,
        },
        {
          id: "create_team",
          label: "Create First Team",
          completed: setupComplete, // Completed as part of wizard
        },
        {
          id: "invite_members",
          label: "Invite Team",
          completed: setupComplete, // Optional but marked complete with wizard
        }
      );
    }

    // Determine current step
    let currentStep: string | null = null;
    for (const step of steps) {
      if (!step.completed) {
        currentStep = step.id;
        break;
      }
    }

    return {
      isComplete: onboardingComplete || (gdprConsentComplete && setupComplete),
      gdprConsentComplete,
      setupComplete,
      currentStep,
      steps,
    };
  },
});

/**
 * Mark onboarding as complete for the current user.
 * Sets onboardingComplete: true on the user record.
 *
 * US-019 requirement: markOnboardingComplete(userId) mutation
 */
export const markOnboardingComplete = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    // Update user record
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          onboardingComplete: true,
        },
      },
    });

    console.log(`[Onboarding] User ${user.email} completed onboarding`);

    return null;
  },
});

/**
 * Reset onboarding for the current user.
 * Clears onboardingComplete and setupComplete flags.
 * Used when user wants to restart the onboarding experience.
 *
 * US-019 requirement: resetOnboarding(userId) mutation
 */
export const resetOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    // Reset onboarding state
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          onboardingComplete: false,
          setupComplete: false,
          setupStep: "gdpr", // Reset to first step
        },
      },
    });

    console.log(`[Onboarding] User ${user.email} reset onboarding`);

    return null;
  },
});
