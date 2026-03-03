"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { FileText, Lightbulb, Mic, Sparkles, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type InsightControlsProps = {
  totalCount: number;
  voiceNoteCount: number;
  aiCount: number;
  manualCount: number;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
  onGenerate: () => void;
};

function InsightControls({
  totalCount,
  voiceNoteCount,
  aiCount,
  manualCount,
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
    {
      key: "manual" as TypeFilter,
      label: "Manual",
      icon: FileText,
      count: manualCount,
    },
  ] as const;

  return (
    <>
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Total Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              From Voice Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{voiceNoteCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">AI Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{aiCount}</div>
          </CardContent>
        </Card>
      </div>

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
  onSelect: (teamId: string) => void;
};

function TeamSelector({
  coachTeams,
  effectiveSelectedTeam,
  playerCountByTeam,
  onSelect,
}: TeamSelectorProps) {
  if (coachTeams.length === 0) {
    return null;
  }
  const gridClass =
    coachTeams.length === 1
      ? "max-w-sm grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {coachTeams.length > 1 && (
        <Card
          className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
            effectiveSelectedTeam === "all"
              ? "border-2 border-green-500 bg-green-50"
              : ""
          }`}
          onClick={() => onSelect("all")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg md:text-xl">All Teams</CardTitle>
                <p className="text-gray-600 text-xs md:text-sm">
                  {coachTeams.length} teams
                </p>
              </div>
              <Lightbulb className="ml-3 h-6 w-6 flex-shrink-0 text-green-600" />
            </div>
          </CardHeader>
        </Card>
      )}
      {coachTeams.map((team) => {
        const isSelected = effectiveSelectedTeam === team.teamId;
        const playerCount = playerCountByTeam.get(team.teamId) ?? 0;
        const meta = [team.ageGroup, team.gender, team.sportCode]
          .filter(Boolean)
          .join(" • ");
        return (
          <Card
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
              isSelected ? "border-2 border-green-500 bg-green-50" : ""
            }`}
            key={team.teamId}
            onClick={() => onSelect(team.teamId)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle
                    className="truncate text-lg md:text-xl"
                    title={team.teamName}
                  >
                    {team.teamName}
                  </CardTitle>
                  <p className="text-gray-600 text-xs md:text-sm">
                    {playerCount} Players
                  </p>
                </div>
                {meta && (
                  <p className="ml-3 flex-shrink-0 whitespace-nowrap text-gray-500 text-xs">
                    {meta}
                  </p>
                )}
              </div>
            </CardHeader>
          </Card>
        );
      })}
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
  const manualCount = paginatedInsights.filter(
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
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight sm:text-3xl">
          <Users className="h-7 w-7" />
          Team Insights
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          AI-generated, voice note, and manual insights for your teams
        </p>
      </div>

      {/* Team selector cards */}
      <TeamSelector
        coachTeams={coachTeams}
        effectiveSelectedTeam={effectiveSelectedTeam}
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
          <InsightControls
            aiCount={aiCount}
            manualCount={manualCount}
            onGenerate={handleGenerateInsights}
            onTypeFilterChange={setTypeFilter}
            totalCount={paginatedInsights.length}
            typeFilter={typeFilter}
            voiceNoteCount={voiceNoteCount}
          />

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
