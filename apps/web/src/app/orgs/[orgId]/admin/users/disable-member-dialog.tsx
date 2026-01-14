"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Ban, CircleCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DisableMemberDialogProps = {
  member: { userId: string; name: string; email: string; isDisabled?: boolean };
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DisableMemberDialog({
  member,
  organizationId,
  onClose,
  onSuccess,
}: DisableMemberDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const disableMember = useMutation(api.models.members.disableMemberAccess);
  const enableMember = useMutation(api.models.members.enableMemberAccess);

  const isCurrentlyDisabled = member.isDisabled;

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isCurrentlyDisabled) {
        // Re-enable the member
        const result = await enableMember({
          organizationId,
          userId: member.userId,
        });

        if (result.success) {
          toast.success("Member access restored");
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || "Failed to restore access");
        }
      } else {
        // Disable the member
        const result = await disableMember({
          organizationId,
          userId: member.userId,
          reason: reason || undefined,
        });

        if (result.success) {
          const message =
            result.disableType === "account"
              ? "Member account suspended (only org)"
              : "Member access to this org suspended";
          toast.success(message);
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || "Failed to suspend member");
        }
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCurrentlyDisabled ? (
              <>
                <CircleCheck className="h-5 w-5 text-green-600" />
                Restore Member Access
              </>
            ) : (
              <>
                <Ban className="h-5 w-5 text-orange-600" />
                Suspend Member Access
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="rounded bg-gray-50 p-3">
            <p className="font-medium">{member.name}</p>
            <p className="text-gray-600 text-sm">{member.email}</p>
          </div>

          {isCurrentlyDisabled ? (
            // Re-enable message
            <Alert>
              <AlertDescription>
                This will restore {member.name}'s access to the organization.
                They will be able to log in and use all features again.
              </AlertDescription>
            </Alert>
          ) : (
            // Disable message and reason field
            <>
              <Alert>
                <AlertDescription>
                  This will temporarily suspend {member.name}'s access to the
                  organization. They will not be able to log in or access any
                  data, but all their information will be preserved and can be
                  restored later.
                  <br />
                  <br />
                  <strong>Note:</strong> This does not delete any data or send
                  any notifications.
                </AlertDescription>
              </Alert>

              <div>
                <Label className="font-medium text-sm">Reason (optional)</Label>
                <Textarea
                  className="mt-1"
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this member being suspended?"
                  value={reason}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={handleAction}
              variant={isCurrentlyDisabled ? "default" : "destructive"}
            >
              {loading
                ? isCurrentlyDisabled
                  ? "Restoring..."
                  : "Suspending..."
                : isCurrentlyDisabled
                  ? "Restore Access"
                  : "Suspend Access"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
