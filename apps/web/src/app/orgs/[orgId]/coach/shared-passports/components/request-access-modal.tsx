"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RequestAccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerIdentityId: string;
  playerName?: string;
  organizationId: string;
};

export function RequestAccessModal({
  open,
  onOpenChange,
  playerIdentityId,
  playerName,
  organizationId,
}: RequestAccessModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestAccess = useMutation(
    api.models.passportSharing.requestPassportAccess
  );

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the request");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestAccess({
        playerIdentityId: playerIdentityId as Id<"playerIdentities">,
        requestingOrgId: organizationId,
        reason,
      });

      toast.success("Access request sent to parent/guardian");
      onOpenChange(false);
      setReason("");
    } catch (error) {
      toast.error("Failed to send request. Please try again.");
      console.error("Request access error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Request Passport Access
            {playerName && ` - ${playerName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              className="mt-2"
              id="reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Player is joining our team for the upcoming season..."
              rows={4}
              value={reason}
            />
            <p className="mt-1 text-muted-foreground text-xs">
              This will be sent to the player's parent/guardian for approval
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
