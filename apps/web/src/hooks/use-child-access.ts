"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";

type ChildAccessToggles = {
  includeCoachFeedback: boolean;
  includeVoiceNotes: boolean;
  includeDevelopmentGoals: boolean;
  includeAssessments: boolean;
  includeWellnessAccess: boolean;
};

type AccessLevel = "none" | "view_only" | "view_interact";

type ChildAccessResult = {
  /** True when the current user is a youth player (playerType === 'youth') */
  isChildAccount: boolean;
  /** Access level granted by parent. null when not a child account or still loading. */
  accessLevel: AccessLevel | null;
  /** Granular content toggles. null when not a child account or still loading. */
  toggles: ChildAccessToggles | null;
  /** True while any data is still loading */
  isLoading: boolean;
  /** The playerIdentity ID of the current user (once resolved) */
  playerIdentityId: Id<"playerIdentities"> | null;
};

/**
 * Hook for checking the child access authorization for the current user.
 *
 * Used throughout the player portal to gate content for youth accounts.
 * Returns the access level and granular toggles from parentChildAuthorizations.
 *
 * Usage:
 * ```tsx
 * const { isChildAccount, accessLevel, toggles, isLoading } = useChildAccess(orgId);
 *
 * if (isChildAccount && accessLevel === 'none') {
 *   // redirect to access-revoked page
 * }
 *
 * if (isChildAccount && !toggles?.includeAssessments) {
 *   return <AccessNotEnabled feature="Assessments" />;
 * }
 * ```
 */
export function useChildAccess(organizationId: string): ChildAccessResult {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const userId = session?.user?.id;

  // Find playerIdentity by userId
  const playerByUserId = useQuery(
    api.models.playerIdentities.findPlayerByUserId,
    userId ? { userId } : "skip"
  );

  const isYouth = playerByUserId?.playerType === "youth";
  const playerIdentityId = playerByUserId?._id ?? null;

  // Only fetch authorization if the player is a youth player
  const authorization = useQuery(
    api.models.parentChildAuthorizations.getChildAuthorizationByPlayerIdentity,
    isYouth && playerIdentityId && organizationId
      ? {
          playerIdentityId: playerIdentityId as Id<"playerIdentities">,
          organizationId,
        }
      : "skip"
  );

  if (!(isYouth && playerByUserId)) {
    return {
      isChildAccount: false,
      accessLevel: null,
      toggles: null,
      isLoading: sessionLoading || playerByUserId === undefined,
      playerIdentityId: playerIdentityId as Id<"playerIdentities"> | null,
    };
  }

  if (authorization === undefined) {
    return {
      isChildAccount: true,
      accessLevel: null,
      toggles: null,
      isLoading: true,
      playerIdentityId: playerIdentityId as Id<"playerIdentities">,
    };
  }

  if (!authorization) {
    // No authorization record exists — treat as none
    return {
      isChildAccount: true,
      accessLevel: "none",
      toggles: null,
      isLoading: false,
      playerIdentityId: playerIdentityId as Id<"playerIdentities">,
    };
  }

  return {
    isChildAccount: true,
    accessLevel: authorization.accessLevel,
    toggles: {
      includeCoachFeedback: authorization.includeCoachFeedback,
      includeVoiceNotes: authorization.includeVoiceNotes,
      includeDevelopmentGoals: authorization.includeDevelopmentGoals,
      includeAssessments: authorization.includeAssessments,
      includeWellnessAccess: authorization.includeWellnessAccess,
    },
    isLoading: false,
    playerIdentityId: playerIdentityId as Id<"playerIdentities">,
  };
}
