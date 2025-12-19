"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "../../../../packages/backend/convex/_generated/api";
import { BulkGuardianClaimDialog } from "./bulk-guardian-claim-dialog";

/**
 * Provider that checks for claimable guardian identities when user logs in
 * Shows bulk claim dialog if multiple unclaimed profiles are found
 */
export function BulkClaimProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [hasChecked, setHasChecked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const userId = session?.user?.id;

  // Query for claimable identities (only runs when logged in)
  const claimableIdentities = useQuery(
    api.models.guardianIdentities.findAllClaimableForCurrentUser,
    userId ? {} : "skip"
  );

  useEffect(() => {
    // Check for claimable identities when query loads
    if (
      userId &&
      claimableIdentities !== undefined &&
      !hasChecked &&
      claimableIdentities.length > 0
    ) {
      // Show dialog for bulk claiming
      setShowDialog(true);
      setHasChecked(true);
    }
  }, [userId, claimableIdentities, hasChecked]);

  const handleClaimComplete = () => {
    setShowDialog(false);
    // The query will automatically refresh and show updated data
  };

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      // User dismissed the dialog
      setHasChecked(true);
    }
  };

  return (
    <>
      {children}

      {/* Bulk Claim Dialog */}
      {userId && claimableIdentities && claimableIdentities.length > 0 && (
        <BulkGuardianClaimDialog
          claimableIdentities={claimableIdentities}
          onClaimComplete={handleClaimComplete}
          onOpenChange={handleDialogClose}
          open={showDialog}
          userId={userId}
        />
      )}
    </>
  );
}
