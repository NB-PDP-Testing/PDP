"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Activity,
  Calendar,
  CheckCircle,
  ChevronRight,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ── helpers ──────────────────────────────────────────────────────────────────

const getSportEmoji = (sportCode: string): string => {
  const map: Record<string, string> = {
    soccer: "⚽",
    football: "⚽",
    rugby: "🏉",
    gaa_football: "🏐",
    gaa: "🏐",
    gaelic: "🏐",
    hurling: "🥍",
    camogie: "🥍",
    basketball: "🏀",
    tennis: "🎾",
    golf: "⛳",
    swimming: "🏊",
    athletics: "🏃",
    hockey: "🏑",
    cricket: "🏏",
  };
  return map[sportCode.toLowerCase()] ?? "🏅";
};

const formatSportName = (code: string) =>
  code.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const getAttendanceColor = (pct: number) =>
  pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";

const getAssessmentBadge = (
  assessmentCount: number | undefined,
  overallRating: number | undefined
) => {
  if (!assessmentCount || assessmentCount === 0) {
    return (
      <Badge className="bg-gray-100 text-gray-600" variant="outline">
        No Assessments
      </Badge>
    );
  }
  if (overallRating && overallRating > 0) {
    const label =
      overallRating >= 4
        ? "Excellent"
        : overallRating >= 3
          ? "Good"
          : overallRating >= 2
            ? "Developing"
            : "Needs Support";
    const cls =
      overallRating >= 4
        ? "bg-green-100 text-green-700"
        : overallRating >= 3
          ? "bg-blue-100 text-blue-700"
          : overallRating >= 2
            ? "bg-yellow-100 text-yellow-700"
            : "bg-orange-100 text-orange-700";
    return <Badge className={cls}>{label}</Badge>;
  }
  return (
    <Badge className="bg-blue-100 text-blue-700">
      {assessmentCount} Assessment{assessmentCount > 1 ? "s" : ""}
    </Badge>
  );
};

// ── component ─────────────────────────────────────────────────────────────────

type PlayerPassportCardProps = {
  orgId: string;
  playerIdentityId: Id<"playerIdentities">;
  teamName?: string;
  trainingAttendance?: number;
  matchAttendance?: number;
};

