"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  MailCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type InvitationHistoryModalProps = {
  invitationId: string;
  inviteeEmail: string;
  onClose: () => void;
};

export function InvitationHistoryModal({
  invitationId,
  inviteeEmail,
  onClose,
}: InvitationHistoryModalProps) {
  const events = useQuery(api.models.members.getInvitationEvents, {
    invitationId,
  });

  if (!events) {
    return null;
  }

  // Helper to format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to get event icon
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "created":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "resent":
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      case "modified":
        return <Edit3 className="h-4 w-4 text-orange-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "expired":
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <MailCheck className="h-4 w-4 text-gray-600" />;
    }
  };

  // Helper to get event label
  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "created":
        return "Invitation Created";
      case "resent":
        return "Invitation Resent";
      case "modified":
        return "Invitation Modified";
      case "cancelled":
        return "Invitation Cancelled";
      case "accepted":
        return "Invitation Accepted";
      case "rejected":
        return "Invitation Rejected";
      case "expired":
        return "Invitation Expired";
      default:
        return eventType;
    }
  };

  // Helper to get event description
  const getEventDescription = (event: any) => {
    const performer =
      event.performedByName || event.performedByEmail || "System";

    switch (event.eventType) {
      case "created":
        return `${performer} sent invitation`;
      case "resent":
        return `${performer} resent invitation email`;
      case "modified":
        return `${performer} updated invitation details`;
      case "cancelled":
        return `${performer} cancelled invitation`;
      case "accepted": {
        const roles = event.metadata?.functionalRolesAssigned || [];
        return `Invitation accepted${roles.length > 0 ? ` as ${roles.join(", ")}` : ""}`;
      }
      case "rejected":
        return "Invitation was rejected";
      case "expired":
        return "Invitation expired";
      default:
        return "";
    }
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invitation History</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Timeline for {inviteeEmail}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No events recorded
              </p>
            ) : (
              <div className="relative space-y-4">
                {/* Timeline line */}
                <div className="absolute top-0 bottom-0 left-[11px] w-px bg-gray-200" />

                {events.map((event, _index) => (
                  <div className="relative flex gap-4" key={event._id}>
                    {/* Event icon */}
                    <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
                      {getEventIcon(event.eventType)}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs" variant="outline">
                              {getEventLabel(event.eventType)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm">
                            {getEventDescription(event)}
                          </p>

                          {/* Show metadata for created events */}
                          {event.eventType === "created" &&
                            event.metadata?.suggestedFunctionalRoles && (
                              <div className="mt-2 rounded-md bg-blue-50 p-2">
                                <p className="font-medium text-blue-900 text-xs">
                                  Roles:{" "}
                                  {event.metadata.suggestedFunctionalRoles.join(
                                    ", "
                                  )}
                                </p>
                                {event.metadata.roleSpecificData?.teams
                                  ?.length > 0 && (
                                  <p className="text-blue-700 text-xs">
                                    Teams:{" "}
                                    {event.metadata.roleSpecificData.teams
                                      .map((t: any) => t.name || t)
                                      .join(", ")}
                                  </p>
                                )}
                                {event.metadata.suggestedPlayerLinks?.length >
                                  0 && (
                                  <p className="text-blue-700 text-xs">
                                    Players:{" "}
                                    {event.metadata.suggestedPlayerLinks.length}{" "}
                                    linked
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Show changes for modified events */}
                          {event.eventType === "modified" && event.changes && (
                            <div className="mt-2 rounded-md bg-orange-50 p-2">
                              <p className="font-medium text-orange-900 text-xs">
                                Changed: {event.changes.field}
                              </p>
                            </div>
                          )}

                          {/* Show metadata for accepted events */}
                          {event.eventType === "accepted" && event.metadata && (
                            <div className="mt-2 space-y-1 rounded-md bg-green-50 p-2 text-green-700 text-xs">
                              {event.metadata.functionalRolesAssigned?.length >
                                0 && (
                                <p>
                                  Roles assigned:{" "}
                                  {event.metadata.functionalRolesAssigned.join(
                                    ", "
                                  )}
                                </p>
                              )}
                              {event.metadata.coachTeamsAssigned > 0 && (
                                <p>
                                  Teams assigned:{" "}
                                  {event.metadata.coachTeamsAssigned}
                                </p>
                              )}
                              {event.metadata.playersLinked > 0 && (
                                <p>
                                  Players linked: {event.metadata.playersLinked}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-muted-foreground text-xs">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
