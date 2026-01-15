"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
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

type RevokeConsentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentId: Id<"passportShareConsents">;
  childName: string;
  organizationName: string;
  onSuccess?: () => void;
};

/**
 * RevokeConsentModal - US-031
 *
 * Confirmation modal for revoking passport sharing consent.
 * Shows warning about immediate revocation and optional reason field.
 */
export function RevokeConsentModal({
  open,
  onOpenChange,
  consentId,
  childName,
  organizationName,
  onSuccess,
}: RevokeConsentModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const revokeConsent = useMutation(
    api.models.passportSharing.revokePassportShareConsent
  );

  const handleRevoke = async () => {
    try {
      setIsSubmitting(true);

      await revokeConsent({
        consentId,
        revokedReason: reason || undefined,
      });

      // Close modal and reset state
      onOpenChange(false);
      setReason("");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      // TODO: Show toast notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <DialogTitle>Revoke Sharing Access</DialogTitle>
          </div>
          <DialogDescription>
            This action will immediately revoke{" "}
            <span className="font-semibold">{organizationName}</span>'s access
            to <span className="font-semibold">{childName}</span>'s passport
            data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning box */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900 text-sm">
              What happens when you revoke:
            </p>
            <ul className="mt-2 space-y-1 text-amber-800 text-sm">
              <li>• Coaches will lose access immediately</li>
              <li>• All guardians will be notified</li>
              <li>• You can re-enable sharing anytime</li>
            </ul>
          </div>

          {/* Optional reason field */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              disabled={isSubmitting}
              id="reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Player moved to another club, concerns about data access, etc."
              rows={3}
              value={reason}
            />
            <p className="text-muted-foreground text-xs">
              This will be included in the notification to guardians and logged
              for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            disabled={isSubmitting}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleRevoke}
            type="button"
            variant="destructive"
          >
            {isSubmitting ? "Revoking..." : "Revoke Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
