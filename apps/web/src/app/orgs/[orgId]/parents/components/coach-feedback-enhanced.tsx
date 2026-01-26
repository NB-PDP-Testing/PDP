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
import { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [viewMode, setViewMode] = useState<"all-messages" | "by-child">(
    "all-messages"
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
  const {
    newData,
    historyData,
    allMessagesNew,
    allMessagesHistory,
    stats,
    childOptions,
  } = useMemo(() => {
    if (!summariesData) {
      return {
        newData: [],
        historyData: [],
        allMessagesNew: [],
        allMessagesHistory: [],
        stats: { total: 0, unread: 0, read: 0, children: 0 },
        childOptions: [],
      };
    }

    // Build child options for filter dropdown
    const options = summariesData.map((child: any) => ({
      value: child.player._id,
      label: `${child.player.firstName} ${child.player.lastName}`,
    }));

    // Flatten all summaries for stats
    const allSummaries = summariesData.flatMap((child: any) =>
      child.sportGroups.flatMap((sportGroup: any) =>
        sportGroup.summaries.map((summary: any) => ({
          summary,
          child,
          sportGroup,
        }))
      )
    );

    // Calculate stats
    const totalSummaries = allSummaries.length;
    const unreadSummaries = allSummaries.filter(
      (item: any) => !item.summary.acknowledgedAt
    ).length;
    const readSummaries = totalSummaries - unreadSummaries;

    // Apply child filter
    let filtered = summariesData;
    if (selectedChild !== "all") {
      filtered = filtered.filter(
        (child: any) => child.player._id === selectedChild
      );
    }

    // Split into new (unacknowledged) and history (acknowledged)
    const splitData = (acknowledged: boolean) => {
      return filtered
        .map((child: any) => ({
          ...child,
          sportGroups: child.sportGroups
            .map((sportGroup: any) => ({
              ...sportGroup,
              summaries: sportGroup.summaries.filter((summary: any) => {
                // Filter by acknowledged status
                if (acknowledged && !summary.acknowledgedAt) {
                  return false;
                }
                if (!acknowledged && summary.acknowledgedAt) {
                  return false;
                }

                // Apply search filter
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
            .filter((sportGroup: any) => sportGroup.summaries.length > 0),
        }))
        .filter((child: any) => child.sportGroups.length > 0);
    };

    // Create flat lists for "All Messages" view (sorted newest to oldest)
    const createFlatList = (acknowledged: boolean) => {
      const flatList: any[] = [];

      // Apply child filter first
      let dataToProcess = summariesData;
      if (selectedChild !== "all") {
        dataToProcess = dataToProcess.filter(
          (child: any) => child.player._id === selectedChild
        );
      }

      // Flatten all summaries with metadata
      for (const child of dataToProcess) {
        for (const sportGroup of child.sportGroups) {
          for (const summary of sportGroup.summaries) {
            // Filter by acknowledged status
            if (acknowledged && !summary.acknowledgedAt) {
              continue;
            }
            if (!acknowledged && summary.acknowledgedAt) {
              continue;
            }

            // Apply search filter
            if (searchQuery.trim()) {
              const searchLower = searchQuery.toLowerCase();
              const content = summary.publicSummary.content.toLowerCase();
              const coachName = summary.coachName?.toLowerCase() || "";
              const category =
                summary.privateInsight?.category.toLowerCase() || "";

              if (
                !(
                  content.includes(searchLower) ||
                  coachName.includes(searchLower) ||
                  category.includes(searchLower)
                )
              ) {
                continue;
              }
            }

            flatList.push({
              summary,
              child,
              sportGroup,
              playerName: `${child.player.firstName} ${child.player.lastName}`,
              sportName: sportGroup.sport?.name || "Unknown Sport",
              sportCode: sportGroup.sport?.code,
            });
          }
        }
      }

      // Sort by creation time (newest first)
      flatList.sort(
        (a, b) => b.summary._creationTime - a.summary._creationTime
      );

      return flatList;
    };

    return {
      newData: splitData(false), // Unacknowledged (grouped by child)
      historyData: splitData(true), // Acknowledged (grouped by child)
      allMessagesNew: createFlatList(false), // Unacknowledged (flat list)
      allMessagesHistory: createFlatList(true), // Acknowledged (flat list)
      stats: {
        total: totalSummaries,
        unread: unreadSummaries,
        read: readSummaries,
        children: summariesData.length,
      },
      childOptions: options,
    };
  }, [summariesData, selectedChild, searchQuery]);

  // Auto-switch to history tab if no unread messages
  useEffect(() => {
    if (stats.unread === 0 && stats.read > 0 && activeTab === "new") {
      setActiveTab("history");
    }
  }, [stats.unread, stats.read, activeTab]);

  const hasSummaries = summariesData && summariesData.length > 0;
  const hasActiveFilters = searchQuery.trim() || selectedChild !== "all";

  if (!hasSummaries) {
    return null;
  }

  // Render flat list of all messages (newest to oldest)
  const renderAllMessages = (messages: typeof allMessagesNew) => {
    if (messages.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No messages found matching your filters."
              : activeTab === "new"
                ? "No new messages. Great job staying on top of feedback!"
                : "No message history yet."}
          </p>
          {hasActiveFilters && (
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setSelectedChild("all");
              }}
              variant="outline"
            >
              Clear filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {messages.map((item: any) => (
          <div className="space-y-1" key={item.summary._id}>
            {/* Child and sport header */}
            <div className="flex items-center gap-2 px-1 text-muted-foreground text-xs">
              <span className="truncate font-medium text-foreground">
                {item.playerName}
              </span>
              <span className="flex-shrink-0">•</span>
              <span className="flex flex-shrink-0 items-center gap-1">
                {(() => {
                  const SportIcon = getSportIcon(item.sportCode);
                  return <SportIcon className="h-3 w-3" />;
                })()}
                <span className="truncate">{item.sportName}</span>
              </span>
            </div>
            {/* Summary card */}
            <ParentSummaryCard
              isUnread={!item.summary.acknowledgedAt}
              onAcknowledge={handleAcknowledgeSummary}
              onView={handleViewSummary}
              summary={item.summary}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderChildCards = (
    data: typeof newData,
    showMarkAllButton: boolean
  ) => {
    if (data.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No messages found matching your filters."
              : activeTab === "new"
                ? "No new messages. Great job staying on top of feedback!"
                : "No message history yet."}
          </p>
          {hasActiveFilters && (
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setSelectedChild("all");
              }}
              variant="outline"
            >
              Clear filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((childData: any) => {
          const unreadCount = childData.sportGroups.reduce(
            (sum: any, sg: any) =>
              sum + sg.summaries.filter((s: any) => !s.acknowledgedAt).length,
            0
          );

          return (
            <Card key={childData.player._id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg sm:text-xl">
                      {childData.player.firstName} {childData.player.lastName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {childData.sportGroups.length} sport
                      {childData.sportGroups.length !== 1 ? "s" : ""} •{" "}
                      {childData.sportGroups.reduce(
                        (sum: any, sg: any) => sum + sg.summaries.length,
                        0
                      )}{" "}
                      message
                      {childData.sportGroups.reduce(
                        (sum: any, sg: any) => sum + sg.summaries.length,
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
                  {showMarkAllButton && unreadCount > 0 && (
                    <Button
                      className="flex-shrink-0"
                      onClick={() => handleMarkAllAsRead(childData.player._id)}
                      size="sm"
                      variant="outline"
                    >
                      <CheckCheck className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Mark All as Read</span>
                      <span className="sm:hidden">Mark All</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {childData.sportGroups.map((sportGroup: any) => (
                  <div key={sportGroup.sport?._id || `sport-${Math.random()}`}>
                    {/* Sport header */}
                    {sportGroup.sport && (
                      <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
                        {(() => {
                          const SportIcon = getSportIcon(sportGroup.sport.code);
                          return <SportIcon className="h-4 w-4" />;
                        })()}
                        {sportGroup.sport.name}
                        {showMarkAllButton &&
                          sportGroup.summaries.filter(
                            (s: any) => !s.acknowledgedAt
                          ).length > 0 && (
                            <Badge variant="destructive">
                              {
                                sportGroup.summaries.filter(
                                  (s: any) => !s.acknowledgedAt
                                ).length
                              }
                            </Badge>
                          )}
                      </h4>
                    )}

                    {/* Summary cards */}
                    <div className="space-y-2">
                      {sportGroup.summaries.map((summary: any) => (
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
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pt-3 pb-2">
            <CardDescription className="text-xs">
              Total Messages
            </CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pt-3 pb-2">
            <CardDescription className="text-xs">
              Unread Messages
            </CardDescription>
            <CardTitle className="text-2xl">
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
          <CardHeader className="pt-3 pb-2">
            <CardDescription className="text-xs">Children</CardDescription>
            <CardTitle className="text-2xl">{stats.children}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Unified Card with Tabs and Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI Coach Summaries
              </CardTitle>
              <CardDescription className="text-xs">
                AI-generated summaries from your coach's voice notes
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            onValueChange={(v) => setActiveTab(v as "new" | "history")}
            value={activeTab}
          >
            {/* Tabs */}
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="new">
                New
                {stats.unread > 0 && (
                  <Badge
                    className="ml-2 bg-red-500 text-white"
                    variant="default"
                  >
                    {stats.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                History
                {stats.read > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {stats.read}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* View Mode Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => setViewMode("all-messages")}
                  size="sm"
                  variant={viewMode === "all-messages" ? "default" : "outline"}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center sm:mr-2">
                    <svg
                      aria-label="List view"
                      className="h-4 w-4"
                      fill="none"
                      role="img"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 12h18M3 6h18M3 18h18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="hidden sm:inline">All Messages</span>
                  <span className="sm:hidden">All</span>
                </Button>
                <Button
                  onClick={() => setViewMode("by-child")}
                  size="sm"
                  variant={viewMode === "by-child" ? "default" : "outline"}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center sm:mr-2">
                    <svg
                      aria-label="Grid view"
                      className="h-4 w-4"
                      fill="none"
                      role="img"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="hidden sm:inline">By Child</span>
                  <span className="sm:hidden">Child</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                  {childOptions.map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                    {
                      childOptions.find((o: any) => o.value === selectedChild)
                        ?.label
                    }
                    <button
                      className="ml-1"
                      onClick={() => setSelectedChild("all")}
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
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Tab Content */}
            <TabsContent className="mt-4" value="new">
              {viewMode === "all-messages"
                ? renderAllMessages(allMessagesNew)
                : renderChildCards(newData, true)}
            </TabsContent>

            <TabsContent className="mt-4" value="history">
              {viewMode === "all-messages"
                ? renderAllMessages(allMessagesHistory)
                : renderChildCards(historyData, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
