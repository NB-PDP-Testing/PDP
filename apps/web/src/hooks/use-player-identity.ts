import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

/**
 * Hook to get a player identity by ID with all related data.
 *
 * @param playerIdentityId - The player identity ID
 *
 * Returns:
 * - player: The player identity data
 * - guardians: Array of linked guardians with relationship info
 * - enrollments: Array of org enrollments
 * - isLoading: Whether the data is still loading
 *
 * Usage:
 * ```tsx
 * const { player, guardians, enrollments, isLoading } = usePlayerIdentity(playerId);
 *
 * if (isLoading) return <Loading />;
 * if (!player) return <PlayerNotFound />;
 *
 * return <PlayerProfile player={player} guardians={guardians} />;
 * ```
 */
export function usePlayerIdentity(
  playerIdentityId: Id<"playerIdentities"> | undefined
) {
  // Get player identity
  const player = useQuery(
    api.models.playerIdentities.getPlayerById,
    playerIdentityId ? { playerIdentityId } : "skip"
  );

  // Get guardians for this player
  const guardians = useQuery(
    api.models.guardianPlayerLinks.getGuardiansForPlayer,
    playerIdentityId ? { playerIdentityId } : "skip"
  );

  // Get all enrollments for this player
  const enrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForPlayer,
    playerIdentityId ? { playerIdentityId } : "skip"
  );

  const isLoading =
    player === undefined ||
    guardians === undefined ||
    enrollments === undefined;

  return {
    player,
    guardians: guardians ?? [],
    enrollments: enrollments ?? [],
    isLoading,
  };
}

/**
 * Hook to get a player's enrollment in a specific organization.
 *
 * @param playerIdentityId - The player identity ID
 * @param organizationId - The organization ID
 *
 * Usage:
 * ```tsx
 * const { player, enrollment, isLoading } = usePlayerEnrollment(playerId, orgId);
 * ```
 */
export function usePlayerEnrollment(
  playerIdentityId: Id<"playerIdentities"> | undefined,
  organizationId: string | undefined
) {
  const {
    player,
    guardians,
    isLoading: playerLoading,
  } = usePlayerIdentity(playerIdentityId);

  const enrollment = useQuery(
    api.models.orgPlayerEnrollments.getEnrollment,
    playerIdentityId && organizationId
      ? { playerIdentityId, organizationId }
      : "skip"
  );

  return {
    player,
    guardians,
    enrollment,
    isLoading: playerLoading || enrollment === undefined,
    isEnrolled: enrollment !== null && enrollment !== undefined,
  };
}

/**
 * Hook to get the player identity for the current logged-in adult user.
 *
 * For adult players who have their own account linked to their player identity.
 *
 * Usage:
 * ```tsx
 * const { player, emergencyContacts, isLoading } = useMyPlayerProfile();
 * ```
 */
export function useMyPlayerProfile() {
  // Get player identity for current user (only works for adult players)
  const player = useQuery(api.models.playerIdentities.getPlayerForCurrentUser);

  // Get emergency contacts if player exists
  const emergencyContacts = useQuery(
    api.models.playerEmergencyContacts.getEmergencyContacts,
    player?._id ? { playerIdentityId: player._id } : "skip"
  );

  // Get all enrollments
  const enrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForPlayer,
    player?._id ? { playerIdentityId: player._id } : "skip"
  );

  const isLoading = player === undefined;
  const hasProfile = player !== null && player !== undefined;

  return {
    player,
    emergencyContacts: emergencyContacts ?? [],
    enrollments: enrollments ?? [],
    isLoading,
    hasProfile,
    isAdult: player?.playerType === "adult",
  };
}

/**
 * Hook to get players enrolled in an organization.
 *
 * @param organizationId - The organization ID
 * @param options - Optional filters (status, ageGroup)
 *
 * Usage:
 * ```tsx
 * const { players, isLoading } = usePlayersInOrg(orgId, { status: "active" });
 * ```
 */
export function usePlayersInOrg(
  organizationId: string | undefined,
  options?: {
    status?: "active" | "inactive" | "pending" | "suspended";
    ageGroup?: string;
  }
) {
  const players = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    organizationId
      ? {
          organizationId,
          status: options?.status,
          ageGroup: options?.ageGroup,
        }
      : "skip"
  );

  return {
    players: players ?? [],
    isLoading: players === undefined,
  };
}

/**
 * Hook to calculate a player's age from their date of birth.
 *
 * @param playerIdentityId - The player identity ID
 *
 * Usage:
 * ```tsx
 * const { age, ageGroup, isLoading } = usePlayerAge(playerId);
 * ```
 */
export function usePlayerAge(
  playerIdentityId: Id<"playerIdentities"> | undefined
) {
  const age = useQuery(
    api.models.playerIdentities.getPlayerAge,
    playerIdentityId ? { playerIdentityId } : "skip"
  );

  const ageGroup = useQuery(
    api.models.playerIdentities.getPlayerAgeGroup,
    playerIdentityId ? { playerIdentityId } : "skip"
  );

  return {
    age,
    ageGroup,
    isLoading: age === undefined || ageGroup === undefined,
  };
}
