"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Rating level color mapping
const RATING_COLORS = {
  1: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  2: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  3: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  4: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  5: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

const STATUS_COLORS = {
  below: { bg: "bg-red-100", text: "text-red-700", label: "Below Expected" },
  developing: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Developing",
  },
  on_track: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "On Track",
  },
  exceeding: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Exceeding",
  },
  exceptional: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Exceptional",
  },
};

function getRatingColors(rating: number) {
  const level = Math.round(Math.max(1, Math.min(5, rating)));
  return RATING_COLORS[level as keyof typeof RATING_COLORS];
}

type BenchmarkComparisonProps = {
  playerId: Id<"playerIdentities">;
  sportCode: string;
  dateOfBirth?: string;
  ageGroup?: string;
  level?: "recreational" | "competitive" | "development" | "elite";
  showAllSkills?: boolean;
};

export function BenchmarkComparison({
  playerId,
  sportCode,
  dateOfBirth,
  ageGroup,
  level = "recreational",
  showAllSkills = false,
}: BenchmarkComparisonProps) {
  // Get benchmarks for this player (skip only if BOTH DOB and ageGroup are missing)
  const benchmarks = useQuery(
    api.models.referenceData.getBenchmarksForPlayer,
    dateOfBirth || ageGroup
      ? { sportCode, dateOfBirth, ageGroup, level }
      : "skip"
  );

  // Get skill definitions to display names
  const skills = useQuery(api.models.referenceData.getSkillDefinitionsBySport, {
    sportCode,
  });

  // Get player's latest assessments
  const assessments = useQuery(
    api.models.skillAssessments.getAssessmentsForPlayer,
    { playerIdentityId: playerId, sportCode }
  );

  // Benchmark type
  type BenchmarkData = {
    skillCode: string;
    expectedRating: number;
    minAcceptable: number;
    developingThreshold: number;
    excellentThreshold: number;
    ageGroup: string;
    source: string;
  };

  // Create lookup maps
  const skillLookup = useMemo(() => {
    if (!skills) {
      return new Map<string, string>();
    }
    return new Map(skills.map((s) => [s.code, s.name]));
  }, [skills]);

  const benchmarkLookup = useMemo(() => {
    if (!benchmarks) {
      return new Map<string, BenchmarkData>();
    }
    return new Map(benchmarks.map((b) => [b.skillCode, b]));
  }, [benchmarks]);

  // Get latest assessment per skill
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

  // Get skills that have both benchmarks and assessments
  const comparableSkills = useMemo(() => {
    if (!(benchmarks && assessments)) {
      return [];
    }

    const skillsToShow = showAllSkills
      ? Array.from(benchmarkLookup.keys())
      : Array.from(latestAssessments.keys()).filter((sk) =>
          benchmarkLookup.has(sk)
        );

    return skillsToShow.map((skillCode) => {
      const benchmark = benchmarkLookup.get(skillCode);
      const rating = latestAssessments.get(skillCode) ?? 0;

      let status: keyof typeof STATUS_COLORS = "on_track";
      if (benchmark) {
        if (rating < benchmark.minAcceptable) {
          status = "below";
        } else if (rating < benchmark.developingThreshold) {
          status = "developing";
        } else if (rating < benchmark.excellentThreshold) {
          status = "on_track";
        } else if (rating < 5) {
          status = "exceeding";
        } else {
          status = "exceptional";
        }
      }

      return {
        skillCode,
        skillName: skillLookup.get(skillCode) ?? skillCode,
        rating,
        benchmark,
        status,
        delta: benchmark ? rating - benchmark.expectedRating : null,
      };
    });
  }, [
    benchmarks,
    assessments,
    benchmarkLookup,
    latestAssessments,
    skillLookup,
    showAllSkills,
  ]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (comparableSkills.length === 0) {
      return { onTrack: 0, total: 0, average: null };
    }

    const onTrackOrBetter = comparableSkills.filter(
      (s) =>
        s.status === "on_track" ||
        s.status === "exceeding" ||
        s.status === "exceptional"
    ).length;

    const ratingsSum = comparableSkills
      .filter((s) => s.rating > 0)
      .reduce((sum, s) => sum + s.rating, 0);
    const ratingsCount = comparableSkills.filter((s) => s.rating > 0).length;

    return {
      onTrack: onTrackOrBetter,
      total: comparableSkills.length,
      average: ratingsCount > 0 ? ratingsSum / ratingsCount : null,
    };
  }, [comparableSkills]);

  // Loading state
  if (!(benchmarks && skills && assessments)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Benchmark Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No date of birth or age group provided
  if (!(dateOfBirth || ageGroup)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Benchmark Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Date of birth or age group is required to show benchmark
            comparisons. Please update the player's profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No benchmarks available
  if (benchmarks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Benchmark Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No benchmarks are available for this player's age group and sport (
            {sportCode}). Benchmarks are set by platform administrators based on
            NGB standards.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No assessments yet
  if (latestAssessments.size === 0 && !showAllSkills) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Benchmark Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No skill assessments have been recorded yet. Once skills are
            assessed, they will be compared against age-appropriate benchmarks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Benchmark Comparison
            </div>
            {summaryStats.total > 0 && (
              <Badge className="font-normal" variant="outline">
                {summaryStats.onTrack}/{summaryStats.total} on track or better
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          {summaryStats.average !== null && (
            <div className="flex items-center gap-4 rounded-lg border bg-gray-50 p-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Average Rating</p>
                <p className="text-muted-foreground text-xs">
                  {summaryStats.average.toFixed(1)} / 5.0 across{" "}
                  {comparableSkills.filter((s) => s.rating > 0).length} skills
                </p>
              </div>
            </div>
          )}

          {/* Skill comparison grid */}
          <div className="space-y-3">
            {comparableSkills.map((skill) => (
              <SkillBenchmarkRow key={skill.skillCode} {...skill} />
            ))}
          </div>

          {/* Age group note */}
          {benchmarks.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Benchmarks from {benchmarks[0].source} for age group{" "}
              {benchmarks[0].ageGroup.toUpperCase()}
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

type SkillBenchmarkRowProps = {
  skillCode: string;
  skillName: string;
  rating: number;
  benchmark:
    | {
        expectedRating: number;
        minAcceptable: number;
        developingThreshold: number;
        excellentThreshold: number;
      }
    | undefined;
  status: keyof typeof STATUS_COLORS;
  delta: number | null;
};

function SkillBenchmarkRow({
  skillName,
  rating,
  benchmark,
  status,
  delta,
}: SkillBenchmarkRowProps) {
  const statusStyle = STATUS_COLORS[status];
  const ratingColors = getRatingColors(rating);

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-sm">{skillName}</span>
        <div className="flex items-center gap-2">
          {rating > 0 ? (
            <Badge className={`${ratingColors.bg} ${ratingColors.text}`}>
              {rating.toFixed(1)}
            </Badge>
          ) : (
            <Badge variant="outline">Not assessed</Badge>
          )}
          {benchmark && rating > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  className={`${statusStyle.bg} ${statusStyle.text}`}
                  variant="outline"
                >
                  {delta !== null && delta > 0 && (
                    <ArrowUp className="mr-1 h-3 w-3" />
                  )}
                  {delta !== null && delta < 0 && (
                    <ArrowDown className="mr-1 h-3 w-3" />
                  )}
                  {delta !== null && delta === 0 && (
                    <ArrowRight className="mr-1 h-3 w-3" />
                  )}
                  {statusStyle.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p>Expected: {benchmark.expectedRating.toFixed(1)}</p>
                  <p>
                    Delta:{" "}
                    {delta !== null
                      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
                      : "N/A"}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {benchmark && (
        <div className="relative">
          <Progress className="h-2" value={(rating / 5) * 100} />
          {/* Expected rating marker */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-blue-600"
            style={{ left: `${(benchmark.expectedRating / 5) * 100}%` }}
            title={`Expected: ${benchmark.expectedRating.toFixed(1)}`}
          />
        </div>
      )}
    </div>
  );
}

// Export a simpler inline version for embedding
export function BenchmarkBadge({
  rating,
  benchmarkRating,
  status,
}: {
  rating: number;
  benchmarkRating?: number;
  status?:
    | "below"
    | "developing"
    | "on_track"
    | "exceeding"
    | "exceptional"
    | null;
}) {
  if (!(status && benchmarkRating)) {
    return null;
  }

  const statusStyle = STATUS_COLORS[status];
  const delta = rating - benchmarkRating;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge
          className={`text-xs ${statusStyle.bg} ${statusStyle.text}`}
          variant="outline"
        >
          {delta > 0 && <ArrowUp className="mr-0.5 h-2.5 w-2.5" />}
          {delta < 0 && <ArrowDown className="mr-0.5 h-2.5 w-2.5" />}
          {delta === 0 && <ArrowRight className="mr-0.5 h-2.5 w-2.5" />}
          {statusStyle.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          Expected: {benchmarkRating.toFixed(1)} | Actual: {rating.toFixed(1)} |
          Delta: {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
