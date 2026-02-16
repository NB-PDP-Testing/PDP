"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type SyncStatus = "all" | "completed" | "failed" | "running";
type DateRange = "last7" | "last30" | "all";
type SyncType = "scheduled" | "manual" | "webhook";
type LogStatus = "completed" | "failed";

// Helper functions to get badge variants
function getSyncTypeBadgeVariant(
  syncType: SyncType
): "default" | "secondary" | "outline" {
  if (syncType === "scheduled") {
    return "default";
  }
  if (syncType === "manual") {
    return "secondary";
  }
  return "outline";
}

function getStatusBadgeVariant(
  status: LogStatus
): "default" | "destructive" | "secondary" {
  if (status === "completed") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "secondary";
}

export default function SyncLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<SyncStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("last7");
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  // Fetch connectors for filter dropdown
  const connectors = useQuery(
    api.models.federationConnectors.listConnectors,
    {}
  );

  // Calculate date filter
  const startDate = useMemo(() => {
    const now = Date.now();
    if (dateRange === "last7") {
      return now - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === "last30") {
      return now - 30 * 24 * 60 * 60 * 1000;
    }
    return;
  }, [dateRange]);

  // Fetch sync history
  const syncHistory = useQuery(api.models.syncHistory.getAllSyncHistory, {
    connectorId:
      selectedConnector === "all"
        ? undefined
        : (selectedConnector as Id<"federationConnectors">),
    status: selectedStatus === "all" ? undefined : selectedStatus,
    cursor,
  });

  // Filter by search query and date range (client-side)
  const filteredLogs = useMemo(() => {
    if (!syncHistory?.entries) {
      return [];
    }

    let filtered = syncHistory.entries;

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((log) => log.startedAt >= startDate);
    }

    // Filter by search query (organization ID for now)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log.organizationId.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [syncHistory, searchQuery, startDate]);

  // Get connector name map for display
  const connectorMap = useMemo(() => {
    if (!connectors) {
      return new Map();
    }
    const map = new Map<string, string>();
    for (const conn of connectors) {
      map.set(conn._id, conn.name);
    }
    return map;
  }, [connectors]);

  // Format duration
  const formatDuration = (startedAt: number, completedAt?: number) => {
    if (!completedAt) {
      return "Running...";
    }
    const durationMs = completedAt - startedAt;
    const minutes = Math.floor(durationMs / 60_000);
    const seconds = Math.floor((durationMs % 60_000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 font-bold text-3xl">Federation Sync Logs</h1>
          <p className="text-blue-100">
            View detailed sync history with filtering and search
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              All sync events across all federation connectors
            </CardDescription>

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search organization..."
                  value={searchQuery}
                />
              </div>

              {/* Connector filter */}
              <Select
                onValueChange={setSelectedConnector}
                value={selectedConnector}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Connectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connectors</SelectItem>
                  {connectors?.map((conn) => (
                    <SelectItem key={conn._id} value={conn._id}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select
                onValueChange={(v) => setSelectedStatus(v as SyncStatus)}
                value={selectedStatus}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>

              {/* Date range filter */}
              <Select
                onValueChange={(v) => setDateRange(v as DateRange)}
                value={dateRange}
              >
                <SelectTrigger>
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-gray-200 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Connector
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Stats
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          className="py-8 text-center text-gray-500"
                          colSpan={8}
                        >
                          No sync logs found. Try adjusting filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const connectorName =
                          connectorMap.get(log.connectorId) || "Unknown";
                        return (
                          <tr
                            className="border-gray-100 border-b hover:bg-gray-50"
                            key={log._id}
                          >
                            <td className="px-4 py-3 text-sm">
                              {formatDistanceToNow(log.startedAt, {
                                addSuffix: true,
                              })}
                            </td>
                            <td className="px-4 py-3 font-medium text-sm">
                              {connectorName}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {log.organizationId}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={getSyncTypeBadgeVariant(log.syncType)}
                              >
                                {log.syncType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={getStatusBadgeVariant(log.status)}
                              >
                                {log.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDuration(log.startedAt, log.completedAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="space-y-1">
                                <div>
                                  Created: {log.stats.playersCreated}, Updated:{" "}
                                  {log.stats.playersUpdated}
                                </div>
                                {log.conflictCount > 0 && (
                                  <div className="text-orange-600">
                                    Conflicts: {log.conflictCount}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant="outline">
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {filteredLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No sync logs found. Try adjusting filters.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const connectorName =
                    connectorMap.get(log.connectorId) || "Unknown";
                  return (
                    <Card key={log._id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">
                            {connectorName}
                          </CardTitle>
                          <Badge
                            variant={
                              log.status === "completed"
                                ? "default"
                                : log.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatDistanceToNow(log.startedAt, {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Organization:</span>
                          <span className="font-medium">
                            {log.organizationId}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Type:</span>
                          <Badge
                            variant={
                              log.syncType === "scheduled"
                                ? "default"
                                : log.syncType === "manual"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {log.syncType}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration:</span>
                          <span>
                            {formatDuration(log.startedAt, log.completedAt)}
                          </span>
                        </div>
                        <div className="border-t pt-2 text-sm">
                          <div className="flex justify-between">
                            <span>Created: {log.stats.playersCreated}</span>
                            <span>Updated: {log.stats.playersUpdated}</span>
                          </div>
                          {log.conflictCount > 0 && (
                            <div className="mt-1 text-orange-600">
                              Conflicts: {log.conflictCount}
                            </div>
                          )}
                        </div>
                        <Button
                          className="mt-2 w-full"
                          size="sm"
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {syncHistory && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <Button
                  disabled={cursor === undefined}
                  onClick={() => setCursor(undefined)}
                  size="sm"
                  variant="outline"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  First Page
                </Button>
                <span className="text-gray-600 text-sm">
                  Showing {filteredLogs.length} logs
                </span>
                <Button
                  disabled={!syncHistory.hasMore}
                  onClick={() => setCursor(syncHistory.nextCursor)}
                  size="sm"
                  variant="outline"
                >
                  Next Page
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
