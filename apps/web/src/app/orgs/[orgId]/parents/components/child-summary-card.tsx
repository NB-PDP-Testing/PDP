"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChildSummaryCardProps = {
  player: {
    _id: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
  };
  unreadCount: number;
  orgId: string;
};

export function ChildSummaryCard({
  player,
  unreadCount,
  orgId: _orgId,
}: ChildSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {player.firstName} {player.lastName}
          </span>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Placeholder for stats - will be populated in US-008 */}
        <div className="text-muted-foreground text-sm">
          <p>Loading stats...</p>
        </div>

        {/* View Passport Button */}
        <Button className="w-full">View Passport</Button>
      </CardContent>
    </Card>
  );
}
