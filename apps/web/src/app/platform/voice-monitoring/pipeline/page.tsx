"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ARTIFACT_STATUS_CONFIG } from "@/lib/voice-notes/configs";
import { PipelineFlowGraph } from "../_components/pipeline-flow-graph";

// ── Stage drill-down modal ────────────────────────────────────

type StageInfo = {
  id: string;
  label: string;
  avgLatency: number;
  failureRate: number;
  count: number;
};

function StageDrillDown({
  stage,
  onClose,
}: {
  stage: StageInfo;
  onClose: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage.label} Stage Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="font-bold text-xl">{stage.count}</div>
              <p className="text-muted-foreground text-xs">Total</p>
            </div>
            <div className="text-center">
              <div className="font-bold text-xl">
                {Math.round(stage.avgLatency)}ms
              </div>
              <p className="text-muted-foreground text-xs">Avg Latency</p>
            </div>
            <div className="text-center">
              <div
                className={`font-bold text-xl ${stage.failureRate > 0.1 ? "text-red-600" : "text-green-600"}`}
              >
                {(stage.failureRate * 100).toFixed(1)}%
              </div>
              <p className="text-muted-foreground text-xs">Error Rate</p>
            </div>
          </div>

          {/* Latency distribution (simple visual) */}
          <div>
            <p className="mb-2 font-medium text-sm">Latency Distribution</p>
            <div className="relative h-8 w-full overflow-hidden rounded bg-gray-100">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${Math.min((stage.avgLatency / 10_000) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Avg: {Math.round(stage.avgLatency)}ms (relative to 10s max)
            </p>
          </div>

          {/* Error breakdown */}
          {stage.failureRate > 0 && (
            <div>
              <p className="mb-2 font-medium text-sm">Error Rate</p>
              <div className="relative h-4 w-full overflow-hidden rounded bg-gray-100">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${stage.failureRate * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Active Artifact Card ──────────────────────────────────────

function ActiveArtifactCard({
  artifact,
}: {
  artifact: Record<string, unknown>;
}) {
  const status = artifact.status as string;
  const statusCfg = ARTIFACT_STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-700",
  };

  const createdAt = artifact.createdAt as number;
  const elapsed = Math.round((Date.now() - createdAt) / 1000);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs">
            {(artifact.artifactId as string).slice(0, 16)}...
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {artifact.sourceChannel as string}
          </p>
        </div>
        <div className="text-right">
          <Badge className={statusCfg.color} variant="outline">
            {statusCfg.label}
          </Badge>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {elapsed}s elapsed
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function PipelinePage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<StageInfo | null>(null);

  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  const stageBreakdown = useQuery(
    api.models.voicePipelineMetrics.getStageBreakdown,
    isPlatformStaff
      ? {
          periodType: "hourly" as const,
          startTime: twentyFourHoursAgo,
          endTime: now,
        }
      : "skip"
  );

  const activeArtifacts = useQuery(
    api.models.voicePipelineEvents.getActiveArtifacts,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null } }
      : "skip"
  );

  const failedArtifacts = useQuery(
    api.models.voicePipelineEvents.getFailedArtifacts,
    isPlatformStaff
      ? { paginationOpts: { numItems: 10, cursor: null } }
      : "skip"
  );

  const isLoading =
    realTimeMetrics === undefined || stageBreakdown === undefined;

  const STAGE_LABELS: Record<string, string> = {
    ingestion: "Ingestion",
    transcription: "Transcription",
    claims_extraction: "Claims",
    entity_resolution: "Entity Resolution",
    draft_generation: "Draft Generation",
    confirmation: "Confirmation",
  };

  const handleStageClick = (stage: {
    stage: string;
    avgLatency: number;
    failureRate: number;
    count: number;
  }) => {
    setSelectedStage({
      id: stage.stage,
      label: STAGE_LABELS[stage.stage] ?? stage.stage,
      avgLatency: stage.avgLatency,
      failureRate: stage.failureRate,
      count: stage.count,
    });
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div>
        <h2 className="font-semibold text-lg">Pipeline</h2>
        <p className="text-muted-foreground text-sm">
          End-to-end pipeline flow and stage details
        </p>
      </div>

      {/* Pipeline Flow Graph (reused from overview) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineFlowGraph metrics={realTimeMetrics} />
        </CardContent>
      </Card>

      {/* Stage breakdown table with click-to-drill-down */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Stage Breakdown — Click to Drill Down
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton className="h-10 w-full" key={i} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-right font-medium">Count</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Avg Latency
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Error Rate
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(stageBreakdown?.stages ?? []).map((stage) => (
                    <tr
                      className="border-t hover:bg-muted/30"
                      key={stage.stage}
                    >
                      <td className="px-4 py-3 font-medium">
                        {STAGE_LABELS[stage.stage] ?? stage.stage}
                      </td>
                      <td className="px-4 py-3 text-right">{stage.count}</td>
                      <td className="px-4 py-3 text-right">
                        {Math.round(stage.avgLatency)}ms
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          className={
                            stage.failureRate > 0.1
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }
                          variant="outline"
                        >
                          {(stage.failureRate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          onClick={() => handleStageClick(stage)}
                          size="sm"
                          variant="outline"
                        >
                          Drill Down
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Artifacts panel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Active Artifacts ({activeArtifacts?.page?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeArtifacts === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  <Skeleton className="h-16 w-full" key={i} />
                ))}
              </div>
            ) : (activeArtifacts.page?.length ?? 0) === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No active artifacts
              </p>
            ) : (
              <div className="space-y-2">
                {(activeArtifacts.page as Record<string, unknown>[]).map(
                  (artifact) => (
                    <ActiveArtifactCard
                      artifact={artifact}
                      key={artifact._id as string}
                    />
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Recent Failures ({failedArtifacts?.page?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {failedArtifacts === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  <Skeleton className="h-16 w-full" key={i} />
                ))}
              </div>
            ) : (failedArtifacts.page?.length ?? 0) === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No recent failures
              </p>
            ) : (
              <div className="space-y-2">
                {(failedArtifacts.page as Record<string, unknown>[]).map(
                  (artifact) => (
                    <ActiveArtifactCard
                      artifact={artifact}
                      key={artifact._id as string}
                    />
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage drill-down modal */}
      {selectedStage && (
        <StageDrillDown
          onClose={() => setSelectedStage(null)}
          stage={selectedStage}
        />
      )}
    </div>
  );
}
