"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  onComplete: () => void;
};

/**
 * PlayerClaimPendingStep - Transparently links player history for existing-account users.
 *
 * When a guardian sends a graduation invite to an email that already has a PlayerARC
 * account, the player doesn't need to follow a claim link. Instead, on their next login
 * this step fires the autoClaimByEmail mutation automatically, linking their player
 * identity without any extra steps beyond a brief visual confirmation.
 */
export function PlayerClaimPendingStep({ onComplete }: Props) {
  const [status, setStatus] = useState<"claiming" | "done" | "error">(
    "claiming"
  );
  const autoClaimByEmail = useMutation(
    api.models.playerGraduations.autoClaimByEmail
  );

  useEffect(() => {
    autoClaimByEmail({})
      .then((result) => {
        if (result.claimed) {
          setStatus("done");
          // Brief pause so user sees the success, then continue to player_claimed_account welcome
          setTimeout(() => onComplete(), 1500);
        } else {
          // Nothing to claim (token expired or already claimed) — skip silently
          onComplete();
        }
      })
      .catch(() => {
        setStatus("error");
        setTimeout(() => onComplete(), 2000);
      });
  }, [autoClaimByEmail, onComplete]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
      {status === "claiming" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Linking your player history...
          </p>
        </>
      )}
      {status === "done" && (
        <>
          <UserCheck className="h-10 w-10 text-green-600" />
          <p className="font-medium">Player history linked!</p>
        </>
      )}
      {status === "error" && (
        <p className="text-muted-foreground text-sm">
          Could not link history. Continuing...
        </p>
      )}
    </div>
  );
}
