"use client";

import { Clock, Mail, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EnrichedInvitation = {
  _id: string;
  email: string;
  role: string | null;
  functionalRoles: string[];
  teams: Array<{
    _id: string;
    name: string;
    ageGroup: string | null;
  }>;
  players: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  inviter: { name: string | null };
  sentAt: number;
  expiresAt: number;
  isExpired: boolean;
  resendCount: number;
  resendHistory: Array<{
    resentAt: number;
    resentByName: string;
  }>;
};

type InvitationDetailModalProps = {
  invitation: EnrichedInvitation | null;
  onResend: () => Promise<void>;
  onCancel: () => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
};

export function InvitationDetailModal({
  invitation,
  onResend,
  onCancel,
  onClose,
  isOpen,
}: InvitationDetailModalProps) {
  if (!invitation) {
    return null;
  }

  const daysUntilExpiry = Math.ceil(
    (invitation.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invitation Details</DialogTitle>
        </DialogHeader>

        {/* Email & Status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{invitation.email}</span>
            {invitation.isExpired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : (
              <Badge variant="secondary">{daysUntilExpiry} days left</Badge>
            )}
          </div>

          {/* Timeline */}
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" />
              Timeline
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sent:</span>
                <span>{new Date(invitation.sentAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Invited by:</span>
                <span>{invitation.inviter.name || "Unknown"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expires:</span>
                <span>{new Date(invitation.expiresAt).toLocaleString()}</span>
              </div>
              {invitation.resendCount > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 font-medium text-sm">
                    Resent {invitation.resendCount} time(s):
                  </p>
                  <div className="space-y-1">
                    {invitation.resendHistory.map((resend, idx) => (
                      <div
                        className="flex justify-between text-gray-600 text-xs"
                        key={idx}
                      >
                        <span>
                          {new Date(resend.resentAt).toLocaleString()}
                        </span>
                        <span>by {resend.resentByName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Functional Roles */}
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Roles
            </h3>
            {invitation.functionalRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {invitation.functionalRoles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No functional roles assigned
              </p>
            )}
          </Card>

          {/* Coach: Teams */}
          {invitation.teams.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Team Assignments ({invitation.teams.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {invitation.teams.map((team) => (
                  <div className="rounded bg-gray-50 p-2" key={team._id}>
                    <p className="font-medium text-sm">{team.name}</p>
                    {team.ageGroup && (
                      <p className="text-gray-600 text-xs">{team.ageGroup}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Parent: Players */}
          {invitation.players.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Player Links ({invitation.players.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {invitation.players.map((player) => (
                  <div className="rounded bg-gray-50 p-2" key={player._id}>
                    <p className="font-medium text-sm">
                      {player.firstName} {player.lastName}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button
              disabled={invitation.isExpired}
              onClick={onResend}
              variant="outline"
            >
              Resend Invitation
            </Button>
            <Button onClick={onCancel} variant="destructive">
              Cancel Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
