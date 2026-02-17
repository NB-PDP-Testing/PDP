"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ActivityFeed } from "./_components/activity-feed";
import { PipelineFlowGraph } from "./_components/pipeline-flow-graph";
import { StatusCards } from "./_components/status-cards";

export default function VoiceMonitoringOverviewPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  // Query 1: Real-time metrics from counters (O(1))
  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  // Query 2: Recent pipeline events (last 20)
  const recentEvents = useQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null }, filters: {} }
      : "skip"
  );

  // Query 3: Active pipeline alerts
  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  // Query 4: Active artifacts (for accurate count)
  const activeArtifactsResult = useQuery(
    api.models.voicePipelineEvents.getActiveArtifacts,
    isPlatformStaff
      ? { paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  // Query 5: Historical metrics (for latency calculation - last 24 hours)
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const historicalMetrics = useQuery(
    api.models.voicePipelineMetrics.getHistoricalMetrics,
    isPlatformStaff
      ? {
          periodType: "hourly" as const,
          startTime: twentyFourHoursAgo,
          endTime: now,
        }
      : "skip"
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Section 1: Pipeline Flow Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineFlowGraph metrics={realTimeMetrics} />
        </CardContent>
      </Card>

      {/* Section 2: Status Cards */}
      <StatusCards
        activeArtifacts={activeArtifactsResult?.page as any}
        alerts={activeAlerts}
        historicalMetrics={historicalMetrics}
        metrics={realTimeMetrics}
        recentEvents={recentEvents?.page as any}
      />

      {/* Section 3: Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={recentEvents?.page as any} />
        </CardContent>
      </Card>
    </div>
  );
}
