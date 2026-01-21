"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
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
import { useSession } from "@/lib/auth-client";

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
  const { data: session } = useSession();
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

  // Use atomic find-or-create mutation to avoid race conditions
  const findOrCreateGuardian = useMutation(
    api.models.guardianIdentities.findOrCreateGuardian
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
      // Step 1: Find or create guardian (atomic operation - no race condition)
      const guardianResult = await findOrCreateGuardian({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        createdFrom: "admin_guardians_page",
        // Pass current user info for auto-linking detection
        currentUserId: session?.user?.id,
        currentUserEmail: session?.user?.email,
      });

      // Step 2: Link guardian to player
      await createGuardianPlayerLink({
        guardianIdentityId: guardianResult.guardianIdentityId,
        playerIdentityId: playerId,
        relationship: formData.relationship,
        isPrimary: true, // First guardian added is primary
        hasParentalResponsibility: true,
        canCollectFromTraining: true,
        consentedToSharing: false, // Requires explicit consent
      });

      // Success message depends on whether guardian was created or found
      if (guardianResult.autoLinked) {
        toast.success("Guardian added and linked to your account", {
          description: `You've been linked as guardian to ${playerName}. No claim process needed.`,
        });
      } else if (guardianResult.wasCreated) {
        toast.success("Guardian added successfully", {
          description: `${formData.firstName} ${formData.lastName} has been created and linked to ${playerName}`,
        });
      } else {
        toast.success("Existing guardian linked successfully", {
          description: `${formData.firstName} ${formData.lastName} has been linked to ${playerName}`,
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
              Add Guardian
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
