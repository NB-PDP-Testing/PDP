"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

type RequestAccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  organizationId: string;
  onRequestSent?: () => void;
};

export function RequestAccessModal({
  open,
  onOpenChange,
  playerIdentityId,
  playerName,
  organizationId,
  onRequestSent,
}: RequestAccessModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestAccess = useMutation(
    api.models.passportSharing.requestPassportAccess
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await requestAccess({
        playerIdentityId,
        requestingOrgId: organizationId,
        reason: reason.trim() || undefined,
      });

      toast.success("Access Request Sent", {
        description:
          "Your request has been sent to the player's parent/guardian for approval.",
      });

      // Reset form and close modal
      setReason("");
      onOpenChange(false);

      // Notify parent component if callback provided
      if (onRequestSent) {
        onRequestSent();
      }
    } catch (error) {
      console.error("Failed to request access:", error);
      toast.error("Request Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to send access request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Request Passport Access
          </DialogTitle>
          <DialogDescription>
            Request access to view {playerName}'s shared passport data. This
            request will be sent to their parent/guardian for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Name Display */}
          <div>
            <Label className="font-medium text-sm">Player</Label>
            <p className="mt-1 text-muted-foreground text-sm">{playerName}</p>
          </div>

          {/* Optional Reason Field */}
          <div>
            <Label htmlFor="reason">
              Reason for Request{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              className="mt-1.5"
              disabled={isSubmitting}
              id="reason"
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Player is joining our team and I'd like to understand their development history..."
              rows={4}
              value={reason}
            />
            <p className="mt-1.5 text-muted-foreground text-xs">
              Providing context helps parents understand your request
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
