"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  Loader2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightCard } from "./insight-card";

type VoiceNote = {
  _id: Id<"voiceNotes">;
  _creationTime: number;
  orgId: string;
  coachId?: string;
  coachName: string;
  date: string;
  type: "training" | "match" | "general";
  transcription?: string;
  transcriptionStatus?: "pending" | "processing" | "completed" | "failed";
  insights: Array<{
    id: string;
    playerIdentityId?: Id<"playerIdentities">;
    playerName?: string;
    title: string;
    description: string;
    category?: string;
    recommendedUpdate?: string;
    status: "pending" | "applied" | "dismissed" | "auto_applied";
    appliedDate?: string;
  }>;
  insightsStatus?:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "awaiting_confirmation"
    | "cancelled";
};

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
  isCoach?: boolean;
  isParent?: boolean;
  isAdmin?: boolean;
};

type ViewMode = "detailed" | "compact";
type GroupBy = "date" | "category" | "status";

export function VoiceInsightsSectionImproved({
  playerIdentityId,
  orgId,
  isCoach = false,
  isParent = false,
  isAdmin = false,
}: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  const [_groupBy, _setGroupBy] = useState<GroupBy>("date");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(
    new Set()
  );

  // Query voice notes for this player
  const voiceNotes = useQuery(api.models.voiceNotes.getVoiceNotesForPlayer, {
    orgId,
    playerIdentityId,
  });

  // Query parent summaries to check which insights have been shared
  const parentSummaries = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Determine permissions
  const canSeeTranscriptions = isCoach || isAdmin;
  const canSeeAllInsights = isCoach || isAdmin;

  // Filter insights based on permissions
  const filteredNotes = useMemo(() => {
    if (!voiceNotes) {
      return [];
    }

    const filtered: VoiceNote[] = [];

    for (const note of voiceNotes) {
      // Filter insights based on role
      const filteredInsights = note.insights.filter((insight) => {
        // Check if this insight is for this player
        if (insight.playerIdentityId !== playerIdentityId) {
          return false;
        }

        // Parents can only see applied insights
        if (isParent && insight.status !== "applied") {
          return false;
        }

        // Coaches and admins see everything
        return true;
      });

      // Only include notes that have insights after filtering
      if (filteredInsights.length > 0) {
        filtered.push({
          ...note,
          insights: filteredInsights,
        });
      }
    }

    return filtered;
  }, [voiceNotes, playerIdentityId, isParent]);

  // Apply search and filters
  const searchedAndFilteredNotes = useMemo(() => {
    let results = filteredNotes;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results
        .map((note) => ({
          ...note,
          insights: note.insights.filter(
            (insight) =>
              insight.title.toLowerCase().includes(query) ||
              insight.description.toLowerCase().includes(query) ||
              insight.recommendedUpdate?.toLowerCase().includes(query) ||
              note.transcription?.toLowerCase().includes(query)
          ),
        }))
        .filter((note) => note.insights.length > 0);
    }

    // Category filter
    if (filterCategory !== "all") {
      results = results
        .map((note) => ({
          ...note,
          insights: note.insights.filter(
            (insight) => insight.category === filterCategory
          ),
        }))
        .filter((note) => note.insights.length > 0);
    }

    // Status filter
    if (filterStatus !== "all") {
      results = results
        .map((note) => ({
          ...note,
          insights: note.insights.filter(
            (insight) => insight.status === filterStatus
          ),
        }))
        .filter((note) => note.insights.length > 0);
    }

    return results;
  }, [filteredNotes, searchQuery, filterCategory, filterStatus]);

  // Group insights by coach
  const _insightsByCoach = useMemo(() => {
    const grouped = new Map<
      string,
      {
        coachId: string;
        coachName: string;
        notes: VoiceNote[];
      }
    >();

    for (const note of searchedAndFilteredNotes) {
      const coachId = note.coachId || "unknown";
      const coachName = note.coachName || "Unknown Coach";

      if (!grouped.has(coachId)) {
        grouped.set(coachId, {
          coachId,
          coachName,
          notes: [],
        });
      }

      const coachGroup = grouped.get(coachId);
      if (coachGroup) {
        coachGroup.notes.push(note);
      }
    }

    // Sort coaches by most recent note
    return Array.from(grouped.values()).sort((a, b) => {
      const aLatest = Math.max(...a.notes.map((n) => n._creationTime));
      const bLatest = Math.max(...b.notes.map((n) => n._creationTime));
      return bLatest - aLatest;
    });
  }, [searchedAndFilteredNotes]);

  // Count total insights
  const totalInsights = useMemo(
    () =>
      searchedAndFilteredNotes.reduce(
        (sum, note) => sum + note.insights.length,
        0
      ),
    [searchedAndFilteredNotes]
  );

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const note of filteredNotes) {
      for (const insight of note.insights) {
        if (insight.category) {
          cats.add(insight.category);
        }
      }
    }
    return Array.from(cats).sort();
  }, [filteredNotes]);

  // Calculate stats
  const stats = useMemo(() => {
    let applied = 0;
    let pending = 0;
    let dismissed = 0;

    for (const note of filteredNotes) {
      for (const insight of note.insights) {
        if (insight.status === "applied") {
          applied += 1;
        }
        if (insight.status === "pending") {
          pending += 1;
        }
        if (insight.status === "dismissed") {
          dismissed += 1;
        }
      }
    }

    return {
      applied,
      pending,
      dismissed,
      total: applied + pending + dismissed,
    };
  }, [filteredNotes]);

  // Check if insight has parent summary
  const getParentSummaryStatus = (
    insightId: string
  ): { hasParentSummary: boolean; parentSummaryApproved: boolean } => {
    if (!parentSummaries) {
      return { hasParentSummary: false, parentSummaryApproved: false };
    }

    // Find the summary for this insight
    for (const child of parentSummaries) {
      for (const sportGroup of child.sportGroups) {
        for (const summary of sportGroup.summaries) {
          if (summary.insightId === insightId) {
            return {
              hasParentSummary: true,
              parentSummaryApproved:
                summary.status === "approved" || summary.status === "delivered",
            };
          }
        }
      }
    }

    return { hasParentSummary: false, parentSummaryApproved: false };
  };

  // Navigate to voice notes tab
  const handleViewInVoiceNotes = (noteId: string) => {
    router.push(
      `/orgs/${orgId}/coach/voice-notes?noteId=${noteId}&highlight=true`
    );
  };

  // Toggle insight expansion
  const toggleInsight = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  // Expand/collapse all
  const expandAll = () => {
    const allIds = new Set<string>();
    for (const note of searchedAndFilteredNotes) {
      for (const insight of note.insights) {
        allIds.add(insight.id);
      }
    }
    setExpandedInsights(allIds);
  };

  const collapseAll = () => {
    setExpandedInsights(new Set());
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
  };

  const hasActiveFilters =
    searchQuery.trim() || filterCategory !== "all" || filterStatus !== "all";

  // Loading state
  if (voiceNotes === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voice Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (filteredNotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voice Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              {isParent
                ? "No insights have been shared yet."
                : "No insights recorded for this player yet."}
            </p>
            {isCoach && (
              <Button
                className="mt-4"
                onClick={() => router.push(`/orgs/${orgId}/coach/voice-notes`)}
                size="sm"
                variant="outline"
              >
                Create Voice Note
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render compact insight summary
  const renderCompactInsight = (
    insight: VoiceNote["insights"][0],
    note: VoiceNote
  ) => {
    const isInsightExpanded = expandedInsights.has(insight.id);
    const summaryStatus = getParentSummaryStatus(insight.id);

    return (
      <button
        className="w-full cursor-pointer rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
        key={insight.id}
        onClick={() => toggleInsight(insight.id)}
        type="button"
      >
        {/* Compact Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {insight.category && (
                <Badge
                  className="text-xs"
                  variant={
                    insight.category === "injury"
                      ? "destructive"
                      : insight.category === "behavior"
                        ? "secondary"
                        : "default"
                  }
                >
                  {insight.category.replace("_", " ")}
                </Badge>
              )}
              <Badge
                className="text-xs"
                variant={
                  insight.status === "applied"
                    ? "default"
                    : insight.status === "dismissed"
                      ? "outline"
                      : "secondary"
                }
              >
                {insight.status}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {new Date(note.date).toLocaleDateString()}
              </span>
            </div>
            <p className="line-clamp-1 font-medium text-sm">{insight.title}</p>
            <p className="text-muted-foreground text-xs">
              by {note.coachName || "Unknown Coach"}
            </p>
            {!isInsightExpanded && (
              <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
                {insight.description}
              </p>
            )}
          </div>
          {isInsightExpanded ? (
            <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
        </div>

        {/* Expanded Details */}
        {isInsightExpanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <InsightCard
              coachName={note.coachName}
              hasParentSummary={summaryStatus.hasParentSummary}
              insight={insight}
              noteDate={note.date}
              noteId={note._id}
              onViewInVoiceNotes={
                canSeeAllInsights
                  ? () => handleViewInVoiceNotes(note._id)
                  : undefined
              }
              orgId={orgId}
              parentSummaryApproved={summaryStatus.parentSummaryApproved}
              showTranscription={canSeeTranscriptions}
              transcription={note.transcription}
            />
          </div>
        )}
      </button>
    );
  };

  // Render insights list
  const renderInsightsList = () => {
    if (viewMode === "compact") {
      return (
        <div className="space-y-2">
          {searchedAndFilteredNotes.map((note) =>
            note.insights.map((insight) => renderCompactInsight(insight, note))
          )}
        </div>
      );
    }

    // Detailed view - full InsightCard
    return (
      <div className="space-y-3">
        {searchedAndFilteredNotes.map((note) =>
          note.insights.map((insight) => {
            const summaryStatus = getParentSummaryStatus(insight.id);
            return (
              <InsightCard
                coachName={note.coachName}
                hasParentSummary={summaryStatus.hasParentSummary}
                insight={insight}
                key={insight.id}
                noteDate={note.date}
                noteId={note._id}
                onViewInVoiceNotes={
                  canSeeAllInsights
                    ? () => handleViewInVoiceNotes(note._id)
                    : undefined
                }
                orgId={orgId}
                parentSummaryApproved={summaryStatus.parentSummaryApproved}
                showTranscription={canSeeTranscriptions}
                transcription={note.transcription}
              />
            );
          })
        )}
      </div>
    );
  };

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Voice Insights
                <Badge className="ml-2" variant="secondary">
                  {totalInsights}
                </Badge>
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Privacy Notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Privacy: Original voice transcriptions are visible to coaches
                only. Parents can see approved insights that have been shared
                with them.
              </AlertDescription>
            </Alert>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/30 p-2 text-center">
                <div className="font-bold text-lg">{stats.total}</div>
                <div className="text-muted-foreground text-xs">Total</div>
              </div>
              <div className="rounded-lg bg-green-50 p-2 text-center">
                <div className="font-bold text-green-700 text-lg">
                  {stats.applied}
                </div>
                <div className="text-muted-foreground text-xs">Applied</div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-2 text-center">
                <div className="font-bold text-lg text-yellow-700">
                  {stats.pending}
                </div>
                <div className="text-muted-foreground text-xs">Pending</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 text-center">
                <div className="font-bold text-gray-700 text-lg">
                  {stats.dismissed}
                </div>
                <div className="text-muted-foreground text-xs">Dismissed</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-9 pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search insights by keyword..."
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-3"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  onValueChange={setFilterCategory}
                  value={filterCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setFilterStatus} value={filterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(v) => setViewMode(v as ViewMode)}
                  value={viewMode}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button onClick={clearFilters} size="sm" variant="ghost">
                    Clear Filters
                  </Button>
                )}

                {viewMode === "compact" && (
                  <div className="ml-auto flex gap-1">
                    <Button onClick={expandAll} size="sm" variant="ghost">
                      Expand All
                    </Button>
                    <Button onClick={collapseAll} size="sm" variant="ghost">
                      Collapse All
                    </Button>
                  </div>
                )}
              </div>

              {/* Results count */}
              {hasActiveFilters && (
                <div className="text-muted-foreground text-sm">
                  Showing {totalInsights} of {stats.total} insights
                </div>
              )}
            </div>

            {/* Insights List */}
            {totalInsights === 0 ? (
              <div className="py-8 text-center">
                <Filter className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground text-sm">
                  No insights match your filters
                </p>
                <Button
                  className="mt-4"
                  onClick={clearFilters}
                  size="sm"
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              renderInsightsList()
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
