"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Mail, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type SendGraduationInviteDialogProps = {
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  organizationName?: string;
  open: boolean;
  onClose: () => void;
};

export function SendGraduationInviteDialog({
  playerIdentityId,
  playerName,
  organizationName,
  open,
  onClose,
}: SendGraduationInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessfully, setSentSuccessfully] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
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
        playerIdentityId,
        playerEmail: email.trim(),
      });
      if (result.success) {
        setSentSuccessfully(true);
        if (result.existingUser) {
          setIsExistingUser(true);
        } else {
          toast.success(
            `Invite sent to ${email.trim()}. Link valid for 30 days.`
          );
        }
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
    setIsExistingUser(false);
    onClose();
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Account Invite to {playerName}</DialogTitle>
          <DialogDescription>
            {playerName} will receive an email with a secure link to claim their
            PlayerARC account
            {organizationName ? ` at ${organizationName}` : ""}. The link
            expires after 30 days.
          </DialogDescription>
        </DialogHeader>

        {sentSuccessfully && isExistingUser && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium text-blue-800">Account Found</p>
            <p className="mt-1 text-muted-foreground text-sm">
              This person already has a PlayerARC account. Their player history
              will be linked automatically the next time they log in.
            </p>
          </div>
        )}
        {sentSuccessfully && !isExistingUser && (
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
        )}
        {!sentSuccessfully && (
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
                Enter the email address where {playerName} can receive their
                invite link.
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
