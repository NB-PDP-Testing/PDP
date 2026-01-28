"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ChildLink = {
  linkId: string;
  playerIdentityId: string;
  playerName: string;
  relationship: string;
  organizationName: string;
  organizationId: string;
  guardianIdentityId: string;
};

// Maximum number of times a user can skip child linking
const MAX_SKIP_COUNT = 3;

type ChildLinkingStepProps = {
  pendingLinks: ChildLink[];
  hasExistingGdprConsent?: boolean;
  onComplete: () => void;
  skipCount?: number; // Phase 6: Current skip count (max 3)
};

/**
 * ChildLinkingStep - Modal component for parent child linking
 *
 * Displays all pending child links for the parent to accept or decline.
 * This modal cannot be dismissed without actioning all children.
 */
export function ChildLinkingStep({
  pendingLinks,
  hasExistingGdprConsent = false,
  onComplete,
  skipCount = 0,
}: ChildLinkingStepProps) {
  const [consentToSharing, setConsentToSharing] = useState(true);
  const [actionedLinks, setActionedLinks] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const acceptChildLink = useMutation(
    api.models.guardianPlayerLinks.acceptChildLink
  );
  const declineChildLink = useMutation(
    api.models.guardianPlayerLinks.declineChildLinkWithStatus
  );
  const acceptAllChildLinks = useMutation(
    api.models.guardianPlayerLinks.acceptAllChildLinks
  );
  const incrementSkipCount = useMutation(
    api.models.onboarding.incrementChildLinkingSkipCount
  );

  // Show skip button only if user hasn't exceeded max skips
  const canSkip = skipCount < MAX_SKIP_COUNT;

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await incrementSkipCount();
      toast.info("You can complete this step next time you log in.");
      onComplete();
    } catch (error) {
      console.error("Failed to skip child linking:", error);
      toast.error("Failed to skip. Please try again.");
    } finally {
      setIsSkipping(false);
    }
  };

  // Get remaining pending links (not yet actioned)
  const remainingLinks = pendingLinks.filter(
    (link) => !actionedLinks.has(link.linkId)
  );

  // Check if all links have been actioned
  const allActioned = remainingLinks.length === 0;

  // Get unique guardian identity IDs for Accept All
  const uniqueGuardianIds = [
    ...new Set(remainingLinks.map((link) => link.guardianIdentityId)),
  ];

  const handleAccept = async (link: ChildLink) => {
    setIsSubmitting(link.linkId);
    try {
      await acceptChildLink({
        linkId: link.linkId as Id<"guardianPlayerLinks">,
        consentToSharing,
      });

      setActionedLinks((prev) => new Set([...prev, link.linkId]));
      toast.success(`${link.playerName} linked successfully`);

      // Check if this was the last one
      if (remainingLinks.length === 1) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to accept child link:", error);
      toast.error("Failed to link child. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDecline = async (link: ChildLink) => {
    setIsSubmitting(link.linkId);
    try {
      await declineChildLink({
        linkId: link.linkId as Id<"guardianPlayerLinks">,
      });

      setActionedLinks((prev) => new Set([...prev, link.linkId]));
      toast.info(`Link to ${link.playerName} declined`);

      // Check if this was the last one
      if (remainingLinks.length === 1) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to decline child link:", error);
      toast.error("Failed to decline link. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleAcceptAll = async () => {
    setAcceptingAll(true);
    try {
      // Accept all for each unique guardian identity
      for (const guardianId of uniqueGuardianIds) {
        await acceptAllChildLinks({
          guardianIdentityId: guardianId as Id<"guardianIdentities">,
          consentToSharing,
        });
      }

      // Mark all as actioned
      const allLinkIds = remainingLinks.map((link) => link.linkId);
      setActionedLinks((prev) => new Set([...prev, ...allLinkIds]));

      toast.success(`${remainingLinks.length} children linked successfully`);
      onComplete();
    } catch (error) {
      console.error("Failed to accept all child links:", error);
      toast.error("Failed to link children. Please try again.");
    } finally {
      setAcceptingAll(false);
    }
  };

  // Format relationship for display
  const formatRelationship = (relationship: string) => {
    const labels: Record<string, string> = {
      mother: "Mother of",
      father: "Father of",
      guardian: "Guardian of",
      grandparent: "Grandparent of",
      other: "Guardian of",
    };
    return labels[relationship] || "Guardian of";
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg sm:max-w-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <AlertDialogTitle>Confirm Your Children</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {hasExistingGdprConsent && (
                <p className="rounded-md bg-blue-50 p-2 text-blue-800 text-sm">
                  Your privacy consent now extends to the children below.
                </p>
              )}
              <p>
                Please confirm the following children are associated with your
                account.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-80 space-y-3 overflow-y-auto py-4">
          {allActioned ? (
            <div className="py-8 text-center text-muted-foreground">
              <Check className="mx-auto mb-2 size-12 text-green-500" />
              <p>All children have been confirmed!</p>
            </div>
          ) : (
            remainingLinks.map((link) => (
              <Card key={link.linkId}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{link.playerName}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatRelationship(link.relationship)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {link.organizationName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={isSubmitting === link.linkId || acceptingAll}
                      onClick={() => handleDecline(link)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="mr-1 size-4" />
                      Decline
                    </Button>
                    <Button
                      disabled={isSubmitting === link.linkId || acceptingAll}
                      onClick={() => handleAccept(link)}
                      size="sm"
                    >
                      <Check className="mr-1 size-4" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!allActioned && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={consentToSharing}
                id="consent-sharing"
                onCheckedChange={(checked) =>
                  setConsentToSharing(checked === true)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="font-medium text-sm leading-relaxed"
                  htmlFor="consent-sharing"
                >
                  Allow sharing of my child's progress with coaches at other
                  clubs
                </Label>
                <p className="text-muted-foreground text-xs">
                  This helps coaches provide better support when players
                  participate at multiple clubs
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {!allActioned && canSkip && (
            <Button
              className="w-full sm:w-auto"
              disabled={acceptingAll || isSubmitting !== null || isSkipping}
              onClick={handleSkip}
              size="lg"
              variant="outline"
            >
              {isSkipping ? "Skipping..." : "Skip for Now"}
            </Button>
          )}
          {!allActioned && remainingLinks.length > 1 && (
            <Button
              className="w-full sm:w-auto"
              disabled={acceptingAll || isSubmitting !== null || isSkipping}
              onClick={handleAcceptAll}
              size="lg"
            >
              {acceptingAll
                ? "Accepting..."
                : `Accept All (${remainingLinks.length})`}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