export function PlayerPassportCard({
  orgId,
  playerIdentityId,
  teamName,
  trainingAttendance = 0,
  matchAttendance = 0,
}: PlayerPassportCardProps) {
  // Full passport data (skills, scores, etc.)
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    { playerIdentityId, organizationId: orgId }
  );

  // All sport passports for badges + multi-sport buttons
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    {
      playerIdentityId,
    }
  );

  // Goals
  const goals = useQuery(api.models.passportGoals.getGoalsForPlayer, {
    playerIdentityId,
  });

  // Injuries
  const injuries = useQuery(api.models.playerInjuries.getInjuriesForPlayer, {
    playerIdentityId,
  });

  // ── derived ──────────────────────────────────────────────────────────────

  const activeSports = useMemo(
    () => (allPassports ?? []).filter((p) => p.status === "active"),
    [allPassports]
  );
  const isMultiSport = activeSports.length > 1;
  const primaryPassport = activeSports[0];

  const skills = passportData?.skills as Record<string, number> | undefined;

  const averageRating = useMemo(() => {
    if (!skills) {
      return 0;
    }
    const vals = Object.values(skills).filter(
      (v): v is number => typeof v === "number" && v > 0
    );
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [skills]);

  const topSkills = useMemo(() => {
    if (!skills) {
      return [];
    }
    return Object.entries(skills)
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .map(([k, v]) => ({
        name: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        rating: v as number,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [skills]);

  const activeGoals = useMemo(
    () =>
      (goals ?? []).filter(
        (g) => g.status === "in_progress" || g.status === "not_started"
      ),
    [goals]
  );

  const activeInjuries = useMemo(
    () =>
      (injuries ?? []).filter(
        (i) => i.status === "active" || i.status === "recovering"
      ),
    [injuries]
  );

  const performanceScore = Math.round(averageRating * 20);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
      {/* ── Header gradient ── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="min-w-0 shrink font-semibold text-lg text-white leading-snug">
                My Passport
              </p>
              <div className="ml-auto shrink-0">
                {getAssessmentBadge(
                  (primaryPassport as any)?.assessmentCount,
                  (primaryPassport as any)?.currentOverallRating
                )}
              </div>
            </div>
            {teamName && (
              <p className="mt-0.5 text-blue-100 text-sm">{teamName}</p>
            )}
            {/* Sport badges */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {activeSports.length > 0 ? (
                <>
                  {activeSports.map((sport) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-medium text-white text-xs"
                      key={sport._id}
                    >
                      {getSportEmoji(sport.sportCode)}{" "}
                      {formatSportName(sport.sportCode)}
                    </span>
                  ))}
                  {isMultiSport && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 font-bold text-amber-100 text-xs">
                      ⭐ Multi-Sport
                    </span>
                  )}
                </>
              ) : (
                primaryPassport?.sportCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-medium text-white text-xs">
                    {getSportEmoji(primaryPassport.sportCode)}{" "}
                    {formatSportName(primaryPassport.sportCode)}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        {/* Performance score */}
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium text-sm">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Overall Performance
            </span>
            <span className="font-bold text-blue-700 text-lg">
              {performanceScore}%
            </span>
          </div>
          <Progress className="h-2" value={performanceScore} />
        </div>

        {/* Top strengths */}
        {topSkills.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              Top Strengths
            </h4>
            <div className="space-y-2">
              {topSkills.map((skill) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={skill.name}
                >
                  <span className="text-muted-foreground">{skill.name}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        className={`h-3 w-3 ${
                          i < skill.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200"
                        }`}
                        key={`star-${skill.name}-${i}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance */}
        {(trainingAttendance > 0 || matchAttendance > 0) && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
              <Calendar className="h-4 w-4 text-green-600" />
              Attendance
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-2 text-center">
                <div
                  className={`font-bold text-lg ${getAttendanceColor(trainingAttendance)}`}
                >
                  {trainingAttendance}%
                </div>
                <div className="text-muted-foreground text-xs">Training</div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div
                  className={`font-bold text-lg ${getAttendanceColor(matchAttendance)}`}
                >
                  {matchAttendance}%
                </div>
                <div className="text-muted-foreground text-xs">Matches</div>
              </div>
            </div>
          </div>
        )}

        {/* Current goals */}
        {activeGoals.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
              <Target className="h-4 w-4 text-purple-600" />
              Current Goals ({activeGoals.length})
            </h4>
            <div className="space-y-2">
              {activeGoals.slice(0, 2).map((goal) => (
                <div
                  className="rounded-lg border bg-purple-50/50 p-2 text-sm"
                  key={goal._id}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.title}</span>
                    {goal.progress !== undefined && (
                      <Badge className="text-xs" variant="outline">
                        {goal.progress}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Injury status bar */}
        <Link
          className={`block rounded-lg border-l-4 p-3 transition-colors hover:opacity-90 ${
            activeInjuries.length > 0
              ? "border-red-500 bg-red-50"
              : "border-green-500 bg-green-50"
          }`}
          href={`/orgs/${orgId}/player/injuries` as Route}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4
                className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wide ${
                  activeInjuries.length > 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                <Activity className="h-4 w-4" />
                Injury Status
              </h4>
              <p
                className={`mt-1 text-sm ${
                  activeInjuries.length > 0 ? "text-red-800" : "text-green-800"
                }`}
              >
                {activeInjuries.length > 0 ? (
                  <>
                    {activeInjuries.filter((i) => i.status === "active")
                      .length > 0 && (
                      <span className="font-medium">
                        {
                          activeInjuries.filter((i) => i.status === "active")
                            .length
                        }{" "}
                        active
                        {activeInjuries.filter((i) => i.status === "recovering")
                          .length > 0 && ", "}
                      </span>
                    )}
                    {activeInjuries.filter((i) => i.status === "recovering")
                      .length > 0 && (
                      <span>
                        {
                          activeInjuries.filter(
                            (i) => i.status === "recovering"
                          ).length
                        }{" "}
                        recovering
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    No injuries recorded
                  </span>
                )}
              </p>
            </div>
            <ChevronRight
              className={`h-5 w-5 ${
                activeInjuries.length > 0 ? "text-red-400" : "text-green-400"
              }`}
            />
          </div>
        </Link>

        {/* View Passport button(s) */}
        {allPassports &&
        allPassports.filter((p) => p.status === "active").length > 1 ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              View Passports
            </span>
            <div className="grid grid-cols-1 gap-2">
              {allPassports
                .filter((p) => p.status === "active")
                .map((passport) => (
                  <Link
                    className="group flex w-full items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 transition-colors hover:bg-blue-100"
                    href={
                      `/orgs/${orgId}/player/passports?sport=${passport.sportCode}` as Route
                    }
                    key={passport._id}
                  >
                    <span className="font-medium text-sm">
                      {formatSportName(passport.sportCode)} Passport
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
            </div>
          </div>
        ) : (
          <Link
            className="group flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 transition-colors hover:bg-blue-100"
            href={`/orgs/${orgId}/player/passports` as Route}
          >
            <span className="font-medium">View Full Passport</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
