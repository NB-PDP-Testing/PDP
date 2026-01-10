"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Filter,
  Lightbulb,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

type ViewMode = "players" | "guardians" | "status";
type StatusFilter = "all" | "claimed" | "pending" | "missing";

export default function GuardianManagementPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [viewMode, setViewMode] = useState<ViewMode>("players");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [groupByFamily, setGroupByFamily] = useState(false);

  // Queries
  const stats = useQuery(api.models.guardianManagement.getGuardianStatsForOrg, {
    organizationId: orgId,
  });
  const relationships = useQuery(
    api.models.guardianManagement.getGuardianRelationshipsForOrg,
    { organizationId: orgId }
  );
  const guardians = useQuery(api.models.guardianManagement.getGuardiansForOrg, {
    organizationId: orgId,
  });
  const playersWithoutGuardians = useQuery(
    api.models.guardianManagement.getPlayersWithoutGuardians,
    { organizationId: orgId }
  );

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Generate insights and recommendations
  const getInsights = () => {
    if (!(stats && relationships && guardians)) return [];

    const insights = [];

    // Missing guardians insight
    if (stats.playersWithoutGuardians > 0) {
      insights.push({
        type: "warning",
        icon: AlertCircle,
        title: "Players Missing Guardian Information",
        description: `${stats.playersWithoutGuardians} player${stats.playersWithoutGuardians > 1 ? "s" : ""} don't have any guardian contacts linked.`,
        action: "Review Players",
        onClick: () => {
          setViewMode("status");
          setStatusFilter("missing");
        },
        priority: "high",
      });
    }

    // Pending accounts insight
    if (stats.pendingAccounts > 0) {
      const pendingPercentage = Math.round(
        (stats.pendingAccounts /
          (stats.claimedAccounts + stats.pendingAccounts)) *
          100
      );
      insights.push({
        type: "info",
        icon: Send,
        title: "Guardian Invitations Pending",
        description: `${stats.pendingAccounts} guardian${stats.pendingAccounts > 1 ? "s" : ""} (${pendingPercentage}%) haven't created their accounts yet.`,
        action: "Send Reminders",
        onClick: () => {
          setViewMode("guardians");
          setStatusFilter("pending");
        },
        priority: "medium",
      });
    }

    // Missing contact info insight
    if (
      stats.guardiansWithMissingEmail > 0 ||
      stats.guardiansWithMissingPhone > 0
    ) {
      const totalMissing =
        stats.guardiansWithMissingEmail + stats.guardiansWithMissingPhone;
      insights.push({
        type: "warning",
        icon: Mail,
        title: "Incomplete Contact Information",
        description: `${totalMissing} guardian record${totalMissing > 1 ? "s" : ""} missing email or phone details.`,
        action: "Review Contacts",
        onClick: () => {
          setViewMode("guardians");
          setStatusFilter("all");
        },
        priority: "medium",
      });
    }

    // Duplicate emails insight
    if (stats.duplicateEmails > 0) {
      insights.push({
        type: "info",
        icon: Users2,
        title: "Potential Duplicate Guardians",
        description: `${stats.duplicateEmails} email address${stats.duplicateEmails > 1 ? "es are" : " is"} shared across multiple guardian records.`,
        action: "View Families",
        onClick: () => {
          setViewMode("guardians");
          setGroupByFamily(true);
        },
        priority: "low",
      });
    }

    // Success insight
    if (
      stats.claimedAccounts === stats.claimedAccounts + stats.pendingAccounts &&
      stats.playersWithoutGuardians === 0 &&
      stats.guardiansWithMissingEmail === 0
    ) {
      insights.push({
        type: "success",
        icon: CheckCircle2,
        title: "Guardian Management Complete",
        description:
          "All guardians have accounts and complete contact information!",
        action: null,
        onClick: null,
        priority: "low",
      });
    }

    // Engagement opportunity
    if (
      stats.claimedAccounts > 0 &&
      stats.pendingAccounts > stats.claimedAccounts * 0.5
    ) {
      insights.push({
        type: "tip",
        icon: Lightbulb,
        title: "Boost Guardian Engagement",
        description:
          "Consider sending a welcome message to active guardians asking them to invite others.",
        action: null,
        onClick: null,
        priority: "low",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );
    });
  };

  const insights = getInsights();

  // Group guardians by family (same last name or shared players)
  const getGroupedGuardians = () => {
    if (!guardians) return [];

    const familyGroups: Map<string, any[]> = new Map();

    guardians.forEach((guardian: any) => {
      const familyKey = guardian.lastName.toLowerCase();
      if (!familyGroups.has(familyKey)) {
        familyGroups.set(familyKey, []);
      }
      familyGroups.get(familyKey)!.push(guardian);
    });

    // Convert to array and filter by search
    return Array.from(familyGroups.entries())
      .map(([lastName, members]) => ({
        familyName: lastName,
        members: members.filter((guardian: any) => {
          if (searchQuery === "") return true;
          return (
            `${guardian.firstName} ${guardian.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            guardian.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guardian.players.some((p: any) =>
              p.playerName.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
        }),
        playerCount: new Set(
          members.flatMap((g: any) => g.players.map((p: any) => p.playerId))
        ).size,
      }))
      .filter((family) => family.members.length > 0)
      .sort((a, b) => b.playerCount - a.playerCount);
  };

  // Filter data based on search and status
  const getFilteredData = () => {
    if (viewMode === "players" && relationships) {
      const filtered = relationships.filter((rel: any) => {
        const matchesSearch =
          searchQuery === "" ||
          rel.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rel.guardians.some((g: any) =>
            `${g.firstName} ${g.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          );

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "claimed" &&
            rel.claimedCount === rel.guardianCount &&
            rel.guardianCount > 0) ||
          (statusFilter === "pending" &&
            rel.claimedCount < rel.guardianCount &&
            rel.guardianCount > 0) ||
          (statusFilter === "missing" && rel.guardianCount === 0);

        return matchesSearch && matchesStatus;
      });
      return filtered;
    }

    if (viewMode === "guardians" && guardians) {
      const filtered = guardians.filter((guardian: any) => {
        const matchesSearch =
          searchQuery === "" ||
          `${guardian.firstName} ${guardian.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          guardian.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "claimed" && guardian.hasUserAccount) ||
          (statusFilter === "pending" && !guardian.hasUserAccount);

        return matchesSearch && matchesStatus;
      });
      return filtered;
    }

    if (viewMode === "status") {
      if (statusFilter === "missing") {
        if (!playersWithoutGuardians) return [];
        // Apply search filter to missing guardians
        return playersWithoutGuardians.filter((player: any) => {
          if (searchQuery === "") return true;
          return player.playerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        });
      }
      // For other status filters, show filtered players
      if (relationships) {
        return relationships.filter((rel: any) => {
          const matchesSearch =
            searchQuery === "" ||
            rel.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rel.guardians.some((g: any) =>
              `${g.firstName} ${g.lastName}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            );

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "claimed" &&
              rel.claimedCount === rel.guardianCount &&
              rel.guardianCount > 0) ||
            (statusFilter === "pending" &&
              rel.claimedCount < rel.guardianCount &&
              rel.guardianCount > 0);

          return matchesSearch && matchesStatus;
        });
      }
      return [];
    }

    return [];
  };

  const filteredData = getFilteredData();

  const getStatusBadge = (claimedCount: number, totalCount: number) => {
    if (totalCount === 0) {
      return (
        <Badge className="gap-1" variant="destructive">
          <AlertCircle className="h-3 w-3" />
          Missing
        </Badge>
      );
    }
    if (claimedCount === totalCount) {
      return (
        <Badge className="gap-1 bg-green-600" variant="default">
          <CheckCircle2 className="h-3 w-3" />
          All Claimed
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-yellow-600 text-white" variant="secondary">
        <Clock className="h-3 w-3" />
        {claimedCount}/{totalCount} Claimed
      </Badge>
    );
  };

  const getGuardianStatusBadge = (hasAccount: boolean) => {
    if (hasAccount) {
      return (
        <Badge className="gap-1 bg-green-600" variant="default">
          <CheckCircle2 className="h-3 w-3" />
          Claimed
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-yellow-600 text-white" variant="secondary">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  if (!(stats && relationships && guardians)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading guardian data...</p>
        </div>
      </div>
    );
  }

  const claimedPercentage =
    stats.totalGuardianLinks > 0
      ? Math.round(
          (stats.claimedAccounts /
            (stats.claimedAccounts + stats.pendingAccounts)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/orgs/${orgId}/admin`}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Guardian Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            View and manage parent/guardian relationships and account status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => setViewMode("players")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.totalPlayers}</div>
            <p className="text-muted-foreground text-xs">
              {stats.totalGuardianLinks} guardian links
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-green-600"
          onClick={() => {
            setViewMode("guardians");
            setStatusFilter("claimed");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Claimed Accounts
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.claimedAccounts}</div>
            <p className="text-muted-foreground text-xs">
              {claimedPercentage}% of guardians
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-yellow-600"
          onClick={() => {
            setViewMode("guardians");
            setStatusFilter("pending");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Pending Sign-up
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.pendingAccounts}</div>
            <p className="text-muted-foreground text-xs">
              Awaiting account creation
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-red-600"
          onClick={() => {
            setViewMode("status");
            setStatusFilter("missing");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Missing Guardians
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.playersWithoutGuardians}
            </div>
            <p className="text-muted-foreground text-xs">
              Players with no guardian
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      {insights.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Insights & Recommendations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.slice(0, 4).map((insight, index) => {
                const Icon = insight.icon;
                const bgColor = {
                  warning: "bg-orange-100 dark:bg-orange-950/50",
                  info: "bg-blue-100 dark:bg-blue-950/50",
                  success: "bg-green-100 dark:bg-green-950/50",
                  tip: "bg-purple-100 dark:bg-purple-950/50",
                }[insight.type];
                const iconColor = {
                  warning: "text-orange-600",
                  info: "text-blue-600",
                  success: "text-green-600",
                  tip: "text-purple-600",
                }[insight.type];
                const borderColor = {
                  warning: "border-orange-200 dark:border-orange-900",
                  info: "border-blue-200 dark:border-blue-900",
                  success: "border-green-200 dark:border-green-900",
                  tip: "border-purple-200 dark:border-purple-900",
                }[insight.type];

                return (
                  <div
                    className={`flex flex-col gap-2 rounded-lg border ${borderColor} ${bgColor} p-3 transition-all ${
                      insight.onClick ? "cursor-pointer hover:shadow-md" : ""
                    }`}
                    key={index}
                    onClick={insight.onClick || undefined}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-semibold text-sm">
                          {insight.title}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {insight.description}
                        </div>
                      </div>
                    </div>
                    {insight.action && (
                      <div className="ml-11 flex items-center gap-1 font-medium text-primary text-xs">
                        {insight.action}
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {insights.length > 4 && (
              <div className="mt-3 text-center text-muted-foreground text-xs">
                + {insights.length - 4} more insight
                {insights.length - 4 > 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Toggle and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* View Mode Toggle and Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode("players")}
                  size="sm"
                  variant={viewMode === "players" ? "default" : "outline"}
                >
                  Player View
                </Button>
                <Button
                  onClick={() => setViewMode("guardians")}
                  size="sm"
                  variant={viewMode === "guardians" ? "default" : "outline"}
                >
                  Guardian View
                </Button>
                <Button
                  onClick={() => setViewMode("status")}
                  size="sm"
                  variant={viewMode === "status" ? "default" : "outline"}
                >
                  Status View
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-10 pl-10"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players, guardians, emails..."
                  type="text"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Guardian View Options */}
            {viewMode === "guardians" && (
              <div className="flex items-center gap-2 border-t pt-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  View options:
                </span>
                <Button
                  onClick={() => setGroupByFamily(!groupByFamily)}
                  size="sm"
                  variant={groupByFamily ? "default" : "outline"}
                >
                  <Users2 className="mr-2 h-4 w-4" />
                  {groupByFamily ? "Grouped by Family" : "Group by Family"}
                </Button>
                {groupByFamily && (
                  <Badge className="ml-2" variant="secondary">
                    {getGroupedGuardians().length} families
                  </Badge>
                )}
              </div>
            )}

            {/* Active Filters Summary */}
            {(searchQuery || statusFilter !== "all") && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-muted-foreground text-sm">
                  Active filters:
                </span>
                {searchQuery && (
                  <Badge className="gap-1" variant="secondary">
                    Search: "{searchQuery}"
                    <button
                      className="ml-1 hover:text-foreground"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge className="gap-1" variant="secondary">
                    Status: {statusFilter}
                    <button
                      className="ml-1 hover:text-foreground"
                      onClick={() => setStatusFilter("all")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  className="h-6 text-xs"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          All
        </button>
        <button
          className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === "claimed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStatusFilter("claimed")}
        >
          ✅ Claimed
        </button>
        <button
          className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStatusFilter("pending")}
        >
          ⏳ Pending
        </button>
        <button
          className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === "missing"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStatusFilter("missing")}
        >
          ⚠️ Missing Contact
        </button>
      </div>

      {/* Data Display */}
      <div className="space-y-4">
        {viewMode === "players" && (
          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <p className="text-muted-foreground">No players found</p>
                </CardContent>
              </Card>
            ) : (
              filteredData.map((rel: any) => (
                <Card className="overflow-hidden" key={rel.playerId}>
                  <CardContent className="p-0">
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50"
                      onClick={() => toggleRow(rel.playerId)}
                    >
                      <div className="flex items-center gap-4">
                        <button className="text-muted-foreground">
                          {expandedRows.has(rel.playerId) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium">{rel.playerName}</div>
                          <div className="text-muted-foreground text-sm">
                            {rel.ageGroup} • {rel.guardianCount} guardian
                            {rel.guardianCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(rel.claimedCount, rel.guardianCount)}
                      </div>
                    </div>

                    {expandedRows.has(rel.playerId) && (
                      <div className="border-t bg-muted/20 p-4">
                        {rel.guardians.length === 0 ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <AlertCircle className="h-4 w-4" />
                            No guardians linked to this player
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {rel.guardians.map((guardian: any) => (
                              <div
                                className="flex items-start justify-between rounded-lg border bg-background p-3"
                                key={guardian.guardianId}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {guardian.firstName} {guardian.lastName}
                                    </span>
                                    {guardian.isPrimary && (
                                      <Badge
                                        className="text-xs"
                                        variant="outline"
                                      >
                                        Primary
                                      </Badge>
                                    )}
                                    {getGuardianStatusBadge(
                                      guardian.userAccount?.hasAccount
                                    )}
                                  </div>
                                  <div className="mt-1 space-y-1 text-muted-foreground text-sm">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" />
                                      {guardian.email || "No email"}
                                    </div>
                                    {guardian.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        {guardian.phone}
                                      </div>
                                    )}
                                    <div className="text-xs">
                                      Relationship: {guardian.relationship}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {viewMode === "guardians" && !groupByFamily && (
          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No Guardians Found</EmptyTitle>
                      <EmptyDescription>
                        No guardians match your current filters
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              filteredData.map((guardian: any) => (
                <Card className="overflow-hidden" key={guardian.guardianId}>
                  <CardContent className="p-0">
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50"
                      onClick={() => toggleRow(guardian.guardianId)}
                    >
                      <div className="flex items-center gap-4">
                        <button className="text-muted-foreground">
                          {expandedRows.has(guardian.guardianId) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium">
                            {guardian.firstName} {guardian.lastName}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {guardian.email} • {guardian.players.length} player
                            {guardian.players.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getGuardianStatusBadge(guardian.hasUserAccount)}
                      </div>
                    </div>

                    {expandedRows.has(guardian.guardianId) && (
                      <div className="border-t bg-muted/20 p-4">
                        <div className="space-y-3">
                          <div className="text-sm">
                            <div className="mb-2 font-medium">
                              Contact Information:
                            </div>
                            <div className="space-y-1 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {guardian.email || "No email"}
                              </div>
                              {guardian.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  {guardian.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-sm">
                            <div className="mb-2 font-medium">
                              Linked Players:
                            </div>
                            <div className="space-y-2">
                              {guardian.players.map((player: any) => (
                                <div
                                  className="flex items-center justify-between rounded-lg border bg-background p-2"
                                  key={player.playerId}
                                >
                                  <div>
                                    <div className="font-medium text-sm">
                                      {player.playerName}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {player.ageGroup} • {player.relationship}
                                      {player.isPrimary && " (Primary)"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {viewMode === "guardians" && groupByFamily && (
          <div className="space-y-3">
            {getGroupedGuardians().length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <p className="text-muted-foreground">No families found</p>
                </CardContent>
              </Card>
            ) : (
              getGroupedGuardians().map((family: any) => (
                <Card className="overflow-hidden" key={family.familyName}>
                  <CardContent className="p-0">
                    <div
                      className="flex cursor-pointer items-center justify-between bg-muted/30 p-4 hover:bg-muted/50"
                      onClick={() => toggleRow(family.familyName)}
                    >
                      <div className="flex items-center gap-4">
                        <button className="text-muted-foreground">
                          {expandedRows.has(family.familyName) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                        <Users2 className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold text-lg capitalize">
                            {family.familyName} Family
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {family.members.length} guardian
                            {family.members.length !== 1 ? "s" : ""} •{" "}
                            {family.playerCount} player
                            {family.playerCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {
                            family.members.filter((g: any) => g.hasUserAccount)
                              .length
                          }{" "}
                          / {family.members.length} claimed
                        </Badge>
                      </div>
                    </div>

                    {expandedRows.has(family.familyName) && (
                      <div className="border-t bg-background p-4">
                        <div className="space-y-4">
                          {family.members.map((guardian: any) => (
                            <div
                              className="rounded-lg border bg-muted/20 p-4"
                              key={guardian.guardianId}
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="mb-2 flex items-center gap-2">
                                    <span className="font-medium text-lg">
                                      {guardian.firstName} {guardian.lastName}
                                    </span>
                                    {getGuardianStatusBadge(
                                      guardian.hasUserAccount
                                    )}
                                  </div>
                                  <div className="space-y-1 text-muted-foreground text-sm">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" />
                                      {guardian.email || "No email"}
                                    </div>
                                    {guardian.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        {guardian.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="border-t pt-3">
                                <div className="mb-2 font-medium text-sm">
                                  Linked Players ({guardian.players.length}):
                                </div>
                                <div className="space-y-2">
                                  {guardian.players.map((player: any) => (
                                    <div
                                      className="flex items-center justify-between rounded-md border bg-background p-2"
                                      key={player.playerId}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">
                                          {player.playerName}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                          {player.ageGroup} •{" "}
                                          {player.relationship}
                                          {player.isPrimary && " (Primary)"}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {viewMode === "status" && statusFilter === "missing" && (
          <div className="space-y-2">
            {playersWithoutGuardians && playersWithoutGuardians.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                    <p className="font-medium">All players have guardians!</p>
                    <p className="text-muted-foreground text-sm">
                      Every player has at least one guardian linked
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              playersWithoutGuardians?.map((player: any) => (
                <Card key={player.playerId}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{player.playerName}</div>
                      <div className="text-muted-foreground text-sm">
                        {player.ageGroup} • DOB: {player.dateOfBirth}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Guardian
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Contextual Help & Recommendations */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 text-purple-600" />
            <div className="flex-1 text-sm">
              <div className="mb-2 font-semibold text-purple-900 dark:text-purple-100">
                {viewMode === "players" &&
                  statusFilter === "all" &&
                  "Player Overview Tips"}
                {viewMode === "players" &&
                  statusFilter === "claimed" &&
                  "Players with Active Guardians"}
                {viewMode === "players" &&
                  statusFilter === "pending" &&
                  "Players with Pending Guardians"}
                {viewMode === "players" &&
                  statusFilter === "missing" &&
                  "Action Required: Missing Guardians"}
                {viewMode === "guardians" &&
                  !groupByFamily &&
                  statusFilter === "all" &&
                  "Guardian Management Tips"}
                {viewMode === "guardians" &&
                  !groupByFamily &&
                  statusFilter === "claimed" &&
                  "Active Guardians"}
                {viewMode === "guardians" &&
                  !groupByFamily &&
                  statusFilter === "pending" &&
                  "Pending Guardian Invitations"}
                {viewMode === "guardians" &&
                  groupByFamily &&
                  "Family Grouping View"}
                {viewMode === "status" &&
                  statusFilter === "missing" &&
                  "Players Without Guardian Contacts"}
              </div>
              <div className="space-y-2 text-purple-800 dark:text-purple-200">
                {viewMode === "players" && statusFilter === "all" && (
                  <>
                    <div>
                      • Click on any player to see their guardian details and
                      claim status
                    </div>
                    <div>
                      • Use the search bar to quickly find specific players or
                      guardians
                    </div>
                    <div>
                      • Filter by status to focus on specific groups that need
                      attention
                    </div>
                  </>
                )}
                {viewMode === "players" && statusFilter === "missing" && (
                  <>
                    <div>
                      • These players have no guardian contacts - this should be
                      addressed urgently
                    </div>
                    <div>
                      • Click "Add Guardian" to manually add guardian
                      information
                    </div>
                    <div>
                      • Consider reaching out to these players directly for
                      guardian details
                    </div>
                  </>
                )}
                {viewMode === "guardians" &&
                  !groupByFamily &&
                  statusFilter === "pending" && (
                    <>
                      <div>
                        • These guardians have been added but haven't created
                        accounts yet
                      </div>
                      <div>
                        • Consider sending invitation reminders via email or SMS
                      </div>
                      <div>
                        • Verify email addresses are correct if invitations
                        aren't being received
                      </div>
                    </>
                  )}
                {viewMode === "guardians" && groupByFamily && (
                  <>
                    <div>
                      • Guardians are grouped by last name to identify family
                      units
                    </div>
                    <div>
                      • This view helps spot potential duplicates or siblings
                    </div>
                    <div>
                      • Click on a family to see all guardians and their linked
                      players
                    </div>
                  </>
                )}
                {viewMode === "status" && statusFilter === "missing" && (
                  <>
                    <div>
                      <strong>Priority Action:</strong> Add guardian contacts
                      for these players
                    </div>
                    <div>
                      • Missing guardian information prevents important
                      communications
                    </div>
                    <div>
                      • This is required for emergency situations and event
                      notifications
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <div className="mb-1 font-medium text-blue-900 dark:text-blue-100">
                Data Quality Summary
              </div>
              <div className="space-y-1 text-blue-800 dark:text-blue-200">
                {stats.guardiansWithMissingEmail > 0 && (
                  <div>
                    • {stats.guardiansWithMissingEmail} guardian(s) missing
                    email address
                  </div>
                )}
                {stats.guardiansWithMissingPhone > 0 && (
                  <div>
                    • {stats.guardiansWithMissingPhone} guardian(s) missing
                    phone number
                  </div>
                )}
                {stats.duplicateEmails > 0 && (
                  <div>
                    • {stats.duplicateEmails} duplicate email addresses found
                  </div>
                )}
                {stats.guardiansWithMissingEmail === 0 &&
                  stats.guardiansWithMissingPhone === 0 &&
                  stats.duplicateEmails === 0 && (
                    <div>✅ All guardian contact information is complete!</div>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
