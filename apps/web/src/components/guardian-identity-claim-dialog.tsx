"use client";

import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "../../../../packages/backend/convex/_generated/api";
import type { Id } from "../../../../packages/backend/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Label } from "./ui/label";

type Child = {
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
};

type Organization = {
  organizationId: string;
  organizationName?: string;
};

type GuardianIdentityClaimDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianIdentityId: Id<"guardianIdentities">;
  guardianName: string;
  childrenList: Child[];
  organizations: Organization[];
  userId: string;
  onClaimComplete: () => void;
  onDismiss: () => void;
};

export function GuardianIdentityClaimDialog({
  open,
  onOpenChange,
  guardianIdentityId,
  guardianName: _guardianName,
  childrenList,
  organizations,
  userId,
  onClaimComplete,
  onDismiss,
}: GuardianIdentityClaimDialogProps) {
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentToSharing, setConsentToSharing] = useState(false);
  const [childSelections, setChildSelections] = useState<
    Record<string, "mine" | "not_mine" | "unselected">
  >(
    childrenList.reduce(
      (acc, child) => {
        acc[child.playerIdentityId] = "unselected";
        return acc;
      },
      {} as Record<string, "mine" | "not_mine" | "unselected">
    )
  );

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
    childId: string,
    selection: "mine" | "not_mine"
  ) => {
    setChildSelections((prev) => ({
      ...prev,
      [childId]: prev[childId] === selection ? "unselected" : selection,
    }));
  };

  const handleClaim = async () => {
    // Check if at least one child is selected as "mine"
    const selectedChildren = Object.entries(childSelections).filter(
      ([_, selection]) => selection === "mine"
    );

    if (selectedChildren.length === 0) {
      toast.error("Please select at least one child or click 'This Isn't Me'");
      return;
    }

    setIsProcessing(true);
    try {
      // Link the guardian identity to the user
      await linkGuardianToUser({
        guardianIdentityId,
        userId,
      });

      // Process each child based on selection
      for (const child of childrenList) {
        const selection = childSelections[child.playerIdentityId];

        if (selection === "mine") {
          // Accept this child - update consent
          await updateLinkConsent({
            guardianIdentityId,
            playerIdentityId: child.playerIdentityId,
            consentedToSharing: consentToSharing,
          });
        } else if (selection === "not_mine") {
          // Decline this child
          await declineGuardianPlayerLink({
            guardianIdentityId,
            playerIdentityId: child.playerIdentityId,
            userId,
          });
        }
        // If "unselected", treat as declined
        else if (selection === "unselected") {
          await declineGuardianPlayerLink({
            guardianIdentityId,
            playerIdentityId: child.playerIdentityId,
            userId,
          });
        }
      }

      const acceptedCount = selectedChildren.length;
      const declinedCount = Object.entries(childSelections).filter(
        ([_, selection]) =>
          selection === "not_mine" || selection === "unselected"
      ).length;

      toast.success(
        `Welcome! ${acceptedCount} ${acceptedCount === 1 ? "child" : "children"} linked to your account.${declinedCount > 0 ? ` ${declinedCount} declined.` : ""}`
      );

      onClaimComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to claim guardian identity:", error);
      toast.error(
        "Unable to link your profile. Please contact support if this continues."
      );
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

  // Shared content for both mobile and desktop
  const dialogContent = (
    <div className="space-y-6">
      {/* Organizations */}
      {organizations.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-muted-foreground text-sm">
            Organizations
          </h3>
          <div className="flex flex-wrap gap-2">
            {organizations.map((org) => (
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
      {childrenList.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-muted-foreground text-sm">
            Assigned {childrenList.length === 1 ? "Child" : "Children"}
          </h3>
          <div className="space-y-3">
            {childrenList.map((child) => {
              const selection = childSelections[child.playerIdentityId];
              return (
                <div
                  className={`rounded-lg border p-3 transition-colors ${
                    selection === "mine"
                      ? "border-green-500 bg-green-50"
                      : selection === "not_mine"
                        ? "border-red-500 bg-red-50"
                        : "bg-card"
                  }`}
                  key={child.playerIdentityId}
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
                      onClick={() =>
                        toggleChildSelection(child.playerIdentityId, "mine")
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
                      onClick={() =>
                        toggleChildSelection(child.playerIdentityId, "not_mine")
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

  // Mobile: Use Drawer (full screen)
  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
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
              disabled={isProcessing}
              onClick={handleClaim}
              style={{
                backgroundColor: "var(--pdp-navy)",
              }}
            >
              {isProcessing ? "Processing..." : "Confirm Selections"}
            </Button>
            <Button
              className="h-12 w-full"
              disabled={isProcessing}
              onClick={onDismiss}
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
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <button
          className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
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
          <AlertDialogCancel
            disabled={isProcessing}
            onClick={(e) => {
              e.preventDefault();
              onDismiss();
            }}
          >
            This Isn't Me
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isProcessing}
            onClick={(e) => {
              e.preventDefault();
              handleClaim();
            }}
            style={{
              backgroundColor: "var(--pdp-navy)",
            }}
          >
            {isProcessing ? "Processing..." : "Confirm Selections"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
