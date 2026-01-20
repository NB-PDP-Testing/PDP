"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Checkbox } from "./ui/checkbox";
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
  childrenListList: Child[];
  organizations: Organization[];
  userId: string;
  onClaimComplete: () => void;
};

export function GuardianIdentityClaimDialog({
  open,
  onOpenChange,
  guardianIdentityId,
  guardianName,
  childrenList,
  organizations,
  userId,
  onClaimComplete,
}: GuardianIdentityClaimDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentToSharing, setConsentToSharing] = useState(false);

  const linkGuardianToUser = useMutation(
    api.models.guardianIdentities.linkGuardianToUser
  );
  const updateLinkConsent = useMutation(
    api.models.guardianPlayerLinks.updateLinkConsent
  );

  const handleClaim = async () => {
    setIsProcessing(true);
    try {
      // Link the guardian identity to the user
      await linkGuardianToUser({
        guardianIdentityId,
        userId,
      });

      // Update consent for all childrenList
      for (const child of childrenList) {
        await updateLinkConsent({
          guardianIdentityId,
          playerIdentityId: child.playerIdentityId,
          consentedToSharing: consentToSharing,
        });
      }

      toast.success(
        `Welcome back, ${guardianName}! Your profile has been linked to your account.`
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

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            We Found Your Profile!
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-4 text-base">
            We found an existing profile for{" "}
            <span className="font-semibold">{guardianName}</span> in our system.
            Is this you?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
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
                Your {childrenList.length === 1 ? "Child" : "Children"}
              </h3>
              <div className="space-y-2">
                {childrenList.map((child) => (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                    key={child.playerIdentityId}
                  >
                    <div>
                      <p className="font-medium">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Age {calculateAge(child.dateOfBirth)} •{" "}
                        {child.relationship}
                      </p>
                    </div>
                  </div>
                ))}
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
                onCheckedChange={(checked) =>
                  setConsentToSharing(checked === true)
                }
              />
              <div className="flex-1">
                <Label
                  className="cursor-pointer text-sm leading-relaxed"
                  htmlFor="consent-sharing"
                >
                  Allow other clubs/organizations to see my relationship with{" "}
                  {childrenList.length === 1 ? "this child" : "these children"}
                </Label>
                <p className="mt-1 text-muted-foreground text-xs">
                  This helps other clubs your{" "}
                  {childrenList.length === 1 ? "child" : "children"} may join in
                  the future to identify you as their guardian. You can change
                  this setting anytime in your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-2 font-semibold text-sm">What happens next?</h3>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>Your account will be linked to this profile</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>
                  You'll have access to your{" "}
                  {childrenList.length === 1 ? "child's" : "children's"}{" "}
                  information
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>You can manage your profile and preferences</span>
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
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
            {isProcessing ? "Linking Profile..." : "Yes, This Is Me"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
