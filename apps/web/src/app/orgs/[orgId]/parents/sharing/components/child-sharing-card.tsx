"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccessAuditLog } from "./access-audit-log";
import { QuickShare } from "./quick-share";
import { RevokeConsentModal } from "./revoke-consent-modal";

type ChildSharingCardProps = {
  child: {
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
    };
    enrollment?: {
      sport?: string;
      ageGroup?: string;
    };
  };
  onEnableSharing?: (childId: string) => void;
};

export function ChildSharingCard({
  child,
  onEnableSharing,
}: ChildSharingCardProps) {
  // Modal state for revocation
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedConsentId, setSelectedConsentId] =
    useState<Id<"passportShareConsents"> | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState("");

  // Modal state for audit log
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Fetch consents for this player
  const consents = useQuery(api.lib.consentGateway.getConsentsForPlayer, {
    playerIdentityId: child.player._id,
  });

  // Fetch pending requests for this player
  const pendingRequests = useQuery(
    api.models.passportSharing.getPendingRequestsForPlayer,
    {
      playerIdentityId: child.player._id,
    }
  );

  // Get active consents (for revocation UI)
  const activeConsents = useMemo(() => {
    if (!consents) {
      return [];
    }
    const now = Date.now();
    return consents.filter(
      (c) =>
        c.status === "active" &&
        c.coachAcceptanceStatus === "accepted" &&
        c.expiresAt > now
    );
  }, [consents]);

  // Calculate sharing metrics
  const sharingMetrics = useMemo(() => {
    if (!consents) {
      return {
        activeShares: 0,
        pendingRequests: 0,
        lastActivity: null as Date | null,
      };
    }

    // Count active shares (accepted and not expired)
    const activeSharesCount = activeConsents.length;

    // Count pending requests
    const pendingRequestsCount = pendingRequests?.length || 0;

    // Find last activity (most recent consent/acceptance/decline date)
    let lastActivityTimestamp: number | null = null;

    for (const consent of consents) {
      // Check various activity timestamps
      const timestamps = [
        consent.consentedAt,
        consent.acceptedAt,
        consent.declinedAt,
        consent.revokedAt,
      ].filter((t): t is number => t !== undefined && t !== null);

      for (const timestamp of timestamps) {
        if (!lastActivityTimestamp || timestamp > lastActivityTimestamp) {
          lastActivityTimestamp = timestamp;
        }
      }
    }

    return {
      activeShares: activeSharesCount,
      pendingRequests: pendingRequestsCount,
      lastActivity: lastActivityTimestamp
        ? new Date(lastActivityTimestamp)
        : null,
    };
  }, [consents, pendingRequests, activeConsents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {child.player.firstName} {child.player.lastName}
          </span>
          <Badge variant="outline">
            {child.enrollment?.sport || "Unknown"}
          </Badge>
        </CardTitle>
        <CardDescription>
          {child.enrollment?.ageGroup || "No age group"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QuickShare component (shows only if feature flag enabled and parent has previous consent) */}
        <QuickShare
          childName={`${child.player.firstName} ${child.player.lastName}`}
          onSuccess={() => {
            // Refresh data by triggering re-render
            // Convex will automatically refetch consents
          }}
          playerIdentityId={child.player._id}
        />

        {/* Sharing status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Shares:</span>
            <Badge
              variant={
                sharingMetrics.activeShares > 0 ? "default" : "secondary"
              }
            >
              {sharingMetrics.activeShares}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pending Requests:</span>
            <Badge
              variant={
                sharingMetrics.pendingRequests > 0 ? "default" : "secondary"
              }
            >
              {sharingMetrics.pendingRequests}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Activity:</span>
            <span className="text-muted-foreground text-xs">
              {sharingMetrics.lastActivity
                ? sharingMetrics.lastActivity.toLocaleDateString()
                : "None"}
            </span>
          </div>
        </div>

        {/* Active shares with revoke buttons */}
        {activeConsents.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm">Active Shares:</p>
            {activeConsents.map((consent) => (
              <div
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2"
                key={consent.consentId}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">
                      Org: {consent.receivingOrgId.slice(0, 8)}...
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Expires:{" "}
                      {new Date(consent.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSelectedConsentId(consent.consentId);
                    setSelectedOrgName(consent.receivingOrgId);
                    setRevokeModalOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => onEnableSharing?.(child.player._id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Enable Sharing
          </Button>
          <Button
            className="w-full"
            onClick={() => setAuditLogOpen(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            View Audit Log
          </Button>
        </div>
      </CardContent>

      {/* Revoke Consent Modal */}
      {selectedConsentId && (
        <RevokeConsentModal
          childName={`${child.player.firstName} ${child.player.lastName}`}
          consentId={selectedConsentId}
          onOpenChange={setRevokeModalOpen}
          onSuccess={() => {
            // Convex will automatically refetch consents
          }}
          open={revokeModalOpen}
          organizationName={selectedOrgName}
        />
      )}

      {/* Access Audit Log Dialog */}
      <Dialog onOpenChange={setAuditLogOpen} open={auditLogOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <AccessAuditLog
            childName={`${child.player.firstName} ${child.player.lastName}`}
            playerIdentityId={child.player._id}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
