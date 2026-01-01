"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../packages/backend/convex/_generated/api";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

/**
 * Modal that automatically detects and displays pending invitations
 * when a user logs in or signs up without clicking the invitation link.
 *
 * This component:
 * - Queries for pending invitations matching the current user's email
 * - Shows a modal with all pending invitations
 * - Allows user to accept invitations or dismiss to handle later
 * - Handles both single and multiple pending invitations
 */
export function PendingInvitationsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const pendingInvitations = useQuery(
    api.models.members.getPendingInvitationsByEmail,
    {}
  );

  // Show modal when invitations are detected
  useEffect(() => {
    if (pendingInvitations && pendingInvitations.length > 0) {
      setIsOpen(true);
    }
  }, [pendingInvitations]);

  if (!pendingInvitations || pendingInvitations.length === 0) {
    return null;
  }

  const handleAcceptInvitation = (invitationId: string) => {
    router.push(`/orgs/accept-invitation/${invitationId}`);
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>You have pending invitations!</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            You&apos;ve been invited to join {pendingInvitations.length}{" "}
            organization{pendingInvitations.length > 1 ? "s" : ""}. Accept your
            invitations to get started.
          </p>

          {pendingInvitations.map((invitation) => (
            <Card className="p-4" key={invitation._id}>
              <div className="space-y-3">
                {/* Organization Name */}
                <div>
                  <p className="font-medium text-base">
                    {invitation.organizationName}
                  </p>
                  <p className="text-gray-600 text-sm">{invitation.email}</p>
                </div>

                {/* Functional Roles with Assignments */}
                {invitation.functionalRoles.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-600 text-xs">
                      You&apos;re being invited as:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {invitation.functionalRoles.map((role: string) => (
                        <div className="flex items-center gap-1.5" key={role}>
                          <Badge className="text-xs" variant="outline">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Badge>
                          {/* Show teams inline if coach role */}
                          {role === "coach" && invitation.teams?.length > 0 && (
                            <span className="text-blue-600 text-xs">
                              →{" "}
                              {invitation.teams
                                .map((t: { name: string }) => t.name)
                                .join(", ")}
                            </span>
                          )}
                          {/* Show players inline if parent role */}
                          {role === "parent" &&
                            invitation.players?.length > 0 && (
                              <span className="text-green-600 text-xs">
                                →{" "}
                                {invitation.players
                                  .map(
                                    (p: {
                                      firstName: string;
                                      lastName: string;
                                    }) => `${p.firstName} ${p.lastName}`
                                  )
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
                  <p className="text-gray-500 text-xs">
                    Expires:{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Accept Button */}
                <Button
                  className="w-full"
                  onClick={() => handleAcceptInvitation(invitation._id)}
                >
                  Accept Invitation
                </Button>
              </div>
            </Card>
          ))}

          {/* Dismiss Button */}
          <Button
            className="w-full"
            onClick={() => setIsOpen(false)}
            variant="ghost"
          >
            I&apos;ll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
