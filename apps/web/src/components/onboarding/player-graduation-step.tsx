"use client";

/**
 * PlayerGraduationStep - Welcome screen for newly-claimed adult players
 *
 * Shown via the onboarding orchestrator when a player has claimed their
 * account (claimedAt set) but hasn't seen the welcome screen yet
 * (playerWelcomedAt not set).
 *
 * On completion, calls markPlayerWelcomed and redirects to the org dashboard.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { GraduationCap, LayoutDashboard, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PlayerGraduationStepProps = {
  playerFirstName: string;
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  onComplete: () => void;
};

export function PlayerGraduationStep({
  playerFirstName,
  playerIdentityId: _playerIdentityId,
  organizationId,
  onComplete,
}: PlayerGraduationStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const markWelcomed = useMutation(
    api.models.playerGraduations.markPlayerWelcomed
  );

  const handleGoToDashboard = async () => {
    setIsLoading(true);
    try {
      await markWelcomed({});
      onComplete();
      router.push(`/orgs/${organizationId}`);
    } catch (err) {
      console.error("Failed to mark player welcomed:", err);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            Welcome, {playerFirstName}!
          </DialogTitle>
          <DialogDescription>
            You&apos;ve successfully claimed your PlayerARC account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-4">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-sm">Your development history</p>
              <p className="text-muted-foreground text-sm">
                All your assessments, goals, and coach feedback are waiting for
                you.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
            <LayoutDashboard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Your personal dashboard</p>
              <p className="text-muted-foreground text-sm">
                Track your progress and manage your own profile.
              </p>
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleGoToDashboard}
        >
          {isLoading ? "Loading..." : "Go to My Dashboard"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
