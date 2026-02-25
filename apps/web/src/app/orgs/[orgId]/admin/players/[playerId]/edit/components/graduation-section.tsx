"use client";

/**
 * GraduationSection - Admin controls for managing player graduation
 *
 * Shown on the edit player page when a youth player is 18 or older.
 * Allows admins to:
 * - View current graduation status
 * - Send an invitation directly to the player (bypasses guardian)
 * - Force-transition the player to adult status ('Transition Now')
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { GraduationCap, Mail, Send, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GraduationSectionProps = {
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  organizationId: string;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "invitation_sent":
      return (
        <Badge className="bg-blue-100 text-blue-800" variant="outline">
          Invite Sent
        </Badge>
      );
    case "claimed":
      return (
        <Badge className="bg-green-100 text-green-800" variant="outline">
          Claimed
        </Badge>
      );
    case "dismissed":
      return <Badge variant="outline">Dismissed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function GraduationSection({
  playerIdentityId,
  playerName,
  organizationId: _organizationId,
}: GraduationSectionProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const graduationStatus = useQuery(
    api.models.playerGraduations.getPlayerGraduationStatus,
    { playerIdentityId }
  );
  const sendInvite = useMutation(
    api.models.playerGraduations.sendGraduationInvite
  );
  const transitionToAdult = useMutation(
    api.models.adultPlayers.transitionToAdult
  );

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }
    setIsSendingInvite(true);
    try {
      const result = await sendInvite({
        playerIdentityId,
        playerEmail: inviteEmail.trim(),
      });
      if (result.success) {
        toast.success(`Invite sent to ${inviteEmail.trim()}.`);
        setShowInviteDialog(false);
        setInviteEmail("");
      } else {
        toast.error(result.error ?? "Failed to send invite.");
      }
    } catch (err) {
      console.error("Failed to send graduation invite:", err);
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleTransitionNow = async () => {
    setIsTransitioning(true);
    try {
      const result = await transitionToAdult({ playerIdentityId });
      if (result.success) {
        toast.success(
          `${playerName} has been transitioned to an adult player. ${result.emergencyContactsCreated} guardian(s) converted to emergency contacts.`
        );
        setShowTransitionDialog(false);
      }
    } catch (err) {
      console.error("Failed to transition player:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to transition. Please try again."
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  const canActOnGraduation =
    !graduationStatus?.found || graduationStatus.status !== "claimed";

  return (
    <>
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-purple-900">Graduation</CardTitle>
          </div>
          <CardDescription>
            This player is 18 or older. Manage their transition to an adult
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">Status:</span>
            {graduationStatus === undefined ? (
              <Badge variant="outline">Loading...</Badge>
            ) : graduationStatus.found ? (
              <div className="flex items-center gap-2">
                {getStatusBadge(graduationStatus.status)}
                {graduationStatus.invitationSentAt && (
                  <span className="text-muted-foreground text-xs">
                    Invite sent {formatDate(graduationStatus.invitationSentAt)}
                  </span>
                )}
                {graduationStatus.claimedAt && (
                  <span className="text-muted-foreground text-xs">
                    Claimed {formatDate(graduationStatus.claimedAt)}
                  </span>
                )}
              </div>
            ) : (
              <Badge variant="outline">No record</Badge>
            )}
          </div>

          {/* Actions */}
          {canActOnGraduation && (
            <div className="flex flex-wrap gap-2">
              <Button
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                onClick={() => setShowInviteDialog(true)}
                size="sm"
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
              <Button
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => setShowTransitionDialog(true)}
                size="sm"
                variant="outline"
              >
                <Zap className="mr-2 h-4 w-4" />
                Transition Now
              </Button>
            </div>
          )}

          {!canActOnGraduation && (
            <p className="text-muted-foreground text-sm">
              This player has already claimed their adult account. No further
              action required.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Send Invitation Dialog */}
      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowInviteDialog(false);
            setInviteEmail("");
          }
        }}
        open={showInviteDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Account Invite to {playerName}</DialogTitle>
            <DialogDescription>
              Send a direct invitation to {playerName} to claim their PlayerARC
              account at your organization. This bypasses the guardian flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="graduation-invite-email">
                Player&apos;s Email Address
              </Label>
              <Input
                autoComplete="email"
                id="graduation-invite-email"
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                placeholder="player@example.com"
                type="email"
                value={inviteEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowInviteDialog(false);
                setInviteEmail("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!inviteEmail.trim() || isSendingInvite}
              onClick={handleSendInvite}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSendingInvite ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Now Confirmation Dialog */}
      <Dialog
        onOpenChange={(isOpen) => !isOpen && setShowTransitionDialog(false)}
        open={showTransitionDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transition {playerName} to Adult?</DialogTitle>
            <DialogDescription>
              This will convert {playerName} to an adult player. Guardian
              contacts will be converted to emergency contacts. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="font-medium text-orange-900 text-sm">
              What happens when you proceed:
            </p>
            <ul className="mt-2 space-y-1 text-orange-800 text-sm">
              <li>
                • Player type changes from &quot;youth&quot; to
                &quot;adult&quot;
              </li>
              <li>
                • All guardian contacts are converted to emergency contacts
              </li>
              <li>• Player will need to sign up and claim their account</li>
              <li>• Guardian access to this player&apos;s data is removed</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowTransitionDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isTransitioning}
              onClick={handleTransitionNow}
            >
              <Zap className="mr-2 h-4 w-4" />
              {isTransitioning ? "Transitioning..." : "Proceed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
