"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { DollarSign, Download, RefreshCw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeRange = "7d" | "30d" | "90d";

type SyncHistoryEntry = {
  _id: Id<"syncHistory">;
  _creationTime: number;
  connectorId: Id<"federationConnectors">;
  organizationId: string;
  syncType: "scheduled" | "manual" | "webhook";
  startedAt: number;
  completedAt?: number;
  status: "completed" | "failed";
  stats: {
    playersProcessed: number;
    playersCreated: number;
    playersUpdated: number;
    conflictsDetected: number;
    conflictsResolved: number;
    errors: number;
  };
  conflictCount: number;
};

type Connector = {
  _id: Id<"federationConnectors">;
  name: string;
};

// Helper function to get days from time range
function getDaysFromTimeRange(timeRange: TimeRange): number {
  if (timeRange === "7d") {
    return 7;
  }
  if (timeRange === "30d") {
    return 30;
  }
  return 90;
}

// Helper function to get badge variant based on success rate
function getSuccessRateBadgeVariant(
  successRate: number
): "default" | "secondary" | "destructive" {
  if (successRate > 95) {
    return "default";
  }
  if (successRate > 80) {
    return "secondary";
  }
  return "destructive";
}

export default function ConnectorAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedConnector, setSelectedConnector] = useState<
    Id<"federationConnectors"> | "all"
  >("all");

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = Date.now();
    const days = getDaysFromTimeRange(timeRange);
    const startDate = now - days * 24 * 60 * 60 * 1000;
    return { startDate, endDate: now };
  }, [timeRange]);

  // Fetch data
  const connectors = useQuery(
    api.models.federationConnectors.listConnectors,
    {}
  );
  const syncHistory = useQuery(api.models.syncHistory.getAllSyncHistory, {
    connectorId: selectedConnector === "all" ? undefined : selectedConnector,
    limit: 1000,
  });
  const aiStats = useQuery(api.models.aiMappingAnalytics.getAIMappingStats, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const costEstimate = useQuery(
    api.models.aiMappingAnalytics.getAICostEstimate,
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }
  );

  // Filter sync history by date range
  const filteredSyncHistory = useMemo(() => {
    if (!syncHistory) {
      return [];
    }
    return syncHistory.entries.filter(
      (entry: SyncHistoryEntry) =>
        entry.startedAt >= dateRange.startDate &&
        entry.startedAt <= dateRange.endDate
    );
  }, [syncHistory, dateRange]);

  // Prepare sync volume chart data (grouped by day)
  const syncVolumeData = useMemo(() => {
    const dayMap = new Map<
      string,
      { date: string; scheduled: number; manual: number; webhook: number }
    >();

    for (const entry of filteredSyncHistory) {
      const dayKey = format(entry.startedAt, "yyyy-MM-dd");
      const existing = dayMap.get(dayKey) || {
        date: dayKey,
        scheduled: 0,
        manual: 0,
        webhook: 0,
      };

      if (entry.syncType === "scheduled") {
        existing.scheduled += 1;
      } else if (entry.syncType === "manual") {
        existing.manual += 1;
      } else if (entry.syncType === "webhook") {
        existing.webhook += 1;
      }

      dayMap.set(dayKey, existing);
    }

    return Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredSyncHistory]);

  // Prepare API cost chart data (by day)
  const costChartData = useMemo(() => {
    const dayMap = new Map<
      string,
      { date: string; cost: number; syncs: number }
    >();

    for (const entry of filteredSyncHistory) {
      const dayKey = format(entry.startedAt, "yyyy-MM-dd");
      const existing = dayMap.get(dayKey) || {
        date: dayKey,
        cost: 0,
        syncs: 0,
      };

      // Cost per sync estimate: $0.003 per uncached AI call
      // Assume ~10 AI calls per sync (player field mappings)
      existing.cost += 0.003 * 10;
      existing.syncs += 1;

      dayMap.set(dayKey, existing);
    }

    return Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredSyncHistory]);

  // Prepare cache hit rate pie chart data
  const cacheHitData = useMemo(() => {
    if (!aiStats) {
      return [];
    }
    const cached = (aiStats.totalMappings * aiStats.cacheHitRate) / 100;
    const uncached = aiStats.totalMappings - cached;

    return [
      { name: "Cached", value: Math.round(cached), fill: "#22c55e" },
      { name: "Uncached", value: Math.round(uncached), fill: "#ef4444" },
    ];
  }, [aiStats]);

  // Prepare connector performance table data
  const connectorPerformance = useMemo(() => {
    if (!connectors) {
      return [];
    }

    const connectorMap = new Map<
      Id<"federationConnectors">,
      {
        name: string;
        totalSyncs: number;
        successfulSyncs: number;
        totalDuration: number;
        totalCost: number;
      }
    >();

    // Initialize all connectors
    for (const connector of connectors) {
      connectorMap.set(connector._id, {
        name: connector.name,
        totalSyncs: 0,
        successfulSyncs: 0,
        totalDuration: 0,
        totalCost: 0,
      });
    }

    // Aggregate data from sync history
    for (const entry of filteredSyncHistory) {
      const existing = connectorMap.get(entry.connectorId);
      if (!existing) {
        continue;
      }

      existing.totalSyncs += 1;
      if (entry.status === "completed") {
        existing.successfulSyncs += 1;
      }

      const duration = entry.completedAt
        ? entry.completedAt - entry.startedAt
        : 0;
      existing.totalDuration += duration;

      // Cost estimate
      existing.totalCost += 0.003 * 10; // $0.003 per AI call, ~10 calls per sync
    }

    return Array.from(connectorMap.values())
      .map((data) => ({
        name: data.name,
        avgDuration:
          data.totalSyncs > 0 ? data.totalDuration / data.totalSyncs : 0,
        successRate:
          data.totalSyncs > 0
            ? (data.successfulSyncs / data.totalSyncs) * 100
            : 0,
        apiCost: data.totalCost,
        totalSyncs: data.totalSyncs,
      }))
      .sort((a, b) => b.totalSyncs - a.totalSyncs);
  }, [connectors, filteredSyncHistory]);

  // Prepare organization leaderboard
  const orgLeaderboard = useMemo(() => {
    const orgMap = new Map<string, { orgId: string; syncCount: number }>();

    for (const entry of filteredSyncHistory) {
      const existing = orgMap.get(entry.organizationId) || {
        orgId: entry.organizationId,
        syncCount: 0,
      };
      existing.syncCount += 1;
      orgMap.set(entry.organizationId, existing);
    }

    return Array.from(orgMap.values())
      .sort((a, b) => b.syncCount - a.syncCount)
      .slice(0, 10);
  }, [filteredSyncHistory]);

  // Export analytics data
  const handleExport = () => {
    const data = {
      timeRange,
      dateRange,
      syncVolume: syncVolumeData,
      costs: costChartData,
      cacheHitRate: aiStats,
      connectorPerformance,
      orgLeaderboard,
      totalSyncs: filteredSyncHistory.length,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `federation-analytics-${format(Date.now(), "yyyy-MM-dd")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = !(connectors && syncHistory && aiStats && costEstimate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-4xl text-gray-900">
              Federation Analytics
            </h1>
            <p className="mt-2 text-gray-600">
              Analyze connector usage, costs, and performance trends
            </p>
          </div>
          <Button disabled={isLoading} onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Analytics
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="mb-2 block font-medium text-gray-700 text-sm">
                Time Range
              </div>
              <Select
                onValueChange={(value: TimeRange) => {
                  setTimeRange(value);
                }}
                value={timeRange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="mb-2 block font-medium text-gray-700 text-sm">
                Connector
              </div>
              <Select
                onValueChange={(value: Id<"federationConnectors"> | "all") => {
                  setSelectedConnector(value);
                }}
                value={selectedConnector}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connectors</SelectItem>
                  {connectors?.map((connector: Connector) => (
                    <SelectItem key={connector._id} value={connector._id}>
                      {connector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Syncs</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {filteredSyncHistory.length}
              </div>
              <p className="text-muted-foreground text-xs">
                In selected time range
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Cache Hit Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {aiStats ? `${aiStats.cacheHitRate.toFixed(1)}%` : "—"}
              </div>
              <p className="text-muted-foreground text-xs">
                AI mapping cache efficiency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Estimated Cost
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                ${costEstimate?.estimatedCost.toFixed(2) ?? "0.00"}
              </div>
              <p className="text-muted-foreground text-xs">
                API costs this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Cache Savings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl text-green-600">
                ${costEstimate?.savings.toFixed(2) ?? "0.00"}
              </div>
              <p className="text-muted-foreground text-xs">Saved via caching</p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Volume</CardTitle>
            <CardDescription>
              Daily sync counts by type (scheduled, manual, webhook)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full overflow-x-auto">
              <ResponsiveContainer height={300} width="100%">
                <BarChart data={syncVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      format(new Date(value as string), "MMM dd, yyyy")
                    }
                  />
                  <Legend />
                  <Bar dataKey="scheduled" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="manual" fill="#a855f7" stackId="a" />
                  <Bar dataKey="webhook" fill="#22c55e" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* API Cost Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Costs</CardTitle>
              <CardDescription>
                Estimated daily costs for AI mapping
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer height={240} width="100%">
                  <LineChart data={costChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        format(new Date(value), "MMM dd")
                      }
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Cost",
                      ]}
                      labelFormatter={(value) =>
                        format(new Date(value as string), "MMM dd, yyyy")
                      }
                    />
                    <Line
                      dataKey="cost"
                      stroke="#ef4444"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cache Hit Rate Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cache Hit Rate</CardTitle>
              <CardDescription>Cached vs uncached AI mappings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer height={240} width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={cacheHitData}
                      dataKey="value"
                      fill="#8884d8"
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      labelLine={false}
                      outerRadius={80}
                    >
                      {cacheHitData.map((entry) => (
                        <Cell fill={entry.fill} key={`cell-${entry.name}`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connector Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Connector Performance</CardTitle>
            <CardDescription>Performance metrics by connector</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-700 text-sm">
                      Connector
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 text-sm">
                      Avg Duration
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 text-sm">
                      Success Rate
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 text-sm">
                      API Cost
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 text-sm">
                      Total Syncs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {connectorPerformance.map((perf) => {
                    const durationMinutes = perf.avgDuration / 60_000;
                    const isSlow = durationMinutes > 5;
                    return (
                      <tr
                        className={`border-b ${isSlow ? "bg-yellow-50" : ""}`}
                        key={perf.name}
                      >
                        <td className="px-4 py-2 text-sm">{perf.name}</td>
                        <td className="px-4 py-2 text-sm">
                          {durationMinutes.toFixed(1)}m
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <Badge
                            variant={getSuccessRateBadgeVariant(
                              perf.successRate
                            )}
                          >
                            {perf.successRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          ${perf.apiCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm">{perf.totalSyncs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {connectorPerformance.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No connector data available for the selected time range.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Leaderboard</CardTitle>
            <CardDescription>
              Top 10 organizations by sync count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgLeaderboard.map((org, idx) => (
                <div
                  className="flex items-center justify-between"
                  key={org.orgId}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {org.orgId}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-gray-700 text-lg">
                    {org.syncCount} syncs
                  </div>
                </div>
              ))}
              {orgLeaderboard.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No organization data available for the selected time range.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
