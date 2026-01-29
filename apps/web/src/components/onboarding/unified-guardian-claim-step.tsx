"use client";

/**
 * UnifiedGuardianClaimStep - Unified onboarding step for guardian identity claim + child linking
 *
 * This component combines:
 * 1. Claiming the guardian identity (linking it to the user)
 * 2. Accepting/declining individual children with "Yes, this is mine" / "No, not mine"
 * 3. Privacy consent for cross-organization sharing
 *
 * Used by the OnboardingOrchestrator for the guardian_claim task.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

export type ClaimableChild = {
  playerIdentityId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
};

export type ClaimableOrganization = {
  organizationId: string;
  organizationName?: string;
};

export type ClaimableIdentity = {
  guardianIdentity: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    verificationStatus: string;
  };
  children: ClaimableChild[];
  organizations: ClaimableOrganization[];
};

type UnifiedGuardianClaimStepProps = {
  claimableIdentities: ClaimableIdentity[];
  userId: string;
  onComplete: () => void;
};

export function UnifiedGuardianClaimStep({
  claimableIdentities,
  userId,
  onComplete,
}: UnifiedGuardianClaimStepProps) {
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentToSharing, setConsentToSharing] = useState(false);

  // Track selection state for each child across all identities
  // Key: `${guardianIdentityId}:${playerIdentityId}`
  const [childSelections, setChildSelections] = useState<
    Record<string, "mine" | "not_mine" | "unselected">
  >(() => {
    const initial: Record<string, "mine" | "not_mine" | "unselected"> = {};
    for (const identity of claimableIdentities) {
      for (const child of identity.children) {
        initial[`${identity.guardianIdentity._id}:${child.playerIdentityId}`] =
          "unselected";
      }
    }
    return initial;
  });

  const linkGuardianToUser = useMutation(
    api.models.guardianIdentities.linkGuardianToUser
  );
  const updateLinkConsent = useMutation(
    api.models.guardianPlayerLinks.updateLinkConsent
  );
  const declineGuardianPlayerLink = useMutation(
    api.models.guardianPlayerLinks.declineGuardianPlayerLink
  );

  const toggleChildSelection = (
    guardianId: string,
    childId: string,
    selection: "mine" | "not_mine"
  ) => {
    const key = `${guardianId}:${childId}`;
    setChildSelections((prev) => ({
      ...prev,
      [key]: prev[key] === selection ? "unselected" : selection,
    }));
  };

  const selectAllAsMine = () => {
    const newSelections: Record<string, "mine" | "not_mine" | "unselected"> =
      {};
    for (const identity of claimableIdentities) {
      for (const child of identity.children) {
        newSelections[
          `${identity.guardianIdentity._id}:${child.playerIdentityId}`
        ] = "mine";
      }
    }
    setChildSelections(newSelections);
  };

  const handleConfirm = async () => {
    // Check if at least one child is selected as "mine"
    const hasSelectedChildren = Object.values(childSelections).some(
      (s) => s === "mine"
    );

    if (!hasSelectedChildren) {
      toast.error(
        "Please select at least one child as yours, or click 'This Isn't Me'"
      );
      return;
    }

    setIsProcessing(true);
    try {
      let linkedCount = 0;
      let declinedCount = 0;

      // Process each identity
      for (const identity of claimableIdentities) {
        const guardianId = identity.guardianIdentity._id;

        // Check if any children from this identity are selected as "mine"
        const hasChildrenFromThisIdentity = identity.children.some(
          (child) =>
            childSelections[`${guardianId}:${child.playerIdentityId}`] ===
            "mine"
        );

        if (hasChildrenFromThisIdentity) {
          // Link the guardian identity to the user
          await linkGuardianToUser({
            guardianIdentityId: guardianId as Id<"guardianIdentities">,
            userId,
          });

          // Process each child
          for (const child of identity.children) {
            const selection =
              childSelections[`${guardianId}:${child.playerIdentityId}`];

            if (selection === "mine") {
              // Accept this child - update consent and mark as acknowledged
              await updateLinkConsent({
                guardianIdentityId: guardianId as Id<"guardianIdentities">,
                playerIdentityId:
                  child.playerIdentityId as Id<"playerIdentities">,
                consentedToSharing: consentToSharing,
              });
              linkedCount += 1;
            } else {
              // Decline this child (either "not_mine" or "unselected")
              await declineGuardianPlayerLink({
                guardianIdentityId: guardianId as Id<"guardianIdentities">,
                playerIdentityId:
                  child.playerIdentityId as Id<"playerIdentities">,
                userId,
              });
              declinedCount += 1;
            }
          }
        }
      }

      toast.success(
        `Welcome! ${linkedCount} ${linkedCount === 1 ? "child" : "children"} linked to your account.${declinedCount > 0 ? ` ${declinedCount} declined.` : ""}`
      );

      onComplete();
    } catch (error) {
      console.error("Failed to process guardian claim:", error);
      toast.error(
        "Unable to link your profile. Please contact support if this continues."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissAll = async () => {
    setIsProcessing(true);
    try {
      // Decline all children from all identities
      for (const identity of claimableIdentities) {
        for (const child of identity.children) {
          await declineGuardianPlayerLink({
            guardianIdentityId: identity.guardianIdentity
              ._id as Id<"guardianIdentities">,
            playerIdentityId: child.playerIdentityId as Id<"playerIdentities">,
            userId,
          });
        }
      }

      toast.info("All links have been declined.");
      onComplete();
    } catch (error) {
      console.error("Failed to dismiss guardian claim:", error);
      toast.error("Failed to dismiss. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }
    return age;
  };

  // Get selected count
  const selectedCount = Object.values(childSelections).filter(
    (s) => s === "mine"
  ).length;

  // Collect all unique organizations
  const allOrganizations = claimableIdentities.flatMap((i) => i.organizations);
  const uniqueOrgs = allOrganizations.filter(
    (org, index, self) =>
      index === self.findIndex((o) => o.organizationId === org.organizationId)
  );

  // Collect all children with their guardian info
  const allChildren = claimableIdentities.flatMap((identity) =>
    identity.children.map((child) => ({
      ...child,
      guardianId: identity.guardianIdentity._id,
    }))
  );

  // Shared dialog content
  const dialogContent = (
    <div className="space-y-6">
      {/* Organizations */}
      {uniqueOrgs.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-muted-foreground text-sm">
            Organizations
          </h3>
          <div className="flex flex-wrap gap-2">
            {uniqueOrgs.map((org) => (
              <div
                className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm"
                key={org.organizationId}
              >
                {org.organizationName || org.organizationId}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children */}
      {allChildren.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-muted-foreground text-sm">
              Assigned {allChildren.length === 1 ? "Child" : "Children"}
            </h3>
            {allChildren.length > 1 && (
              <Button
                disabled={isProcessing}
                onClick={selectAllAsMine}
                size="sm"
                type="button"
                variant="outline"
              >
                <Check className="mr-1 h-3 w-3" />
                Accept All
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {allChildren.map((child) => {
              const key = `${child.guardianId}:${child.playerIdentityId}`;
              const selection = childSelections[key];
              return (
                <div
                  className={`rounded-lg border p-3 transition-colors ${
                    selection === "mine"
                      ? "border-green-500 bg-green-50"
                      : selection === "not_mine"
                        ? "border-red-500 bg-red-50"
                        : "bg-card"
                  }`}
                  key={key}
                >
                  <div className="mb-2">
                    <p className="font-medium">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Age {calculateAge(child.dateOfBirth)} •{" "}
                      {child.relationship}
                    </p>
                  </div>
                  {/* Stack buttons vertically on mobile, horizontally on desktop */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <Button
                      className={`h-14 flex-1 text-base sm:h-8 sm:text-xs ${
                        selection === "mine"
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }`}
                      disabled={isProcessing}
                      onClick={() =>
                        toggleChildSelection(
                          child.guardianId,
                          child.playerIdentityId,
                          "mine"
                        )
                      }
                      size="sm"
                      type="button"
                      variant={selection === "mine" ? "default" : "outline"}
                    >
                      <Check className="mr-2 h-5 w-5 sm:mr-1 sm:h-3 sm:w-3" />
                      Yes, this is mine
                    </Button>
                    <Button
                      className={`h-14 flex-1 text-base sm:h-8 sm:text-xs ${
                        selection === "not_mine"
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                      }`}
                      disabled={isProcessing}
                      onClick={() =>
                        toggleChildSelection(
                          child.guardianId,
                          child.playerIdentityId,
                          "not_mine"
                        )
                      }
                      size="sm"
                      type="button"
                      variant={selection === "not_mine" ? "default" : "outline"}
                    >
                      <X className="mr-2 h-5 w-5 sm:mr-1 sm:h-3 sm:w-3" />
                      No, not mine
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy & Consent */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-3 font-semibold text-sm">
          Privacy & Cross-Organization Sharing
        </h3>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={consentToSharing}
            disabled={isProcessing}
            id="consent-sharing"
            onCheckedChange={(checked) => setConsentToSharing(checked === true)}
          />
          <div className="flex-1">
            <Label
              className="cursor-pointer text-sm leading-relaxed"
              htmlFor="consent-sharing"
            >
              Allow other clubs/organizations to see my relationship with the
              children I'm accepting
            </Label>
            <p className="mt-1 text-muted-foreground text-xs">
              This helps other clubs your children may join in the future to
              identify you as their guardian. You can change this setting
              anytime in your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open>
        <DrawerContent className="h-[100dvh] max-h-[100dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">
              Welcome, you have pending actions
            </DrawerTitle>
            <DrawerDescription className="text-base">
              Please review and confirm the children assigned to your account.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-4">{dialogContent}</div>
          <DrawerFooter className="flex-col gap-2 pt-2">
            <Button
              className="h-12 w-full"
              disabled={isProcessing || selectedCount === 0}
              onClick={handleConfirm}
              style={{ backgroundColor: "var(--pdp-navy)" }}
            >
              {isProcessing
                ? "Processing..."
                : `Confirm Selections (${selectedCount})`}
            </Button>
            <Button
              className="h-12 w-full"
              disabled={isProcessing}
              onClick={handleDismissAll}
              variant="outline"
            >
              This Isn't Me
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use AlertDialog
  return (
    <AlertDialog open>
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            Welcome, you have pending actions
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-4 text-base">
            Please review and confirm the children assigned to your account.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">{dialogContent}</div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing} onClick={handleDismissAll}>
            This Isn't Me
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isProcessing || selectedCount === 0}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            style={{ backgroundColor: "var(--pdp-navy)" }}
          >
            {isProcessing
              ? "Processing..."
              : `Confirm Selections (${selectedCount})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
