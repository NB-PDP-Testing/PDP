"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
  Layers,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Topic display config ──────────────────────────────────────

const TOPIC_CONFIG: Record<string, { label: string; color: string }> = {
  injury: { label: "Injury", color: "bg-red-100 text-red-800" },
  skill_rating: { label: "Skill Rating", color: "bg-blue-100 text-blue-800" },
  skill_progress: { label: "Skill Progress", color: "bg-sky-100 text-sky-800" },
  behavior: { label: "Behavior", color: "bg-orange-100 text-orange-800" },
  performance: { label: "Performance", color: "bg-green-100 text-green-800" },
  attendance: { label: "Attendance", color: "bg-yellow-100 text-yellow-800" },
  wellbeing: { label: "Wellbeing", color: "bg-purple-100 text-purple-800" },
  recovery: { label: "Recovery", color: "bg-pink-100 text-pink-800" },
  development_milestone: {
    label: "Milestone",
    color: "bg-emerald-100 text-emerald-800",
  },
  physical_development: {
    label: "Physical Dev",
    color: "bg-teal-100 text-teal-800",
  },
  parent_communication: {
    label: "Parent Comms",
    color: "bg-amber-100 text-amber-800",
  },
  tactical: { label: "Tactical", color: "bg-indigo-100 text-indigo-800" },
  team_culture: {
    label: "Team Culture",
    color: "bg-violet-100 text-violet-800",
  },
  todo: { label: "Todo", color: "bg-slate-100 text-slate-800" },
  session_plan: { label: "Session Plan", color: "bg-cyan-100 text-cyan-800" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  extracted: { label: "Extracted", color: "bg-blue-100 text-blue-700" },
  resolving: { label: "Resolving", color: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  needs_disambiguation: {
    label: "Needs Review",
    color: "bg-orange-100 text-orange-700",
  },
  merged: { label: "Merged", color: "bg-purple-100 text-purple-700" },
  discarded: { label: "Discarded", color: "bg-gray-100 text-gray-500" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
};

const ARTIFACT_STATUS_CONFIG: Record<string, { label: string; color: string }> =
  {
    received: { label: "Received", color: "bg-gray-100 text-gray-700" },
    transcribing: {
      label: "Transcribing",
      color: "bg-yellow-100 text-yellow-700",
    },
    transcribed: { label: "Transcribed", color: "bg-blue-100 text-blue-700" },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-700" },
    completed: { label: "Completed", color: "bg-green-100 text-green-700" },
    failed: { label: "Failed", color: "bg-red-100 text-red-700" },
  };

// ── Helpers ───────────────────────────────────────────────────

function getSeverityColor(severity: string): string {
  if (severity === "critical") {
    return "bg-red-200 text-red-900";
  }
  if (severity === "high") {
    return "bg-orange-200 text-orange-900";
  }
  return "bg-gray-100 text-gray-700";
}

// ── Claim row component ───────────────────────────────────────

function ClaimRow({ claim }: { claim: ClaimDoc }) {
  const topicCfg = TOPIC_CONFIG[claim.topic] ?? {
    label: claim.topic,
    color: "bg-gray-100 text-gray-800",
  };
  const statusCfg = STATUS_CONFIG[claim.status] ?? {
    label: claim.status,
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
          <p className="font-medium text-sm">{claim.title}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {claim.sourceText}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            {claim.resolvedPlayerName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {claim.resolvedPlayerName}
              </span>
            )}
            {claim.resolvedTeamName && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {claim.resolvedTeamName}
              </span>
            )}
            {claim.entityMentions.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {claim.entityMentions.length} mention
                {claim.entityMentions.length !== 1 ? "s" : ""}
              </span>
            )}
            <span>
              Confidence: {(claim.extractionConfidence * 100).toFixed(0)}%
            </span>
            {claim.severity && (
              <Badge
                className={getSeverityColor(claim.severity)}
                variant="outline"
              >
                {claim.severity}
              </Badge>
            )}
            {claim.sentiment && (
              <span className="capitalize">{claim.sentiment}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Artifact card with expandable claims ──────────────────────

function ArtifactCard(props: { artifact: ArtifactDoc; claims: ClaimDoc[] }) {
  const [expanded, setExpanded] = useState(false);
  const { artifact, claims } = props;
  const artifactClaims = claims.filter((c) => c.artifactId === artifact._id);
  const statusCfg = ARTIFACT_STATUS_CONFIG[artifact.status] ?? {
    label: artifact.status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-sm">
              {artifact.artifactId.slice(0, 12)}...
            </CardTitle>
            <Badge className={statusCfg.color} variant="outline">
              {statusCfg.label}
            </Badge>
            <Badge variant="secondary">
              {artifactClaims.length} claim
              {artifactClaims.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <span className="text-muted-foreground text-xs">
            {new Date(artifact.createdAt).toLocaleString()}
          </span>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="mt-2 text-muted-foreground text-xs">
            <span>Channel: {artifact.sourceChannel}</span>
            <span className="mx-2">|</span>
            <span>User: {artifact.senderUserId.slice(0, 10)}...</span>
          </div>
          {artifactClaims.length > 0 ? (
            <div className="mt-3 rounded-md border">
              {artifactClaims.map((claim) => (
                <ClaimRow claim={claim} key={claim._id} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground text-sm">
              No claims extracted yet.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Type aliases from query results ───────────────────────────

type ArtifactDoc = NonNullable<
  ReturnType<
    typeof useQuery<typeof api.models.voiceNoteArtifacts.getRecentArtifacts>
  >
>[number];

type ClaimDoc = NonNullable<
  ReturnType<typeof useQuery<typeof api.models.voiceNoteClaims.getRecentClaims>>
>[number];

// ── Artifact list section ──────────────────────────────────────

function ArtifactList(props: {
  artifacts: ArtifactDoc[] | undefined;
  claims: ClaimDoc[] | undefined;
  isLoading: boolean;
}) {
  if (props.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!props.artifacts?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-lg">No artifacts yet</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            v2 claims will appear here once a coach with feature flags enabled
            records a voice note.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {props.artifacts.map((artifact) => (
        <ArtifactCard
          artifact={artifact}
          claims={props.claims ?? []}
          key={artifact._id}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function V2ClaimsPage() {
  const artifacts = useQuery(api.models.voiceNoteArtifacts.getRecentArtifacts, {
    limit: 50,
  });
  const claims = useQuery(api.models.voiceNoteClaims.getRecentClaims, {
    limit: 200,
  });

  const isLoading = artifacts === undefined || claims === undefined;

  // Stats
  const totalClaims = claims?.length ?? 0;
  const totalArtifacts = artifacts?.length ?? 0;
  const topicCounts: Record<string, number> = {};
  if (claims) {
    for (const claim of claims) {
      topicCounts[claim.topic] = (topicCounts[claim.topic] ?? 0) + 1;
    }
  }
  const completedArtifacts =
    artifacts?.filter((a) => a.status === "completed").length ?? 0;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          className="text-muted-foreground hover:text-foreground"
          href="/platform"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold text-2xl">v2 Claims Viewer</h1>
          <p className="text-muted-foreground text-sm">
            Debug view of extracted claims from the v2 pipeline
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <span className="font-bold text-2xl">{totalArtifacts}</span>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">Artifacts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-bold text-2xl">{totalClaims}</span>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">Claims</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="font-bold text-2xl">{completedArtifacts}</span>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">
                Completed Artifacts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="font-bold text-2xl">
                  {Object.keys(topicCounts).length}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">
                Topic Categories
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Topic breakdown */}
      {!isLoading && totalClaims > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Claims by Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(topicCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([topic, count]) => {
                  const cfg = TOPIC_CONFIG[topic] ?? {
                    label: topic,
                    color: "bg-gray-100 text-gray-800",
                  };
                  return (
                    <Badge className={cfg.color} key={topic} variant="outline">
                      {cfg.label}: {count}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Artifact list */}
      <ArtifactList
        artifacts={artifacts}
        claims={claims}
        isLoading={isLoading}
      />
    </div>
  );
}
