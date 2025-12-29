import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

// Type for a child with player and link data
type ChildWithLink = NonNullable<
  FunctionReturnType<
    typeof api.models.guardianPlayerLinks.getPlayersForGuardian
  >
>[number];

// Type for enrollment data
type EnrollmentData = NonNullable<
  FunctionReturnType<
    typeof api.models.orgPlayerEnrollments.getEnrollmentsForOrg
  >
>[number];

/**
 * Hook to get the guardian identity for the current authenticated user.
 *
 * Returns:
 * - guardianIdentity: The platform-level guardian identity (or null if not found)
 * - children: Array of linked player identities with their enrollment data
 * - isLoading: Whether the data is still loading
 * - hasIdentity: Whether the user has a guardian identity
 *
 * Note: This hook tries two lookup strategies:
 * 1. First by userId (for claimed/linked guardian identities)
 * 2. Then by email (for unclaimed guardian identities that match the user's email)
 *
 * Usage:
 * ```tsx
 * const { guardianIdentity, children, isLoading } = useGuardianIdentity();
 *
 * if (isLoading) return <Loading />;
 * if (!guardianIdentity) return <NoGuardianProfile />;
 *
 * return <ChildrenList children={children} />;
 * ```
 */
export function useGuardianIdentity(userEmail?: string | null) {
  // Get guardian identity for current user (by userId)
  const guardianByUserId = useQuery(
    api.models.guardianIdentities.getGuardianForCurrentUser
  );

  // Also try to find by email (for unclaimed identities)
  const guardianByEmail = useQuery(
    api.models.guardianIdentities.findGuardianByEmail,
    userEmail ? { email: userEmail } : "skip"
  );

  // Prefer userId-linked guardian, but fall back to email match
  const guardianIdentity = guardianByUserId ?? guardianByEmail ?? null;

  // Get all children for this guardian (across all orgs)
  const childrenQuery = useQuery(
    api.models.guardianPlayerLinks.getPlayersForGuardian,
    guardianIdentity?._id
      ? { guardianIdentityId: guardianIdentity._id }
      : "skip"
  );

  const isLoading =
    guardianByUserId === undefined ||
    (userEmail && guardianByEmail === undefined);
  const hasIdentity =
    guardianIdentity !== null && guardianIdentity !== undefined;

  // Ensure typed array even when query returns undefined
  const children: ChildWithLink[] = childrenQuery ?? [];

  return {
    guardianIdentity,
    children,
    isLoading,
    hasIdentity,
  };
}

/**
 * Hook to get children enrolled in a specific organization.
 *
 * @param organizationId - The organization ID to filter by
 *
 * Usage:
 * ```tsx
 * const { children, isLoading } = useGuardianChildrenInOrg(orgId);
 * ```
 */
export function useGuardianChildrenInOrg(
  organizationId: string | undefined,
  userEmail?: string | null
) {
  const { guardianIdentity, children, isLoading } =
    useGuardianIdentity(userEmail);

  // Get enrollments for all players in this org
  const enrollmentsQuery = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForOrg,
    organizationId ? { organizationId } : "skip"
  );

  // Ensure typed array for enrollments
  const enrollments: EnrollmentData[] = enrollmentsQuery ?? [];

  // Filter children to only those enrolled in this org
  const enrolledChildIds = new Set(enrollments.map((e) => e.playerIdentityId));

  const enrolledChildren = children.filter((child) =>
    enrolledChildIds.has(child.player._id)
  );

  // Combine child data with enrollment data
  const childrenWithEnrollments = enrolledChildren.map((child) => {
    const enrollment = enrollments.find(
      (e) => e.playerIdentityId === child.player._id
    );
    return {
      ...child,
      enrollment,
    };
  });

  return {
    guardianIdentity,
    children: childrenWithEnrollments,
    isLoading: isLoading || enrollmentsQuery === undefined,
    hasIdentity: guardianIdentity !== null && guardianIdentity !== undefined,
  };
}

/**
 * Hook to get org-specific guardian profile.
 *
 * @param organizationId - The organization ID
 *
 * Usage:
 * ```tsx
 * const { profile, isLoading } = useGuardianOrgProfile(orgId);
 * ```
 */
export function useGuardianOrgProfile(organizationId: string | undefined) {
  const { guardianIdentity, isLoading: identityLoading } =
    useGuardianIdentity();

  const profile = useQuery(
    api.models.orgGuardianProfiles.getOrgGuardianProfile,
    guardianIdentity?._id && organizationId
      ? { guardianIdentityId: guardianIdentity._id, organizationId }
      : "skip"
  );

  return {
    guardianIdentity,
    profile,
    isLoading: identityLoading || profile === undefined,
  };
}
