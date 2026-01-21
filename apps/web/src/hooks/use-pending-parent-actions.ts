"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useSession } from "@/lib/auth-client";

export type PendingParentActions = {
  unclaimedIdentities: Array<{
    guardianIdentity: any;
    linkedChildren: Array<{
      playerIdentityId: string;
      playerName: string;
      organizationId: string;
      organizationName: string;
      relationship: string;
      linkId: string;
    }>;
    organizations: Array<{
      organizationId: string;
      organizationName: string;
    }>;
  }>;
  newChildAssignments: Array<{
    guardianIdentityId: string;
    linkId: string;
    playerIdentityId: string;
    playerName: string;
    organizationId: string;
    organizationName: string;
    relationship: string;
    assignedAt: number;
  }>;
  incompleteProfiles: Array<{
    linkId: string;
    playerIdentityId: string;
    playerName: string;
    organizationId: string;
    organizationName: string;
    requiredFields: string[];
  }>;
  missingConsents: Array<{
    linkId: string;
    playerIdentityId: string;
    playerName: string;
    organizationId: string;
    organizationName: string;
    consentType: string;
  }>;
};

export function usePendingParentActions() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Query pending actions (this also returns dismiss count now)
  const data = useQuery(
    api.models.guardianIdentities.getPendingParentActionsWithDismissCount,
    userId ? { userId } : "skip"
  );

  // Extract data
  const pendingActions = data?.pendingActions;
  const dismissCount = data?.dismissCount || 0;
  const lastDismissedAt = data?.lastDismissedAt || 0;

  // Calculate if we have pending actions
  const hasPendingActions =
    pendingActions &&
    (pendingActions.unclaimedIdentities.length > 0 ||
      pendingActions.newChildAssignments.length > 0 ||
      pendingActions.incompleteProfiles.length > 0 ||
      pendingActions.missingConsents.length > 0);

  // Determine if we should show modal or banner
  const shouldShowModal = hasPendingActions && dismissCount < 3;
  const shouldShowBanner = hasPendingActions && dismissCount >= 3;

  return {
    pendingActions: pendingActions as PendingParentActions | undefined,
    isLoading: data === undefined,
    hasPendingActions: !!hasPendingActions,
    dismissCount,
    lastDismissedAt,
    shouldShowModal,
    shouldShowBanner,
  };
}
