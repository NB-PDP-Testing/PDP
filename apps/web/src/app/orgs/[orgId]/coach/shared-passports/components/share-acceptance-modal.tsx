"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

type PendingShare = {
  consentId: Id<"passportShareConsents">;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  sourceOrgIds: string[];
  sourceOrgMode: "all_enrolled" | "specific_orgs";
  sharedElements: {
    basicProfile: boolean;
    skillRatings: boolean;
    skillHistory: boolean;
    developmentGoals: boolean;
    coachNotes: boolean;
    benchmarkData: boolean;
    attendanceRecords: boolean;
    injuryHistory: boolean;
    medicalSummary: boolean;
    contactInfo: boolean;
  };
  consentedAt: number;
  expiresAt: number;
};

type ShareAcceptanceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share: PendingShare | null;
  onSuccess?: () => void;
};

/**
 * ShareAcceptanceModal - US-037 and US-038
 *
 * Modal for coaches to accept or decline incoming passport shares.
 * Shows pending share details, shared elements, and source organizations.
 * Supports decline with optional reason (US-038).
 */
export function ShareAcceptanceModal({
  open,
  onOpenChange,
  share,
  onSuccess,
}: ShareAcceptanceModalProps) {
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const acceptShare = useMutation(
    api.models.passportSharing.acceptPassportShare
  );
  const declineShare = useMutation(
    api.models.passportSharing.declinePassportShare
  );

  // Get all organizations from Better Auth to resolve names
  const { data: organizations } = authClient.useListOrganizations();

  // Create a map of orgId to orgName
  const orgNameMap = useMemo(() => {
    if (!organizations) {
      return new Map<string, string>();
    }
    return new Map(organizations.map((org) => [org.id, org.name]));
  }, [organizations]);

  // Format shared elements for display
  const formatSharedElements = (elements: PendingShare["sharedElements"]) => {
    const elementLabels: Record<string, string> = {
      basicProfile: "Profile",
      skillRatings: "Skills",
      skillHistory: "History",
      developmentGoals: "Goals",
      coachNotes: "Notes",
      benchmarkData: "Benchmarks",
      attendanceRecords: "Attendance",
      injuryHistory: "Injuries",
      medicalSummary: "Medical",
      contactInfo: "Contacts",
    };

    return Object.entries(elements)
      .filter(([_, value]) => value === true)
      .map(([key]) => elementLabels[key] || key);
  };

  // Format source organizations
  const formatSourceOrgs = () => {
    if (!share) {
      return "";
    }
    if (share.sourceOrgMode === "all_enrolled") {
      return "All enrolled organizations";
    }
    return share.sourceOrgIds.map((id) => orgNameMap.get(id) || id).join(", ");
  };

  const handleAccept = async () => {
    if (!share) {
      return;
    }

    try {
      setIsSubmitting(true);

      await acceptShare({
        consentId: share.consentId,
      });

      toast.success("Share accepted!", {
        description: `You now have access to ${share.playerName}'s passport data.`,
      });

      // Close modal and reset state
      onOpenChange(false);
      setShowDeclineForm(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to accept share:", error);
      toast.error("Failed to accept share", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineClick = () => {
    setShowDeclineForm(true);
  };

  const handleDeclineConfirm = async () => {
    if (!share) {
      return;
    }

    try {
      setIsSubmitting(true);

      await declineShare({
        consentId: share.consentId,
        declineReason: declineReason || undefined,
      });

      toast.success("Share declined", {
        description: "The parent will be notified of your decision.",
      });

      // Close modal and reset state
      onOpenChange(false);
      setShowDeclineForm(false);
      setDeclineReason("");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to decline share:", error);
      toast.error("Failed to decline share", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!share) {
    return null;
  }

  const sharedElementsList = formatSharedElements(share.sharedElements);
  const sourceOrgs = formatSourceOrgs();

  // Calculate expiry date
  const expiryDate = new Date(share.expiresAt).toLocaleDateString();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {showDeclineForm ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            )}
            <DialogTitle>
              {showDeclineForm ? "Decline Share?" : "Accept Passport Share"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {showDeclineForm
              ? "You can provide an optional reason for declining this share."
              : `Review the details and accept to view ${share.playerName}'s passport data.`}
          </DialogDescription>
        </DialogHeader>

        {showDeclineForm ? (
          <div className="space-y-4 py-4">
            {/* Decline reason field */}
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason (optional)</Label>
              <Textarea
                disabled={isSubmitting}
                id="declineReason"
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g., I don't need access to this data, player not on my team, etc."
                rows={3}
                value={declineReason}
              />
              <p className="text-muted-foreground text-xs">
                This will be shared with the parent to help them understand your
                decision.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Player info */}
            <div>
              <h4 className="mb-2 font-semibold text-gray-900 text-sm">
                Player
              </h4>
              <p className="text-gray-700">{share.playerName}</p>
            </div>

            {/* Source organizations */}
            <div>
              <h4 className="mb-2 font-semibold text-gray-900 text-sm">
                Shared From
              </h4>
              <p className="text-gray-700 text-sm">{sourceOrgs}</p>
            </div>

            {/* Shared elements */}
            <div>
              <h4 className="mb-2 font-semibold text-gray-900 text-sm">
                Shared Data
              </h4>
              <div className="flex flex-wrap gap-1">
                {sharedElementsList.map((element) => (
                  <Badge className="text-xs" key={element} variant="outline">
                    {element}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Expiry date */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">
                    Expires on {expiryDate}
                  </p>
                  <p className="text-blue-800 text-xs">
                    Parents can revoke access at any time
                  </p>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                <p className="text-gray-700 text-xs">
                  All access will be logged for audit purposes. Only accept if
                  you need this data for coaching purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {showDeclineForm ? (
            <>
              <Button
                disabled={isSubmitting}
                onClick={() => setShowDeclineForm(false)}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleDeclineConfirm}
                type="button"
                variant="destructive"
              >
                {isSubmitting ? "Declining..." : "Confirm Decline"}
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={isSubmitting}
                onClick={handleDeclineClick}
                type="button"
                variant="outline"
              >
                Decline
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleAccept}
                type="button"
              >
                {isSubmitting ? "Accepting..." : "Accept Share"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
