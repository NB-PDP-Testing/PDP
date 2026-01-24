"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReassignGuardianModal } from "./reassign-guardian-modal";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EditGuardianModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianPlayerLinkId: Id<"guardianPlayerLinks">;
  guardianIdentityId: Id<"guardianIdentities">;
  playerName: string;
  currentData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    relationship: string;
  };
};

export function EditGuardianModal({
  open,
  onOpenChange,
  guardianPlayerLinkId,
  guardianIdentityId,
  playerName,
  currentData,
}: EditGuardianModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: currentData.firstName,
    lastName: currentData.lastName,
    email: currentData.email,
    phone: currentData.phone || "",
    relationship: currentData.relationship as
      | "mother"
      | "father"
      | "guardian"
      | "grandparent"
      | "other",
  });

  // Reset form data when currentData changes (modal reopens with different guardian)
  useEffect(() => {
    setFormData({
      firstName: currentData.firstName,
      lastName: currentData.lastName,
      email: currentData.email,
      phone: currentData.phone || "",
      relationship: currentData.relationship as
        | "mother"
        | "father"
        | "guardian"
        | "grandparent"
        | "other",
    });
  }, [currentData]);

  // Check for email conflicts when email changes
  const normalizedEmail = formData.email.toLowerCase().trim();
  const emailChanged =
    normalizedEmail !== currentData.email.toLowerCase().trim();

  const conflictCheck = useQuery(
    api.models.guardianIdentities.checkGuardianEmailConflict,
    emailChanged && EMAIL_REGEX.test(formData.email)
      ? {
          email: normalizedEmail,
          excludeGuardianId: guardianIdentityId,
        }
      : "skip"
  );

  const updateGuardianIdentity = useMutation(
    api.models.guardianIdentities.updateGuardianIdentity
  );
  const updateGuardianPlayerLink = useMutation(
    api.models.guardianPlayerLinks.updateGuardianPlayerLink
  );
  const reassignPlayerToGuardian = useMutation(
    api.models.guardianPlayerLinks.reassignPlayerToGuardian
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      toast.error("Please enter first name");
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error("Please enter last name");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter email address");
      return;
    }

    // Basic email validation
    if (!EMAIL_REGEX.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if there's a conflict with an existing guardian
    if (conflictCheck) {
      // Show reassign modal instead of failing
      setShowReassignModal(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async () => {
    setIsSaving(true);

    try {
      // Update guardian identity
      await updateGuardianIdentity({
        guardianIdentityId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
      });

      // Update relationship in guardian-player link
      await updateGuardianPlayerLink({
        linkId: guardianPlayerLinkId,
        relationship: formData.relationship,
      });

      toast.success("Guardian information updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update guardian:", error);

      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          // This shouldn't happen anymore since we check first, but handle it just in case
          errorMessage =
            "A guardian with this email already exists in the system";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error("Failed to update guardian", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReassign = async () => {
    if (!conflictCheck) {
      return;
    }

    setIsSaving(true);
    try {
      // Reassign the player-guardian link to the existing guardian
      await reassignPlayerToGuardian({
        linkId: guardianPlayerLinkId,
        newGuardianIdentityId: conflictCheck.guardianIdentityId,
        relationship: formData.relationship,
      });

      toast.success("Player reassigned to existing guardian successfully");
      setShowReassignModal(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to reassign guardian:", error);

      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("already linked")) {
          errorMessage = "This guardian is already linked to this player";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error("Failed to reassign guardian", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Guardian</DialogTitle>
              <DialogDescription>
                Update guardian contact information and relationship
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* First Name */}
              <div className="grid gap-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                  required
                  value={formData.firstName}
                />
              </div>

              {/* Last Name */}
              <div className="grid gap-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                  required
                  value={formData.lastName}
                />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="guardian@example.com"
                  required
                  type="email"
                  value={formData.email}
                />
                {/* Show hint if email conflicts with existing guardian */}
                {conflictCheck && (
                  <p className="text-amber-600 text-xs">
                    This email belongs to an existing guardian (
                    {conflictCheck.firstName} {conflictCheck.lastName}). Saving
                    will offer to reassign the player.
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+353 123 456 789"
                  type="tel"
                  value={formData.phone}
                />
              </div>

              {/* Relationship */}
              <div className="grid gap-2">
                <Label htmlFor="relationship">
                  Relationship <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      relationship: value as typeof formData.relationship,
                    })
                  }
                  value={formData.relationship}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                disabled={isSaving}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSaving} type="submit">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reassign Guardian Modal */}
      {conflictCheck && (
        <ReassignGuardianModal
          existingGuardian={conflictCheck}
          onConfirm={handleReassign}
          onOpenChange={setShowReassignModal}
          open={showReassignModal}
          playerName={playerName}
        />
      )}
    </>
  );
}
