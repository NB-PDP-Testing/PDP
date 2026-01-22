"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
  orgId,
}: ChildSummaryCardProps) {
  const router = useRouter();

  // Query passport data to calculate average skill rating
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    {
      playerIdentityId: player._id,
      organizationId: orgId,
    }
  );

  // Calculate average skill rating from skills Record
  const avgSkillRating = useMemo(() => {
    const skills = passportData?.skills;
    if (!skills) {
      return null;
    }

    const values = Object.values(skills).filter(
      (v) => typeof v === "number" && v > 0
    );
    if (values.length === 0) {
      return null;
    }

    const total = values.reduce((sum, val) => sum + val, 0);
    return (total / values.length).toFixed(1);
  }, [passportData]);

  const handleViewPassport = () => {
    router.push(`/orgs/${orgId}/players/${player._id}`);
  };

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
        {/* Stats Section */}
        {passportData === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading stats...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">Avg Skill Rating:</span>
            <span className="text-muted-foreground">
              {avgSkillRating ? `${avgSkillRating}/5` : "N/A"}
            </span>
          </div>
        )}

        {/* View Passport Button */}
        <Button className="w-full" onClick={handleViewPassport}>
          View Passport
        </Button>
      </CardContent>
    </Card>
  );
}
