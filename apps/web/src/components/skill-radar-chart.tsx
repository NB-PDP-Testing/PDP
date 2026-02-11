"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Radar } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SkillRadarChartProps = {
  playerId: Id<"playerIdentities">;
  sportCode: string;
  dateOfBirth?: string;
  ageGroup?: string;
  level?: "recreational" | "competitive" | "development" | "elite";
  defaultExpanded?: boolean;
};

// Colors for chart
const CHART_COLORS = {
  player: {
    stroke: "#22c55e",
    fill: "#22c55e",
    fillOpacity: 0.3,
  },
  benchmark: {
    stroke: "#3b82f6",
    fill: "#3b82f6",
    fillOpacity: 0.15,
  },
};

// Category display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  // Soccer categories
  ball_mastery: "Ball Mastery",
  passing: "Passing",
  shooting: "Shooting",
  tactical: "Tactical",
  physical: "Physical",
  character: "Character",
  // GAA categories
  kicking: "Kicking",
  catching: "Catching",
  free_taking: "Free Taking",
  defensive: "Defensive",
  laterality: "Laterality",
  // Rugby categories
  passing_handling: "Passing & Handling",
  catching_receiving: "Catching",
  running_ball_carry: "Running",
  contact_breakdown: "Contact",
};

// Abbreviate long skill/category names for radar chart labels
function abbreviateLabel(label: string, maxLength = 14): string {
  if (label.length <= maxLength) {
    return label;
  }

  // Common abbreviations
  const abbreviations: Record<string, string> = {
    "Kicking (Long)": "Kick (Long)",
    "Kicking (Short)": "Kick (Short)",
    "Free Taking (Ground)": "Free (Ground)",
    "Free Taking (Hand)": "Free (Hand)",
    "High Catching": "High Catch",
    "Hand Passing": "Hand Pass",
    "Positional Sense": "Position",
    "Decision Making": "Decisions",
    "Decision Speed": "Dec. Speed",
    "Passing & Handling": "Pass/Handle",
    "Ball Mastery": "Ball Mastery",
    "Tactical & Decision Making": "Tactical",
  };

  if (abbreviations[label]) {
    return abbreviations[label];
  }

  // Generic truncation with ellipsis
  return `${label.substring(0, maxLength - 1)}…`;
}

