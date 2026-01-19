"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Email validation regex at top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AddGuardianModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: Id<"playerIdentities">;
  playerName: string;
};

export function AddGuardianModal({
  open,
  onOpenChange,
  playerId,
  playerName,
}: AddGuardianModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "guardian" as
      | "mother"
      | "father"
      | "guardian"
      | "grandparent"
      | "other",
  });

  // Check if guardian exists with this email
  const existingGuardian = useQuery(
    api.models.guardianIdentities.findGuardianByEmail,
    formData.email.trim() && EMAIL_REGEX.test(formData.email.trim())
      ? { email: formData.email.trim() }
      : "skip"
  );

  const createGuardianIdentity = useMutation(
    api.models.guardianIdentities.createGuardianIdentity
  );
  const createGuardianPlayerLink = useMutation(
    api.models.guardianPlayerLinks.createGuardianPlayerLink
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

    setIsSaving(true);

    try {
      let guardianId: Id<"guardianIdentities">;
      let isExistingGuardian = false;

      // Step 1: Check if guardian already exists or create new one
      if (existingGuardian) {
        // Guardian already exists - use their ID
        guardianId = existingGuardian._id;
        isExistingGuardian = true;
      } else {
        // Create new guardian identity
        guardianId = await createGuardianIdentity({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          createdFrom: "admin_guardians_page",
        });
      }

      // Step 2: Link guardian to player
      await createGuardianPlayerLink({
        guardianIdentityId: guardianId,
        playerIdentityId: playerId,
        relationship: formData.relationship,
        isPrimary: true, // First guardian added is primary
        hasParentalResponsibility: true,
        canCollectFromTraining: true,
        consentedToSharing: false, // Requires explicit consent
      });

      // Success message depends on whether guardian existed
      if (isExistingGuardian) {
        toast.success("Existing guardian linked successfully", {
          description: `${existingGuardian.firstName} ${existingGuardian.lastName} has been linked to ${playerName}`,
        });
      } else {
        toast.success("Guardian added successfully", {
          description: `${formData.firstName} ${formData.lastName} has been created and linked to ${playerName}`,
        });
      }

      // Reset form and close modal
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        relationship: "guardian",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add guardian:", error);

      // Provide user-friendly error messages
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          errorMessage = "This guardian is already linked to this player";
        } else if (error.message.includes("not found")) {
          errorMessage = "Player or guardian not found";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error("Failed to link guardian", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Guardian</DialogTitle>
            <DialogDescription>
              Add guardian contact information for {playerName}
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
              {existingGuardian && (
                <p className="text-amber-600 text-sm">
                  ⚠️ A guardian with this email already exists. They will be
                  linked to this player.
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
              {existingGuardian ? "Link Existing Guardian" : "Add Guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
