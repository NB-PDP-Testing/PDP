"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Hash, RefreshCw, User, Users } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ARTIFACT_STATUS_CONFIG,
  STATUS_CONFIG,
  TOPIC_CONFIG,
} from "@/lib/voice-notes/configs";

// ── Node color helper ─────────────────────────────────────────

function getNodeColor(eventType: string): string {
  if (
    eventType.includes("completed") ||
    eventType.includes("generated") ||
    eventType.includes("confirmed")
  ) {
    return "bg-green-500";
  }
  if (eventType.includes("failed")) {
    return "bg-red-500";
  }
  if (eventType.includes("started")) {
    return "bg-blue-500";
  }
  if (eventType.includes("retry")) {
    return "bg-yellow-500";
  }
  if (eventType.includes("circuit_breaker")) {
    return "bg-orange-500";
  }
  return "bg-gray-400";
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── EventMetadata ─────────────────────────────────────────────

function EventMetadata({ event }: { event: Record<string, unknown> }) {
  const meta = event.metadata as Record<string, unknown> | undefined;
  const eventType = event.eventType as string;

  if (!meta) {
    return null;
  }

  const items: { label: string; value: string }[] = [];

  if (meta.claimCount !== undefined) {
    items.push({ label: "Claims", value: String(meta.claimCount) });
  }
  if (meta.entityCount !== undefined) {
    items.push({ label: "Entities", value: String(meta.entityCount) });
  }
  if (meta.disambiguationCount !== undefined) {
    items.push({ label: "Disambig", value: String(meta.disambiguationCount) });
  }
  if (meta.confidenceScore !== undefined) {
    items.push({
      label: "Confidence",
      value: `${((meta.confidenceScore as number) * 100).toFixed(0)}%`,
    });
  }
  if (meta.transcriptDuration !== undefined) {
    items.push({
      label: "Duration",
      value: `${(meta.transcriptDuration as number).toFixed(1)}s`,
    });
  }
  if (meta.transcriptWordCount !== undefined) {
    items.push({ label: "Words", value: String(meta.transcriptWordCount) });
  }
  if (meta.aiCost !== undefined) {
    items.push({
      label: "Cost",
      value: `$${(meta.aiCost as number).toFixed(4)}`,
    });
  }
  if (meta.draftCount !== undefined) {
    items.push({ label: "Drafts", value: String(meta.draftCount) });
  }
  if (meta.retryAttempt !== undefined) {
    items.push({ label: "Attempt", value: String(meta.retryAttempt) });
  }
  if (meta.sourceChannel !== undefined) {
    items.push({ label: "Channel", value: String(meta.sourceChannel) });
  }

  const isFailure = eventType.includes("failed");
  const errorMsg = event.errorMessage as string | undefined;
  const errorCode = event.errorCode as string | undefined;

  return (
    <div className="mt-1 space-y-1">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
          {items.map((item) => (
            <span key={item.label}>
              <span className="font-medium">{item.label}:</span> {item.value}
            </span>
          ))}
        </div>
      )}
      {isFailure && errorMsg && (
        <p className="text-red-600 text-xs">
          Error: {errorMsg}
          {errorCode && ` (${errorCode})`}
        </p>
      )}
    </div>
  );
}

// ── EventTimeline ─────────────────────────────────────────────

