"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RemoveFromOrgDialogProps = {
  member: { userId: string; name: string; email: string };
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function RemoveFromOrgDialog({
  member,
  organizationId,
  onClose,
  onSuccess,
}: RemoveFromOrgDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = useQuery(api.models.members.getRemovalPreview, {
    organizationId,
    userId: member.userId,
  });

  const removeFromOrg = useMutation(api.models.members.removeFromOrganization);

  const handleRemove = async () => {
    if (confirmText !== "REMOVE") {
      toast.error("Please type REMOVE to confirm");
      return;
    }

    setLoading(true);
    try {
      const result = await removeFromOrg({
        organizationId,
        userId: member.userId,
        reason,
      });

      if (result.success) {
        toast.success("Member removed from organization");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Failed to remove member");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!preview) {
    return null;
  }

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Remove from Organization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Blockers */}
          {!preview.canRemove && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {preview.blockers[0]?.message}
              </AlertDescription>
            </Alert>
          )}

          {/* User Info */}
          <div className="rounded bg-gray-50 p-3">
            <p className="font-medium">{member.name}</p>
            <p className="text-gray-600 text-sm">{member.email}</p>
          </div>

          {/* Impact Summary */}
          {preview.canRemove && (
            <div>
              <h4 className="mb-2 font-medium">This will remove:</h4>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Organization membership</li>
                {preview.impacts.teamsCoached > 0 && (
                  <li>
                    • {preview.impacts.teamsCoached} team coaching assignment(s)
                  </li>
                )}
                {preview.impacts.playersManaged > 0 && (
                  <li>
                    • {preview.impacts.playersManaged} player guardian link(s)
                  </li>
                )}
                {preview.impacts.voiceNotes > 0 && (
                  <li>• {preview.impacts.voiceNotes} voice note(s)</li>
                )}
                {preview.impacts.guardianProfiles > 0 && (
                  <li>
                    • {preview.impacts.guardianProfiles} guardian profile(s)
                  </li>
                )}
                {preview.impacts.playerEnrollments > 0 && (
                  <li>
                    • {preview.impacts.playerEnrollments} player enrollment(s)
                  </li>
                )}
                {preview.impacts.sportPassports > 0 && (
                  <li>• {preview.impacts.sportPassports} sport passport(s)</li>
                )}
                {preview.impacts.pendingInvitations > 0 && (
                  <li>
                    • {preview.impacts.pendingInvitations} pending invitation(s)
                    will be cancelled
                  </li>
                )}
              </ul>
              <p className="mt-2 text-gray-500 text-xs">
                Note: User account and data in other organizations will be
                preserved.
              </p>
            </div>
          )}

          {/* Reason */}
          {preview.canRemove && (
            <>
              <div>
                <Label className="font-medium text-sm">Reason (optional)</Label>
                <Textarea
                  className="mt-1"
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this member being removed?"
                  value={reason}
                />
              </div>

              {/* Confirmation */}
              <div>
                <Label className="font-medium text-sm">
                  Type <span className="font-bold font-mono">REMOVE</span> to
                  confirm
                </Label>
                <Input
                  className="mt-1"
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="REMOVE"
                  value={confirmText}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={loading || confirmText !== "REMOVE"}
                  onClick={handleRemove}
                  variant="destructive"
                >
                  {loading ? "Removing..." : "Remove from Organization"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
