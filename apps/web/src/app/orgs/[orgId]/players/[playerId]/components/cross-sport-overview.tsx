"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Calendar, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CrossSportOverviewProps = {
  playerIdentityId: Id<"playerIdentities">;
};

export function CrossSportOverview({
  playerIdentityId,
}: CrossSportOverviewProps) {
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    { playerIdentityId }
  );

  if (!allPassports || allPassports.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">No passport data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-xl">Multi-Sport Athlete</h2>
        <p className="text-muted-foreground">
          Participating in {allPassports.length} sports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allPassports.map((passport) => (
          <Card key={passport._id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {passport.sportCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <Badge
                  variant={
                    passport.status === "active" ? "default" : "secondary"
                  }
                >
                  {passport.status}
                </Badge>
              </div>

              {passport._creationTime && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Created</span>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {new Date(passport._creationTime).toLocaleDateString()}
                  </div>
                </div>
              )}

              {passport.assessmentCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Assessments
                  </span>
                  <span className="font-medium text-sm">
                    {passport.assessmentCount}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
