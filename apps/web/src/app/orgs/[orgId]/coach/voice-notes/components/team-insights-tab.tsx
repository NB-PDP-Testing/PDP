"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  Lightbulb,
  Loader2,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const { useSession } = authClient;

// Format date as "Mon Jan 22, 10:30 PM"
function formatDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TeamInsightsTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function TeamInsightsTab({
  orgId,
  onSuccess,
  onError,
}: TeamInsightsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplied, setShowApplied] = useState(false);
  const { data: session } = useSession();

  // Get coach ID from session
  const coachId = session?.user?.userId || session?.user?.id;

  // Get team insights - notes from coaches on my teams
  const teamNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesForCoachTeams,
    coachId ? { orgId, coachId } : "skip"
  );

  const updateInsightStatus = useMutation(
    api.models.voiceNotes.updateInsightStatus
  );

  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());

  const handleApplyInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    const key = `${noteId}-${insightId}`;
    setApplyingIds((prev) => new Set(prev).add(key));

    try {
      await updateInsightStatus({
        noteId,
        insightId,
        status: "applied",
      });
      onSuccess("Insight applied to player profile");
    } catch (error) {
      console.error("Failed to apply insight:", error);
      onError("Failed to apply insight");
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDismissInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    const key = `${noteId}-${insightId}`;
    setApplyingIds((prev) => new Set(prev).add(key));

    try {
      await updateInsightStatus({
        noteId,
        insightId,
        status: "dismissed",
      });
      onSuccess("Insight dismissed");
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      onError("Failed to dismiss insight");
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Filter and group insights
  const filteredNotes = teamNotes?.filter((note: any) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCoach = note.coachName.toLowerCase().includes(query);
      const matchesSummary = note.summary?.toLowerCase().includes(query);
      const matchesInsight = note.insights.some(
        (i: any) =>
          i.title.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query) ||
          i.playerName?.toLowerCase().includes(query)
      );
      if (!(matchesCoach || matchesSummary || matchesInsight)) {
        return false;
      }
    }

    // Show applied toggle
    if (!showApplied) {
      // Only show notes that have at least one pending insight
      return note.insights.some((i: any) => i.status === "pending");
    }

    return true;
  });

  // Group insights by player for easier viewing
  const insightsByPlayer = new Map<
    string,
    Array<{
      noteId: Id<"voiceNotes">;
      insight: any;
      coachName: string;
      date: string;
      type: string;
    }>
  >();

  if (filteredNotes) {
    for (const note of filteredNotes) {
      for (const insight of note.insights) {
        if (!insight.playerIdentityId) {
          continue; // Skip non-player insights
        }
        if (!showApplied && insight.status !== "pending") {
          continue; // Skip applied if toggle off
        }

        const playerKey = insight.playerName || "Unknown Player";
        if (!insightsByPlayer.has(playerKey)) {
          insightsByPlayer.set(playerKey, []);
        }

        insightsByPlayer.get(playerKey)?.push({
          noteId: note._id,
          insight,
          coachName: note.coachName,
          date: note.date,
          type: note.type,
        });
      }
    }
  }

  const isLoading = teamNotes === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5" />
              Team Insights
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Player insights from coaches on your teams
            </CardDescription>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-3 space-y-2 sm:mt-4">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
            <Input
              className="pr-9 pl-9 text-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players, coaches, or insights..."
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Toggle for showing applied insights */}
          <div className="flex items-center gap-2">
            <button
              className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                showApplied
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setShowApplied(!showApplied)}
              type="button"
            >
              {showApplied ? "Showing all" : "Pending only"}
            </button>
            {searchQuery && (
              <button
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-500 text-xs hover:bg-gray-200"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {insightsByPlayer.size === 0 ? (
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {teamNotes?.length === 0
                  ? "No team insights yet"
                  : "No matching insights"}
              </EmptyTitle>
              <EmptyDescription>
                {teamNotes?.length === 0
                  ? "Insights from coaches on your teams will appear here"
                  : "Try adjusting your search or filters"}
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-4">
            {Array.from(insightsByPlayer.entries()).map(
              ([playerName, playerInsights]) => (
                <div
                  className="rounded-lg border-2 border-gray-200 p-4"
                  key={playerName}
                >
                  {/* Player header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 text-sm">
                      {playerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {playerName}
                      </h3>
                      <p className="text-gray-500 text-xs">
                        {playerInsights.length} insight
                        {playerInsights.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Insights for this player */}
                  <div className="space-y-3">
                    {playerInsights.map(
                      ({ noteId, insight, coachName, date, type }) => {
                        const key = `${noteId}-${insight.id}`;
                        const isProcessing = applyingIds.has(key);

                        return (
                          <div
                            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                            key={key}
                          >
                            {/* Coach attribution and metadata */}
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-gray-600 text-xs">
                              <Badge className="text-xs" variant="outline">
                                {coachName}
                              </Badge>
                              <span>•</span>
                              <span>{formatDate(date)}</span>
                              <span>•</span>
                              <Badge className="text-xs" variant="secondary">
                                {type}
                              </Badge>
                              {insight.category && (
                                <>
                                  <span>•</span>
                                  <Badge className="text-xs" variant="outline">
                                    {insight.category.replace("_", " ")}
                                  </Badge>
                                </>
                              )}
                            </div>

                            {/* Insight content */}
                            <div className="mb-2">
                              <h4 className="mb-1 font-medium text-gray-900 text-sm">
                                {insight.title}
                              </h4>
                              <p className="text-gray-700 text-sm">
                                {insight.description}
                              </p>
                              {insight.recommendedUpdate && (
                                <div className="mt-2 rounded border-blue-200 border-l-4 bg-blue-50 p-2">
                                  <p className="flex items-start gap-1.5 text-blue-900 text-xs">
                                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{insight.recommendedUpdate}</span>
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {insight.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleApplyInsight(noteId, insight.id)
                                  }
                                  size="sm"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Apply to Profile
                                </Button>
                                <Button
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleDismissInsight(noteId, insight.id)
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Dismiss
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                className="text-xs"
                                variant={
                                  insight.status === "applied"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {insight.status === "applied" && "✓ "}
                                {insight.status === "dismissed" && "✗ "}
                                {insight.status.charAt(0).toUpperCase() +
                                  insight.status.slice(1)}
                              </Badge>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
