"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "@/components/loader";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TimeRange = "7days" | "30days" | "90days" | "all";

export default function ImportAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [showAllErrors, setShowAllErrors] = useState(false);

  // Fetch analytics data
  const analytics = useQuery(
    api.models.importAnalytics.getPlatformImportAnalytics,
    { timeRange }
  );

  // Fetch detailed common errors
  const commonErrorsData = useQuery(
    api.models.importAnalytics.getCommonErrors,
    {}
  );

  // Fetch import activity over time for chart
  const activityData = useQuery(
    api.models.importAnalytics.getImportActivityOverTime,
    { timeRange }
  );

  // Export errors to CSV
  const exportErrorsToCSV = () => {
    if (!commonErrorsData?.errors || commonErrorsData.errors.length === 0) {
      return;
    }

    const headers = [
      "Error Message",
      "Occurrences",
      "Affected Organizations",
      "Percentage",
    ];
    const csvRows = [headers.join(",")];

    for (const error of commonErrorsData.errors) {
      const row = [
        `"${error.errorMessage.replace(/"/g, '""')}"`,
        error.occurrences.toString(),
        error.affectedOrgs.toString(),
        `${error.percentage.toFixed(2)}%`,
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Determine displayed errors (top 10 or all)
  const displayedErrors = useMemo(() => {
    if (!commonErrorsData?.errors) {
      return [];
    }
    return showAllErrors
      ? commonErrorsData.errors
      : commonErrorsData.errors.slice(0, 10);
  }, [commonErrorsData, showAllErrors]);

  // Use real activity data for chart
  const chartData = activityData || [];

  if (!(analytics && commonErrorsData && activityData)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Import Analytics
            </h1>
            <p className="text-muted-foreground">
              Platform-wide import performance and error tracking
            </p>
          </div>

          {/* Time Range Selector */}
          <Select
            onValueChange={(value) => setTimeRange(value as TimeRange)}
            value={timeRange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Imports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Imports
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{analytics.totalImports}</div>
              <div className="flex items-center gap-1 pt-1 text-muted-foreground text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {timeRange === "7days"
                    ? "Last 7 days"
                    : timeRange === "30days"
                      ? "Last 30 days"
                      : timeRange === "90days"
                        ? "Last 90 days"
                        : "All time"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {analytics.successRate.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1 pt-1">
                <Badge
                  className="text-xs"
                  variant={
                    analytics.successRate >= 90
                      ? "default"
                      : analytics.successRate >= 70
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {analytics.successRate >= 90 ? (
                    <>
                      <ArrowUp className="mr-1 h-3 w-3" />
                      Excellent
                    </>
                  ) : analytics.successRate >= 70 ? (
                    <>
                      <Activity className="mr-1 h-3 w-3" />
                      Good
                    </>
                  ) : (
                    <>
                      <ArrowDown className="mr-1 h-3 w-3" />
                      Needs Attention
                    </>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Players Imported */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Players
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {analytics.totalPlayersImported.toLocaleString()}
              </div>
              <p className="pt-1 text-muted-foreground text-xs">
                Imported across all organizations
              </p>
            </CardContent>
          </Card>

          {/* Average Import Size */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Avg Import Size
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {analytics.averagePlayersPerImport.toFixed(1)}
              </div>
              <p className="pt-1 text-muted-foreground text-xs">
                Players per import
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Import Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Import Activity</CardTitle>
            <CardDescription>
              Number of imports over time (last{" "}
              {timeRange === "7days"
                ? "7 days"
                : timeRange === "30days"
                  ? "30 days"
                  : timeRange === "90days"
                    ? "90 days"
                    : "all time"}
              )
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    dataKey="imports"
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Total Imports"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Line
                    dataKey="successfulImports"
                    dot={{ fill: "hsl(142 76% 36%)" }}
                    name="Successful"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Line
                    dataKey="failedImports"
                    dot={{ fill: "hsl(var(--destructive))" }}
                    name="Failed"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Common Errors Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Common Errors</CardTitle>
                <CardDescription>
                  Most frequently encountered errors across all imports{" "}
                  {showAllErrors
                    ? `(showing all ${commonErrorsData.errors.length})`
                    : "(top 10)"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={commonErrorsData.errors.length === 0}
                  onClick={exportErrorsToCSV}
                  size="sm"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {commonErrorsData.errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="font-medium text-muted-foreground">
                  No errors found
                </p>
                <p className="text-muted-foreground text-sm">
                  All imports completed successfully
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-full">Error Message</TableHead>
                        <TableHead className="text-right">
                          Occurrences
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>Orgs</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedErrors.map((error) => (
                        <TableRow key={error.errorMessage}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                              <span
                                className="line-clamp-2"
                                title={error.errorMessage}
                              >
                                {error.errorMessage}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {error.occurrences}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {error.affectedOrgs}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                error.percentage > 10
                                  ? "destructive"
                                  : error.percentage > 5
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {error.percentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {commonErrorsData.errors.length > 10 && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={() => setShowAllErrors(!showAllErrors)}
                      size="sm"
                      variant="outline"
                    >
                      {showAllErrors ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Show More ({commonErrorsData.errors.length - 10} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
