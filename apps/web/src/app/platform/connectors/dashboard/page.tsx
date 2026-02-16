"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronDown,
  DollarSign,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper: Format date to YYYY-MM-DD
const formatDayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// Helper: Update day map with sync entry
const updateDayMap = (
  dayMap: Map<string, { successful: number; failed: number }>,
  entry: { startedAt: number; status: "completed" | "failed" }
) => {
  const dayKey = formatDayKey(entry.startedAt);

  if (!dayMap.has(dayKey)) {
    dayMap.set(dayKey, { successful: 0, failed: 0 });
  }

  const dayData = dayMap.get(dayKey);
  if (!dayData) {
    return;
  }

  if (entry.status === "completed") {
    dayData.successful += 1;
  } else if (entry.status === "failed") {
    dayData.failed += 1;
  }
};

export default function ConnectorDashboardPage() {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const autoRefresh = true; // Auto-refresh enabled by default

  // Fetch all connectors
  const connectors = useQuery(api.models.federationConnectors.listConnectors, {
    status: undefined,
  });

  // Fetch recent sync history (last 30 days)
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const syncHistory = useQuery(api.models.syncHistory.getAllSyncHistory, {
    connectorId: undefined,
    status: undefined,
    limit: 500, // Get enough data for 30 days
  });

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      setLastRefresh(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Calculate summary metrics
  const summaryMetrics = () => {
    if (!(connectors && syncHistory)) {
      return {
        totalConnectors: 0,
        activeConnectors: 0,
        inactiveConnectors: 0,
        errorConnectors: 0,
        totalOrgs: 0,
        syncsLast24h: 0,
        failedSyncsLast24h: 0,
        estimatedMonthlyCost: 0,
      };
    }

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Get unique organization IDs from all connectors
    const uniqueOrgs = new Set<string>();
    for (const connector of connectors) {
      for (const org of connector.connectedOrganizations) {
        uniqueOrgs.add(org.organizationId);
      }
    }

    // Count syncs in last 24 hours
    const recentSyncs = syncHistory.entries.filter(
      (entry: { startedAt: number }) => entry.startedAt > dayAgo
    );
    const failedSyncs = recentSyncs.filter(
      (entry: { status: string }) => entry.status === "failed"
    );

    // Estimate monthly cost (simplified)
    // Formula: uncached AI mappings * $0.003 + sync executions * $0.001
    const totalSyncs = syncHistory.entries.length;
    const estimatedMonthlyCost = totalSyncs * 0.001 + totalSyncs * 0.003; // Rough estimate

    return {
      totalConnectors: connectors.length,
      activeConnectors: connectors.filter(
        (c: { status: string }) => c.status === "active"
      ).length,
      inactiveConnectors: connectors.filter(
        (c: { status: string }) => c.status === "inactive"
      ).length,
      errorConnectors: connectors.filter(
        (c: { status: string }) => c.status === "error"
      ).length,
      totalOrgs: uniqueOrgs.size,
      syncsLast24h: recentSyncs.length,
      failedSyncsLast24h: failedSyncs.length,
      estimatedMonthlyCost,
    };
  };

  const metrics = summaryMetrics();

  // Prepare chart data (last 30 days)
  const getChartData = () => {
    if (!syncHistory) {
      return [];
    }

    // Group by day
    const dayMap = new Map<string, { successful: number; failed: number }>();

    // Filter recent entries and update day map
    const recentEntries = syncHistory.entries.filter(
      (entry: { startedAt: number }) => entry.startedAt >= thirtyDaysAgo
    );

    for (const entry of recentEntries) {
      updateDayMap(dayMap, entry);
    }

    // Convert to array and sort by date
    return Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        successful: data.successful,
        failed: data.failed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = getChartData();

  // Get top 5 connectors with worst health
  const getTopUnhealthyConnectors = () => {
    if (!connectors) {
      return [];
    }

    type ConnectorWithHealth = {
      _id: string;
      name: string;
      status: string;
      consecutiveFailures?: number;
      lastErrorAt?: number;
      uptimePercentage: number;
    };

    const connectorsWithHealth: ConnectorWithHealth[] = connectors.map(
      (connector): ConnectorWithHealth => {
        let uptime = 100;
        if (connector.status === "error") {
          uptime = Math.max(0, 100 - (connector.consecutiveFailures || 0) * 20);
        } else if (connector.consecutiveFailures) {
          uptime = Math.max(0, 100 - (connector.consecutiveFailures || 0) * 10);
        }

        return {
          _id: connector._id as string,
          name: connector.name as string,
          status: connector.status,
          consecutiveFailures: connector.consecutiveFailures,
          lastErrorAt: connector.lastErrorAt as number | undefined,
          uptimePercentage: uptime,
        };
      }
    );

    // Sort by uptime (worst first)
    return connectorsWithHealth
      .sort((a, b) => a.uptimePercentage - b.uptimePercentage)
      .slice(0, 5);
  };

  const unhealthyConnectors = getTopUnhealthyConnectors();

  // Get last 10 errors
  const getRecentErrors = () => {
    if (!syncHistory) {
      return [];
    }

    return syncHistory.entries
      .filter((entry: { status: string }) => entry.status === "failed")
      .slice(0, 10);
  };

  const recentErrors = getRecentErrors();

  // Get uptime badge color
  const getUptimeBadgeColor = (uptime: number) => {
    if (uptime >= 95) {
      return "bg-green-100 text-green-800 hover:bg-green-100";
    }
    if (uptime >= 80) {
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    }
    return "bg-red-100 text-red-800 hover:bg-red-100";
  };

  if (connectors === undefined || syncHistory === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-8 h-20 w-full" />
          <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Link href="/platform">
              <Button className="text-white/80" size="sm" variant="ghost">
                <ChevronDown className="mr-1 h-4 w-4 rotate-90" />
                Back to Platform
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 font-bold text-4xl text-white tracking-tight">
                Federation Connector Dashboard
              </h1>
              <p className="text-lg text-white/80">
                System health and performance overview
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm text-white/60">
                <p>Last updated</p>
                <p>{formatDistanceToNow(lastRefresh, { addSuffix: true })}</p>
              </div>
              <Button
                onClick={() => setLastRefresh(Date.now())}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Connectors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Connectors
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {metrics.totalConnectors}
              </div>
              <p className="text-muted-foreground text-xs">
                {metrics.activeConnectors} active, {metrics.inactiveConnectors}{" "}
                inactive, {metrics.errorConnectors} error
              </p>
            </CardContent>
          </Card>

          {/* Total Organizations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Connected Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{metrics.totalOrgs}</div>
              <p className="text-muted-foreground text-xs">
                Organizations using federation connectors
              </p>
            </CardContent>
          </Card>

          {/* Syncs Last 24h */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Syncs Last 24h
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{metrics.syncsLast24h}</div>
              <p className="text-muted-foreground text-xs">
                {metrics.syncsLast24h - metrics.failedSyncsLast24h} completed,{" "}
                {metrics.failedSyncsLast24h} failed
              </p>
            </CardContent>
          </Card>

          {/* API Cost This Month */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Est. Monthly Cost
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                ${metrics.estimatedMonthlyCost.toFixed(2)}
              </div>
              <p className="text-muted-foreground text-xs">
                Estimated from API usage
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Trend Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sync Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(date) => {
                      const parts = date.split("-");
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    dataKey="successful"
                    name="Successful"
                    stroke="#10b981"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Line
                    dataKey="failed"
                    name="Failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout for Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connector Health Table */}
          <Card>
            <CardHeader>
              <CardTitle>Connector Health (Top 5 by Priority)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Connector</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Last Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unhealthyConnectors.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center" colSpan={3}>
                        <div className="py-8 text-muted-foreground">
                          No connectors to display
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    unhealthyConnectors.map((connector) => {
                      const badgeColor = getUptimeBadgeColor(
                        connector.uptimePercentage
                      );
                      return (
                        <TableRow key={connector._id}>
                          <TableCell className="font-medium">
                            {connector.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={badgeColor}>
                              {connector.uptimePercentage.toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {connector.lastErrorAt
                              ? formatDistanceToNow(connector.lastErrorAt, {
                                  addSuffix: true,
                                })
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 text-center">
                <Link href="/platform/connectors">
                  <Button size="sm" variant="outline">
                    Manage Connectors
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Errors</CardTitle>
            </CardHeader>
            <CardContent>
              {recentErrors.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No recent errors
                </div>
              ) : (
                <div className="space-y-3">
                  {recentErrors.map(
                    (error: {
                      _id: string;
                      organizationId: string;
                      startedAt: number;
                      stats: { errors: number };
                    }) => (
                      <div
                        className="flex items-start gap-3 rounded-lg border p-3"
                        key={error._id}
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            Org: {error.organizationId}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(error.startedAt, {
                              addSuffix: true,
                            })}
                          </p>
                          {error.stats.errors > 0 && (
                            <p className="mt-1 text-muted-foreground text-xs">
                              {error.stats.errors} errors
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
              <div className="mt-4 text-center">
                <Link href="/platform/connectors/sync-logs">
                  <Button size="sm" variant="outline">
                    View All Logs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
