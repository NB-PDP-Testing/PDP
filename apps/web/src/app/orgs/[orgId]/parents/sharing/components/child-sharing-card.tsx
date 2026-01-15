"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
};

export function ChildSharingCard({ child }: ChildSharingCardProps) {
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
    const now = Date.now();
    const activeSharesCount = consents.filter(
      (c) =>
        c.status === "active" &&
        c.coachAcceptanceStatus === "accepted" &&
        c.expiresAt > now
    ).length;

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
  }, [consents, pendingRequests]);

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

        {/* Quick actions */}
        <div className="flex flex-col gap-2">
          <Button className="w-full" size="sm" variant="outline">
            Enable Sharing
          </Button>
          <Button className="w-full" size="sm" variant="ghost">
            View Audit Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
