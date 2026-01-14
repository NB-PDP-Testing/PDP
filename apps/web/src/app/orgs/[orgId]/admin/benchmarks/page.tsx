"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { OrgThemedButton } from "@/components/org-themed-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrgTheme } from "@/hooks/use-org-theme";

// Rating level descriptions
const RATING_LEVELS = {
  1: { label: "Beginning", color: "bg-red-100 text-red-700 border-red-200" },
  2: {
    label: "Developing",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  3: {
    label: "Competent",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  4: {
    label: "Proficient",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  5: {
    label: "Expert",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

function getRatingLabel(rating: number): string {
  const level = Math.round(rating);
  return RATING_LEVELS[level as keyof typeof RATING_LEVELS]?.label ?? "Unknown";
}

function getRatingColor(rating: number): string {
  const level = Math.round(rating);
  return (
    RATING_LEVELS[level as keyof typeof RATING_LEVELS]?.color ??
    "bg-gray-100 text-gray-700"
  );
}

// Visual rating bar component
function RatingBar({
  expected,
  min,
  developing,
  excellent,
}: {
  expected: number;
  min: number;
  developing: number;
  excellent: number;
}) {
  const maxRating = 5;
  const minPercent = (min / maxRating) * 100;
  const developingPercent = (developing / maxRating) * 100;
  const expectedPercent = (expected / maxRating) * 100;
  const excellentPercent = (excellent / maxRating) * 100;

  return (
    <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-100">
      {/* Below minimum - red zone */}
      <div
        className="absolute top-0 left-0 h-full bg-red-200"
        style={{ width: `${minPercent}%` }}
      />
      {/* Developing zone - orange */}
      <div
        className="absolute top-0 h-full bg-orange-200"
        style={{
          left: `${minPercent}%`,
          width: `${developingPercent - minPercent}%`,
        }}
      />
      {/* On track zone - yellow/green */}
      <div
        className="absolute top-0 h-full bg-yellow-200"
        style={{
          left: `${developingPercent}%`,
          width: `${excellentPercent - developingPercent}%`,
        }}
      />
      {/* Excellent zone - green */}
      <div
        className="absolute top-0 h-full bg-green-200"
        style={{
          left: `${excellentPercent}%`,
          width: `${100 - excellentPercent}%`,
        }}
      />
      {/* Expected rating marker */}
      <div
        className="absolute top-0 h-full w-1 bg-blue-600"
        style={{ left: `${expectedPercent}%` }}
        title={`Expected: ${expected.toFixed(1)}`}
      />
      {/* Labels */}
      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
        <span className="font-medium text-red-700">Below</span>
        <span className="font-medium text-orange-700">Dev</span>
        <span className="font-medium text-yellow-700">On Track</span>
        <span className="font-medium text-green-700">Exc</span>
      </div>
    </div>
  );
}

// Skill benchmark card
function SkillBenchmarkCard({
  skillCode,
  skillName,
  benchmarks,
  ageGroups,
  selectedAgeGroup,
}: {
  skillCode: string;
  skillName: string;
  benchmarks: Array<{
    _id: string;
    ageGroup: string;
    expectedRating: number;
    minAcceptable: number;
    developingThreshold: number;
    excellentThreshold: number;
    level: string;
    source: string;
    sourceYear: number;
  }>;
  ageGroups: Array<{ code: string; name: string }>;
  selectedAgeGroup: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter benchmarks by selected age group if any
  const filteredBenchmarks = selectedAgeGroup
    ? benchmarks.filter((b) => b.ageGroup === selectedAgeGroup)
    : benchmarks;

  // Sort benchmarks by age group
  const sortedBenchmarks = [...filteredBenchmarks].sort((a, b) => {
    const ageA = ageGroups.findIndex((ag) => ag.code === a.ageGroup);
    const ageB = ageGroups.findIndex((ag) => ag.code === b.ageGroup);
    return ageA - ageB;
  });

  const getAgeGroupName = (code: string) =>
    ageGroups.find((ag) => ag.code === code)?.name ?? code;

  if (sortedBenchmarks.length === 0) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <div className="rounded-lg border bg-white">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <span className="font-medium">{skillName}</span>
                <span className="ml-2 font-mono text-muted-foreground text-xs">
                  {skillCode}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {sortedBenchmarks.length} age group
                {sortedBenchmarks.length !== 1 ? "s" : ""}
              </Badge>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            <div className="space-y-4">
              {sortedBenchmarks.map((benchmark) => (
                <div
                  className="rounded-md border bg-gray-50 p-3"
                  key={benchmark._id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">
                        {getAgeGroupName(benchmark.ageGroup)}
                      </Badge>
                      <Badge
                        className={getRatingColor(benchmark.expectedRating)}
                        variant="outline"
                      >
                        Expected: {benchmark.expectedRating.toFixed(1)} (
                        {getRatingLabel(benchmark.expectedRating)})
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {benchmark.source} ({benchmark.sourceYear})
                    </span>
                  </div>
                  <RatingBar
                    developing={benchmark.developingThreshold}
                    excellent={benchmark.excellentThreshold}
                    expected={benchmark.expectedRating}
                    min={benchmark.minAcceptable}
                  />
                  <div className="mt-2 flex justify-between text-muted-foreground text-xs">
                    <span>Min: {benchmark.minAcceptable.toFixed(1)}</span>
                    <span>Dev: {benchmark.developingThreshold.toFixed(1)}</span>
                    <span>Expected: {benchmark.expectedRating.toFixed(1)}</span>
                    <span>Exc: {benchmark.excellentThreshold.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function OrgAdminBenchmarksPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { theme } = useOrgTheme();

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

  // Queries
  const sports = useQuery(api.models.referenceData.getSports);
  const ageGroups = useQuery(api.models.referenceData.getAgeGroups);
  const skills = useQuery(
    api.models.referenceData.getSkillDefinitionsBySport,
    selectedSport ? { sportCode: selectedSport } : "skip"
  );
  const benchmarks = useQuery(
    api.models.skillBenchmarks.getBenchmarksForSport,
    selectedSport ? { sportCode: selectedSport, activeOnly: true } : "skip"
  );
  const clubAnalytics = useQuery(
    api.models.skillAssessments.getClubBenchmarkAnalytics,
    selectedSport
      ? {
          organizationId: orgId,
          sportCode: selectedSport,
          ageGroup: selectedAgeGroup ?? undefined,
        }
      : "skip"
  );

  // Benchmark type
  type Benchmark = NonNullable<typeof benchmarks>[number];

  // Group benchmarks by skill code
  const benchmarksBySkill = useMemo(() => {
    if (!benchmarks) {
      return new Map<string, Benchmark[]>();
    }
    const map = new Map<string, Benchmark[]>();
    for (const b of benchmarks) {
      const existing = map.get(b.skillCode) ?? [];
      existing.push(b);
      map.set(b.skillCode, existing);
    }
    return map;
  }, [benchmarks]);

  // Create skill lookup
  const skillLookup = useMemo(() => {
    if (!skills) {
      return new Map<string, string>();
    }
    return new Map(skills.map((s) => [s.code, s.name]));
  }, [skills]);

  // Stats
  const stats = useMemo(() => {
    if (!benchmarks) {
      return { total: 0, skills: 0, ageGroups: new Set<string>() };
    }
    const ageGroupSet = new Set<string>();
    for (const b of benchmarks) {
      ageGroupSet.add(b.ageGroup);
    }
    return {
      total: benchmarks.length,
      skills: benchmarksBySkill.size,
      ageGroups: ageGroupSet,
    };
  }, [benchmarks, benchmarksBySkill]);

  const isLoading = sports === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Skill Benchmarks</h1>
        <p className="mt-2 text-muted-foreground">
          View expected skill ratings by age group from national governing body
          standards
        </p>
      </div>

      {/* Info Card */}
      <Card
        className="border-blue-200 bg-blue-50/50"
        style={{
          borderColor: "rgb(var(--org-primary-rgb) / 0.3)",
          backgroundColor: "rgb(var(--org-primary-rgb) / 0.05)",
        }}
      >
        <CardContent className="flex items-start gap-4 py-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)" }}
          >
            <Info className="h-5 w-5" style={{ color: theme.primary }} />
          </div>
          <div className="flex-1">
            <p className="font-medium" style={{ color: theme.primary }}>
              Understanding Benchmarks
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Benchmarks are predefined skill expectations from national
              governing bodies (FAI, GAA, IRFU). They help coaches understand
              what level of skill proficiency is typical for each age group. Use
              these as guidelines when assessing your players.
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  className="shrink-0"
                  href="https://www.fai.ie/development"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <OrgThemedButton size="sm" variant="outline">
                    Learn More <ExternalLink className="ml-1 h-3 w-3" />
                  </OrgThemedButton>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Visit NGB development resources</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Sport Selector */}
      {isLoading ? (
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <Select
              onValueChange={(value) => {
                setSelectedSport(value);
                setSelectedAgeGroup(null);
              }}
              value={selectedSport ?? ""}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a sport" />
              </SelectTrigger>
              <SelectContent>
                {sports?.map((sport) => (
                  <SelectItem key={sport._id} value={sport.code}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSport && ageGroups && (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <Select
                onValueChange={(value) =>
                  setSelectedAgeGroup(value === "all" ? null : value)
                }
                value={selectedAgeGroup ?? "all"}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All age groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All age groups</SelectItem>
                  {ageGroups.map((ag) => (
                    <SelectItem key={ag._id} value={ag.code}>
                      {ag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {selectedSport ? (
        benchmarks === undefined || skills === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : benchmarks.length > 0 ? (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Total Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{stats.total}</div>
                  <p className="text-muted-foreground text-xs">
                    Skill/age combinations defined
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <Award className="h-4 w-4" />
                    Skills Covered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{stats.skills}</div>
                  <p className="text-muted-foreground text-xs">
                    Different skills with benchmarks
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <BarChart3 className="h-4 w-4" />
                    Age Groups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {stats.ageGroups.size}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Age groups with defined expectations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Club Analytics Section */}
            {clubAnalytics && clubAnalytics.totalAssessments > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Club Performance vs Benchmarks
                  </CardTitle>
                  <CardDescription>
                    How your club's players compare to age-appropriate
                    benchmarks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg border bg-green-50 p-4 text-center">
                      <div className="font-bold text-2xl text-green-700">
                        {clubAnalytics.onTrackPercentage.toFixed(0)}%
                      </div>
                      <div className="flex items-center justify-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        On Track or Better
                      </div>
                    </div>
                    <div className="rounded-lg border bg-blue-50 p-4 text-center">
                      <div className="font-bold text-2xl text-blue-700">
                        {clubAnalytics.totalPlayers}
                      </div>
                      <div className="text-blue-600 text-sm">
                        Players Assessed
                      </div>
                    </div>
                    <div className="rounded-lg border bg-purple-50 p-4 text-center">
                      <div className="font-bold text-2xl text-purple-700">
                        {clubAnalytics.totalAssessments}
                      </div>
                      <div className="text-purple-600 text-sm">
                        Skill Assessments
                      </div>
                    </div>
                    <div className="rounded-lg border bg-amber-50 p-4 text-center">
                      <div className="font-bold text-2xl text-amber-700">
                        {clubAnalytics.skillsNeedingAttention.length}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Skills Need Focus
                      </div>
                    </div>
                  </div>

                  {/* Status Distribution */}
                  <div>
                    <h4 className="mb-2 font-medium text-sm">
                      Rating Distribution
                    </h4>
                    <div className="flex h-4 overflow-hidden rounded-full">
                      {[
                        {
                          key: "below",
                          color: "bg-red-500",
                          count: clubAnalytics.statusDistribution.below,
                        },
                        {
                          key: "developing",
                          color: "bg-orange-500",
                          count: clubAnalytics.statusDistribution.developing,
                        },
                        {
                          key: "on_track",
                          color: "bg-yellow-500",
                          count: clubAnalytics.statusDistribution.on_track,
                        },
                        {
                          key: "exceeding",
                          color: "bg-green-500",
                          count: clubAnalytics.statusDistribution.exceeding,
                        },
                        {
                          key: "exceptional",
                          color: "bg-emerald-500",
                          count: clubAnalytics.statusDistribution.exceptional,
                        },
                      ].map((item) => {
                        const percentage =
                          clubAnalytics.totalAssessments > 0
                            ? (item.count / clubAnalytics.totalAssessments) *
                              100
                            : 0;
                        return percentage > 0 ? (
                          <div
                            className={`${item.color}`}
                            key={item.key}
                            style={{ width: `${percentage}%` }}
                            title={`${item.key}: ${item.count} (${percentage.toFixed(1)}%)`}
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                        Below ({clubAnalytics.statusDistribution.below})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />{" "}
                        Developing (
                        {clubAnalytics.statusDistribution.developing})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />{" "}
                        On Track ({clubAnalytics.statusDistribution.on_track})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />{" "}
                        Exceeding ({clubAnalytics.statusDistribution.exceeding})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                        Exceptional (
                        {clubAnalytics.statusDistribution.exceptional})
                      </span>
                    </div>
                  </div>

                  {/* Skills Needing Attention */}
                  {clubAnalytics.skillsNeedingAttention.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-sm">
                        Skills Needing Focus
                      </h4>
                      <div className="space-y-2">
                        {clubAnalytics.skillsNeedingAttention.map(
                          (skill: {
                            skillCode: string;
                            belowCount: number;
                            totalCount: number;
                            belowPercentage: number;
                          }) => (
                            <div
                              className="flex items-center justify-between rounded border bg-amber-50 p-2"
                              key={skill.skillCode}
                            >
                              <span className="font-medium text-sm">
                                {skillLookup.get(skill.skillCode) ??
                                  skill.skillCode}
                              </span>
                              <Badge className="bg-amber-100 text-amber-700">
                                {skill.belowPercentage.toFixed(0)}%
                                below/developing
                              </Badge>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Players Needing Attention */}
                  {clubAnalytics.playersNeedingAttention.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-sm">
                        Players Needing Support
                      </h4>
                      <div className="space-y-2">
                        {clubAnalytics.playersNeedingAttention.map(
                          (player: {
                            playerIdentityId: string;
                            firstName: string;
                            lastName: string;
                            belowCount: number;
                          }) => (
                            <Link
                              className="flex items-center justify-between rounded border bg-red-50 p-2 transition-colors hover:bg-red-100"
                              href={`/orgs/${orgId}/players/${player.playerIdentityId}`}
                              key={player.playerIdentityId}
                            >
                              <span className="font-medium text-sm">
                                {player.firstName} {player.lastName}
                              </span>
                              <Badge className="bg-red-100 text-red-700">
                                {player.belowCount} skills below benchmark
                              </Badge>
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty state for club analytics */}
            {clubAnalytics && clubAnalytics.totalAssessments === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No skill assessments recorded yet. Start assessing players
                    to see how they compare to benchmarks.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Benchmark List */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Benchmarks by Age Group</CardTitle>
                <CardDescription>
                  Click on a skill to see expected ratings across different age
                  groups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(benchmarksBySkill.entries()).map(
                  ([skillCode, skillBenchmarks]) => (
                    <SkillBenchmarkCard
                      ageGroups={ageGroups ?? []}
                      benchmarks={skillBenchmarks}
                      key={skillCode}
                      selectedAgeGroup={selectedAgeGroup}
                      skillCode={skillCode}
                      skillName={skillLookup.get(skillCode) ?? skillCode}
                    />
                  )
                )}
              </CardContent>
            </Card>

            {/* Rating Scale Legend */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-base">Rating Scale Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(RATING_LEVELS).map(
                    ([level, { label, color }]) => (
                      <div className="flex items-center gap-2" key={level}>
                        <Badge className={color} variant="outline">
                          {level}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          {label}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <div className="mt-4 grid gap-2 text-muted-foreground text-sm md:grid-cols-2">
                  <div>
                    <span className="font-medium text-red-600">Below:</span>{" "}
                    Player needs significant support
                  </div>
                  <div>
                    <span className="font-medium text-orange-600">
                      Developing:
                    </span>{" "}
                    Working towards expected level
                  </div>
                  <div>
                    <span className="font-medium text-yellow-600">
                      On Track:
                    </span>{" "}
                    Meeting age-appropriate expectations
                  </div>
                  <div>
                    <span className="font-medium text-green-600">
                      Exceeding:
                    </span>{" "}
                    Above expected for age group
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">
                No Benchmarks Available
              </h3>
              <p className="mb-4 max-w-sm text-muted-foreground">
                There are no skill benchmarks defined for this sport yet.
                Benchmarks are set by platform administrators based on NGB
                standards.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="mb-4 rounded-full p-4"
              style={{ backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)" }}
            >
              <Target className="h-8 w-8" style={{ color: theme.primary }} />
            </div>
            <h3 className="mb-2 font-semibold text-lg">Select a Sport</h3>
            <p className="max-w-sm text-muted-foreground">
              Choose a sport above to view skill benchmarks and expected ratings
              by age group.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
