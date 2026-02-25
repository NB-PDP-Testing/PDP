"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  List,
  Loader2,
  Minus,
  TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

// ─── Types ───────────────────────────────────────────────────────────────────

type TrendDir = "up" | "down" | "same" | "none";
type ViewMode = "chart" | "list";

type RadarDatum = {
  subject: string;
  current: number;
  previous?: number;
};

type AssessmentSession = {
  date: string;
  skills: { code: string; name: string; rating: number }[];
};

type DimensionEntry = { key: string; label: string; rating?: number };

type LatestAssessment = {
  skillCode: string;
  rating: number;
  previousRating?: number;
};

// ─── Module-level helpers ────────────────────────────────────────────────────

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "chart";
  }
  return (localStorage.getItem("playerProgressView") as ViewMode) ?? "chart";
}

function buildAssessmentTimeline(
  history:
    | {
        assessmentDate: string;
        skillCode: string;
        skillName: string;
        rating: number;
      }[]
    | undefined
): AssessmentSession[] {
  if (!history) {
    return [];
  }
  const byDate = new Map<string, AssessmentSession>();
  for (const a of history) {
    const existing = byDate.get(a.assessmentDate);
    if (existing) {
      existing.skills.push({
        code: a.skillCode,
        name: a.skillName,
        rating: a.rating,
      });
    } else {
      byDate.set(a.assessmentDate, {
        date: a.assessmentDate,
        skills: [{ code: a.skillCode, name: a.skillName, rating: a.rating }],
      });
    }
  }
  return Array.from(byDate.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function getTrendDir(
  skillCode: string,
  assessments: LatestAssessment[] | undefined
): TrendDir {
  if (!assessments) {
    return "none";
  }
  const a = assessments.find((x) => x.skillCode === skillCode);
  if (!a || a.previousRating === undefined) {
    return "none";
  }
  const delta = a.rating - a.previousRating;
  if (delta > 0.01) {
    return "up";
  }
  if (delta < -0.01) {
    return "down";
  }
  return "same";
}

function buildRadarData(
  dimensions: DimensionEntry[],
  assessments: LatestAssessment[] | undefined
): RadarDatum[] {
  return dimensions
    .filter((d) => d.rating !== undefined)
    .map((d) => ({
      subject: d.label,
      current: d.rating ?? 0,
      previous: assessments?.find((a) => a.skillCode === d.key)?.previousRating,
    }));
}

function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Small display components ─────────────────────────────────────────────────

function TrendArrow({ dir }: { dir: TrendDir }) {
  if (dir === "up") {
    return <ArrowUp className="inline h-4 w-4 text-green-600" />;
  }
  if (dir === "down") {
    return <ArrowDown className="inline h-4 w-4 text-red-500" />;
  }
  if (dir === "same") {
    return <Minus className="inline h-4 w-4 text-muted-foreground" />;
  }
  return null;
}

function RatingBar({ value, max = 10 }: { value?: number; max?: number }) {
  if (value === undefined) {
    return <span className="text-muted-foreground text-sm">Not assessed</span>;
  }
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-[var(--org-primary,theme(colors.blue.500))]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium text-sm">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// ─── RatingsCard — chart/list toggle with radar chart ────────────────────────

type RatingsCardProps = {
  selectedPassport:
    | { lastAssessmentDate?: string; currentOverallRating?: number }
    | undefined;
  dimensions: DimensionEntry[];
  latestAssessments: LatestAssessment[] | undefined;
  radarData: RadarDatum[];
  hasPreviousData: boolean;
  currentDateLabel: string;
  previousDateLabel: string;
};

function RatingsCard({
  selectedPassport,
  dimensions,
  latestAssessments,
  radarData,
  hasPreviousData,
  currentDateLabel,
  previousDateLabel,
}: RatingsCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("playerProgressView", mode);
  };

  const primaryColor = "var(--org-primary, #3b82f6)";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Skill Ratings</CardTitle>
            {selectedPassport?.lastAssessmentDate && (
              <CardDescription>
                Last assessed:{" "}
                {new Date(
                  selectedPassport.lastAssessmentDate
                ).toLocaleDateString()}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              aria-pressed={viewMode === "chart"}
              onClick={() => handleViewMode("chart")}
              size="sm"
              variant={viewMode === "chart" ? "secondary" : "ghost"}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Chart</span>
            </Button>
            <Button
              aria-pressed={viewMode === "list"}
              onClick={() => handleViewMode("list")}
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
            >
              <List className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">List</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {viewMode === "chart" && radarData.length > 0 && (
          <div
            aria-label={`Progress radar chart showing skill ratings across ${radarData.length} dimensions`}
            className="space-y-2"
            role="img"
          >
            <ResponsiveContainer height={300} width="100%">
              <RadarChart
                data={radarData}
                margin={{ bottom: 10, left: 30, right: 30, top: 10 }}
              >
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 10 }}
                  tickCount={3}
                />
                {hasPreviousData && (
                  <Radar
                    dataKey="previous"
                    fill="transparent"
                    fillOpacity={0}
                    name={previousDateLabel}
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                  />
                )}
                <Radar
                  dataKey="current"
                  fill={primaryColor}
                  fillOpacity={0.3}
                  name={currentDateLabel}
                  stroke={primaryColor}
                />
                <Tooltip formatter={(value: number) => [value.toFixed(1)]} />
              </RadarChart>
            </ResponsiveContainer>
            {hasPreviousData && (
              <div className="flex justify-center gap-4 text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--org-primary,#3b82f6)]" />
                  {currentDateLabel}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                  {previousDateLabel}
                </span>
              </div>
            )}
            <p className="text-center text-muted-foreground text-xs">
              Based on assessment: {currentDateLabel}
            </p>
          </div>
        )}

        {viewMode === "chart" && radarData.length === 0 && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No skill ratings yet. Your coach will add ratings after your first
            assessment.
          </p>
        )}

        {viewMode === "list" && (
          <div className="space-y-4">
            {selectedPassport?.currentOverallRating !== undefined && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Overall</span>
                    <TrendArrow
                      dir={getTrendDir("overall", latestAssessments)}
                    />
                  </div>
                  <RatingBar value={selectedPassport.currentOverallRating} />
                </div>
                <div className="h-px bg-border" />
              </>
            )}
            {dimensions.map((dim) => (
              <div className="space-y-1" key={dim.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{dim.label}</span>
                  <TrendArrow dir={getTrendDir(dim.key, latestAssessments)} />
                </div>
                <RatingBar value={dim.rating} />
              </div>
            ))}
            {dimensions.every((d) => d.rating === undefined) && (
              <p className="text-center text-muted-foreground text-sm">
                No skill ratings yet. Your coach will add ratings after your
                first assessment.
              </p>
            )}
          </div>
        )}

        <Badge variant="secondary">Ratings are set by your coach</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Player Notes hook ────────────────────────────────────────────────────────

