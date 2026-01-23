"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CrossSportOverviewProps = {
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
};

/**
 * Get emoji icon for a sport code
 */
function getSportEmoji(sportCode: string): string {
  const sportEmojis: Record<string, string> = {
    soccer: "⚽",
    football: "⚽",
    rugby: "🏉",
    gaa_football: "🏐",
    gaa: "🏐",
    gaelic: "🏐",
    hurling: "🥍",
    camogie: "🥍",
    basketball: "🏀",
    tennis: "🎾",
    golf: "⛳",
    swimming: "🏊",
    athletics: "🏃",
    hockey: "🏑",
    cricket: "🏏",
  };
  return sportEmojis[sportCode.toLowerCase()] || "🏅";
}

/**
 * Format sport code to display name
 */
function formatSportName(sportCode: string): string {
  return sportCode.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function CrossSportOverview({
  playerIdentityId,
  organizationId,
}: CrossSportOverviewProps) {
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    { playerIdentityId }
  );

  // Get teams with sport information
  const playerTeams = useQuery(
    api.models.teamPlayerIdentities.getTeamsForPlayerWithCoreFlag,
    { playerIdentityId, organizationId, status: "active" }
  );

  if (!allPassports || allPassports.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">No passport data available</p>
      </div>
    );
  }

  // Group teams by sport
  const teamsBySport = (playerTeams || []).reduce(
    (acc, team) => {
      const sport = team.sportCode.toLowerCase();
      if (!acc[sport]) {
        acc[sport] = [];
      }
      acc[sport].push(team);
      return acc;
    },
    {} as Record<string, typeof playerTeams>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-xl">
          <span>⭐</span> Multi-Sport Athlete
        </h2>
        <p className="text-muted-foreground">
          Participating in {allPassports.length} sports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allPassports.map((passport) => {
          const teamsForSport =
            teamsBySport[passport.sportCode.toLowerCase()] || [];

          return (
            <Card className="overflow-hidden" key={passport._id}>
              {/* Sport Header with emoji and gradient */}
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 pb-4">
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getSportEmoji(passport.sportCode)}
                  </span>
                  <div>
                    <div className="font-bold text-lg">
                      {formatSportName(passport.sportCode)}
                    </div>
                    <Badge
                      className="mt-1"
                      variant={
                        passport.status === "active" ? "default" : "secondary"
                      }
                    >
                      {passport.status}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                {/* Teams for this sport */}
                {teamsForSport.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {teamsForSport.length > 1 ? "Teams" : "Team"}
                    </span>
                    <div className="mt-1 space-y-1">
                      {teamsForSport.map((team) => (
                        <div
                          className="flex items-center justify-between"
                          key={team._id}
                        >
                          <span className="font-medium text-sm">
                            {team.teamName}
                          </span>
                          <Badge
                            className="bg-blue-100 text-blue-700"
                            variant="outline"
                          >
                            {team.ageGroup.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessments */}
                {passport.assessmentCount !== undefined &&
                  passport.assessmentCount > 0 && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-muted-foreground text-sm">
                        Assessments
                      </span>
                      <span className="font-semibold text-sm">
                        {passport.assessmentCount}
                      </span>
                    </div>
                  )}

                {/* Created date */}
                {passport._creationTime && (
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Started</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(passport._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
