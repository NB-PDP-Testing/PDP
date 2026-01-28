"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import { BarChart3, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ImpactSummaryCards } from "./impact-summary-cards";
import { SentSummariesSection } from "./sent-summaries-section";

type MyImpactTabProps = {
  orgId: BetterAuthId<"organization">;
  coachId: string;
};

type DateRangeFilter = "week" | "month" | "all";

/**
 * Helper function to convert date range filter to millisecond timestamps
 */
function getDateRangeForFilter(filter: DateRangeFilter): {
  start: number;
  end: number;
} {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  switch (filter) {
    case "week":
      return { start: now - oneWeek, end: now };
    case "month":
      return { start: now - oneMonth, end: now };
    case "all":
      return { start: 0, end: now };
    default:
      return { start: now - oneMonth, end: now };
  }
}

/**
 * My Impact Tab - Phase 8: Coach Impact Visibility
 *
 * Shows comprehensive coaching impact metrics:
 * - Summary cards (voice notes, insights, summaries, parent view rate)
 * - Recent sent summaries with parent engagement
 * - Applied insights grouped by category
 * - Team observations
 *
 * Week 1: Scaffolding with date range filtering
 * Week 2: Fill in dashboard sections (US-P8-005 to US-P8-011)
 */
export function MyImpactTab({ orgId, coachId }: MyImpactTabProps) {
  // Date range state with localStorage persistence
  const [dateRange, setDateRange] = useState<DateRangeFilter>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("impact-date-range");
      if (stored === "week" || stored === "month" || stored === "all") {
        return stored;
      }
    }
    return "month";
  });

  // Persist date range preference to localStorage
  useEffect(() => {
    localStorage.setItem("impact-date-range", dateRange);
  }, [dateRange]);

  // Fetch impact data
  const impactData = useQuery(api.models.voiceNotes.getCoachImpactSummary, {
    coachId,
    organizationId: orgId,
    dateRange: getDateRangeForFilter(dateRange),
  });

  // Loading state
  if (impactData === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Summary cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-2 h-12 w-12 rounded-full" />
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-2 h-12 w-12 rounded-full" />
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-2 h-12 w-12 rounded-full" />
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-2 h-12 w-12 rounded-full" />
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        </div>

        {/* Content sections skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Empty state - no voice notes created yet
  if (impactData.voiceNotesCreated === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Mic className="h-12 w-12 text-muted-foreground" />
          </div>
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No voice notes yet</EmptyTitle>
          <EmptyDescription>
            Record your first voice note to see your coaching impact and track
            how your insights help players develop.
          </EmptyDescription>
          <Button className="mt-4" size="lg">
            <Mic className="mr-2 h-4 w-4" />
            Record Voice Note
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date range filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">My Impact</h2>
            <p className="text-muted-foreground text-sm">
              Track your coaching activity and parent engagement
            </p>
          </div>
        </div>

        <Select
          onValueChange={(v) => setDateRange(v as DateRangeFilter)}
          value={dateRange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Phase 8 Week 2: Summary cards section (US-P8-005) */}
      <ImpactSummaryCards data={impactData} />

      {/* Phase 8 Week 2: Sent summaries section (US-P8-006) */}
      <SentSummariesSection summaries={impactData.recentSummaries} />

      {/* Phase 8 Week 2: Applied insights section (US-P8-007) */}
      <div>
        <h3 className="mb-4 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Applied Insights
        </h3>
        <div className="rounded-lg border-2 border-muted-foreground/25 border-dashed bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            <strong>Week 2 Implementation:</strong> Insights grouped by category
            (skills, injuries, attendance) with links to player passports.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Data available: {impactData.skillChanges.length} skill changes,{" "}
            {impactData.injuriesRecorded.length} injuries recorded
          </p>
        </div>
      </div>

      {/* Phase 8 Week 2: Team observations section (US-P8-009) */}
      <div>
        <h3 className="mb-4 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Team Observations
        </h3>
        <div className="rounded-lg border-2 border-muted-foreground/25 border-dashed bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            <strong>Week 2 Implementation:</strong> Team-level insights and
            observations from voice notes.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Data available: {impactData.teamObservations.length} team
            observations
          </p>
        </div>
      </div>
    </div>
  );
}
