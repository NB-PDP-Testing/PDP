"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Activity,
  BarChart3,
  Calendar,
  Filter,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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

// Colors for charts
const COLORS = {
  below: "#ef4444",
  developing: "#f59e0b",
  on_track: "#22c55e",
  exceeding: "#3b82f6",
  exceptional: "#8b5cf6",
};

const _STATUS_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"];

export default function AnalyticsDashboard() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Filters
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Get analytics data
  const analyticsData = useQuery(
    api.models.skillAssessments.getClubBenchmarkAnalytics,
    {
      organizationId: orgId,
      sportCode: sportFilter !== "all" ? sportFilter : undefined,
      ageGroup: ageGroupFilter !== "all" ? ageGroupFilter : undefined,
    }
  );

  // Get all assessments for trend data
  const startDate = useMemo(() => {
    if (dateRange === "7d") {
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    }
    if (dateRange === "30d") {
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    }
    if (dateRange === "90d") {
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    }
    return;
  }, [dateRange]);

  const allAssessments = useQuery(
    api.models.skillAssessments.getOrgAssessments,
    {
      organizationId: orgId,
      startDate,
    }
  );

  // Get teams for filter dropdown
  const _teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get sports for filter
  const sports = useQuery(api.models.referenceData.getSports);

  // Calculate additional metrics including unique player count
  const metrics = useMemo(() => {
    if (!allAssessments) {
      return null;
    }

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthStr = thisMonth.toISOString().split("T")[0];

    const assessmentsThisMonth = allAssessments.filter(
      (a) => a.assessmentDate >= thisMonthStr
    );

    const avgRating =
      allAssessments.length > 0
        ? allAssessments.reduce((sum, a) => sum + a.rating, 0) /
          allAssessments.length
        : 0;

    // Calculate trend (compare this month vs last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    const lastMonthStr = lastMonth.toISOString().split("T")[0];

    const lastMonthAssessments = allAssessments.filter(
      (a) => a.assessmentDate >= lastMonthStr && a.assessmentDate < thisMonthStr
    );

    const lastMonthAvg =
      lastMonthAssessments.length > 0
        ? lastMonthAssessments.reduce((sum, a) => sum + a.rating, 0) /
          lastMonthAssessments.length
        : 0;

    const thisMonthAvg =
      assessmentsThisMonth.length > 0
        ? assessmentsThisMonth.reduce((sum, a) => sum + a.rating, 0) /
          assessmentsThisMonth.length
        : 0;

    const ratingTrend =
      lastMonthAvg > 0
        ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100
        : 0;

    // Count unique players (works for all assessments, not just those with benchmark data)
    const uniquePlayerIds = new Set(
      allAssessments.map((a) => a.playerIdentityId)
    );

    return {
      totalAssessments: allAssessments.length,
      assessmentsThisMonth: assessmentsThisMonth.length,
      avgRating,
      ratingTrend,
      uniquePlayerCount: uniquePlayerIds.size,
    };
  }, [allAssessments]);

  // Prepare chart data
  const statusDistributionData = useMemo(() => {
    if (!analyticsData?.statusDistribution) {
      return [];
    }
    return [
      {
        name: "Below",
        value: analyticsData.statusDistribution.below,
        color: COLORS.below,
      },
      {
        name: "Developing",
        value: analyticsData.statusDistribution.developing,
        color: COLORS.developing,
      },
      {
        name: "On Track",
        value: analyticsData.statusDistribution.on_track,
        color: COLORS.on_track,
      },
      {
        name: "Exceeding",
        value: analyticsData.statusDistribution.exceeding,
        color: COLORS.exceeding,
      },
      {
        name: "Exceptional",
        value: analyticsData.statusDistribution.exceptional,
        color: COLORS.exceptional,
      },
    ].filter((d) => d.value > 0);
  }, [analyticsData]);

  // Progress over time (group by week)
  const progressOverTimeData = useMemo(() => {
    if (!allAssessments) {
      return [];
    }

    const weeklyData = new Map<
      string,
      { week: string; count: number; avgRating: number; totalRating: number }
    >();

    for (const assessment of allAssessments) {
      const date = new Date(assessment.assessmentDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      const existing = weeklyData.get(weekKey) || {
        week: weekKey,
        count: 0,
        avgRating: 0,
        totalRating: 0,
      };
      existing.count++;
      existing.totalRating += assessment.rating;
      existing.avgRating = existing.totalRating / existing.count;
      weeklyData.set(weekKey, existing);
    }

    return Array.from(weeklyData.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12) // Last 12 weeks
      .map((d) => ({
        week: new Date(d.week).toLocaleDateString("en-IE", {
          month: "short",
          day: "numeric",
        }),
        assessments: d.count,
        avgRating: Number(d.avgRating.toFixed(2)),
      }));
  }, [allAssessments]);

  // Skills needing attention bar chart
  const skillsBarData = useMemo(() => {
    if (!analyticsData?.skillsNeedingAttention) {
      return [];
    }
    return analyticsData.skillsNeedingAttention
      .slice(0, 8)
      .map(
        (s: {
          skillCode: string;
          belowPercentage: number;
          belowCount: number;
        }) => ({
          skill: s.skillCode
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          belowPercent: Math.round(s.belowPercentage),
          belowCount: s.belowCount,
        })
      );
  }, [analyticsData]);

  // Radar chart for skill categories (aggregate by category)
  const skillRadarData = useMemo(() => {
    if (!analyticsData?.skillStats) {
      return [];
    }

    const categories = new Map<string, { total: number; onTrack: number }>();

    for (const [skillCode, stats] of Object.entries(
      analyticsData.skillStats as Record<
        string,
        {
          on_track: number;
          exceeding: number;
          exceptional: number;
          total: number;
        }
      >
    )) {
      // Extract category from skill code (e.g., "passing_accuracy" -> "passing")
      const category = skillCode.split("_")[0];
      const existing = categories.get(category) || { total: 0, onTrack: 0 };
      existing.total += stats.total;
      existing.onTrack += stats.on_track + stats.exceeding + stats.exceptional;
      categories.set(category, existing);
    }

    return Array.from(categories.entries())
      .map(([category, stats]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        onTrackPercent:
          stats.total > 0 ? Math.round((stats.onTrack / stats.total) * 100) : 0,
        fullMark: 100,
      }))
      .slice(0, 8);
  }, [analyticsData]);

  if (!(analyticsData && metrics)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Performance insights and skill development analytics
          </p>
        </div>
        <Badge className="text-sm" variant="outline">
          <Activity className="mr-1 h-3 w-3" />
          Live Data
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Filters:</span>
            </div>

            <Select onValueChange={setDateRange} value={dateRange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSportFilter} value={sportFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {sports?.map((sport: { code: string; name: string }) => (
                  <SelectItem key={sport.code} value={sport.code}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setAgeGroupFilter} value={ageGroupFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                {[
                  "u8",
                  "u9",
                  "u10",
                  "u11",
                  "u12",
                  "u13",
                  "u14",
                  "u15",
                  "u16",
                  "u17",
                  "u18",
                  "senior",
                ].map((ag) => (
                  <SelectItem key={ag} value={ag}>
                    {ag.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                setDateRange("all");
                setSportFilter("all");
                setAgeGroupFilter("all");
              }}
              size="sm"
              variant="ghost"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {metrics.uniquePlayerCount}
            </div>
            <p className="text-muted-foreground text-xs">
              With skill assessments
              {analyticsData.totalPlayers > 0 &&
                analyticsData.totalPlayers !== metrics.uniquePlayerCount && (
                  <span className="ml-1">
                    ({analyticsData.totalPlayers} with benchmarks)
                  </span>
                )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Avg. Skill Rating
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl">
                {metrics.avgRating.toFixed(1)}
              </span>
              <span className="text-muted-foreground text-sm">/ 5</span>
            </div>
            {metrics.ratingTrend !== 0 && (
              <p
                className={`flex items-center text-xs ${metrics.ratingTrend > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {metrics.ratingTrend > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {Math.abs(metrics.ratingTrend).toFixed(1)}% from last month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Assessments This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {metrics.assessmentsThisMonth}
            </div>
            <p className="text-muted-foreground text-xs">
              {metrics.totalAssessments} total assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">On Track Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl text-green-600">
                {Math.round(analyticsData.onTrackPercentage)}%
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Meeting or exceeding benchmarks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skill Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Status Distribution</CardTitle>
            <CardDescription>
              How players compare to benchmarks across all skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={statusDistributionData}
                    dataKey="value"
                    innerRadius={60}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell fill={entry.color} key={`cell-${index}`} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skills Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle>Skills Needing Attention</CardTitle>
            <CardDescription>
              Skills where &gt;25% of players are below benchmark
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {skillsBarData.length > 0 ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={skillsBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      type="number"
                    />
                    <YAxis dataKey="skill" type="category" width={120} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar
                      dataKey="belowPercent"
                      fill="#ef4444"
                      name="Below Benchmark %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>All skills are on track! 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progress Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Activity Over Time</CardTitle>
            <CardDescription>
              Weekly assessment counts and average ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {progressOverTimeData.length > 0 ? (
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={progressOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" />
                    <YAxis
                      domain={[1, 5]}
                      orientation="right"
                      yAxisId="right"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="assessments"
                      fill="#3b82f6"
                      name="Assessments"
                      yAxisId="left"
                    />
                    <Line
                      dataKey="avgRating"
                      name="Avg Rating"
                      stroke="#22c55e"
                      strokeWidth={2}
                      type="monotone"
                      yAxisId="right"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>No assessment data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skill Category Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Category Performance</CardTitle>
            <CardDescription>
              % of players on track by skill category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {skillRadarData.length > 0 ? (
                <ResponsiveContainer height="100%" width="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    data={skillRadarData}
                    outerRadius="80%"
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      dataKey="onTrackPercent"
                      fill="#22c55e"
                      fillOpacity={0.5}
                      name="On Track %"
                      stroke="#22c55e"
                    />
                    <Legend />
                    <Tooltip formatter={(value) => `${value}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>No skill category data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Players Needing Attention */}
      {analyticsData.playersNeedingAttention?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Players Needing Attention
            </CardTitle>
            <CardDescription>
              Players with 2 or more skills below benchmark
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analyticsData.playersNeedingAttention.map(
                (player: {
                  playerIdentityId: string;
                  firstName: string;
                  lastName: string;
                  belowCount: number;
                }) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={player.playerIdentityId}
                  >
                    <div>
                      <p className="font-medium">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {player.belowCount} skills below benchmark
                      </p>
                    </div>
                    <Badge variant="destructive">{player.belowCount}</Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
