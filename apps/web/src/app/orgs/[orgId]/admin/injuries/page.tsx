"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DatePreset = "30d" | "90d" | "season" | "all";

function getDateRange(preset: DatePreset): {
  startDate?: string;
  endDate?: string;
} {
  if (preset === "all") {
    return {};
  }

  const now = new Date();
  const endDate = now.toISOString().split("T")[0];

  if (preset === "30d") {
    const start = new Date(now.getTime() - 30 * 86_400_000);
    return { startDate: start.toISOString().split("T")[0], endDate };
  }

  if (preset === "90d") {
    const start = new Date(now.getTime() - 90 * 86_400_000);
    return { startDate: start.toISOString().split("T")[0], endDate };
  }

  // "season" - approximate as current calendar year
  return { startDate: `${now.getFullYear()}-01-01`, endDate };
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdminInjuriesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const dateRange = getDateRange(datePreset);

  const analytics = useQuery(api.models.playerInjuries.getOrgInjuryAnalytics, {
    organizationId: orgId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const isLoading = analytics === undefined;

  return (
    <div className="space-y-6">
      {/* Header with date range controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Injury Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Organization-wide injury statistics and trends
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              { key: "30d", label: "Last 30 days" },
              { key: "90d", label: "Last 90 days" },
              { key: "season", label: "This season" },
              { key: "all", label: "All time" },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              onClick={() => setDatePreset(key)}
              size="sm"
              variant={datePreset === key ? "default" : "outline"}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : analytics.totalInjuries === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No injury data recorded for the selected period.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards placeholder - US-ANA-007 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Total Injuries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.totalInjuries}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Currently Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.activeCount + analytics.recoveringCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Avg Recovery Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.avgRecoveryDays}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Recurrence Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.recurrenceRate}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Trends + Body Part - placeholders for US-ANA-008, US-ANA-009 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Charts Row 2: Severity + Context - placeholders for US-ANA-010, US-ANA-011 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>

          {/* Team Comparison placeholder - US-ANA-012 */}
          <SkeletonChart />

          {/* Recent Injuries Table placeholder - US-ANA-013 */}
          <SkeletonChart />
        </>
      )}
    </div>
  );
}
