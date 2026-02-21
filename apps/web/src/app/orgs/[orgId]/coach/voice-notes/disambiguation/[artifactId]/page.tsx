"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Search,
  UserSearch,
  X,
} from "lucide-react";
import type * as NextTypes from "next";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgTheme } from "@/hooks/use-org-theme";

type AppRoute = NextTypes.Route;

// ── Match reason display config ──────────────────────────────

const MATCH_REASON_CONFIG: Record<string, { label: string; color: string }> = {
  irish_alias: {
    label: "Irish name alias",
    color: "bg-emerald-100 text-emerald-800",
  },
  "irish_alias+fuzzy": {
    label: "Irish alias (fuzzy)",
    color: "bg-emerald-100 text-emerald-700",
  },
  exact_first_name: {
    label: "Exact first name",
    color: "bg-blue-100 text-blue-800",
  },
  fuzzy_full_name: {
    label: "Similar name",
    color: "bg-yellow-100 text-yellow-800",
  },
  fuzzy_first_name: {
    label: "Similar first name",
    color: "bg-amber-100 text-amber-800",
  },
  last_name_match: {
    label: "Last name match",
    color: "bg-sky-100 text-sky-800",
  },
  reversed_name: {
    label: "Reversed name",
    color: "bg-indigo-100 text-indigo-800",
  },
  partial_match: {
    label: "Partial match",
    color: "bg-gray-100 text-gray-700",
  },
  coach_alias: {
    label: "Coach alias",
    color: "bg-green-100 text-green-800",
  },
};

// ── Types ────────────────────────────────────────────────────

type Resolution = {
  _id: Id<"voiceNoteEntityResolutions">;
  _creationTime: number;
  claimId: Id<"voiceNoteClaims">;
  artifactId: Id<"voiceNoteArtifacts">;
  mentionIndex: number;
  mentionType: string;
  rawText: string;
  candidates: Array<{
    entityType: string;
    entityId: string;
    entityName: string;
    score: number;
    matchReason: string;
  }>;
  status: string;
  resolvedEntityId?: string;
  resolvedEntityName?: string;
  resolvedAt?: number;
  organizationId: string;
  createdAt: number;
};

type MentionGroup = {
  rawText: string;
  resolutions: Resolution[];
  candidates: Resolution["candidates"];
};

type OrgPlayer = {
  _id: Id<"playerIdentities">;
  name: string;
  firstName: string;
  lastName: string;
  playerIdentityId: Id<"playerIdentities">;
  ageGroup?: string;
  sportCode?: string;
};

// ── Page component ───────────────────────────────────────────

