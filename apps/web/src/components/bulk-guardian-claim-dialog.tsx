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
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";

type ClaimableIdentity = {
  guardianIdentity: {
    _id: Id<"guardianIdentities">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    verificationStatus: string;
  };
  children: Array<{
    playerIdentityId: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationship: string;
  }>;
  organizations: Array<{
    organizationId: string;
    organizationName?: string;
  }>;
  confidence: number;
};

type BulkGuardianClaimDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimableIdentities: ClaimableIdentity[];
  userId: string;
  onClaimComplete: () => void;
};

export function BulkGuardianClaimDialog({
  open,
  onOpenChange,
  claimableIdentities,
  userId,
  onClaimComplete,
}: BulkGuardianClaimDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIdentities, setSelectedIdentities] = useState<Set<string>>(
    new Set(claimableIdentities.map((i) => i.guardianIdentity._id))
  );
  const [consentToSharing, setConsentToSharing] = useState(false);

  const linkGuardianToUser = useMutation(
    api.models.guardianIdentities.linkGuardianToUser
  );
  const updateLinkConsent = useMutation(
    api.models.guardianPlayerLinks.updateLinkConsent
  );

  const handleClaimSelected = async () => {
    setIsProcessing(true);
    try {
      let linkedCount = 0;

      for (const identity of claimableIdentities) {
        if (selectedIdentities.has(identity.guardianIdentity._id)) {
          // Link the guardian identity to the user
          await linkGuardianToUser({
            guardianIdentityId: identity.guardianIdentity._id,
            userId,
          });

          // Update consent for all children of this guardian
          for (const child of identity.children) {
            await updateLinkConsent({
              guardianIdentityId: identity.guardianIdentity._id,
              playerIdentityId: child.playerIdentityId,
              consentedToSharing: consentToSharing,
            });
          }

          linkedCount++;
        }
      }

      if (linkedCount > 0) {
        const totalChildren = claimableIdentities
          .filter((i) => selectedIdentities.has(i.guardianIdentity._id))
          .reduce((sum, i) => sum + i.children.length, 0);

        toast.success(
          `Successfully linked ${linkedCount} ${linkedCount === 1 ? "profile" : "profiles"} with access to ${totalChildren} ${totalChildren === 1 ? "child" : "children"}!`
        );
      }

      onClaimComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to claim guardian identities:", error);
      toast.error(
        "Unable to link some profiles. Please contact support if this continues."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleIdentity = (identityId: string) => {
    const newSet = new Set(selectedIdentities);
    if (newSet.has(identityId)) {
      newSet.delete(identityId);
    } else {
      newSet.add(identityId);
    }
    setSelectedIdentities(newSet);
  };

  const totalSelectedChildren = claimableIdentities
    .filter((i) => selectedIdentities.has(i.guardianIdentity._id))
    .reduce((sum, i) => sum + i.children.length, 0);

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-h-[90vh] max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            Multiple Profiles Found!
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2 text-base">
            We found {claimableIdentities.length} guardian{" "}
            {claimableIdentities.length === 1 ? "profile" : "profiles"} that
            match your email address. Select which ones you'd like to claim.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {claimableIdentities.map((identity) => {
              const isSelected = selectedIdentities.has(
                identity.guardianIdentity._id
              );

              return (
                <div
                  className={`rounded-lg border p-4 transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                  key={identity.guardianIdentity._id}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      id={identity.guardianIdentity._id}
                      onCheckedChange={() =>
                        toggleIdentity(identity.guardianIdentity._id)
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <Label
                        className="cursor-pointer font-semibold text-base"
                        htmlFor={identity.guardianIdentity._id}
                      >
                        {identity.guardianIdentity.firstName}{" "}
                        {identity.guardianIdentity.lastName}
                      </Label>

                      {/* Organizations */}
                      {identity.organizations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {identity.organizations.map((org) => (
                            <Badge key={org.organizationId} variant="secondary">
                              {org.organizationName || org.organizationId}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Children */}
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Children:
                        </p>
                        {identity.children.map((child) => (
                          <div
                            className="flex items-center justify-between text-sm"
                            key={child.playerIdentityId}
                          >
                            <span>
                              {child.firstName} {child.lastName}
                            </span>
                            <Badge className="text-xs" variant="outline">
                              {child.relationship}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Consent Section */}
        {selectedIdentities.size > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={consentToSharing}
                id="bulk-consent-sharing"
                onCheckedChange={(checked) =>
                  setConsentToSharing(checked === true)
                }
              />
              <div className="flex-1">
                <Label
                  className="cursor-pointer text-sm leading-relaxed"
                  htmlFor="bulk-consent-sharing"
                >
                  Allow cross-organization sharing for all selected profiles
                </Label>
                <p className="mt-1 text-muted-foreground text-xs">
                  This helps other clubs your children may join to identify you
                  as their guardian. You can change this setting later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {selectedIdentities.size > 0 && (
          <div className="rounded-lg border bg-primary/10 p-4">
            <p className="text-sm">
              <span className="font-semibold">
                {selectedIdentities.size}{" "}
                {selectedIdentities.size === 1 ? "profile" : "profiles"}
              </span>{" "}
              selected, giving you access to{" "}
              <span className="font-semibold">
                {totalSelectedChildren}{" "}
                {totalSelectedChildren === 1 ? "child" : "children"}
              </span>
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Skip for Now
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isProcessing || selectedIdentities.size === 0}
            onClick={(e) => {
              e.preventDefault();
              handleClaimSelected();
            }}
            style={{
              backgroundColor: "var(--pdp-navy)",
            }}
          >
            {isProcessing
              ? "Linking Profiles..."
              : `Claim ${selectedIdentities.size} ${selectedIdentities.size === 1 ? "Profile" : "Profiles"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
