"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { GraduationCap, Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

type GraduationAlertProps = {
  orgId: string;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GraduationAlerts({ orgId }: GraduationAlertProps) {
  const pendingGraduations = useQuery(
    api.models.playerGraduations.getPendingGraduations
  );
  const dismissGraduation = useMutation(
    api.models.playerGraduations.dismissGraduationPrompt
  );

  if (!pendingGraduations || pendingGraduations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingGraduations.map((graduation) => (
        <GraduationAlertCard
          graduation={graduation}
          key={graduation.graduationId}
          onDismiss={() =>
            dismissGraduation({
              playerIdentityId: graduation.playerIdentityId,
            }).catch((err) => {
              console.error("Failed to dismiss graduation:", err);
              toast.error("Failed to dismiss. Please try again.");
            })
          }
          orgId={orgId}
        />
      ))}
    </div>
  );
}

type GraduationRecord = {
  graduationId: Id<"playerGraduations">;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  dateOfBirth: string;
  turnedEighteenAt: number;
  organizationId: string;
  organizationName: string;
};

type GraduationAlertCardProps = {
  graduation: GraduationRecord;
  orgId: string;
  onDismiss: () => void;
};

function GraduationAlertCard({
  graduation,
  orgId: _orgId,
  onDismiss,
}: GraduationAlertCardProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    await onDismiss();
  };

  return (
    <>
      <Card className="border-amber-300 bg-amber-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <GraduationCap className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <CardTitle className="text-amber-900 text-base">
                  {graduation.playerName} Has Turned 18
                </CardTitle>
                <CardDescription className="text-amber-700">
                  {graduation.organizationName}
                </CardDescription>
              </div>
            </div>
            <Button
              className="h-8 w-8 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
              disabled={isDismissing}
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-1 text-amber-700 text-xs">
            Date of birth:{" "}
            <span className="font-medium">
              {new Date(graduation.dateOfBirth).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </p>
          <p className="mb-4 text-amber-800 text-sm">
            They turned 18 on{" "}
            <span className="font-semibold">
              {formatDate(graduation.turnedEighteenAt)}
            </span>
            . Send them an invite to claim their own PlayerARC account.
          </p>
          <div className="flex gap-2">
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => setShowInviteDialog(true)}
              size="sm"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Account Invite
            </Button>
            <Button
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              disabled={isDismissing}
              onClick={handleDismiss}
              size="sm"
              variant="outline"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      <SendInviteDialog
        graduation={graduation}
        onClose={() => setShowInviteDialog(false)}
        open={showInviteDialog}
      />
    </>
  );
}

type SendInviteDialogProps = {
  graduation: GraduationRecord;
  open: boolean;
  onClose: () => void;
};

function SendInviteDialog({
  graduation,
  open,
  onClose,
}: SendInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessfully, setSentSuccessfully] = useState(false);
  const sendInvite = useMutation(
    api.models.playerGraduations.sendGraduationInvite
  );

  const handleSend = async () => {
    if (!email.trim()) {
      return;
    }
    setIsSending(true);
    try {
      const result = await sendInvite({
        playerIdentityId: graduation.playerIdentityId,
        playerEmail: email.trim(),
      });
      if (result.success) {
        setSentSuccessfully(true);
        toast.success(
          `Invite sent to ${email.trim()}. Link valid for 30 days.`
        );
      } else {
        toast.error(result.error ?? "Failed to send invite. Please try again.");
      }
    } catch (err) {
      console.error("Failed to send graduation invite:", err);
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSentSuccessfully(false);
    onClose();
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send Account Invite to {graduation.playerName}
          </DialogTitle>
          <DialogDescription>
            {graduation.playerName} will receive an email with a secure link to
            claim their PlayerARC account at {graduation.organizationName}. The
            link expires after 30 days.
          </DialogDescription>
        </DialogHeader>

        {sentSuccessfully ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium text-green-800">Invite Sent!</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Invite sent to <span className="font-medium">{email}</span>. Link
              valid for 30 days.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Player&apos;s Email Address</Label>
              <Input
                autoComplete="email"
                id="invite-email"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="player@example.com"
                type="email"
                value={email}
              />
              <p className="text-muted-foreground text-xs">
                Enter the email address where {graduation.playerName} can
                receive their invite link.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {sentSuccessfully ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button onClick={handleClose} variant="outline">
                Cancel
              </Button>
              <Button
                disabled={!email.trim() || isSending}
                onClick={handleSend}
              >
                {isSending ? "Sending..." : "Send Invite"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
