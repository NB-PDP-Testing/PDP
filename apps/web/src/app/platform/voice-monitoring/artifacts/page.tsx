"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ARTIFACT_STATUS_CONFIG,
  STATUS_CONFIG,
  TOPIC_CONFIG,
} from "@/lib/voice-notes/configs";

// ── Types ─────────────────────────────────────────────────────

type ArtifactStatus =
  | "received"
  | "transcribing"
  | "transcribed"
  | "processing"
  | "completed"
  | "failed";

// ── ClaimRow component (reused pattern from v2-claims) ────────

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
          <p className="font-medium text-sm">{claim.title as string}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {claim.sourceText as string}
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

// ── ExpandedArtifactRow ────────────────────────────────────────

function ExpandedArtifactRow({
  artifactId,
  isPlatformStaff,
}: {
  artifactId: Id<"voiceNoteArtifacts">;
  isPlatformStaff: boolean;
}) {
  const claimsData = useQuery(
    api.models.voiceNoteClaims.getPlatformClaimsByArtifact,
    isPlatformStaff ? { artifactId } : "skip"
  );

  if (claimsData === undefined) {
    return (
      <div className="space-y-2 px-4 py-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!claimsData.length) {
    return (
      <div className="px-4 py-3 text-muted-foreground text-sm">
        No claims extracted yet.
      </div>
    );
  }

  return (
    <div className="border-t">
      {(claimsData as Record<string, unknown>[]).map((claim) => (
        <ClaimRow claim={claim} key={claim._id as string} />
      ))}
    </div>
  );
}

// ── ArtifactRow ────────────────────────────────────────────────

function ArtifactRow({
  artifact,
  isPlatformStaff,
  onRetry,
}: {
  artifact: Record<string, unknown>;
  isPlatformStaff: boolean;
  onRetry: (artifactId: Id<"voiceNoteArtifacts">, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const artifactStatus = artifact.status as ArtifactStatus;
  const statusCfg = ARTIFACT_STATUS_CONFIG[artifactStatus] ?? {
    label: artifactStatus,
    color: "bg-gray-100 text-gray-700",
  };

  const artifactId = artifact.artifactId as string;
  const docId = artifact._id as Id<"voiceNoteArtifacts">;

  const orgCandidates = artifact.orgContextCandidates as Array<{
    organizationId: string;
    confidence: number;
  }>;

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
              type="button"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <button
              className="font-mono text-xs hover:underline"
              onClick={() =>
                // biome-ignore lint: dynamic route with Convex Id
                router.push(
                  `/platform/voice-monitoring/artifacts/${String(docId)}` as any
                )
              }
              type="button"
            >
              {artifactId.slice(0, 16)}...
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={statusCfg.color} variant="outline">
            {statusCfg.label}
          </Badge>
        </td>
        <td className="px-4 py-3 text-xs">
          {artifact.sourceChannel as string}
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          {(artifact.senderUserId as string).slice(0, 10)}...
        </td>
        <td className="px-4 py-3 text-xs">
          {orgCandidates[0]?.organizationId.slice(0, 10) ?? "—"}...
        </td>
        <td className="px-4 py-3 text-xs">
          {new Date(artifact.createdAt as number).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          {artifactStatus === "failed" && (
            <Button
              onClick={() => onRetry(docId, "full")}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td className="px-4 py-2" colSpan={7}>
            <ExpandedArtifactRow
              artifactId={docId}
              isPlatformStaff={isPlatformStaff}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ArtifactsPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | "all">(
    "all"
  );

  // Redirect non-platform staff
  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  // Paginated artifacts query (usePaginatedQuery - MANDATORY per ADR-VNM-021)
  const { results, status, loadMore } = usePaginatedQuery(
    api.models.voiceNoteArtifacts.getPlatformArtifacts,
    isPlatformStaff
      ? {
          filters:
            statusFilter !== "all" ? { status: statusFilter } : undefined,
        }
      : "skip",
    { initialNumItems: 25 }
  );

  const retryFullPipeline = useMutation(
    api.models.voicePipelineRetry.retryFullPipeline
  );
  const retryTranscription = useMutation(
    api.models.voicePipelineRetry.retryTranscription
  );

  const handleRetry = async (
    artifactId: Id<"voiceNoteArtifacts">,
    type: string
  ) => {
    try {
      if (type === "full") {
        await retryFullPipeline({ artifactId });
      } else {
        await retryTranscription({ artifactId });
      }
      toast.success("Retry initiated");
    } catch (err) {
      toast.error(
        `Retry failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const isLoading = status === "LoadingFirstPage";
  const isLoadingMore = status === "LoadingMore";
  const canLoadMore = status === "CanLoadMore";

  return (
    <div className="container mx-auto space-y-4 px-4 py-6">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-lg">Artifacts</h2>
        <p className="text-muted-foreground text-sm">
          Platform-wide artifact monitoring with claims
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          onValueChange={(v) => setStatusFilter(v as ArtifactStatus | "all")}
          value={statusFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="transcribing">Transcribing</SelectItem>
            <SelectItem value="transcribed">Transcribed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          {results.length} artifact{results.length !== 1 ? "s" : ""} loaded
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Artifact ID</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Coach</th>
              <th className="px-4 py-3 text-left font-medium">Org</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells
                    <td className="px-4 py-3" key={j}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td
                  className="py-12 text-center text-muted-foreground"
                  colSpan={7}
                >
                  No artifacts found
                </td>
              </tr>
            ) : (
              (results as Record<string, unknown>[]).map((artifact) => (
                <ArtifactRow
                  artifact={artifact}
                  isPlatformStaff={isPlatformStaff}
                  key={artifact._id as string}
                  onRetry={handleRetry}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {canLoadMore && (
        <div className="flex justify-center">
          <Button
            disabled={isLoadingMore}
            onClick={() => loadMore(25)}
            variant="outline"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
