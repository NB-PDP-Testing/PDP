"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  Clock,
  DollarSign,
  Gauge,
  LayoutDashboard,
  Pencil,
  Save,
  Settings,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlatformMessagingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 text-white">
          <h1 className="mb-2 font-bold text-3xl tracking-tight sm:text-4xl">
            Platform Messaging & AI Dashboard
          </h1>
          <p className="text-lg text-white/90">
            Monitor AI usage, costs, rate limits, and service health across all
            organizations
          </p>
        </div>

        {/* Main Content with Tabs */}
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <Tabs className="w-full" defaultValue="overview">
            <TabsList className="mb-6 w-full justify-start">
              <TabsTrigger className="gap-2" value="overview">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="cost-analytics">
                <DollarSign className="h-4 w-4" />
                Cost Analytics
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="rate-limits">
                <Gauge className="h-4 w-4" />
                Rate Limits
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="service-health">
                <Activity className="h-4 w-4" />
                Service Health
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="settings">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Key metrics and platform health status will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-022
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cost Analytics Tab */}
            <TabsContent value="cost-analytics">
              <CostAnalyticsTab />
            </TabsContent>

            {/* Rate Limits Tab */}
            <TabsContent value="rate-limits">
              <RateLimitsTab />
            </TabsContent>

            {/* Service Health Tab */}
            <TabsContent value="service-health">
              <Card>
                <CardHeader>
                  <CardTitle>Service Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI service status, circuit breaker state, and recent errors
                    will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-020
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Settings & Emergency Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Feature toggles and emergency kill switch will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-021
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Helper function to get cache hit rate color
function getCacheHitRateColor(rate: number): string {
  if (rate >= 80) {
    return "text-green-600";
  }
  if (rate >= 60) {
    return "text-amber-600";
  }
  return "text-red-600";
}

// Helper function to get cache hit rate background color
function getCacheHitRateBg(rate: number): string {
  if (rate >= 80) {
    return "bg-green-50 border-green-200";
  }
  if (rate >= 60) {
    return "bg-amber-50 border-amber-200";
  }
  return "bg-red-50 border-red-200";
}

// Helper function to get cache hit rate label
function getCacheHitRateLabel(rate: number): string {
  if (rate >= 80) {
    return "Excellent";
  }
  if (rate >= 60) {
    return "Good";
  }
  return "Needs improvement";
}

