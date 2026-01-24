"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
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

type ExistingGuardianDetails = {
  guardianIdentityId: Id<"guardianIdentities">;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  verificationStatus: string;
  linkedPlayersCount: number;
};

type ReassignGuardianModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGuardian: ExistingGuardianDetails;
  playerName: string;
  onConfirm: () => Promise<void>;
};

export function ReassignGuardianModal({
  open,
  onOpenChange,
  existingGuardian,
  playerName,
  onConfirm,
}: ReassignGuardianModalProps) {
  const [isReassigning, setIsReassigning] = useState(false);

  const handleConfirm = async () => {
    setIsReassigning(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by the parent component
      console.error("Reassign failed:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "email_verified":
        return (
          <Badge className="bg-green-100 text-green-700" variant="secondary">
            <UserCheck className="mr-1 h-3 w-3" />
            Email Verified
          </Badge>
        );
      case "id_verified":
        return (
          <Badge className="bg-blue-100 text-blue-700" variant="secondary">
            <UserCheck className="mr-1 h-3 w-3" />
            ID Verified
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-600" variant="secondary">
            Unverified
          </Badge>
        );
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reassign Guardian
          </DialogTitle>
          <DialogDescription>
            A guardian with this email already exists in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Guardian Preview Card */}
          <div className="rounded-lg border bg-slate-50 p-4">
            <h4 className="mb-3 font-medium text-slate-700 text-sm">
              Existing Guardian Details
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {existingGuardian.firstName} {existingGuardian.lastName}
                </span>
                {getVerificationBadge(existingGuardian.verificationStatus)}
              </div>

              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Mail className="h-4 w-4" />
                <span>{existingGuardian.email}</span>
              </div>

              {existingGuardian.phone && (
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{existingGuardian.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  Linked to {existingGuardian.linkedPlayersCount}{" "}
                  {existingGuardian.linkedPlayersCount === 1
                    ? "player"
                    : "players"}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <p className="text-sm">
            Would you like to link <strong>{playerName}</strong> to this
            guardian instead?
          </p>

          <p className="text-muted-foreground text-xs">
            Note: The original guardian record will be kept for audit purposes.
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={isReassigning}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isReassigning}
            onClick={handleConfirm}
            type="button"
          >
            {isReassigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign Guardian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
