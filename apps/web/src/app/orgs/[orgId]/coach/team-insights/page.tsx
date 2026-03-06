"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { InsightCard } from "../team-hub/components/insight-card";
import { InsightDetailModal } from "../team-hub/components/insight-detail-modal";

type Insight = {
  _id: string;
  teamId: string;
  organizationId: string;
  type: "voice-note" | "ai-generated" | "manual";
  title: string;
  summary: string;
  fullText?: string;
  voiceNoteId?: string;
  playerIds: string[];
  topic: "technical" | "tactical" | "fitness" | "behavioral" | "other";
  priority: "high" | "medium" | "low";
  createdBy: string;
  createdAt: number;
  readBy: string[];
  voiceNote?: {
    title: string;
    summary?: string;
  };
  playerNames: string[];
  creatorName: string;
  _creationTime: number;
};

type TypeFilter = "all" | "voice-note" | "ai-generated" | "manual";

type InsightStatsProps = {
  totalCount: number;
  voiceNoteCount: number;
  aiCount: number;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
};

function InsightStats({
  totalCount,
  voiceNoteCount,
  aiCount,
  typeFilter,
  onTypeFilterChange,
}: InsightStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      <Card
        className={`cursor-pointer pt-0 transition-all duration-200 hover:shadow-lg ${typeFilter === "all" ? "ring-2 ring-blue-400" : "border-blue-200 bg-blue-50"}`}
        onClick={() => onTypeFilterChange("all")}
        style={
          typeFilter === "all"
            ? {
                backgroundColor: "rgb(219 234 254)",
                borderColor: "rgb(147 197 253)",
              }
            : {}
        }
      >
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <Lightbulb className="text-blue-500" size={20} />
            <div className="font-bold text-gray-800 text-xl md:text-2xl">
              {totalCount}
            </div>
          </div>
          <div className="font-medium text-gray-600 text-xs md:text-sm">
            Total Insights
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-blue-500/20">
            <div
              className="h-1 rounded-full bg-blue-500"
              style={{ width: totalCount > 0 ? "100%" : "0%" }}
            />
          </div>
        </CardContent>
      </Card>
      <Card
        className={`cursor-pointer pt-0 transition-all duration-200 hover:shadow-lg ${typeFilter === "voice-note" ? "ring-2 ring-purple-400" : "border-purple-200 bg-purple-50"}`}
        onClick={() =>
          onTypeFilterChange(typeFilter === "voice-note" ? "all" : "voice-note")
        }
        style={
          typeFilter === "voice-note"
            ? {
                backgroundColor: "rgb(233 213 255)",
                borderColor: "rgb(192 132 252)",
              }
            : {}
        }
      >
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <Mic className="text-purple-500" size={20} />
            <div className="font-bold text-gray-800 text-xl md:text-2xl">
              {voiceNoteCount}
            </div>
          </div>
          <div className="font-medium text-gray-600 text-xs md:text-sm">
            Voice Notes
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-purple-500/20">
            <div
              className="h-1 rounded-full bg-purple-500"
              style={{ width: voiceNoteCount > 0 ? "100%" : "0%" }}
            />
          </div>
        </CardContent>
      </Card>
      <Card
        className={`cursor-pointer pt-0 transition-all duration-200 hover:shadow-lg ${typeFilter === "ai-generated" ? "ring-2 ring-green-400" : "border-green-200 bg-green-50"}`}
        onClick={() =>
          onTypeFilterChange(
            typeFilter === "ai-generated" ? "all" : "ai-generated"
          )
        }
        style={
          typeFilter === "ai-generated"
            ? {
                backgroundColor: "rgb(187 247 208)",
                borderColor: "rgb(74 222 128)",
              }
            : {}
        }
      >
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <Brain className="text-green-500" size={20} />
            <div className="font-bold text-gray-800 text-xl md:text-2xl">
              {aiCount}
            </div>
          </div>
          <div className="font-medium text-gray-600 text-xs md:text-sm">
            AI Generated
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-green-500/20">
            <div
              className="h-1 rounded-full bg-green-500"
              style={{ width: aiCount > 0 ? "100%" : "0%" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type InsightControlsProps = {
  totalCount: number;
  voiceNoteCount: number;
  aiCount: number;
  manualCount: number;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
  onGenerate: () => void;
};

function _InsightControls({
  totalCount,
  voiceNoteCount,
  aiCount,
  manualCount: _manualCount,
  typeFilter,
  onTypeFilterChange,
  onGenerate,
}: InsightControlsProps) {
  const filterCards = [
    {
      key: "all" as TypeFilter,
      label: "All",
      icon: Lightbulb,
      count: totalCount,
    },
    {
      key: "voice-note" as TypeFilter,
      label: "Voice Note",
      icon: Mic,
      count: voiceNoteCount,
    },
    {
      key: "ai-generated" as TypeFilter,
      label: "AI Generated",
      icon: Sparkles,
      count: aiCount,
    },
  ] as const;

  return (
    <>
      {/* Type filter cards + Generate button */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-wrap gap-2">
          {filterCards.map(({ key, label, icon: Icon, count }) => (
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                typeFilter === key
                  ? "border-2 border-primary bg-primary/5"
                  : "hover:border-primary/40"
              }`}
              key={key}
              onClick={() => onTypeFilterChange(key)}
            >
              <CardContent className="flex items-center gap-2 px-4 py-3">
                <Icon
                  className={`h-4 w-4 ${
                    typeFilter === key
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`font-medium text-sm ${
                    typeFilter === key ? "text-primary" : ""
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 font-semibold text-xs ${
                    typeFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={onGenerate}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Insights
          </Button>
        </div>
      </div>
    </>
  );
}

type CoachTeam = {
  teamId: string;
  teamName: string;
  ageGroup?: string;
  gender?: string;
  sportCode?: string;
};

type TeamSelectorProps = {
  coachTeams: CoachTeam[];
  effectiveSelectedTeam: string;
  playerCountByTeam: Map<string, number>;
  insightsByTeam: Map<
    string,
    { total: number; voiceNote: number; aiGenerated: number }
  >;
  onSelect: (teamId: string) => void;
};

function TeamSelector({
  coachTeams,
  effectiveSelectedTeam,
  playerCountByTeam,
  insightsByTeam,
  onSelect,
}: TeamSelectorProps) {
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  if (coachTeams.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
        onClick={() => setTeamsExpanded((prev) => !prev)}
        type="button"
      >
        <span className="font-semibold text-gray-700 text-sm">
          {effectiveSelectedTeam === "all" || !effectiveSelectedTeam
            ? "All Teams"
            : `${coachTeams.find((t) => t.teamId === effectiveSelectedTeam)?.teamName ?? "All Teams"} · selected`}
        </span>
        {teamsExpanded ? (
          <ChevronUp className="text-gray-500" size={18} />
        ) : (
          <ChevronDown className="text-gray-500" size={18} />
        )}
      </button>
      {teamsExpanded && (
        <div
          className={`grid gap-3 md:gap-4 ${coachTeams.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}
        >
          {coachTeams.length > 1 && (
            <Card
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                effectiveSelectedTeam === "all" ? "ring-2 ring-green-500" : ""
              }`}
              onClick={() => onSelect("all")}
              style={{
                backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                borderColor: "rgba(var(--org-primary-rgb), 0.25)",
              }}
            >
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-gray-800 text-sm leading-tight">
                    All Teams
                  </p>
                  <div className="ml-2 shrink-0 text-right">
                    <p className="font-bold text-gray-800 text-sm leading-tight">
                      {coachTeams.reduce(
                        (sum, t) =>
                          sum + (playerCountByTeam.get(t.teamId) ?? 0),
                        0
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">players</p>
                  </div>
                </div>
                <p className="mb-1.5 text-gray-500 text-xs">
                  {coachTeams.length} teams
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    className="bg-blue-100 text-blue-700"
                    title="Total Insights"
                  >
                    <Lightbulb className="h-3 w-3" />
                    <span className="ml-0.5">
                      {Array.from(insightsByTeam.values()).reduce(
                        (s, v) => s + v.total,
                        0
                      )}
                    </span>
                  </Badge>
                  <Badge
                    className="bg-purple-100 text-purple-700"
                    title="Voice Notes"
                  >
                    <Mic className="h-3 w-3" />
                    <span className="ml-0.5">
                      {Array.from(insightsByTeam.values()).reduce(
                        (s, v) => s + v.voiceNote,
                        0
                      )}
                    </span>
                  </Badge>
                  <Badge
                    className="bg-green-100 text-green-700"
                    title="AI Generated"
                  >
                    <Brain className="h-3 w-3" />
                    <span className="ml-0.5">
                      {Array.from(insightsByTeam.values()).reduce(
                        (s, v) => s + v.aiGenerated,
                        0
                      )}
                    </span>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          {coachTeams.map((team) => {
            const isSelected = effectiveSelectedTeam === team.teamId;
            const playerCount = playerCountByTeam.get(team.teamId) ?? 0;
            const ageMeta = [team.ageGroup, team.gender]
              .filter(Boolean)
              .join(" • ");
            const ins = insightsByTeam.get(team.teamId) ?? {
              total: 0,
              voiceNote: 0,
              aiGenerated: 0,
            };
            return (
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  isSelected ? "ring-2 ring-green-500" : ""
                }`}
                key={team.teamId}
                onClick={() => onSelect(team.teamId)}
                style={{
                  backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                  borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                }}
              >
                <CardContent className="p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-semibold text-gray-800 text-sm leading-tight"
                        title={team.teamName}
                      >
                        {team.teamName}
                      </p>
                      {ageMeta && (
                        <p className="text-gray-500 text-xs">{ageMeta}</p>
                      )}
                    </div>
                    <div className="ml-2 shrink-0 text-right">
                      <p className="font-bold text-gray-800 text-sm leading-tight">
                        {playerCount}
                      </p>
                      <p className="text-gray-500 text-xs">players</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      className="bg-blue-100 text-blue-700"
                      title="Total Insights"
                    >
                      <Lightbulb className="h-3 w-3" />
                      <span className="ml-0.5">{ins.total}</span>
                    </Badge>
                    <Badge
                      className="bg-purple-100 text-purple-700"
                      title="Voice Notes"
                    >
                      <Mic className="h-3 w-3" />
                      <span className="ml-0.5">{ins.voiceNote}</span>
                    </Badge>
                    <Badge
                      className="bg-green-100 text-green-700"
                      title="AI Generated"
                    >
                      <Brain className="h-3 w-3" />
                      <span className="ml-0.5">{ins.aiGenerated}</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function emptyInsightTitle(typeFilter: TypeFilter): string {
  if (typeFilter === "all") {
    return "No insights yet";
  }
  if (typeFilter === "voice-note") {
    return "No voice note insights";
  }
  if (typeFilter === "ai-generated") {
    return "No AI generated insights";
  }
  return "No manual insights";
}

type InsightsListProps = {
  paginatedResult: unknown;
  filteredInsights: Insight[];
  typeFilter: TypeFilter;
  isDone: boolean;
  isLoadingMore: boolean;
  userId: string | undefined;
  onInsightClick: (insight: Insight) => void;
  onLoadMore: () => void;
};

function InsightsList({
  paginatedResult,
  filteredInsights,
  typeFilter,
  isDone,
  isLoadingMore,
  userId,
  onInsightClick,
  onLoadMore,
}: InsightsListProps) {
  if (paginatedResult === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            className="h-24 w-full animate-pulse rounded-lg bg-muted"
            key={n}
          />
        ))}
      </div>
    );
  }

  if (filteredInsights.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Lightbulb className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{emptyInsightTitle(typeFilter)}</EmptyTitle>
              <EmptyDescription>
                {typeFilter === "all"
                  ? "Generate AI insights from voice notes or add manual insights to track team patterns."
                  : "Try a different filter or generate new insights."}
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {filteredInsights.map((insight) => (
        <InsightCard
          insight={insight}
          isUnread={userId ? !insight.readBy.includes(userId) : false}
          key={insight._id}
          onClick={() => onInsightClick(insight)}
        />
      ))}
      {!isDone && (
        <div className="flex justify-center pt-2">
          <Button
            disabled={isLoadingMore}
            onClick={onLoadMore}
            variant="outline"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TeamInsightsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as BetterAuthId<"organization">;
  const { data: session } = authClient.useSession();
  const user = useCurrentUser();

  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Pagination state
  const [paginatedInsights, setPaginatedInsights] = useState<Insight[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const userId = session?.user?.id;

  // Get coach assignments with enriched team data
  const coachAssignment = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get team player links for player counts on team cards
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

  // Coach's teams (filtered/deduplicated)
  const coachTeams = useMemo(() => {
    if (!coachAssignment?.teams) {
      return [];
    }
    const seen = new Set<string>();
    return coachAssignment.teams.filter((team) => {
      if (!team.teamId) {
        return false;
      }
      if (team.teamId.includes("players")) {
        return false;
      }
      if (seen.has(team.teamId)) {
        return false;
      }
      seen.add(team.teamId);
      return true;
    });
  }, [coachAssignment?.teams]);

  // Auto-select single team
  const effectiveSelectedTeam = useMemo(() => {
    if (coachTeams.length === 1) {
      return coachTeams[0].teamId;
    }
    return selectedTeam;
  }, [coachTeams, selectedTeam]);

  // Player count per team
  const playerCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (!teamPlayerLinks) {
      return counts;
    }
    for (const link of teamPlayerLinks) {
      counts.set(link.teamId, (counts.get(link.teamId) ?? 0) + 1);
    }
    return counts;
  }, [teamPlayerLinks]);

  // Insight counts per team for card badges
  const allTeamIds = useMemo(
    () => coachTeams.map((t) => t.teamId),
    [coachTeams]
  );

  const insightCountsRaw = useQuery(
    api.models.teams.getInsightsCountByTeam,
    orgId && allTeamIds.length > 0
      ? { teamIds: allTeamIds, organizationId: orgId }
      : "skip"
  );

  const insightsByTeam = useMemo(() => {
    const map = new Map<
      string,
      { total: number; voiceNote: number; aiGenerated: number }
    >();
    for (const row of insightCountsRaw ?? []) {
      map.set(row.teamId, {
        total: row.total,
        voiceNote: row.voiceNote,
        aiGenerated: row.aiGenerated,
      });
    }
    return map;
  }, [insightCountsRaw]);

  // Determine if we have a specific team selected
  const activeTeamId =
    effectiveSelectedTeam !== "all" ? effectiveSelectedTeam : null;

  // Fetch insights for selected team (paginated)
  const paginatedResult = useQuery(
    api.models.teams.getTeamInsights,
    activeTeamId && orgId
      ? {
          teamId: activeTeamId,
          organizationId: orgId,
          paginationOpts: { cursor: null, numItems: 50 },
        }
      : "skip"
  );

  // Load more query
  const loadMoreQuery = useQuery(
    api.models.teams.getTeamInsights,
    isLoadingMore && cursor && activeTeamId && orgId
      ? {
          teamId: activeTeamId,
          organizationId: orgId,
          paginationOpts: { cursor, numItems: 50 },
        }
      : "skip"
  );

  // Actions / mutations
  const generateInsights = useAction(
    api.actions.teamInsights.generateInsightsFromVoiceNotes
  );
  const markAsRead = useMutation(api.models.teams.markInsightAsRead);

  // Reset paginated list when team changes
  useEffect(() => {
    setPaginatedInsights([]);
    setCursor(null);
    setIsDone(false);
    setTypeFilter("all");
  }, []);

  // Initialize first page
  useEffect(() => {
    if (
      paginatedResult &&
      typeof paginatedResult === "object" &&
      "page" in paginatedResult
    ) {
      setPaginatedInsights(paginatedResult.page as Insight[]);
      setCursor(paginatedResult.continueCursor);
      setIsDone(paginatedResult.isDone);
    }
  }, [paginatedResult]);

  // Handle load more result
  useEffect(() => {
    if (
      isLoadingMore &&
      loadMoreQuery &&
      typeof loadMoreQuery === "object" &&
      "page" in loadMoreQuery
    ) {
      setPaginatedInsights((prev) => [
        ...prev,
        ...(loadMoreQuery.page as Insight[]),
      ]);
      setCursor(loadMoreQuery.continueCursor);
      setIsDone(loadMoreQuery.isDone);
      setIsLoadingMore(false);
    }
  }, [loadMoreQuery, isLoadingMore]);

  const handleLoadMore = () => {
    if (!(isLoadingMore || isDone) && cursor) {
      setIsLoadingMore(true);
    }
  };

  const handleGenerateInsights = async () => {
    if (!(user && activeTeamId && orgId)) {
      return;
    }
    try {
      toast.loading("Generating insights...");
      const result = await generateInsights({
        teamId: activeTeamId,
        organizationId: orgId,
        userId: user._id,
        actorName: user.name || user.email || "Unknown",
      });
      toast.dismiss();
      toast.success(result.message);
    } catch {
      toast.dismiss();
      toast.error("Failed to generate insights");
    }
  };

  const handleInsightClick = async (insight: Insight) => {
    setSelectedInsight(insight);
    if (user && !insight.readBy.includes(user._id)) {
      try {
        await markAsRead({
          insightId: insight._id as Id<"teamInsights">,
          userId: user._id,
        });
      } catch {
        // silent
      }
    }
  };

  // Counts derived from loaded insights
  const voiceNoteCount = paginatedInsights.filter(
    (i) => i.type === "voice-note"
  ).length;
  const aiCount = paginatedInsights.filter(
    (i) => i.type === "ai-generated"
  ).length;
  const _manualCount = paginatedInsights.filter(
    (i) => i.type === "manual"
  ).length;

  // Apply type filter
  const filteredInsights =
    typeFilter === "all"
      ? paginatedInsights
      : paginatedInsights.filter((i) => i.type === typeFilter);

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <OrgThemedGradient className="rounded-lg p-4 shadow-md md:p-6">
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Lightbulb className="h-7 w-7 flex-shrink-0" />
            <div>
              <h1 className="font-bold text-xl md:text-2xl">Team Insights</h1>
              <p className="text-sm opacity-90">
                AI-generated and voice note insights for your teams
              </p>
            </div>
          </div>
          {activeTeamId && (
            <Button
              className="shrink-0 bg-white/20 text-white hover:bg-white/30"
              onClick={handleGenerateInsights}
              size="sm"
              variant="ghost"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </Button>
          )}
        </div>
      </OrgThemedGradient>

      {/* Insight stat cards */}
      <InsightStats
        aiCount={aiCount}
        onTypeFilterChange={setTypeFilter}
        totalCount={paginatedInsights.length}
        typeFilter={typeFilter}
        voiceNoteCount={voiceNoteCount}
      />

      {/* Team selector cards */}
      <TeamSelector
        coachTeams={coachTeams}
        effectiveSelectedTeam={effectiveSelectedTeam}
        insightsByTeam={insightsByTeam}
        onSelect={setSelectedTeam}
        playerCountByTeam={playerCountByTeam}
      />

      {/* Prompt to select a team (multi-team coaches, nothing selected) */}
      {!activeTeamId && coachTeams.length > 1 && (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Select a team</EmptyTitle>
                <EmptyDescription>
                  Choose a team above to view its insights.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      )}

      {/* Content for selected team */}
      {activeTeamId && (
        <>
          {/* Insights list */}
          <InsightsList
            filteredInsights={filteredInsights}
            isDone={isDone}
            isLoadingMore={isLoadingMore}
            onInsightClick={handleInsightClick}
            onLoadMore={handleLoadMore}
            paginatedResult={paginatedResult}
            typeFilter={typeFilter}
            userId={user?._id}
          />
        </>
      )}

      {/* Detail modal */}
      {selectedInsight && activeTeamId && (
        <InsightDetailModal
          insight={selectedInsight}
          isOpen={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
          organizationId={orgId}
          teamId={activeTeamId}
        />
      )}
    </div>
  );
}