export default function DisambiguationPage({
  params,
}: {
  params: Promise<{ orgId: string; artifactId: string }>;
}) {
  const { orgId, artifactId } = use(params);
  const router = useRouter();
  const { theme } = useOrgTheme();

  const resolutions = useQuery(
    api.models.voiceNoteEntityResolutions.getDisambiguationForArtifact,
    { artifactId: artifactId as Id<"voiceNoteArtifacts"> }
  );

  const orgPlayers = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    { organizationId: orgId }
  );

  const resolveEntity = useMutation(
    api.models.voiceNoteEntityResolutions.resolveEntity
  );
  const rejectResolution = useMutation(
    api.models.voiceNoteEntityResolutions.rejectResolution
  );

  const [loadingId, setLoadingId] = useState<string | null>(null);

  // [E6] Group resolutions by rawText
  const mentionGroups = groupByRawText(resolutions ?? []);

  const handleResolve = async (
    group: MentionGroup,
    candidate: MentionGroup["candidates"][0]
  ) => {
    setLoadingId(group.rawText);
    try {
      // Resolve the first resolution in the group — E6 batch handles the rest
      await resolveEntity({
        resolutionId: group.resolutions[0]._id,
        resolvedEntityId: candidate.entityId,
        resolvedEntityName: candidate.entityName,
        selectedScore: candidate.score,
      });
      toast.success(
        group.resolutions.length > 1
          ? `Resolved "${group.rawText}" across ${group.resolutions.length} claims`
          : `Resolved "${group.rawText}"`
      );
    } catch {
      toast.error("Failed to resolve entity");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (group: MentionGroup) => {
    setLoadingId(group.rawText);
    try {
      for (const r of group.resolutions) {
        await rejectResolution({
          resolutionId: r._id,
          topCandidateScore: r.candidates[0]?.score ?? 0,
        });
      }
      toast.success(`Dismissed "${group.rawText}"`);
    } catch {
      toast.error("Failed to dismiss");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDismissAll = async () => {
    setLoadingId("dismiss-all");
    try {
      for (const group of mentionGroups) {
        for (const r of group.resolutions) {
          await rejectResolution({
            resolutionId: r._id,
            topCandidateScore: r.candidates[0]?.score ?? 0,
          });
        }
      }
      toast.success("Dismissed all remaining mentions");
    } catch {
      toast.error("Failed to dismiss");
    } finally {
      setLoadingId(null);
    }
  };

  if (resolutions === undefined) {
    return <LoadingSkeleton />;
  }

  const backUrl = `/orgs/${orgId}/coach/voice-notes`;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => router.push(backUrl as AppRoute)}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-xl">Resolve Player Mentions</h1>
          <p className="text-muted-foreground text-sm">
            {mentionGroups.length === 0
              ? "All mentions resolved!"
              : `${mentionGroups.length} name${mentionGroups.length > 1 ? "s" : ""} to identify`}
          </p>
        </div>
      </div>

      {/* Summary card */}
      {resolutions.length > 0 && (
        <SummaryCard
          groupCount={mentionGroups.length}
          totalResolutions={resolutions.length}
        />
      )}

      {/* Empty state */}
      {mentionGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Check className="h-12 w-12 text-green-500" />
            <p className="font-medium text-lg">All mentions resolved!</p>
            <Button
              onClick={() => router.push(backUrl as AppRoute)}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Voice Notes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mention group cards */}
      {mentionGroups.map((group) => (
        <MentionGroupCard
          group={group}
          isLoading={loadingId === group.rawText}
          key={group.rawText}
          onReject={() => handleReject(group)}
          onResolve={(candidate) => handleResolve(group, candidate)}
          orgPlayers={(orgPlayers ?? []) as OrgPlayer[]}
          theme={theme}
        />
      ))}

      {/* Bottom action bar */}
      {mentionGroups.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
          <div className="mx-auto flex max-w-2xl gap-3">
            <Button
              className="flex-1"
              disabled={loadingId !== null}
              onClick={handleDismissAll}
              variant="outline"
            >
              {loadingId === "dismiss-all" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Dismiss All Remaining
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group resolutions by rawText [E6] ────────────────────────

function groupByRawText(resolutions: Resolution[]): MentionGroup[] {
  const groups = new Map<string, Resolution[]>();

  for (const r of resolutions) {
    const key = r.rawText.toLowerCase().trim();
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([rawText, groupResolutions]) => ({
    rawText,
    resolutions: groupResolutions,
    // Use candidates from the first resolution (all same-name resolutions share candidates)
    candidates: groupResolutions[0]?.candidates ?? [],
  }));
}

// ── Summary card ─────────────────────────────────────────────

function SummaryCard({
  groupCount,
  totalResolutions,
}: {
  groupCount: number;
  totalResolutions: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-3">
        <UserSearch className="h-8 w-8 text-orange-500" />
        <div>
          <p className="font-medium">
            {groupCount} unique name{groupCount > 1 ? "s" : ""} to identify
          </p>
          {totalResolutions > groupCount && (
            <p className="text-muted-foreground text-sm">
              Across {totalResolutions} total mentions
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mention group card ───────────────────────────────────────

function MentionGroupCard({
  group,
  onResolve,
  onReject,
  isLoading,
  orgPlayers,
  theme,
}: {
  group: MentionGroup;
  onResolve: (candidate: MentionGroup["candidates"][0]) => void;
  onReject: () => void;
  isLoading: boolean;
  orgPlayers: OrgPlayer[];
  theme: ReturnType<typeof useOrgTheme>["theme"];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedCandidate = group.candidates.find(
    (c) => c.entityId === selectedId
  );

  const searchResults =
    searchTerm.length >= 2
      ? orgPlayers
          .filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 8)
      : [];

  const handleSelectFromSearch = (player: OrgPlayer) => {
    onResolve({
      entityType: "player",
      entityId: player.playerIdentityId as string,
      entityName: player.name,
      score: 1.0,
      matchReason: "manual_search",
    });
    setShowSearch(false);
    setSearchTerm("");
  };

  return (
    <Card className={isLoading ? "pointer-events-none opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            &ldquo;{group.rawText}&rdquo;
          </CardTitle>
          {group.resolutions.length > 1 && (
            <Badge className="bg-orange-100 text-orange-800" variant="outline">
              {group.resolutions.length} claims
            </Badge>
          )}
        </div>
        <CardDescription>
          {group.candidates.length} candidate
          {group.candidates.length !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* AI candidate options */}
        {group.candidates.map((candidate) => (
          <CandidateOption
            candidate={candidate}
            isSelected={selectedId === candidate.entityId}
            key={candidate.entityId}
            onSelect={() => setSelectedId(candidate.entityId)}
            theme={theme}
          />
        ))}

        {/* Confirm button for selected AI candidate */}
        {selectedId && selectedCandidate && (
          <Button
            className="mt-3 w-full"
            disabled={isLoading}
            onClick={() => onResolve(selectedCandidate)}
            style={
              theme.primary
                ? {
                    backgroundColor: theme.primary,
                    color: theme.primaryContrast,
                  }
                : undefined
            }
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Confirm Selection
          </Button>
        )}

        {/* Divider */}
        <div className="border-t pt-1" />

        {/* Search / dismiss section */}
        {showSearch ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  className="h-8 pl-8 text-sm"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by player name..."
                  value={searchTerm}
                />
              </div>
              <Button
                onClick={() => {
                  setShowSearch(false);
                  setSearchTerm("");
                }}
                size="icon"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((player) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                    key={player.playerIdentityId}
                    onClick={() => handleSelectFromSearch(player)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{player.name}</p>
                      {(player.ageGroup ?? player.sportCode) && (
                        <p className="text-muted-foreground text-xs">
                          {[player.ageGroup, player.sportCode]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && searchResults.length === 0 && (
              <p className="py-2 text-center text-muted-foreground text-sm">
                No players found for &ldquo;{searchTerm}&rdquo;
              </p>
            )}

            {searchTerm.length < 2 && (
              <p className="text-center text-muted-foreground text-xs">
                Type at least 2 characters to search
              </p>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1 text-sm"
              disabled={isLoading}
              onClick={() => {
                setShowSearch(true);
                setSelectedId(null);
              }}
              size="sm"
              variant="outline"
            >
              <Search className="mr-2 h-3.5 w-3.5" />
              Search all players
            </Button>
            <Button
              className="text-muted-foreground text-sm"
              disabled={isLoading}
              onClick={onReject}
              size="sm"
              variant="ghost"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="mr-1.5 h-3.5 w-3.5" />
              )}
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getScoreColor(score: number): string {
  if (score >= 0.9) {
    return "bg-green-500";
  }
  if (score >= 0.7) {
    return "bg-yellow-500";
  }
  return "bg-red-500";
}

// ── Candidate option ─────────────────────────────────────────

function CandidateOption({
  candidate,
  isSelected,
  onSelect,
  theme,
}: {
  candidate: MentionGroup["candidates"][0];
  isSelected: boolean;
  onSelect: () => void;
  theme: ReturnType<typeof useOrgTheme>["theme"];
}) {
  const scorePercent = Math.round(candidate.score * 100);
  const scoreColor = getScoreColor(candidate.score);

  // Parse matchReason for badges
  const reasons = candidate.matchReason.split("+");
  const mainReason = reasons[0];
  const hasTeamContext = reasons.includes("team_context");

  const mainReasonCfg = MATCH_REASON_CONFIG[mainReason] ?? {
    label: mainReason,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <button
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        isSelected ? "border-2" : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
      style={
        isSelected && theme.primary ? { borderColor: theme.primary } : undefined
      }
      type="button"
    >
      {/* Radio indicator */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? "border-current" : "border-muted-foreground/30"
        }`}
        style={
          isSelected && theme.primary
            ? { borderColor: theme.primary, backgroundColor: theme.primary }
            : undefined
        }
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Candidate info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{candidate.entityName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge className={mainReasonCfg.color} variant="secondary">
            {mainReasonCfg.label}
          </Badge>
          {hasTeamContext && (
            <Badge className="bg-teal-100 text-teal-800" variant="secondary">
              On your team
            </Badge>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          {scorePercent}%
        </span>
        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${scoreColor}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ── Loading skeleton ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