type SportPassportRef =
  | {
      _id: Id<"sportPassports">;
      playerNotes?: string;
    }
  | undefined;

function usePlayerNotes(
  selectedPassport: SportPassportRef,
  updateNotes: (args: {
    passportId: Id<"sportPassports">;
    playerNotes: string;
  }) => Promise<unknown>
) {
  const [playerNotes, setPlayerNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  if (selectedPassport && !notesLoaded) {
    setPlayerNotes(selectedPassport.playerNotes ?? "");
    setNotesLoaded(true);
  }

  const saveNotes = async () => {
    if (!selectedPassport) {
      return;
    }
    setSavingNotes(true);
    try {
      await updateNotes({ passportId: selectedPassport._id, playerNotes });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  return {
    playerNotes,
    setPlayerNotes,
    savingNotes,
    saveNotes,
    resetNotes: () => setNotesLoaded(false),
  };
}

// ─── Assessment History Card ──────────────────────────────────────────────────

function AssessmentHistoryCard({
  timeline,
  isLoading,
}: {
  timeline: AssessmentSession[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assessment History</CardTitle>
        <CardDescription>
          Your assessment sessions, newest first
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((sess) => {
              const avgRating =
                sess.skills.reduce((s, sk) => s + sk.rating, 0) /
                sess.skills.length;
              return (
                <div className="flex items-start gap-3" key={sess.date}>
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--org-primary,theme(colors.blue.500))]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">
                        {fmtDate(sess.date)}
                      </span>
                      <Badge variant="outline">
                        avg {avgRating.toFixed(1)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {sess.skills.length} skill
                      {sess.skills.length === 1 ? "" : "s"} assessed
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PlayerProgressPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );
  const passports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const updateNotes = useMutation(api.models.sportPassports.updateNotes);

  const activeSport = selectedSport ?? passports?.[0]?.sportCode ?? null;
  const selectedPassport = passports?.find((p) => p.sportCode === activeSport);

  const { playerNotes, setPlayerNotes, savingNotes, saveNotes, resetNotes } =
    usePlayerNotes(selectedPassport, updateNotes);

  const assessmentHistory = useQuery(
    api.models.skillAssessments.getAssessmentHistory,
    playerIdentity?._id && activeSport && selectedPassport
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          sportCode: activeSport,
          organizationId: orgId,
        }
      : "skip"
  );
  const latestAssessments = useQuery(
    api.models.skillAssessments.getLatestAssessmentsForPassport,
    selectedPassport ? { passportId: selectedPassport._id } : "skip"
  );

  if (!session || playerIdentity === undefined || passports === undefined) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton className="h-24" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!passports || passports.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-6">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>My Progress</CardTitle>
            <CardDescription>
              No passport assessments yet. Your coach will complete your first
              assessment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const dimensions: DimensionEntry[] = [
    {
      key: "technical",
      label: "Technical",
      rating: selectedPassport?.currentTechnicalRating,
    },
    {
      key: "tactical",
      label: "Tactical",
      rating: selectedPassport?.currentTacticalRating,
    },
    {
      key: "physical",
      label: "Physical",
      rating: selectedPassport?.currentPhysicalRating,
    },
    {
      key: "mental",
      label: "Mental",
      rating: selectedPassport?.currentMentalRating,
    },
  ];

  const assessmentTimeline = buildAssessmentTimeline(assessmentHistory);
  const radarData = buildRadarData(dimensions, latestAssessments);
  const hasPreviousData = radarData.some((d) => d.previous !== undefined);
  const currentDateLabel = assessmentTimeline[0]
    ? fmtDate(assessmentTimeline[0].date)
    : "Current";
  const previousDateLabel = assessmentTimeline[1]
    ? fmtDate(assessmentTimeline[1].date)
    : "Previous";

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-bold text-2xl">My Progress</h1>
        <p className="text-muted-foreground text-sm">
          Track your development over time
        </p>
      </div>

      {passports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {passports.map((p) => (
            <Button
              key={p.sportCode}
              onClick={() => {
                setSelectedSport(p.sportCode);
                resetNotes();
              }}
              size="sm"
              variant={activeSport === p.sportCode ? "default" : "outline"}
            >
              {p.sportCode.charAt(0).toUpperCase() + p.sportCode.slice(1)}
            </Button>
          ))}
        </div>
      )}

      <RatingsCard
        currentDateLabel={currentDateLabel}
        dimensions={dimensions}
        hasPreviousData={hasPreviousData}
        latestAssessments={latestAssessments}
        previousDateLabel={previousDateLabel}
        radarData={radarData}
        selectedPassport={selectedPassport}
      />

      {assessmentTimeline.length > 0 && (
        <AssessmentHistoryCard
          isLoading={assessmentHistory === undefined}
          timeline={assessmentTimeline}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Notes</CardTitle>
          <CardDescription>
            Add your own notes about your development and goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="sr-only" htmlFor="player-notes">
              My notes
            </Label>
            <Textarea
              className="min-h-[100px] resize-none"
              id="player-notes"
              onChange={(e) => setPlayerNotes(e.target.value)}
              placeholder="Write your personal development notes here..."
              value={playerNotes}
            />
          </div>
          <Button disabled={savingNotes} onClick={saveNotes} size="sm">
            {savingNotes ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Notes"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
