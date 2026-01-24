"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  Bike,
  CheckCheck,
  Dumbbell,
  Filter,
  type LucideIcon,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParentSummaryCard } from "./parent-summary-card";

type CoachFeedbackEnhancedProps = {
  orgId: string;
};

// Sport icon mapping
const sportCodeToIcon: Record<string, LucideIcon> = {
  GAA: Trophy,
  soccer: Trophy,
  football: Trophy,
  basketball: Dumbbell,
  rugby: Trophy,
  cycling: Bike,
  athletics: Activity,
};

export function CoachFeedbackEnhanced({ orgId }: CoachFeedbackEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all"
  );

  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Mark summary as viewed mutation
  const markViewed = useMutation(
    api.models.coachParentSummaries.markSummaryViewed
  );

  // Acknowledge summary mutation
  const acknowledgeSummary = useMutation(
    api.models.coachParentSummaries.acknowledgeParentSummary
  );

  // Acknowledge all for player mutation
  const acknowledgeAllForPlayer = useMutation(
    api.models.coachParentSummaries.acknowledgeAllForPlayer
  );

  const getSportIcon = (sportCode?: string) => {
    if (!sportCode) {
      return Activity;
    }
    return sportCodeToIcon[sportCode.toLowerCase()] || Activity;
  };

  const handleViewSummary = async (summaryId: Id<"coachParentSummaries">) => {
    try {
      await markViewed({ summaryId, viewSource: "dashboard" });
    } catch (error) {
      console.error("Failed to mark summary as read:", error);
    }
  };

  const handleAcknowledgeSummary = async (
    summaryId: Id<"coachParentSummaries">
  ) => {
    try {
      await acknowledgeSummary({ summaryId });
    } catch (error) {
      console.error("Failed to acknowledge summary:", error);
      throw error;
    }
  };

  const handleMarkAllAsRead = async (
    playerIdentityId: Id<"playerIdentities">
  ) => {
    try {
      const result = await acknowledgeAllForPlayer({
        playerIdentityId,
        organizationId: orgId,
      });
      toast.success(
        `Marked ${result.acknowledgedCount} message${result.acknowledgedCount !== 1 ? "s" : ""} as read`
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // Calculate stats and filter data
  const { filteredData, stats, childOptions } = useMemo(() => {
    if (!summariesData) {
      return {
        filteredData: [],
        stats: { total: 0, unread: 0, children: 0 },
        childOptions: [],
      };
    }

    // Build child options for filter dropdown
    const options = summariesData.map((child) => ({
      value: child.player._id,
      label: `${child.player.firstName} ${child.player.lastName}`,
    }));

    // Flatten all summaries for filtering
    const allSummaries = summariesData.flatMap((child) =>
      child.sportGroups.flatMap((sportGroup) =>
        sportGroup.summaries.map((summary) => ({
          summary,
          child,
          sportGroup,
        }))
      )
    );

    // Calculate stats
    const totalSummaries = allSummaries.length;
    const unreadSummaries = allSummaries.filter(
      (item) => !item.summary.acknowledgedAt
    ).length;

    // Apply filters
    let filtered = summariesData;

    // Filter by child
    if (selectedChild !== "all") {
      filtered = filtered.filter((child) => child.player._id === selectedChild);
    }

    // Filter each child's summaries by read status and search
    filtered = filtered
      .map((child) => ({
        ...child,
        sportGroups: child.sportGroups
          .map((sportGroup) => ({
            ...sportGroup,
            summaries: sportGroup.summaries.filter((summary) => {
              // Read filter
              if (readFilter === "unread" && summary.acknowledgedAt) {
                return false;
              }
              if (readFilter === "read" && !summary.acknowledgedAt) {
                return false;
              }

              // Search filter
              if (searchQuery.trim()) {
                const searchLower = searchQuery.toLowerCase();
                const content = summary.publicSummary.content.toLowerCase();
                const coachName = summary.coachName?.toLowerCase() || "";
                const category =
                  summary.privateInsight?.category.toLowerCase() || "";

                return (
                  content.includes(searchLower) ||
                  coachName.includes(searchLower) ||
                  category.includes(searchLower)
                );
              }

              return true;
            }),
          }))
          .filter((sportGroup) => sportGroup.summaries.length > 0),
      }))
      .filter((child) => child.sportGroups.length > 0);

    return {
      filteredData: filtered,
      stats: {
        total: totalSummaries,
        unread: unreadSummaries,
        children: summariesData.length,
      },
      childOptions: options,
    };
  }, [summariesData, selectedChild, readFilter, searchQuery]);

  const hasSummaries = summariesData && summariesData.length > 0;
  const hasFilteredResults = filteredData.length > 0;
  const hasActiveFilters =
    searchQuery.trim() || selectedChild !== "all" || readFilter !== "all";

  if (!hasSummaries) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Messages</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread Messages</CardDescription>
            <CardTitle className="text-3xl">
              {stats.unread}
              {stats.unread > 0 && (
                <Badge className="ml-2 bg-red-500" variant="default">
                  NEW
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Children</CardDescription>
            <CardTitle className="text-3xl">{stats.children}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI Coach Summaries
              </CardTitle>
              <CardDescription>
                AI-generated summaries from your coach's voice notes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, coaches, or categories..."
                value={searchQuery}
              />
              {searchQuery && (
                <Button
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Child Filter */}
            <Select onValueChange={setSelectedChild} value={selectedChild}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Children" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Children</SelectItem>
                {childOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Read Status Filter */}
            <Select
              onValueChange={(value) =>
                setReadFilter(value as "all" | "unread" | "read")
              }
              value={readFilter}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Messages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Active filters:
              </span>
              {searchQuery.trim() && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                  <button
                    className="ml-1"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedChild !== "all" && (
                <Badge variant="secondary">
                  {childOptions.find((o) => o.value === selectedChild)?.label}
                  <button
                    className="ml-1"
                    onClick={() => setSelectedChild("all")}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {readFilter !== "all" && (
                <Badge variant="secondary">
                  {readFilter === "unread" ? "Unread" : "Read"}
                  <button
                    className="ml-1"
                    onClick={() => setReadFilter("all")}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedChild("all");
                  setReadFilter("all");
                }}
                size="sm"
                variant="ghost"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {!hasFilteredResults && hasActiveFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No messages found matching your filters.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setSelectedChild("all");
                setReadFilter("all");
              }}
              variant="outline"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredData.map((childData) => {
            const unreadCount = childData.sportGroups.reduce(
              (sum, sg) =>
                sum + sg.summaries.filter((s) => !s.acknowledgedAt).length,
              0
            );

            return (
              <Card key={childData.player._id}>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {childData.player.firstName} {childData.player.lastName}
                      </CardTitle>
                      <CardDescription>
                        {childData.sportGroups.length} sport
                        {childData.sportGroups.length !== 1 ? "s" : ""} •{" "}
                        {childData.sportGroups.reduce(
                          (sum, sg) => sum + sg.summaries.length,
                          0
                        )}{" "}
                        message
                        {childData.sportGroups.reduce(
                          (sum, sg) => sum + sg.summaries.length,
                          0
                        ) !== 1
                          ? "s"
                          : ""}
                        {unreadCount > 0 && (
                          <>
                            {" "}
                            •{" "}
                            <span className="font-medium text-red-600">
                              {unreadCount} unread
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        onClick={() =>
                          handleMarkAllAsRead(childData.player._id)
                        }
                        size="sm"
                        variant="outline"
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All as Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {childData.sportGroups.map((sportGroup) => (
                    <div
                      key={sportGroup.sport?._id || `sport-${Math.random()}`}
                    >
                      {/* Sport header */}
                      {sportGroup.sport && (
                        <h4 className="mb-3 flex items-center gap-2 font-medium text-sm">
                          {(() => {
                            const SportIcon = getSportIcon(
                              sportGroup.sport.code
                            );
                            return <SportIcon className="h-4 w-4" />;
                          })()}
                          {sportGroup.sport.name}
                          {sportGroup.summaries.filter((s) => !s.acknowledgedAt)
                            .length > 0 && (
                            <Badge variant="destructive">
                              {
                                sportGroup.summaries.filter(
                                  (s) => !s.acknowledgedAt
                                ).length
                              }
                            </Badge>
                          )}
                        </h4>
                      )}

                      {/* Summary cards */}
                      <div className="space-y-3">
                        {sportGroup.summaries.map((summary) => (
                          <ParentSummaryCard
                            isUnread={!summary.acknowledgedAt}
                            key={summary._id}
                            onAcknowledge={handleAcknowledgeSummary}
                            onView={handleViewSummary}
                            summary={summary}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
