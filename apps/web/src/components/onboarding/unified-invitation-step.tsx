"use client";

/**
 * UnifiedInvitationStep - Combined invitation acceptance + child confirmation
 *
 * This component merges two previously separate steps:
 * 1. Accepting the organization invitation
 * 2. Confirming which children are yours with "Yes, this is mine" / "No, not mine"
 *
 * This prevents the user from seeing two separate popups and ensures
 * child linking only happens for children the user explicitly confirms.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Check, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";

export type InvitationPlayerLink = {
  id: string;
  name: string;
  ageGroup?: string;
};

export type PendingInvitation = {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  role: string;
  functionalRoles: string[];
  expiresAt: number;
  playerLinks?: InvitationPlayerLink[];
  teams?: Array<{
    id: string;
    name: string;
  }>;
};

type UnifiedInvitationStepProps = {
  invitations: PendingInvitation[];
  userId: string;
  userEmail: string;
  onComplete: () => void;
};

export function UnifiedInvitationStep({
  invitations,
  userId,
  userEmail,
  onComplete,
}: UnifiedInvitationStepProps) {
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentToSharing, setConsentToSharing] = useState(false);
  const [currentInvitationIndex, setCurrentInvitationIndex] = useState(0);

  // Track selection state for each child
  // Key: `${invitationId}:${playerId}`
  const [childSelections, setChildSelections] = useState<
    Record<string, "mine" | "not_mine" | "unselected">
  >(() => {
    const initial: Record<string, "mine" | "not_mine" | "unselected"> = {};
    for (const invitation of invitations) {
      for (const player of invitation.playerLinks || []) {
        initial[`${invitation.invitationId}:${player.id}`] = "unselected";
      }
    }
    return initial;
  });

  // Mutation to sync roles and link children (will be modified to accept child selections)
  const syncFunctionalRolesWithSelections = useMutation(
    api.models.members.syncFunctionalRolesWithChildSelections
  );

  const currentInvitation = invitations[currentInvitationIndex];
  const hasPlayerLinks =
    currentInvitation?.playerLinks && currentInvitation.playerLinks.length > 0;

  const toggleChildSelection = (
    invitationId: string,
    playerId: string,
    selection: "mine" | "not_mine"
  ) => {
    const key = `${invitationId}:${playerId}`;
    setChildSelections((prev) => ({
      ...prev,
      [key]: prev[key] === selection ? "unselected" : selection,
    }));
  };

  const selectAllAsMine = () => {
    if (!currentInvitation?.playerLinks) {
      return;
    }
    const newSelections = { ...childSelections };
    for (const player of currentInvitation.playerLinks) {
      newSelections[`${currentInvitation.invitationId}:${player.id}`] = "mine";
    }
    setChildSelections(newSelections);
  };

  // Get selected count for current invitation
  const getSelectedCount = () => {
    if (!currentInvitation?.playerLinks) {
      return 0;
    }
    return currentInvitation.playerLinks.filter(
      (p) =>
        childSelections[`${currentInvitation.invitationId}:${p.id}`] === "mine"
    ).length;
  };

  const handleAcceptInvitation = async () => {
    if (!currentInvitation) {
      return;
    }

    // If there are player links, require at least one selection
    if (hasPlayerLinks && getSelectedCount() === 0) {
      toast.error(
        "Please select at least one child as yours, or click 'Decline All Children'"
      );
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Accept the invitation via Better Auth
      const result = await authClient.organization.acceptInvitation({
        invitationId: currentInvitation.invitationId,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to accept invitation");
        setIsProcessing(false);
        return;
      }

      // 2. Sync roles and link ONLY selected children
      const selectedPlayerIds = (currentInvitation.playerLinks || [])
        .filter(
          (p) =>
            childSelections[`${currentInvitation.invitationId}:${p.id}`] ===
            "mine"
        )
        .map((p) => p.id);

      const declinedPlayerIds = (currentInvitation.playerLinks || [])
        .filter(
          (p) =>
            childSelections[`${currentInvitation.invitationId}:${p.id}`] !==
            "mine"
        )
        .map((p) => p.id);

      await syncFunctionalRolesWithSelections({
        invitationId: currentInvitation.invitationId,
        organizationId: currentInvitation.organizationId,
        userId,
        userEmail,
        selectedPlayerIds,
        declinedPlayerIds,
        consentToSharing,
      });

      // 3. Set organization as active
      await authClient.organization.setActive({
        organizationId: currentInvitation.organizationId,
      });

      // Success message
      const linkedCount = selectedPlayerIds.length;
      if (linkedCount > 0) {
        toast.success(
          `Welcome to ${currentInvitation.organizationName}! ${linkedCount} ${linkedCount === 1 ? "child" : "children"} linked.`
        );
      } else {
        toast.success(`Welcome to ${currentInvitation.organizationName}!`);
      }

      // Move to next invitation or complete
      if (currentInvitationIndex < invitations.length - 1) {
        setCurrentInvitationIndex((prev) => prev + 1);
        setIsProcessing(false);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error("Failed to accept invitation. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleDeclineAllChildren = async () => {
    if (!currentInvitation) {
      return;
    }

    // Mark all children as not mine and proceed
    if (currentInvitation.playerLinks) {
      const newSelections = { ...childSelections };
      for (const player of currentInvitation.playerLinks) {
        newSelections[`${currentInvitation.invitationId}:${player.id}`] =
          "not_mine";
      }
      setChildSelections(newSelections);
    }

    // Now accept with no children selected
    setIsProcessing(true);
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId: currentInvitation.invitationId,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to accept invitation");
        setIsProcessing(false);
        return;
      }

      // Sync roles with NO children (all declined)
      const declinedPlayerIds = (currentInvitation.playerLinks || []).map(
        (p) => p.id
      );

      await syncFunctionalRolesWithSelections({
        invitationId: currentInvitation.invitationId,
        organizationId: currentInvitation.organizationId,
        userId,
        userEmail,
        selectedPlayerIds: [],
        declinedPlayerIds,
        consentToSharing: false,
      });

      await authClient.organization.setActive({
        organizationId: currentInvitation.organizationId,
      });

      toast.info(
        `Joined ${currentInvitation.organizationName}. No children linked.`
      );

      if (currentInvitationIndex < invitations.length - 1) {
        setCurrentInvitationIndex((prev) => prev + 1);
        setIsProcessing(false);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to process invitation:", error);
      toast.error("Failed to process. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    // Skip this invitation (don't accept it)
    if (currentInvitationIndex < invitations.length - 1) {
      setCurrentInvitationIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!currentInvitation) {
    onComplete();
    return null;
  }

  const selectedCount = getSelectedCount();

  // Shared dialog content
  const dialogContent = (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">
              {currentInvitation.organizationName}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {currentInvitation.functionalRoles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Teams (for coaches) */}
        {currentInvitation.teams && currentInvitation.teams.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-1 text-muted-foreground text-sm">
              Assigned Teams:
            </p>
            <div className="flex flex-wrap gap-1">
              {currentInvitation.teams.map((team) => (
                <Badge key={team.id} variant="outline">
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Children Section */}
      {hasPlayerLinks && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-muted-foreground text-sm">
              Children Assigned to You
            </h3>
            {(currentInvitation.playerLinks?.length ?? 0) > 1 && (
              <Button
                disabled={isProcessing}
                onClick={selectAllAsMine}
                size="sm"
                type="button"
                variant="outline"
              >
                <Check className="mr-1 h-3 w-3" />
                Accept All
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {currentInvitation.playerLinks?.map((player) => {
              const key = `${currentInvitation.invitationId}:${player.id}`;
              const selection = childSelections[key];
              return (
                <div
                  className={`rounded-lg border p-3 transition-colors ${
                    selection === "mine"
                      ? "border-green-500 bg-green-50"
                      : selection === "not_mine"
                        ? "border-red-500 bg-red-50"
                        : "bg-card"
                  }`}
                  key={key}
                >
                  <div className="mb-2">
                    <p className="font-medium">{player.name}</p>
                    {player.ageGroup && (
                      <p className="text-muted-foreground text-xs">
                        {player.ageGroup}
                      </p>
                    )}
                  </div>
                  {/* Stack buttons vertically on mobile, horizontally on desktop */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <Button
                      className={`h-14 flex-1 text-base sm:h-8 sm:text-xs ${
                        selection === "mine"
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }`}
                      disabled={isProcessing}
                      onClick={() =>
                        toggleChildSelection(
                          currentInvitation.invitationId,
                          player.id,
                          "mine"
                        )
                      }
                      size="sm"
                      type="button"
                      variant={selection === "mine" ? "default" : "outline"}
                    >
                      <Check className="mr-2 h-5 w-5 sm:mr-1 sm:h-3 sm:w-3" />
                      Yes, this is mine
                    </Button>
                    <Button
                      className={`h-14 flex-1 text-base sm:h-8 sm:text-xs ${
                        selection === "not_mine"
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                      }`}
                      disabled={isProcessing}
                      onClick={() =>
                        toggleChildSelection(
                          currentInvitation.invitationId,
                          player.id,
                          "not_mine"
                        )
                      }
                      size="sm"
                      type="button"
                      variant={selection === "not_mine" ? "default" : "outline"}
                    >
                      <X className="mr-2 h-5 w-5 sm:mr-1 sm:h-3 sm:w-3" />
                      No, not mine
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy & Consent - only show if there are children */}
      {hasPlayerLinks && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 font-semibold text-sm">
            Privacy & Cross-Organization Sharing
          </h3>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={consentToSharing}
              disabled={isProcessing}
              id="consent-sharing"
              onCheckedChange={(checked) =>
                setConsentToSharing(checked === true)
              }
            />
            <div className="flex-1">
              <Label
                className="cursor-pointer text-sm leading-relaxed"
                htmlFor="consent-sharing"
              >
                Allow other clubs/organizations to see my relationship with the
                children I'm accepting
              </Label>
              <p className="mt-1 text-muted-foreground text-xs">
                This helps other clubs your children may join in the future to
                identify you as their guardian.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiration notice */}
      <p className="text-center text-muted-foreground text-xs">
        This invitation expires on{" "}
        {new Date(currentInvitation.expiresAt).toLocaleDateString()}
      </p>
    </div>
  );

  const title = hasPlayerLinks
    ? "Welcome! Please Confirm Your Children"
    : `Join ${currentInvitation.organizationName}`;

  const description = hasPlayerLinks
    ? `You've been invited to join ${currentInvitation.organizationName}. Please confirm which children are yours.`
    : `You've been invited to join as ${currentInvitation.functionalRoles.join(", ")}.`;

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open>
        <DrawerContent className="h-[100dvh] max-h-[100dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">{title}</DrawerTitle>
            <DrawerDescription className="text-base">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-4">{dialogContent}</div>
          <DrawerFooter className="flex-col gap-2 pt-2">
            <Button
              className="h-12 w-full"
              disabled={isProcessing || (hasPlayerLinks && selectedCount === 0)}
              onClick={handleAcceptInvitation}
              style={{ backgroundColor: "var(--pdp-navy)" }}
            >
              {isProcessing
                ? "Processing..."
                : hasPlayerLinks
                  ? `Accept Invitation (${selectedCount} ${selectedCount === 1 ? "child" : "children"})`
                  : "Accept Invitation"}
            </Button>
            {hasPlayerLinks && (
              <Button
                className="h-12 w-full"
                disabled={isProcessing}
                onClick={handleDeclineAllChildren}
                variant="outline"
              >
                Join Without Children
              </Button>
            )}
            <Button
              className="h-12 w-full"
              disabled={isProcessing}
              onClick={handleSkip}
              variant="ghost"
            >
              I'll do this later
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use AlertDialog
  return (
    <AlertDialog open>
      <AlertDialogContent className="flex max-h-[95vh] max-w-3xl flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="pt-2 text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto py-4">{dialogContent}</div>

        <AlertDialogFooter className="flex-shrink-0 flex-col gap-2 sm:flex-row">
          <Button disabled={isProcessing} onClick={handleSkip} variant="ghost">
            I'll do this later
          </Button>
          {hasPlayerLinks && (
            <Button
              disabled={isProcessing}
              onClick={handleDeclineAllChildren}
              variant="outline"
            >
              Join Without Children
            </Button>
          )}
          <Button
            disabled={isProcessing || (hasPlayerLinks && selectedCount === 0)}
            onClick={handleAcceptInvitation}
            style={{ backgroundColor: "var(--pdp-navy)" }}
          >
            {isProcessing
              ? "Processing..."
              : hasPlayerLinks
                ? `Accept Invitation (${selectedCount})`
                : "Accept Invitation"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
