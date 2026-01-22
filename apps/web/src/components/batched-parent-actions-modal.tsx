"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  FileWarning,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { PendingParentActions } from "@/hooks/use-pending-parent-actions";
import { DeclineReasonDialog } from "./decline-reason-dialog";

type BatchedParentActionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pendingActions: PendingParentActions;
  userId: string;
  onComplete: () => void;
};

type ChildSelection = {
  linkId: Id<"guardianPlayerLinks">;
  identityId?: Id<"guardianIdentities">;
  action: "accept" | "decline" | "pending";
  playerName: string;
};

export function BatchedParentActionsModal({
  isOpen,
  onClose,
  pendingActions,
  userId,
  onComplete,
}: BatchedParentActionsModalProps) {
  const [selections, setSelections] = useState<Map<string, ChildSelection>>(
    new Map()
  );
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [currentDecline, setCurrentDecline] = useState<{
    linkId: Id<"guardianPlayerLinks">;
    playerName: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [unclaimedOpen, setUnclaimedOpen] = useState(true);
  const [newAssignmentsOpen, setNewAssignmentsOpen] = useState(true);
  const [incompleteProfilesOpen, setIncompleteProfilesOpen] = useState(true);

  const batchAcknowledge = useMutation(
    api.models.guardianIdentities.batchAcknowledgeParentActions
  );
  const trackDismissal = useMutation(
    api.models.guardianIdentities.trackParentOnboardingDismissal
  );

  // Initialize selections from pending actions
  const initializeSelections = () => {
    const newSelections = new Map<string, ChildSelection>();

    // Unclaimed identities
    for (const identity of pendingActions.unclaimedIdentities) {
      for (const child of identity.linkedChildren) {
        newSelections.set(child.linkId, {
          linkId: child.linkId as Id<"guardianPlayerLinks">,
          identityId: identity.guardianIdentity._id as Id<"guardianIdentities">,
          action: "pending",
          playerName: child.playerName,
        });
      }
    }

    // New assignments
    for (const assignment of pendingActions.newChildAssignments) {
      newSelections.set(assignment.linkId, {
        linkId: assignment.linkId as Id<"guardianPlayerLinks">,
        identityId: assignment.guardianIdentityId as Id<"guardianIdentities">,
        action: "pending",
        playerName: assignment.playerName,
      });
    }

    setSelections(newSelections);
  };

  // Call on mount
  if (selections.size === 0 && isOpen) {
    initializeSelections();
  }

  const handleAccept = (
    linkId: Id<"guardianPlayerLinks">,
    _playerName: string
  ) => {
    const current = selections.get(linkId);
    if (current) {
      setSelections(
        new Map(selections.set(linkId, { ...current, action: "accept" }))
      );
    }
  };

  const handleDecline = (
    linkId: Id<"guardianPlayerLinks">,
    playerName: string
  ) => {
    setCurrentDecline({ linkId, playerName });
    setDeclineDialogOpen(true);
  };

  const handleDeclineSubmit = (reason: string, reasonText?: string) => {
    if (!currentDecline) {
      return;
    }

    const current = selections.get(currentDecline.linkId);
    if (current) {
      setSelections(
        new Map(
          selections.set(currentDecline.linkId, {
            ...current,
            action: "decline",
            declineReason: reason,
            declineReasonText: reasonText,
          } as any)
        )
      );
    }
    setCurrentDecline(null);
  };

  const handleAcceptAll = () => {
    const newSelections = new Map(selections);
    for (const [linkId, selection] of newSelections) {
      if (selection.action === "pending") {
        newSelections.set(linkId, { ...selection, action: "accept" });
      }
    }
    setSelections(newSelections);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Collect identity IDs to claim
      const claimIdentityIds = new Set<Id<"guardianIdentities">>();
      const acknowledgeLinkIds: Id<"guardianPlayerLinks">[] = [];
      const declineLinkIds: Id<"guardianPlayerLinks">[] = [];
      const declineReasons: Record<
        string,
        { reason: string; reasonText?: string }
      > = {};

      for (const [linkId, selection] of selections) {
        if (selection.action === "accept") {
          if (selection.identityId) {
            claimIdentityIds.add(selection.identityId);
          }
          acknowledgeLinkIds.push(selection.linkId);
        } else if (selection.action === "decline") {
          declineLinkIds.push(selection.linkId);
          if ((selection as any).declineReason) {
            declineReasons[linkId] = {
              reason: (selection as any).declineReason,
              reasonText: (selection as any).declineReasonText,
            };
          }
        }
      }

      // Call batch mutation
      const result = await batchAcknowledge({
        userId,
        claimIdentityIds: Array.from(claimIdentityIds),
        acknowledgeLinkIds,
        declineLinkIds,
        declineReasons: declineReasons as any,
        consentLinkIds: acknowledgeLinkIds, // Auto-consent for accepted children
        profilePromises: acknowledgeLinkIds.map((linkId) => ({
          linkId,
          fieldsToComplete: ["emergencyContact", "medicalInfo"],
        })),
      });

      toast.success(
        `Successfully processed ${result.claimed + result.acknowledged} children. ${
          result.declined > 0 ? `Declined ${result.declined}.` : ""
        }`
      );

      onComplete();
      onClose();
      setSelections(new Map());
    } catch (error) {
      console.error("Error processing parent actions:", error);
      toast.error("Failed to process actions. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await trackDismissal({ userId });
      onClose();
      setSelections(new Map());
    } catch (error) {
      console.error("Error tracking dismissal:", error);
      onClose();
    }
  };

  const getSelectionCounts = () => {
    let accepted = 0;
    let declined = 0;
    let pending = 0;

    for (const selection of selections.values()) {
      if (selection.action === "accept") {
        accepted += 1;
      } else if (selection.action === "decline") {
        declined += 1;
      } else {
        pending += 1;
      }
    }

    return { accepted, declined, pending };
  };

  const counts = getSelectionCounts();
  const hasSelections = counts.accepted > 0 || counts.declined > 0;

  return (
    <>
      <Dialog onOpenChange={handleDismiss} open={isOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Welcome! You have pending actions</DialogTitle>
            <DialogDescription>
              We've found some children that may be linked to your account.
              Please review and confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Unclaimed Identities Section */}
            {pendingActions.unclaimedIdentities.length > 0 && (
              <Collapsible onOpenChange={setUnclaimedOpen} open={unclaimedOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {unclaimedOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Unclaimed Children</span>
                    <Badge variant="secondary">
                      {pendingActions.unclaimedIdentities.reduce(
                        (sum, id) => sum + id.linkedChildren.length,
                        0
                      )}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {pendingActions.unclaimedIdentities.map((identity) => (
                    <div
                      className="space-y-2"
                      key={identity.guardianIdentity._id}
                    >
                      {identity.organizations.length > 0 && (
                        <div className="px-2 font-medium text-muted-foreground text-sm">
                          {identity.organizations
                            .map((org) => org.organizationName)
                            .join(", ")}
                        </div>
                      )}
                      {identity.linkedChildren.map((child) => {
                        const selection = selections.get(child.linkId);
                        return (
                          <div
                            className={`flex items-center justify-between rounded-md border p-3 ${
                              selection?.action === "accept"
                                ? "border-green-500 bg-green-50"
                                : selection?.action === "decline"
                                  ? "border-red-500 bg-red-50"
                                  : ""
                            }`}
                            key={child.linkId}
                          >
                            <div>
                              <div className="font-medium">
                                {child.playerName}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {child.organizationName}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {selection?.action === "pending" && (
                                <>
                                  <Button
                                    onClick={() =>
                                      handleAccept(
                                        child.linkId as Id<"guardianPlayerLinks">,
                                        child.playerName
                                      )
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    ✓ This is my child
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleDecline(
                                        child.linkId as Id<"guardianPlayerLinks">,
                                        child.playerName
                                      )
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    ✗ Not mine
                                  </Button>
                                </>
                              )}
                              {selection?.action === "accept" && (
                                <Badge variant="default">Accepted</Badge>
                              )}
                              {selection?.action === "decline" && (
                                <Badge variant="destructive">Declined</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* New Assignments Section */}
            {pendingActions.newChildAssignments.length > 0 && (
              <Collapsible
                onOpenChange={setNewAssignmentsOpen}
                open={newAssignmentsOpen}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {newAssignmentsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <UserPlus className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">New Assignments</span>
                    <Badge variant="secondary">
                      {pendingActions.newChildAssignments.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-3">
                  {pendingActions.newChildAssignments.map((assignment) => {
                    const selection = selections.get(assignment.linkId);
                    const daysAgo = Math.floor(
                      (Date.now() - assignment.assignedAt) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        className={`flex items-center justify-between rounded-md border p-3 ${
                          selection?.action === "accept"
                            ? "border-green-500 bg-green-50"
                            : selection?.action === "decline"
                              ? "border-red-500 bg-red-50"
                              : ""
                        }`}
                        key={assignment.linkId}
                      >
                        <div>
                          <div className="font-medium">
                            {assignment.playerName}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {assignment.organizationName} • Added{" "}
                            {daysAgo === 0
                              ? "today"
                              : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {selection?.action === "pending" && (
                            <>
                              <Button
                                onClick={() =>
                                  handleAccept(
                                    assignment.linkId as Id<"guardianPlayerLinks">,
                                    assignment.playerName
                                  )
                                }
                                size="sm"
                                variant="outline"
                              >
                                ✓ Acknowledge
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDecline(
                                    assignment.linkId as Id<"guardianPlayerLinks">,
                                    assignment.playerName
                                  )
                                }
                                size="sm"
                                variant="outline"
                              >
                                ✗ Decline
                              </Button>
                            </>
                          )}
                          {selection?.action === "accept" && (
                            <Badge variant="default">Acknowledged</Badge>
                          )}
                          {selection?.action === "decline" && (
                            <Badge variant="destructive">Declined</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Incomplete Profiles Section */}
            {pendingActions.incompleteProfiles.length > 0 && (
              <Collapsible
                onOpenChange={setIncompleteProfilesOpen}
                open={incompleteProfilesOpen}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {incompleteProfilesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <FileWarning className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold">
                      Profile Completion Required
                    </span>
                    <Badge variant="secondary">
                      {pendingActions.incompleteProfiles.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-3">
                  {pendingActions.incompleteProfiles.map((profile) => (
                    <div className="rounded-md border p-3" key={profile.linkId}>
                      <div className="font-medium">{profile.playerName}</div>
                      <div className="text-muted-foreground text-sm">
                        {profile.organizationName} • Requires:{" "}
                        {profile.requiredFields.join(", ")}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-muted-foreground text-sm">
                    You'll be able to complete these profiles after accepting
                    the children above.
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Separator />

            {/* Selection Summary */}
            {hasSelections && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="mb-1 font-medium">Your selections:</div>
                {counts.accepted > 0 && (
                  <div className="text-green-600">
                    ✓ Accepting {counts.accepted} children
                  </div>
                )}
                {counts.declined > 0 && (
                  <div className="text-red-600">
                    ✗ Declining {counts.declined} children
                  </div>
                )}
                {counts.pending > 0 && (
                  <div className="text-muted-foreground">
                    • {counts.pending} pending review
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              disabled={isSubmitting}
              onClick={handleDismiss}
              variant="outline"
            >
              Dismiss
            </Button>
            {counts.pending > 0 && (
              <Button
                disabled={isSubmitting}
                onClick={handleAcceptAll}
                variant="secondary"
              >
                Accept All Remaining
              </Button>
            )}
            <Button
              disabled={!hasSelections || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Processing..." : "Confirm Selections"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeclineReasonDialog
        childName={currentDecline?.playerName}
        isOpen={declineDialogOpen}
        onClose={() => {
          setDeclineDialogOpen(false);
          setCurrentDecline(null);
        }}
        onSubmit={handleDeclineSubmit}
      />
    </>
  );
}
