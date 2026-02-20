"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useCurrentUser } from "@/hooks/use-current-user";
import { InsightCard } from "./insight-card";
import { InsightDetailModal } from "./insight-detail-modal";
import { InsightFilters } from "./insight-filters";

type InsightsTabProps = {
  teamId: string;
  organizationId: string;
};

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
type TopicFilter =
  | "all"
  | "technical"
  | "tactical"
  | "fitness"
  | "behavioral"
  | "other";
type SortOption = "newest" | "oldest" | "priority";

export function InsightsTab({ teamId, organizationId }: InsightsTabProps) {
  const user = useCurrentUser();

  // Filter state
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  // Pagination state
  const [paginatedInsights, setPaginatedInsights] = useState<Insight[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Detail modal state
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Initial paginated query
  const paginatedResult = useQuery(api.models.teams.getTeamInsights, {
    teamId,
    organizationId,
    paginationOpts: {
      cursor: null,
      numItems: 50,
    },
  });

  // Load more query
  const loadMoreQuery = useQuery(
    api.models.teams.getTeamInsights,
    isLoadingMore && cursor
      ? {
          teamId,
          organizationId,
          paginationOpts: {
            cursor,
            numItems: 50,
          },
        }
      : "skip"
  );

  // Generate insights action
  const generateInsights = useAction(
    api.actions.teamInsights.generateInsightsFromVoiceNotes
  );

  // Mark as read mutation
  const markAsRead = useMutation(api.models.teams.markInsightAsRead);

  // Initialize paginated insights when first page loads
  useEffect(() => {
    if (
      paginatedResult &&
      typeof paginatedResult === "object" &&
      "page" in paginatedResult
    ) {
      setPaginatedInsights(paginatedResult.page);
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
      setPaginatedInsights((prev) => [...prev, ...loadMoreQuery.page]);
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
    if (!user) return;

    try {
      toast.loading("Generating insights...");
      const result = await generateInsights({
        teamId,
        organizationId,
        userId: user._id,
        actorName: user.name || user.email || "Unknown",
      });
      toast.dismiss();
      toast.success(result.message);
      // Refresh will happen automatically via Convex reactivity
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate insights");
      console.error(error);
    }
  };

  const handleInsightClick = async (insight: Insight) => {
    setSelectedInsight(insight);

    // Mark as read if user hasn't read it yet
    if (user && !insight.readBy.includes(user._id)) {
      try {
        await markAsRead({
          insightId: insight._id as Id<"teamInsights">,
          userId: user._id,
        });
      } catch (error) {
        console.error("Failed to mark insight as read:", error);
      }
    }
  };

  // Loading state
  if (!paginatedResult) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        <ListSkeleton items={5} />
      </div>
    );
  }

  // Apply filters and sorting
  let filteredInsights = paginatedInsights;

  // Type filter
  if (typeFilter !== "all") {
    filteredInsights = filteredInsights.filter((i) => i.type === typeFilter);
  }

  // Topic filter
  if (topicFilter !== "all") {
    filteredInsights = filteredInsights.filter((i) => i.topic === topicFilter);
  }

  // Player filter
  if (selectedPlayerId !== "all") {
    filteredInsights = filteredInsights.filter((i) =>
      i.playerIds.includes(selectedPlayerId)
    );
  }

  // Sort
  filteredInsights = [...filteredInsights].sort((a, b) => {
    if (sortBy === "newest") {
      return b.createdAt - a.createdAt;
    }
    if (sortBy === "oldest") {
      return a.createdAt - b.createdAt;
    }
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return 0;
  });

  // Get unique player IDs for filter dropdown
  const allPlayerIds = Array.from(
    new Set(paginatedInsights.flatMap((i) => i.playerIds))
  );

  // Empty state
  if (paginatedInsights.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleGenerateInsights}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Insights
          </Button>
        </div>
        <Empty>
          <EmptyMedia>
            <Lightbulb className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No Insights Yet</EmptyTitle>
            <EmptyDescription>
              Generate AI insights from voice notes or add manual insights to
              track patterns and observations.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <InsightFilters
          insights={paginatedInsights}
          onPlayerFilterChange={setSelectedPlayerId}
          onSortByChange={setSortBy}
          onTopicFilterChange={setTopicFilter}
          onTypeFilterChange={setTypeFilter}
          playerIds={allPlayerIds}
          selectedPlayerId={selectedPlayerId}
          sortBy={sortBy}
          topicFilter={topicFilter}
          typeFilter={typeFilter}
        />
        <Button onClick={handleGenerateInsights}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Insights
        </Button>
      </div>

      {/* Insights List */}
      {filteredInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No insights match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInsights.map((insight) => (
            <InsightCard
              insight={insight}
              isUnread={user ? !insight.readBy.includes(user._id) : false}
              key={insight._id}
              onClick={() => handleInsightClick(insight)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!isDone && filteredInsights.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            disabled={isLoadingMore}
            onClick={handleLoadMore}
            variant="outline"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInsight && (
        <InsightDetailModal
          insight={selectedInsight}
          isOpen={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
          organizationId={organizationId}
          teamId={teamId}
        />
      )}
    </div>
  );
}
