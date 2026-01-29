"use client";

/**
 * AcceptInvitationStep - Onboarding step for accepting pending invitations
 *
 * Displays pending organization invitations and allows the user to accept
 * or skip them. Integrates with the onboarding orchestrator flow.
 */

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Type for invitation data from the orchestrator
export type PendingInvitation = {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  role: string;
  functionalRoles: string[];
  expiresAt: number;
  playerLinks?: Array<{
    id: string;
    name: string;
    ageGroup?: string;
  }>;
  teams?: Array<{
    id: string;
    name: string;
  }>;
};

type AcceptInvitationStepProps = {
  invitations: PendingInvitation[];
  onComplete: () => void;
};

export function AcceptInvitationStep({
  invitations,
  onComplete,
}: AcceptInvitationStepProps) {
  const router = useRouter();

  const handleAcceptInvitation = (invitationId: string) => {
    // Navigate to the invitation acceptance page
    router.push(`/orgs/accept-invitation/${invitationId}`);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog onOpenChange={() => onComplete()} open>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>You have pending invitations!</DialogTitle>
          <DialogDescription>
            You&apos;ve been invited to join {invitations.length} organization
            {invitations.length > 1 ? "s" : ""}. Accept your invitations to get
            started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {invitations.map((invitation) => (
            <Card className="p-4" key={invitation.invitationId}>
              <div className="space-y-3">
                {/* Organization Name */}
                <div>
                  <p className="font-medium text-base">
                    {invitation.organizationName}
                  </p>
                </div>

                {/* Functional Roles with Assignments */}
                {invitation.functionalRoles.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-xs">
                      You&apos;re being invited as:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {invitation.functionalRoles.map((role: string) => (
                        <div className="flex items-center gap-1.5" key={role}>
                          <Badge className="text-xs" variant="outline">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Badge>
                          {/* Show teams inline if coach role */}
                          {role === "coach" &&
                            invitation.teams &&
                            invitation.teams.length > 0 && (
                              <span className="text-blue-600 text-xs">
                                &rarr;{" "}
                                {invitation.teams.map((t) => t.name).join(", ")}
                              </span>
                            )}
                          {/* Show players inline if parent role */}
                          {role === "parent" &&
                            invitation.playerLinks &&
                            invitation.playerLinks.length > 0 && (
                              <span className="text-green-600 text-xs">
                                &rarr;{" "}
                                {invitation.playerLinks
                                  .map((p) => p.name)
                                  .join(", ")}
                              </span>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expiration Notice */}
                <div>
                  <p className="text-muted-foreground text-xs">
                    Expires:{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Accept Button */}
                <Button
                  className="w-full"
                  onClick={() =>
                    handleAcceptInvitation(invitation.invitationId)
                  }
                >
                  Accept Invitation
                </Button>
              </div>
            </Card>
          ))}

          {/* Skip Button */}
          <Button className="w-full" onClick={handleSkip} variant="ghost">
            I&apos;ll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