function EventTimeline({ events }: { events: Record<string, unknown>[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No events recorded yet.</p>
    );
  }

  return (
    <div className="relative ml-4 space-y-6 border-muted border-l-2 pl-6">
      {events.map((event) => {
        const eventType = event.eventType as string;
        const timestamp = event.timestamp as number;

        return (
          <div className="relative" key={event._id as string}>
            {/* Timeline node */}
            <div
              className={`-left-[29px] absolute h-4 w-4 rounded-full border-2 border-background ${getNodeColor(eventType)}`}
            />
            {/* Event content */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {new Date(timestamp).toLocaleString()}
                </span>
                <Badge className="text-xs" variant="outline">
                  {formatEventType(eventType)}
                </Badge>
                {event.pipelineStage ? (
                  <Badge
                    className="bg-muted text-muted-foreground text-xs"
                    variant="secondary"
                  >
                    {String(event.pipelineStage)}
                  </Badge>
                ) : null}
              </div>
              <EventMetadata event={event} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ClaimRow ──────────────────────────────────────────────────

function ClaimRow({ claim }: { claim: Record<string, unknown> }) {
  const topic = claim.topic as string;
  const claimStatus = claim.status as string;
  const topicCfg = TOPIC_CONFIG[topic] ?? {
    label: topic,
    color: "bg-gray-100 text-gray-800",
  };
  const statusCfg = STATUS_CONFIG[claimStatus] ?? {
    label: claimStatus,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-wrap gap-1.5 pt-0.5">
          <Badge className={topicCfg.color} variant="outline">
            {topicCfg.label}
          </Badge>
          <Badge className={statusCfg.color} variant="outline">
            {statusCfg.label}
          </Badge>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{String(claim.title)}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {String(claim.sourceText)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            {claim.resolvedPlayerName ? (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {String(claim.resolvedPlayerName)}
              </span>
            ) : null}
            {claim.resolvedTeamName ? (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {String(claim.resolvedTeamName)}
              </span>
            ) : null}
            {(claim.entityMentions as unknown[]).length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {(claim.entityMentions as unknown[]).length} mention
                {(claim.entityMentions as unknown[]).length !== 1 ? "s" : ""}
              </span>
            )}
            <span>
              Confidence:{" "}
              {((claim.extractionConfidence as number) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId } = use(params);
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  const artifactDocId = artifactId as Id<"voiceNoteArtifacts">;

  const artifact = useQuery(
    api.models.voiceNoteArtifacts.getPlatformArtifactById,
    isPlatformStaff ? { artifactId: artifactDocId } : "skip"
  );

  const events = useQuery(
    api.models.voicePipelineEvents.getEventTimeline,
    isPlatformStaff ? { artifactId: artifactDocId } : "skip"
  );

  const claims = useQuery(
    api.models.voiceNoteClaims.getPlatformClaimsByArtifact,
    isPlatformStaff ? { artifactId: artifactDocId } : "skip"
  );

  const retryHistory = useQuery(
    api.models.voicePipelineRetry.getRetryHistory,
    isPlatformStaff ? { artifactId: artifactDocId } : "skip"
  );

  const retryFullPipeline = useMutation(
    api.models.voicePipelineRetry.retryFullPipeline
  );

  const handleRetry = async () => {
    try {
      await retryFullPipeline({ artifactId: artifactDocId });
      toast.success("Full pipeline retry initiated");
    } catch (err) {
      toast.error(
        `Retry failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const isLoading = artifact === undefined || events === undefined;

  const statusCfg = artifact
    ? (ARTIFACT_STATUS_CONFIG[artifact.status] ?? {
        label: artifact.status,
        color: "bg-gray-100 text-gray-700",
      })
    : null;

  const orgId = artifact?.orgContextCandidates[0]?.organizationId ?? "Unknown";

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link
          className="hover:text-foreground"
          href={"/platform/voice-monitoring/artifacts" as any}
        >
          <ArrowLeft className="inline h-4 w-4" /> Artifacts
        </Link>
        <span>/</span>
        <span className="font-mono text-xs">{artifactId.slice(0, 20)}...</span>
      </div>

      {/* Header */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : artifact ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-mono text-sm">
                  {artifact.artifactId}
                </CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  {statusCfg && (
                    <Badge className={statusCfg.color} variant="outline">
                      {statusCfg.label}
                    </Badge>
                  )}
                  <Badge variant="secondary">{artifact.sourceChannel}</Badge>
                </div>
              </div>
              {artifact.status === "failed" && (
                <Button onClick={handleRetry} size="sm" variant="outline">
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Retry Pipeline
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">Coach ID</dt>
                <dd className="font-mono text-xs">
                  {artifact.senderUserId.slice(0, 16)}...
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Org</dt>
                <dd className="font-mono text-xs">{orgId.slice(0, 16)}...</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Created</dt>
                <dd className="text-xs">
                  {new Date(artifact.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Updated</dt>
                <dd className="text-xs">
                  {new Date(artifact.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Artifact not found
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {events === undefined ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton className="h-12 w-full" key={i} />
              ))}
            </div>
          ) : (
            <EventTimeline events={events as Record<string, unknown>[]} />
          )}
        </CardContent>
      </Card>

      {/* Claims Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Claims ({claims?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {claims === undefined ? (
            <div className="space-y-2 px-6 pb-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : claims.length === 0 ? (
            <p className="px-6 pb-4 text-muted-foreground text-sm">
              No claims extracted yet.
            </p>
          ) : (
            <div>
              {(claims as Record<string, unknown>[]).map((claim) => (
                <ClaimRow claim={claim} key={claim._id as string} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retry Panel */}
      {(retryHistory?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Retry History ({retryHistory?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {retryHistory?.map((entry, i) => {
                const key = `retry-${entry.timestamp}-${i}`;
                return (
                  <div
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    key={key}
                  >
                    <div>
                      <span className="font-medium">
                        {formatEventType(entry.eventType)}
                      </span>
                      {entry.retryAttempt !== undefined && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          Attempt #{entry.retryAttempt}
                        </span>
                      )}
                      {entry.errorMessage ? (
                        <span className="ml-2 text-red-600 text-xs">
                          {entry.errorMessage}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
