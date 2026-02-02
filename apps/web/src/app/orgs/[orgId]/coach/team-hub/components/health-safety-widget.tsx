"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, Heart, Pill } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type HealthSafetyWidgetProps = {
  teamId: string;
  organizationId: string;
};

export function HealthSafetyWidget({
  teamId,
  organizationId,
}: HealthSafetyWidgetProps) {
  const healthSummary = useQuery(
    api.models.playerInjuries.getTeamHealthSummary,
    {
      teamId,
      organizationId,
    }
  );

  if (!healthSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health & Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const {
    activeInjuries,
    totalActiveInjuries,
    allergyAlertsCount,
    medicationAlertsCount,
  } = healthSummary;

  const hasInjuries = activeInjuries.length > 0;
  const hasAlerts = allergyAlertsCount > 0 || medicationAlertsCount > 0;
  const hasNoHealthIssues = !(hasInjuries || hasAlerts);

  // Severity badge colors
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "severe":
        return (
          <Badge className="text-xs" variant="destructive">
            🔴 Severe
          </Badge>
        );
      case "moderate":
        return (
          <Badge className="bg-yellow-500 text-xs" variant="default">
            🟡 Moderate
          </Badge>
        );
      case "minor":
        return (
          <Badge className="text-xs" variant="secondary">
            🟢 Minor
          </Badge>
        );
      case "long_term":
        return (
          <Badge className="text-xs" variant="outline">
            Long Term
          </Badge>
        );
      default:
        return null;
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="destructive">Out</Badge>;
      case "recovering":
        return <Badge variant="default">Limited</Badge>;
      case "cleared":
        return <Badge variant="secondary">Cleared</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Health & Safety
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasNoHealthIssues ? (
          <Empty className="py-8">
            <EmptyMedia>
              <Heart className="h-12 w-12 text-green-500" />
            </EmptyMedia>
            <EmptyContent>
              <EmptyTitle>All Clear!</EmptyTitle>
              <EmptyDescription>
                No active injuries - great job keeping the team healthy!
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-4">
            {/* Active Injuries Section */}
            {hasInjuries && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Active Injuries</h3>
                <div className="space-y-2">
                  {activeInjuries.map((injury) => (
                    <Link
                      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
                      href={`/orgs/${organizationId}/coach/injuries`}
                      key={injury.injuryId}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {injury.playerName}
                            </span>
                            {getSeverityBadge(injury.severity)}
                            {getStatusBadge(injury.status)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {injury.injuryType} - {injury.bodyPart}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {injury.daysSinceInjury === 0
                              ? "Today"
                              : injury.daysSinceInjury === 1
                                ? "1 day ago"
                                : `${injury.daysSinceInjury} days ago`}
                          </div>
                        </div>
                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
                {totalActiveInjuries > 5 && (
                  <Link
                    className="block text-center text-primary text-sm hover:underline"
                    href={`/orgs/${organizationId}/coach/injuries`}
                  >
                    View All ({totalActiveInjuries})
                  </Link>
                )}
              </div>
            )}

            {/* Medical Alerts Section */}
            {hasAlerts && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold text-sm">Medical Alerts</h3>
                <div className="space-y-2">
                  {allergyAlertsCount > 0 && (
                    <Link
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
                      href={`/orgs/${organizationId}/coach/medical`}
                    >
                      <div className="rounded-full bg-orange-500/10 p-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Allergy Alerts
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {allergyAlertsCount}{" "}
                          {allergyAlertsCount === 1 ? "player" : "players"} with
                          allergies
                        </div>
                      </div>
                    </Link>
                  )}
                  {medicationAlertsCount > 0 && (
                    <Link
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
                      href={`/orgs/${organizationId}/coach/medical`}
                    >
                      <div className="rounded-full bg-blue-500/10 p-2">
                        <Pill className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Medication Alerts
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {medicationAlertsCount}{" "}
                          {medicationAlertsCount === 1 ? "player" : "players"}{" "}
                          on medication
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