export function SkillRadarChart({
  playerId,
  sportCode,
  dateOfBirth,
  ageGroup,
  level = "recreational",
  defaultExpanded = true,
}: SkillRadarChartProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [activeTab, setActiveTab] = useState<"categories" | "all">(
    "categories"
  );

  // Get skill definitions grouped by category
  const skillsByCategory = useQuery(
    api.models.referenceData.getSkillsByCategoryForSport,
    { sportCode }
  );

  // Get player's latest assessments
  const assessments = useQuery(
    api.models.skillAssessments.getAssessmentsForPlayer,
    { playerIdentityId: playerId, sportCode }
  );

  // Get benchmarks if DOB or ageGroup is available
  const benchmarks = useQuery(
    api.models.referenceData.getBenchmarksForPlayer,
    dateOfBirth || ageGroup
      ? { sportCode, dateOfBirth, ageGroup, level }
      : "skip"
  );

  // Create lookup maps
  const latestAssessments = useMemo(() => {
    if (!assessments) {
      return new Map<string, number>();
    }
    const map = new Map<string, number>();
    // Assessments are returned in desc order, so first occurrence is latest
    for (const a of assessments) {
      if (!map.has(a.skillCode)) {
        map.set(a.skillCode, a.rating);
      }
    }
    return map;
  }, [assessments]);

  const benchmarkLookup = useMemo(() => {
    if (!benchmarks) {
      return new Map<string, number>();
    }
    return new Map(benchmarks.map((b) => [b.skillCode, b.expectedRating]));
  }, [benchmarks]);

  // Calculate category averages for radar chart
  const categoryRadarData = useMemo(() => {
    if (!skillsByCategory) {
      return [];
    }

    return skillsByCategory
      .map(({ category, skills }) => {
        // Calculate average player rating for this category
        let totalPlayerRating = 0;
        let playerSkillCount = 0;
        let totalBenchmark = 0;
        let benchmarkCount = 0;

        for (const skill of skills) {
          const playerRating = latestAssessments.get(skill.code);
          if (playerRating !== undefined) {
            totalPlayerRating += playerRating;
            playerSkillCount += 1;
          }

          const benchmarkRating = benchmarkLookup.get(skill.code);
          if (benchmarkRating !== undefined) {
            totalBenchmark += benchmarkRating;
            benchmarkCount += 1;
          }
        }

        const avgPlayerRating =
          playerSkillCount > 0 ? totalPlayerRating / playerSkillCount : 0;
        const avgBenchmark =
          benchmarkCount > 0 ? totalBenchmark / benchmarkCount : 0;

        const categoryName =
          CATEGORY_DISPLAY_NAMES[category.code] || category.name;
        return {
          category: categoryName,
          categoryShort: abbreviateLabel(categoryName),
          categoryCode: category.code,
          playerRating: Number(avgPlayerRating.toFixed(2)),
          benchmark: Number(avgBenchmark.toFixed(2)),
          skillCount: skills.length,
          assessedCount: playerSkillCount,
          fullMark: 5,
        };
      })
      .filter((d) => d.assessedCount > 0); // Only show categories with assessments
  }, [skillsByCategory, latestAssessments, benchmarkLookup]);

  // Individual skills radar data
  const skillsRadarData = useMemo(() => {
    if (!skillsByCategory) {
      return [];
    }

    const allSkills: Array<{
      skill: string;
      skillShort: string;
      skillCode: string;
      playerRating: number;
      benchmark: number;
      fullMark: number;
    }> = [];

    for (const { skills } of skillsByCategory) {
      for (const skill of skills) {
        const playerRating = latestAssessments.get(skill.code);
        if (playerRating !== undefined) {
          allSkills.push({
            skill: skill.name,
            skillShort: abbreviateLabel(skill.name),
            skillCode: skill.code,
            playerRating,
            benchmark: benchmarkLookup.get(skill.code) ?? 0,
            fullMark: 5,
          });
        }
      }
    }

    // Limit to top 12 skills for readability
    return allSkills.slice(0, 12);
  }, [skillsByCategory, latestAssessments, benchmarkLookup]);

  // Loading state
  if (!(skillsByCategory && assessments)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Skills Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // No assessments
  if (latestAssessments.size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Skills Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No skill assessments have been recorded yet. Once skills are
            assessed, a radar chart will visualize the player's skill profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not enough data for a meaningful radar chart (need at least 3 points for a polygon)
  if (categoryRadarData.length < 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Skills Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            More skill assessments are needed to display the radar chart. At
            least 3 skill categories with assessments are required.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            <strong>Debug info:</strong> Sport: {sportCode} | Total assessments:{" "}
            {assessments?.length ?? 0} | Unique skills assessed:{" "}
            {latestAssessments.size} | Categories with assessments:{" "}
            {categoryRadarData.length} | Total categories available:{" "}
            {skillsByCategory?.length ?? 0}
          </p>
          {categoryRadarData.length > 0 && (
            <p className="mt-1 text-muted-foreground text-xs">
              Categories found:{" "}
              {categoryRadarData.map((c) => c.category).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const hasBenchmarks = benchmarkLookup.size > 0;

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5" />
                Skills Overview
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Tabs
                onValueChange={(v) => setActiveTab(v as "categories" | "all")}
                value={activeTab}
              >
                <TabsList>
                  <TabsTrigger value="categories">By Category</TabsTrigger>
                  <TabsTrigger value="all">Individual Skills</TabsTrigger>
                </TabsList>
              </Tabs>

              {hasBenchmarks && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showBenchmark}
                    id="show-benchmark"
                    onCheckedChange={setShowBenchmark}
                  />
                  <Label className="text-sm" htmlFor="show-benchmark">
                    Show Benchmark
                  </Label>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="h-[350px]">
              <ResponsiveContainer height="100%" width="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  data={
                    activeTab === "categories"
                      ? categoryRadarData
                      : skillsRadarData
                  }
                  outerRadius="65%"
                >
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey={
                      activeTab === "categories"
                        ? "categoryShort"
                        : "skillShort"
                    }
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />

                  {/* Benchmark area (shown first so player area overlays it) */}
                  {showBenchmark && hasBenchmarks && (
                    <RechartsRadar
                      dataKey="benchmark"
                      fill={CHART_COLORS.benchmark.fill}
                      fillOpacity={CHART_COLORS.benchmark.fillOpacity}
                      name="Benchmark"
                      stroke={CHART_COLORS.benchmark.stroke}
                      strokeDasharray="5 5"
                    />
                  )}

                  {/* Player ratings */}
                  <RechartsRadar
                    dataKey="playerRating"
                    fill={CHART_COLORS.player.fill}
                    fillOpacity={CHART_COLORS.player.fillOpacity}
                    name="Player"
                    stroke={CHART_COLORS.player.stroke}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-medium">
                              {activeTab === "categories"
                                ? data.category
                                : data.skill}
                            </p>
                            <div className="mt-1 space-y-1 text-sm">
                              <p className="text-green-600">
                                Player: {data.playerRating.toFixed(1)}
                              </p>
                              {showBenchmark && data.benchmark > 0 && (
                                <p className="text-blue-600">
                                  Benchmark: {data.benchmark.toFixed(1)}
                                </p>
                              )}
                              {activeTab === "categories" &&
                                data.assessedCount && (
                                  <p className="text-muted-foreground text-xs">
                                    {data.assessedCount} of {data.skillCount}{" "}
                                    skills assessed
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Legend
                    formatter={(value) => (
                      <span className="text-foreground text-sm">{value}</span>
                    )}
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend/Info */}
            <div className="flex flex-col gap-2 text-muted-foreground text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3"
                  style={{ backgroundColor: CHART_COLORS.player.fill }}
                />
                <span>Player's current ratings</span>
              </div>
              {hasBenchmarks && showBenchmark ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full border-2 border-dashed"
                    style={{ borderColor: CHART_COLORS.benchmark.stroke }}
                  />
                  <span>
                    Age-appropriate benchmark (
                    {benchmarks?.[0]?.ageGroup?.toUpperCase()})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Benchmarks coming soon</span>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Compact version for embedding in other components
export function SkillRadarChartCompact({
  playerId,
  sportCode,
  dateOfBirth,
  ageGroup,
  level = "recreational",
  height = 250,
  showBenchmark = true,
}: SkillRadarChartProps & { height?: number; showBenchmark?: boolean }) {
  // Get skill definitions grouped by category
  const skillsByCategory = useQuery(
    api.models.referenceData.getSkillsByCategoryForSport,
    { sportCode }
  );

  // Get player's latest assessments
  const assessments = useQuery(
    api.models.skillAssessments.getAssessmentsForPlayer,
    { playerIdentityId: playerId, sportCode }
  );

  // Get benchmarks if DOB or ageGroup is available
  const benchmarks = useQuery(
    api.models.referenceData.getBenchmarksForPlayer,
    dateOfBirth || ageGroup
      ? { sportCode, dateOfBirth, ageGroup, level }
      : "skip"
  );

  // Create lookup maps
  const latestAssessments = useMemo(() => {
    if (!assessments) {
      return new Map<string, number>();
    }
    const map = new Map<string, number>();
    for (const a of assessments) {
      if (!map.has(a.skillCode)) {
        map.set(a.skillCode, a.rating);
      }
    }
    return map;
  }, [assessments]);

  const benchmarkLookup = useMemo(() => {
    if (!benchmarks) {
      return new Map<string, number>();
    }
    return new Map(benchmarks.map((b) => [b.skillCode, b.expectedRating]));
  }, [benchmarks]);

  // Calculate category averages
  const categoryRadarData = useMemo(() => {
    if (!skillsByCategory) {
      return [];
    }

    return skillsByCategory
      .map(({ category, skills }) => {
        let totalPlayerRating = 0;
        let playerSkillCount = 0;
        let totalBenchmark = 0;
        let benchmarkCount = 0;

        for (const skill of skills) {
          const playerRating = latestAssessments.get(skill.code);
          if (playerRating !== undefined) {
            totalPlayerRating += playerRating;
            playerSkillCount += 1;
          }

          const benchmarkRating = benchmarkLookup.get(skill.code);
          if (benchmarkRating !== undefined) {
            totalBenchmark += benchmarkRating;
            benchmarkCount += 1;
          }
        }

        const avgPlayerRating =
          playerSkillCount > 0 ? totalPlayerRating / playerSkillCount : 0;
        const avgBenchmark =
          benchmarkCount > 0 ? totalBenchmark / benchmarkCount : 0;

        const categoryName =
          CATEGORY_DISPLAY_NAMES[category.code] || category.name;
        return {
          category: categoryName,
          categoryShort: abbreviateLabel(categoryName),
          playerRating: Number(avgPlayerRating.toFixed(2)),
          benchmark: Number(avgBenchmark.toFixed(2)),
          fullMark: 5,
        };
      })
      .filter((d) => d.playerRating > 0);
  }, [skillsByCategory, latestAssessments, benchmarkLookup]);

  if (!(skillsByCategory && assessments) || categoryRadarData.length < 3) {
    return null;
  }

  const hasBenchmarks = benchmarkLookup.size > 0;

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          data={categoryRadarData}
          outerRadius="65%"
        >
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis dataKey="categoryShort" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={false}
            tickCount={6}
          />

          {showBenchmark && hasBenchmarks && (
            <RechartsRadar
              dataKey="benchmark"
              fill={CHART_COLORS.benchmark.fill}
              fillOpacity={CHART_COLORS.benchmark.fillOpacity}
              name="Benchmark"
              stroke={CHART_COLORS.benchmark.stroke}
              strokeDasharray="5 5"
            />
          )}

          <RechartsRadar
            dataKey="playerRating"
            fill={CHART_COLORS.player.fill}
            fillOpacity={CHART_COLORS.player.fillOpacity}
            name="Player"
            stroke={CHART_COLORS.player.stroke}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
