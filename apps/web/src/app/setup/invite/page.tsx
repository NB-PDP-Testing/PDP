"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Mail, Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Email validation regex at module level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Invitation = {
  id: string;
  email: string;
  role: "admin" | "member";
};

// Generate a simple unique ID for invitations
let invitationIdCounter = 0;
const generateInvitationId = () => {
  invitationIdCounter += 1;
  return `invitation-${invitationIdCounter}`;
};

function SetupInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgName = searchParams.get("orgName");

  const updateSetupStep = useMutation(api.models.setup.updateSetupStep);

  const [invitations, setInvitations] = useState<Invitation[]>([
    { id: generateInvitationId(), email: "", role: "admin" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addInvitation = () => {
    setInvitations([
      ...invitations,
      { id: generateInvitationId(), email: "", role: "admin" },
    ]);
  };

  const removeInvitation = (id: string) => {
    setInvitations(invitations.filter((inv) => inv.id !== id));
  };

  const updateInvitation = (
    id: string,
    field: "email" | "role",
    value: string
  ) => {
    setInvitations(
      invitations.map((inv) =>
        inv.id === id ? { ...inv, [field]: value } : inv
      )
    );
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await updateSetupStep({ step: "complete" });
      router.push(
        `/setup/complete?orgId=${encodeURIComponent(orgId || "")}&orgName=${encodeURIComponent(orgName || "")}`
      );
    } catch (error) {
      console.error("Failed to skip:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvitations = async () => {
    // Filter out empty emails
    const validInvitations = invitations.filter(
      (inv) => inv.email.trim() !== ""
    );

    if (validInvitations.length === 0) {
      toast.error("Please add at least one email address or skip this step.");
      return;
    }

    // Validate email format
    const invalidEmails = validInvitations.filter(
      (inv) => !EMAIL_REGEX.test(inv.email)
    );
    if (invalidEmails.length > 0) {
      toast.error("Please enter valid email addresses.");
      return;
    }

    if (!orgId) {
      toast.error("Organization not found. Please go back and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send invitations using Better Auth
      let successCount = 0;
      let errorCount = 0;

      for (const invitation of validInvitations) {
        try {
          await authClient.organization.inviteMember({
            organizationId: orgId,
            email: invitation.email,
            role: invitation.role,
          });
          successCount += 1;
        } catch (error) {
          console.error(`Failed to invite ${invitation.email}:`, error);
          errorCount += 1;
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} invitation${successCount > 1 ? "s" : ""} sent successfully!`
        );
      }
      if (errorCount > 0) {
        toast.error(
          `Failed to send ${errorCount} invitation${errorCount > 1 ? "s" : ""}.`
        );
      }

      // Update setup step and navigate to complete
      await updateSetupStep({ step: "complete" });
      router.push(
        `/setup/complete?orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName || "")}&invited=${successCount}`
      );
    } catch (error) {
      console.error("Failed to send invitations:", error);
      toast.error("Failed to send invitations. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Invite Your Team</CardTitle>
          <CardDescription className="text-base">
            Add colleagues to help manage{" "}
            {orgName ? (
              <span className="font-medium">{orgName}</span>
            ) : (
              "your organization"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitations list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Team Members</Label>
              <Button
                onClick={addInvitation}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Another
              </Button>
            </div>

            {invitations.map((invitation) => (
              <div className="flex items-start gap-2" key={invitation.id}>
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      disabled={isSubmitting}
                      onChange={(e) =>
                        updateInvitation(invitation.id, "email", e.target.value)
                      }
                      placeholder="colleague@example.com"
                      type="email"
                      value={invitation.email}
                    />
                  </div>
                </div>
                <Select
                  disabled={isSubmitting}
                  onValueChange={(value) =>
                    updateInvitation(invitation.id, "role", value)
                  }
                  value={invitation.role}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {invitations.length > 1 && (
                  <Button
                    disabled={isSubmitting}
                    onClick={() => removeInvitation(invitation.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Help text */}
          <p className="text-center text-muted-foreground text-sm">
            Invited members will receive an email to join your organization. You
            can always invite more team members later from your organization
            settings.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onClick={handleSkip}
              variant="outline"
            >
              Skip for Now
            </Button>
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onClick={handleSendInvitations}
            >
              {isSubmitting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <SetupInviteContent />
    </Suspense>
  );
}
