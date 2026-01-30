"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { authClient } from "@/lib/auth-client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  playerName?: string;
  existingGuardianCount: number;
};

type Relationship = "mother" | "father" | "guardian" | "grandparent" | "other";

// Email validation regex - defined at module level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper component to display user status message (avoids nested ternary)
function UserStatusMessage({
  checkUser,
}: {
  checkUser: { exists: boolean; isMember: boolean };
}) {
  if (checkUser.exists && checkUser.isMember) {
    return (
      <p className="text-muted-foreground text-xs">
        <span className="text-green-600">
          User is already a member of this organization. They will be linked
          directly.
        </span>
      </p>
    );
  }

  if (checkUser.exists) {
    return (
      <p className="text-muted-foreground text-xs">
        <span className="text-blue-600">
          User has an account but is not in this organization. An invitation
          will be sent.
        </span>
      </p>
    );
  }

  return (
    <p className="text-muted-foreground text-xs">
      <span className="text-orange-600">
        New user. An invitation will be sent to create an account.
      </span>
    </p>
  );
}

export function AddGuardianModal({
  open,
  onOpenChange,
  playerIdentityId,
  organizationId,
  playerName,
  existingGuardianCount,
}: Props) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("guardian");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Get current session for self-assignment detection
  const { data: session } = authClient.useSession();

  // Mutation for linking existing org members directly
  const linkPlayersToGuardian = useMutation(
    api.models.guardianPlayerLinks.linkPlayersToGuardian
  );

  // Mutation for updating invitation metadata
  const updateInvitationMetadata = useMutation(
    api.models.members.updateInvitationMetadata
  );

  // Query to check if user exists and their org membership
  const checkUser = useQuery(
    api.models.members.checkUserAndMembership,
    email.trim()
      ? { email: email.trim().toLowerCase(), organizationId }
      : "skip"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if user exists and is already in org
      if (checkUser?.exists && checkUser?.isMember) {
        // User EXISTS and is already in org - link directly
        const result = await linkPlayersToGuardian({
          playerIdentityIds: [playerIdentityId],
          guardianEmail: normalizedEmail,
          organizationId,
          relationship,
          currentUserId: session?.user?.id,
          currentUserEmail: session?.user?.email,
        });

        if (result.errors.length > 0) {
          toast.error(result.errors[0]);
        } else if (result.linked === 0) {
          toast.info("Guardian was already linked to this player");
        } else {
          toast.success(
            `${normalizedEmail} has been added as a guardian. They will see a notification to confirm.`
          );
        }
      } else if (sendEmail) {
        // User does NOT exist OR exists but not in org - send invitation
        const metadata = {
          suggestedFunctionalRoles: ["parent"] as const,
          suggestedPlayerLinks: [
            {
              id: playerIdentityId,
              name: playerName || "Player",
              relationship,
            },
          ],
        };

        const inviteResult = await authClient.organization.inviteMember({
          email: normalizedEmail,
          organizationId,
          role: "member", // Base Better Auth role
          metadata: metadata as any,
        } as any);

        if (inviteResult.error) {
          throw new Error(
            inviteResult.error.message || "Failed to send invitation"
          );
        }

        // Update invitation with metadata
        const invitationId =
          (inviteResult.data as { invitation?: { id?: string }; id?: string })
            ?.invitation?.id || (inviteResult.data as { id?: string })?.id;

        if (invitationId) {
          await updateInvitationMetadata({
            invitationId,
            metadata,
          });
        }

        toast.success(
          `Invitation sent to ${normalizedEmail}. When they accept, they'll be linked as a guardian.`
        );
      } else {
        // User doesn't exist or isn't in org, but admin chose not to send email
        // Create pending link directly - guardian will see prompt on next login
        const result = await linkPlayersToGuardian({
          playerIdentityIds: [playerIdentityId],
          guardianEmail: normalizedEmail,
          organizationId,
          relationship,
          currentUserId: session?.user?.id,
          currentUserEmail: session?.user?.email,
        });

        if (result.errors.length > 0) {
          toast.error(result.errors[0]);
        } else {
          toast.success(
            `${normalizedEmail} has been added as a guardian. They will see a prompt on their next login.`
          );
        }
      }

      // Reset form and close modal
      setEmail("");
      setRelationship("guardian");
      setSendEmail(true);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding guardian:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to add guardian. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setEmail("");
      setRelationship("guardian");
      setSendEmail(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Guardian
          </DialogTitle>
          <DialogDescription>
            Add a parent or guardian for {playerName || "this player"}.
            {existingGuardianCount === 0 && (
              <span className="mt-1 block text-green-600">
                This will be the primary guardian.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="guardian-email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  autoComplete="email"
                  className="pl-10"
                  disabled={isSubmitting}
                  id="guardian-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  type="email"
                  value={email}
                />
              </div>
              {email.trim() && checkUser !== undefined && (
                <UserStatusMessage checkUser={checkUser} />
              )}
            </div>

            {/* Relationship Select */}
            <div className="space-y-2">
              <Label htmlFor="guardian-relationship">Relationship</Label>
              <Select
                disabled={isSubmitting}
                onValueChange={(value: Relationship) => setRelationship(value)}
                value={relationship}
              >
                <SelectTrigger id="guardian-relationship">
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

            {/* Send Email Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                checked={sendEmail}
                disabled={isSubmitting}
                id="send-email"
                onCheckedChange={(checked) => setSendEmail(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="send-email"
                >
                  Send email notification to guardian
                </Label>
                <p className="text-muted-foreground text-xs">
                  If unchecked, guardian will see a prompt on their next login
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting || !email.trim()} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Guardian
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
