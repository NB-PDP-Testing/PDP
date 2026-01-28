"use client";

/**
 * GuardianPrompt - Modal for notifying guardians when their child turns 18
 *
 * This component displays a prompt to guardians when their linked children
 * have turned 18, allowing them to:
 * - Send an account claim invitation to the player
 * - Dismiss the prompt for now (shows again next login)
 * - Permanently dismiss the prompt
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { GraduationCap, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HelpFooter } from "@/components/onboarding/help-footer";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Email validation regex - defined at top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PendingGraduation = {
  graduationId: Id<"playerGraduations">;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  dateOfBirth: string;
  turnedEighteenAt: number;
  organizationId: string;
  organizationName: string;
};

type GuardianPromptProps = {
  pendingGraduations: PendingGraduation[];
  onComplete: () => void;
};

/**
 * GuardianPrompt - Displayed when a guardian has children who turned 18
 *
 * Shows a prompt for each pending graduation, allowing the guardian to:
 * - Enter the player's email and send an invitation
 * - Dismiss temporarily (shows again next login)
 * - Dismiss permanently (marks as dismissed in DB)
 */
export function GuardianPrompt({
  pendingGraduations,
  onComplete,
}: GuardianPromptProps) {
  // Show first pending graduation (process one at a time)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Get mutation for sending invitation (US-006 - will be implemented)
  const sendInvite = useMutation(
    api.models.playerGraduations.sendGraduationInvite
  );
  // Get mutation for permanent dismissal (US-007 - will be implemented)
  const dismissPrompt = useMutation(
    api.models.playerGraduations.dismissGraduationPrompt
  );

  const currentGraduation = pendingGraduations[currentIndex];

  if (!currentGraduation) {
    // All graduations processed
    onComplete();
    return null;
  }

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendInvite({
        playerIdentityId: currentGraduation.playerIdentityId,
        playerEmail: email.trim().toLowerCase(),
      });

      if (result.success) {
        toast.success(
          `Invitation sent to ${currentGraduation.playerName} at ${email}`
        );
        moveToNext();
      } else {
        toast.error("Failed to send invitation. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send graduation invite:", error);
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDismissNow = () => {
    // Just skip this one for now - shows again next login
    toast.info("You can complete this later.");
    moveToNext();
  };

  const handleDismissPermanently = async () => {
    setIsDismissing(true);
    try {
      await dismissPrompt({
        playerIdentityId: currentGraduation.playerIdentityId,
      });
      toast.info(
        `You won't be prompted about ${currentGraduation.playerName} again.`
      );
      moveToNext();
    } catch (error) {
      console.error("Failed to dismiss graduation prompt:", error);
      toast.error("Failed to dismiss. Please try again.");
    } finally {
      setIsDismissing(false);
    }
  };

  const moveToNext = () => {
    setEmail("");
    if (currentIndex < pendingGraduations.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  // Format the 18th birthday date
  const turnedEighteenDate = new Date(
    currentGraduation.turnedEighteenAt
  ).toLocaleDateString("en-IE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AlertDialog open>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">
            {currentGraduation.playerName} has turned 18!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            As of {turnedEighteenDate},{" "}
            <strong>{currentGraduation.playerName}</strong> is now an adult and
            can have their own account to access their development history at{" "}
            <strong>{currentGraduation.organizationName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="player-email">
              Enter {currentGraduation.playerName}&apos;s email address
            </Label>
            <Input
              disabled={isSending}
              id="player-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@email.com"
              type="email"
              value={email}
            />
            <p className="text-muted-foreground text-xs">
              We&apos;ll send them an invitation to claim their account.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            disabled={isSending || isDismissing}
            onClick={handleSendInvitation}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSending ? "Sending..." : "Send Invitation"}
          </Button>

          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              disabled={isSending || isDismissing}
              onClick={handleDismissNow}
              variant="outline"
            >
              Not Now
            </Button>
            <Button
              className="flex-1"
              disabled={isSending || isDismissing}
              onClick={handleDismissPermanently}
              variant="ghost"
            >
              {isDismissing ? "..." : "Don't Ask Again"}
            </Button>
          </div>
        </AlertDialogFooter>

        <HelpFooter />

        {pendingGraduations.length > 1 && (
          <p className="text-center text-muted-foreground text-xs">
            {currentIndex + 1} of {pendingGraduations.length} players
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
