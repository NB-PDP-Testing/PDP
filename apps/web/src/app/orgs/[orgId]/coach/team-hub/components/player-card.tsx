"use client";

import { Activity, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HealthStatus = "healthy" | "recovering" | "injured";

type PlayerCardProps = {
  playerId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  position: string | null;
  healthStatus: HealthStatus;
  isPlayingUp: boolean;
  photoUrl: string | null;
  organizationId: string;
};

/**
 * Player card for Players Tab
 * Shows player photo, name, jersey, position, health status
 * Click to navigate to Player Passport
 */
export function PlayerCard({
  playerId,
  fullName,
  firstName,
  lastName,
  jerseyNumber,
  position,
  healthStatus,
  isPlayingUp,
  photoUrl,
  organizationId,
}: PlayerCardProps) {
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();

  // Health badge config
  const healthConfig = {
    healthy: {
      icon: CheckCircle,
      label: "Healthy",
      variant: "secondary" as const,
      className: "bg-green-100 text-green-700",
    },
    recovering: {
      icon: Activity,
      label: "Recovering",
      variant: "outline" as const,
      className: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    injured: {
      icon: AlertCircle,
      label: "Injured",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-700",
    },
  };

  const config = healthConfig[healthStatus];
  const HealthIcon = config.icon;

  return (
    <Link href={`/orgs/${organizationId}/coach/players/${playerId}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Photo or Initials */}
            <div className="flex-shrink-0">
              {photoUrl ? (
                <img
                  alt={fullName}
                  className="h-12 w-12 rounded-full object-cover"
                  src={photoUrl}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                  {initials}
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-sm transition-colors group-hover:text-primary">
                    {fullName}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-muted-foreground text-xs">
                    {jerseyNumber && <span>#{jerseyNumber}</span>}
                    {jerseyNumber && position && <span>•</span>}
                    {position && <span>{position}</span>}
                  </div>
                </div>

                {/* Jersey number badge (large, right side) */}
                {jerseyNumber && (
                  <div className="flex-shrink-0 font-bold text-2xl text-muted-foreground/30">
                    #{jerseyNumber}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {/* Health Badge */}
                <Badge
                  className={cn("gap-1 text-xs", config.className)}
                  variant={config.variant}
                >
                  <HealthIcon className="h-3 w-3" />
                  {config.label}
                </Badge>

                {/* Playing Up Badge */}
                {isPlayingUp && (
                  <Badge
                    className="border-blue-200 bg-blue-50 text-blue-700 text-xs"
                    variant="outline"
                  >
                    Playing Up
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