// Cost Analytics Tab Component
function CostAnalyticsTab() {
  // Query platform usage for last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const platformUsage = useQuery(api.models.aiUsageLog.getPlatformUsage, {
    startDate: thirtyDaysAgo,
  });

  if (!platformUsage) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card className="animate-pulse" key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate today's cost
  const today = new Date().toISOString().split("T")[0];
  const todayCost =
    platformUsage.dailyCosts.find((d: { date: string }) => d.date === today)
      ?.cost || 0;

  // Calculate average cost per message
  const avgCostPerMessage =
    platformUsage.callCount > 0
      ? platformUsage.totalCost / platformUsage.callCount
      : 0;

  // Calculate max cost for chart scaling
  const maxDailyCost = Math.max(
    ...platformUsage.dailyCosts.map((d: { cost: number }) => d.cost),
    0.01
  );

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Cost (30d)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${platformUsage.totalCost.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">
              {platformUsage.callCount.toLocaleString()} API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Cost Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">${todayCost.toFixed(2)}</div>
            <p className="text-muted-foreground text-xs">
              {platformUsage.dailyCosts.find(
                (d: { date: string }) => d.date === today
              )?.callCount || 0}{" "}
              calls today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Avg per Message
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${avgCostPerMessage.toFixed(4)}
            </div>
            <p className="text-muted-foreground text-xs">Per API call</p>
          </CardContent>
        </Card>

        <Card className={getCacheHitRateBg(platformUsage.averageCacheHitRate)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Cache Hit Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold text-2xl ${getCacheHitRateColor(platformUsage.averageCacheHitRate)}`}
            >
              {platformUsage.averageCacheHitRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">
              {getCacheHitRateLabel(platformUsage.averageCacheHitRate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cost Trend (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {platformUsage.dailyCosts.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No data available for the selected period
              </p>
            ) : (
              <div className="space-y-1">
                {platformUsage.dailyCosts.map(
                  (day: { date: string; cost: number; callCount: number }) => {
                    const heightPercent = (day.cost / maxDailyCost) * 100;
                    return (
                      <div
                        className="flex items-center gap-2 text-sm"
                        key={day.date}
                      >
                        <div className="w-24 text-muted-foreground text-xs">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="flex-1">
                          <div className="relative h-8 w-full overflow-hidden rounded bg-gray-100">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${heightPercent}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right font-medium text-xs">
                          ${day.cost.toFixed(2)}
                        </div>
                        <div className="w-16 text-right text-muted-foreground text-xs">
                          {day.callCount} calls
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Organizations by Cost */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 10 Organizations by Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          {platformUsage.byOrganization.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No organizations with AI usage in this period
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Avg Cost/Call</TableHead>
                  <TableHead className="text-right">Cache Hit Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformUsage.byOrganization.map(
                  (
                    org: {
                      organizationId: string;
                      organizationName: string;
                      cost: number;
                      callCount: number;
                      averageCacheHitRate: number;
                    },
                    index: number
                  ) => {
                    const avgCost = org.cost / org.callCount;
                    return (
                      <TableRow key={org.organizationId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 font-semibold text-xs">
                              {index + 1}
                            </span>
                            <span className="font-mono text-sm">
                              {org.organizationName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${org.cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {org.callCount}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          ${avgCost.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${getCacheHitRateColor(org.averageCacheHitRate)}`}
                          >
                            {org.averageCacheHitRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Rate Limits Tab Component
function RateLimitsTab() {
  const platformLimits = useQuery(api.models.rateLimits.getPlatformRateLimits);
  const orgLimits = useQuery(api.models.rateLimits.getOrgRateLimits);
  const updatePlatformLimit = useMutation(
    api.models.rateLimits.updatePlatformRateLimit
  );
  const updateOrgLimit = useMutation(api.models.rateLimits.updateOrgRateLimit);
  const deleteOrgLimit = useMutation(api.models.rateLimits.deleteOrgRateLimit);

  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEditClick = (limitId: string, currentValue: number) => {
    setEditingLimitId(limitId);
    setEditValue(currentValue.toString());
  };

  const handleSave = async (limitId: string, isPlatform: boolean) => {
    const newValue = Number.parseFloat(editValue);
    if (Number.isNaN(newValue) || newValue <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    try {
      if (isPlatform) {
        await updatePlatformLimit({
          limitId:
            limitId as import("@pdp/backend/convex/_generated/dataModel").Id<"rateLimits">,
          newLimitValue: newValue,
        });
        toast.success("Platform limit updated successfully");
      } else {
        await updateOrgLimit({
          limitId:
            limitId as import("@pdp/backend/convex/_generated/dataModel").Id<"rateLimits">,
          newLimitValue: newValue,
        });
        toast.success("Organization limit updated successfully");
      }
      setEditingLimitId(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update limit";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (limitId: string) => {
    // Note: In production, replace with a proper confirmation dialog component
    // biome-ignore lint/suspicious/noAlert: Temporary simple confirmation
    const confirmed = confirm(
      "Are you sure you want to delete this organization limit override?"
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteOrgLimit({
        limitId:
          limitId as import("@pdp/backend/convex/_generated/dataModel").Id<"rateLimits">,
      });
      toast.success("Organization limit deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete limit";
      toast.error(errorMessage);
    }
  };

  const formatLimitType = (type: string): string =>
    type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const formatTimeRemaining = (windowEnd: number): string => {
    const remaining = windowEnd - Date.now();
    if (remaining <= 0) {
      return "Resetting soon...";
    }
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!(platformLimits && orgLimits)) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform-Wide Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Platform-Wide Rate Limits
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Global safety limits applied across all organizations
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Limit Type</TableHead>
                <TableHead>Limit Value</TableHead>
                <TableHead>Current Usage</TableHead>
                <TableHead>Window Resets In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platformLimits.map((limit) => {
                const isEditing = editingLimitId === limit._id;
                const usagePercent = limit.limitType.includes("cost")
                  ? (limit.currentCost / limit.limitValue) * 100
                  : (limit.currentCount / limit.limitValue) * 100;
                const isNearLimit = usagePercent >= 80;

                return (
                  <TableRow key={limit._id}>
                    <TableCell className="font-medium">
                      {formatLimitType(limit.limitType)}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-32"
                            onChange={(e) => setEditValue(e.target.value)}
                            type="number"
                            value={editValue}
                          />
                          <Button
                            onClick={() => handleSave(limit._id, true)}
                            size="sm"
                            variant="ghost"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => setEditingLimitId(null)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>
                            {limit.limitType.includes("cost")
                              ? `$${limit.limitValue}`
                              : limit.limitValue.toLocaleString()}
                          </span>
                          <Button
                            onClick={() =>
                              handleEditClick(limit._id, limit.limitValue)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>
                          {limit.limitType.includes("cost")
                            ? `$${limit.currentCost.toFixed(2)}`
                            : limit.currentCount.toLocaleString()}
                        </span>
                        <Badge
                          variant={isNearLimit ? "destructive" : "secondary"}
                        >
                          {usagePercent.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTimeRemaining(limit.windowEnd)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isNearLimit && (
                        <Badge variant="destructive">Near Limit</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Organization-Specific Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Per-Organization Overrides
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Custom rate limits for specific organizations
          </p>
        </CardHeader>
        <CardContent>
          {orgLimits.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No organization-specific rate limits configured.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization ID</TableHead>
                  <TableHead>Limit Type</TableHead>
                  <TableHead>Limit Value</TableHead>
                  <TableHead>Current Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgLimits.map((limit) => {
                  const isEditing = editingLimitId === limit._id;
                  const usagePercent = limit.limitType.includes("cost")
                    ? (limit.currentCost / limit.limitValue) * 100
                    : (limit.currentCount / limit.limitValue) * 100;

                  return (
                    <TableRow key={limit._id}>
                      <TableCell className="font-mono text-sm">
                        {limit.organizationId.slice(0, 12)}...
                      </TableCell>
                      <TableCell>{formatLimitType(limit.limitType)}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              className="w-32"
                              onChange={(e) => setEditValue(e.target.value)}
                              type="number"
                              value={editValue}
                            />
                            <Button
                              onClick={() => handleSave(limit._id, false)}
                              size="sm"
                              variant="ghost"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setEditingLimitId(null)}
                              size="sm"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>
                              {limit.limitType.includes("cost")
                                ? `$${limit.limitValue}`
                                : limit.limitValue.toLocaleString()}
                            </span>
                            <Button
                              onClick={() =>
                                handleEditClick(limit._id, limit.limitValue)
                              }
                              size="sm"
                              variant="ghost"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>
                            {limit.limitType.includes("cost")
                              ? `$${limit.currentCost.toFixed(2)}`
                              : limit.currentCount.toLocaleString()}
                          </span>
                          <Badge variant="secondary">
                            {usagePercent.toFixed(1)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleDelete(limit._id)}
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
