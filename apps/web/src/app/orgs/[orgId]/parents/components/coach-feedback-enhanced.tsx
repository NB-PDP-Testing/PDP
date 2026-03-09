"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  Bike,
  CheckCheck,
  Dumbbell,
  type LucideIcon,
  MessageSquare,
  Search,
  Sparkles,
  Trophy,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
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
  const { data: session } = authClient.useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Get children with DOB for filter cards
  const { children: identityChildren } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  // Fetch teams and memberships for child cards
  const orgTeams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const teamMemberships = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  // teamId → name
  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of orgTeams ?? []) {
      map.set(t._id, t.name);
    }
    return map;
  }, [orgTeams]);

  // playerIdentityId → team names
  const teamNamesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of teamMemberships ?? []) {
      const name = teamNameById.get(m.teamId);
      if (!name) {
        continue;
      }
      map.set(m.playerIdentityId, [
        ...(map.get(m.playerIdentityId) ?? []),
        name,
      ]);
    }
    return map;
  }, [teamMemberships, teamNameById]);

  // Age helper
  const calcAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

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

  // Calculate stats, per-child stats, and split data by read/unread
  const { newData, historyData, stats, childStats } = useMemo(() => {
    if (!summariesData) {
      return {
        newData: [],
        historyData: [],
        stats: { total: 0, unread: 0, read: 0, children: 0 },
        childStats: new Map<
          string,
          { total: number; unread: number; read: number }
        >(),
      };
    }

    // Per-child message stats
    const perChild = new Map<
      string,
      { total: number; unread: number; read: number }
    >();
    for (const child of summariesData) {
      let total = 0;
      let unread = 0;
      for (const sg of child.sportGroups) {
        for (const s of sg.summaries) {
          total += 1;
          if (!s.acknowledgedAt) {
            unread += 1;
          }
        }
      }
      perChild.set(child.player._id, { total, unread, read: total - unread });
    }

    // Flatten for aggregate stats
    const allSummaries = summariesData.flatMap((child: any) =>
      child.sportGroups.flatMap((sg: any) => sg.summaries)
    );
    const totalSummaries = allSummaries.length;
    const unreadSummaries = allSummaries.filter(
      (s: any) => !s.acknowledgedAt
    ).length;

    // Apply child filter + search + acknowledged split
    const buildData = (acknowledged: boolean) =>
      summariesData
        .filter((child: any) =>
          selectedChild === "all" ? true : child.player._id === selectedChild
        )
        .map((child: any) => ({
          ...child,
          sportGroups: child.sportGroups
            .map((sg: any) => ({
              ...sg,
              summaries: sg.summaries.filter((summary: any) => {
                if (acknowledged && !summary.acknowledgedAt) {
                  return false;
                }
                if (!acknowledged && summary.acknowledgedAt) {
                  return false;
                }
                if (!searchQuery.trim()) {
                  return true;
                }
                const q = searchQuery.toLowerCase();
                return (
                  summary.publicSummary.content.toLowerCase().includes(q) ||
                  (summary.coachName?.toLowerCase() || "").includes(q) ||
                  (
                    summary.privateInsight?.category.toLowerCase() || ""
                  ).includes(q)
                );
              }),
            }))
            .filter((sg: any) => sg.summaries.length > 0),
        }))
        .filter((child: any) => child.sportGroups.length > 0);

    return {
      newData: buildData(false),
      historyData: buildData(true),
      stats: {
        total: totalSummaries,
        unread: unreadSummaries,
        read: totalSummaries - unreadSummaries,
        children: summariesData.length,
      },
      childStats: perChild,
    };
  }, [summariesData, selectedChild, searchQuery]);

  // Auto-switch to history tab if no unread messages remain
  useEffect(() => {
    if (stats.unread === 0 && stats.read > 0 && activeTab === "new") {
      setActiveTab("history");
    }
  }, [stats.unread, stats.read, activeTab]);

  const hasSummaries = summariesData && summariesData.length > 0;
  const hasActiveFilters = searchQuery.trim() !== "";

  if (!hasSummaries) {
    return null;
  }

  const renderChildGroups = (
    data: typeof newData,
    showMarkAllButton: boolean
  ) => {
    if (data.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No messages found matching your search."
              : activeTab === "new"
                ? "No unread messages. Great job staying on top of feedback!"
                : "No message history yet."}
          </p>
          {hasActiveFilters && (
            <Button
              className="mt-4"
              onClick={() => setSearchQuery("")}
              variant="outline"
            >
              Clear search
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((childData: any) => {
          const unreadCount = childData.sportGroups.reduce(
            (sum: number, sg: any) =>
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
                        (sum: number, sg: any) => sum + sg.summaries.length,
                        0
                      )}{" "}
                      message
                      {childData.sportGroups.reduce(
                        (sum: number, sg: any) => sum + sg.summaries.length,
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
                    {sportGroup.sport && (
                      <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
                        {(() => {
                          const SportIcon = getSportIcon(sportGroup.sport.code);
                          return <SportIcon className="h-4 w-4" />;
                        })()}
                        {sportGroup.sport.name}
                        {sportGroup.summaries.filter(
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

  const childCount = identityChildren.length;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <MessageSquare className="text-blue-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.total}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total Messages
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div className="h-1 w-full rounded-full bg-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertCircle className="text-red-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.unread}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Unread
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-red-100">
              <div
                className="h-1 rounded-full bg-red-500"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.unread / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCheck className="text-green-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.read}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Read
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-500"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.read / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-purple-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.children}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Children
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div className="h-1 w-full rounded-full bg-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Filter Cards */}
      {childCount > 0 && summariesData !== undefined && (
        <div
          className={`grid gap-3 ${
            childCount === 1
              ? "max-w-xs grid-cols-1"
              : childCount === 2
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {identityChildren.map((child) => {
            const isSelected = selectedChild === child.player._id;
            const cs = childStats.get(child.player._id) ?? {
              total: 0,
              unread: 0,
              read: 0,
            };

            return (
              <button
                className={`cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
                key={child.player._id}
                onClick={() =>
                  setSelectedChild(isSelected ? "all" : child.player._id)
                }
                style={{
                  backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                  borderColor: isSelected
                    ? undefined
                    : "rgba(var(--org-primary-rgb), 0.25)",
                }}
                type="button"
              >
                <p
                  className="truncate font-semibold text-gray-900 text-sm"
                  title={`${child.player.firstName} ${child.player.lastName}`}
                >
                  {child.player.firstName} {child.player.lastName}
                </p>

                {child.player.dateOfBirth && (
                  <p className="text-gray-500 text-xs">
                    {new Date(child.player.dateOfBirth).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}{" "}
                    · Age {calcAge(child.player.dateOfBirth)}
                  </p>
                )}

                {(teamNamesByPlayer.get(child.player._id) ?? []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(teamNamesByPlayer.get(child.player._id) ?? []).map(
                      (name) => (
                        <span
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 text-xs"
                          key={name}
                        >
                          {name}
                        </span>
                      )
                    )}
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span
                    className="flex items-center gap-1 text-blue-600 text-xs"
                    title="Total messages"
                  >
                    <MessageSquare size={13} />
                    <span className="font-medium">{cs.total}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${cs.unread > 0 ? "text-red-600" : "text-gray-400"}`}
                    title="Unread"
                  >
                    <AlertCircle size={13} />
                    <span className="font-medium">{cs.unread}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${cs.read > 0 ? "text-green-600" : "text-gray-400"}`}
                    title="Read"
                  >
                    <CheckCheck size={13} />
                    <span className="font-medium">{cs.read}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summaries Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Coach Summaries
          </CardTitle>
          <CardDescription className="text-xs">
            AI-generated summaries from your coach's voice notes
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            onValueChange={(v) => setActiveTab(v as "new" | "history")}
            value={activeTab}
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="new">
                Unread
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
                Read
                {stats.read > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {stats.read}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative mt-4">
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

            <TabsContent className="mt-4" value="new">
              {renderChildGroups(newData, true)}
            </TabsContent>

            <TabsContent className="mt-4" value="history">
              {renderChildGroups(historyData, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
