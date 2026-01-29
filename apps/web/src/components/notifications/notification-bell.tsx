"use client";

/**
 * NotificationBell - Header notification icon with pending items dropdown
 *
 * Shows a bell icon with a badge count when there are pending items:
 * - Pending organization invitations
 * - (Future: coach messages, announcements, etc.)
 *
 * Clicking opens a dropdown panel to view and act on pending items.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Bell, Mail, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  // Query for pending invitations
  const pendingInvitations = useQuery(
    api.models.members.getPendingInvitationsForUser,
    session?.user?.email ? { email: session.user.email } : "skip"
  );

  // Calculate total notification count
  const invitationCount = pendingInvitations?.length ?? 0;
  const totalCount = invitationCount;

  // Don't render anything if no notifications
  if (totalCount === 0) {
    return null;
  }

  const handleAcceptInvitation = (invitationId: string) => {
    // Close the popover and navigate to accept the invitation
    setIsOpen(false);
    router.push(`/orgs/accept-invitation/${invitationId}`);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    // Refresh the page to trigger the orchestrator
    router.refresh();
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className="relative h-9 w-9 rounded-full"
          size="icon"
          variant="ghost"
        >
          <Bell className="h-5 w-5 text-white" />
          {/* Notification badge */}
          <span className="-right-1 -top-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-bold text-[10px] text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
          <span className="sr-only">
            {totalCount} pending notification{totalCount !== 1 ? "s" : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-muted-foreground text-sm">
            You have {totalCount} pending item{totalCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* Pending Invitations Section */}
          {invitationCount > 0 && (
            <div className="p-2">
              <div className="mb-2 flex items-center gap-2 px-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  Organization Invitations
                </span>
              </div>
              <div className="space-y-1">
                {pendingInvitations?.map((invitation) => (
                  <div
                    className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                    key={invitation.invitationId}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {invitation.organizationName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {invitation.functionalRoles.map((role: string) => (
                            <Badge
                              className="text-xs"
                              key={role}
                              variant="secondary"
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          ))}
                        </div>
                        {invitation.playerLinks &&
                          invitation.playerLinks.length > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                              <Users className="h-3 w-3" />
                              {invitation.playerLinks.length} child
                              {invitation.playerLinks.length !== 1 ? "ren" : ""}{" "}
                              linked
                            </p>
                          )}
                      </div>
                      <Button
                        onClick={() =>
                          handleAcceptInvitation(invitation.invitationId)
                        }
                        size="sm"
                        variant="default"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2">
          <Button
            className="w-full"
            onClick={handleViewAll}
            size="sm"
            variant="ghost"
          >
            View All & Complete Setup
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
