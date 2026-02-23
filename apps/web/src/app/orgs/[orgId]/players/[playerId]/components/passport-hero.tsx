"use client";

import { Calendar, Target, TrendingUp, User } from "lucide-react";
import { useMemo } from "react";

const SPORT_EMOJIS: Record<string, string> = {
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

function getSportEmoji(sportCode: string): string {
  return SPORT_EMOJIS[sportCode.toLowerCase()] || "🏅";
}

function formatSportName(sportCode: string): string {
  return sportCode
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function calcAverageRating(skills: Record<string, number> | undefined): number {
  if (!skills) {
    return 0;
  }
  const values = Object.values(skills).filter(
    (v) => typeof v === "number" && v > 0
  );
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getPerfColor(score: number): string {
  if (score >= 70) {
    return "text-green-600";
  }
  if (score >= 40) {
    return "text-yellow-600";
  }
  if (score > 0) {
    return "text-orange-600";
  }
  return "text-gray-400";
}

function getAttendanceColor(pct: number): string {
  if (pct >= 80) {
    return "text-green-600";
  }
  if (pct >= 60) {
    return "text-yellow-600";
  }
  if (pct > 0) {
    return "text-red-600";
  }
  return "text-gray-400";
}

type ActiveSport = {
  _id: string;
  sportCode: string;
};

type Goal = {
  status: string;
};

type SportBadgesProps = {
  activeSports?: ActiveSport[];
  isMultiSport?: boolean;
  sportCode?: string;
};

function SportBadges({
  activeSports,
  isMultiSport,
  sportCode,
}: SportBadgesProps) {
  if (activeSports && activeSports.length > 0) {
    return (
      <>
        {activeSports.map((sport) => (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 font-medium text-sm text-white"
            key={sport._id}
          >
            {getSportEmoji(sport.sportCode)} {formatSportName(sport.sportCode)}
          </span>
        ))}
        {isMultiSport && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2.5 py-0.5 font-bold text-amber-100 text-sm">
            ⭐ Multi-Sport
          </span>
        )}
      </>
    );
  }

  if (sportCode) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 font-medium text-sm text-white">
        {getSportEmoji(sportCode)} {formatSportName(sportCode)}
      </span>
    );
  }

  return null;
}

type PassportHeroProps = {
  playerName: string;
  sportCode?: string;
  ageGroup?: string;
  activeSports?: ActiveSport[];
  isMultiSport?: boolean;
  skills?: Record<string, number>;
  goals?: Goal[];
  overallScore?: number;
  trainingAttendance?: number;
};

export function PassportHero({
  playerName,
  sportCode,
  ageGroup,
  activeSports,
  isMultiSport,
  skills,
  goals,
  overallScore,
  trainingAttendance,
}: PassportHeroProps) {
  const initials = playerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avgRating = useMemo(() => calcAverageRating(skills), [skills]);
  const performanceScore = overallScore || Math.round(avgRating * 20);

  const activeGoalsCount = useMemo(() => {
    if (!goals) {
      return 0;
    }
    return goals.filter(
      (g) => g.status === "in_progress" || g.status === "not_started"
    ).length;
  }, [goals]);

  const trainingPct = trainingAttendance ?? 0;
  const hasStats =
    performanceScore > 0 || trainingPct > 0 || activeGoalsCount > 0;

  return (
    <div className="mb-6 overflow-hidden rounded-xl shadow-lg">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-5 text-white sm:p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white text-xl sm:h-16 sm:w-16 sm:text-2xl">
            {initials || <User className="h-7 w-7" />}
          </div>

          {/* Player Info */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-2xl text-white leading-tight sm:text-3xl">
              {playerName}
            </h1>
            {ageGroup && (
              <p className="mt-0.5 font-medium text-blue-100 text-sm uppercase tracking-wide">
                {ageGroup}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SportBadges
                activeSports={activeSports}
                isMultiSport={isMultiSport}
                sportCode={sportCode}
              />
            </div>
          </div>

          {/* Performance Score Bubble */}
          {performanceScore > 0 && (
            <div className="shrink-0 text-center">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                <span className="font-bold text-lg leading-none">
                  {performanceScore}%
                </span>
              </div>
              <p className="mt-1 text-blue-100 text-xs">Overall</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      {hasStats && (
        <div className="grid grid-cols-3 divide-x border-t bg-white">
          <StatTile
            icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
            label="Performance"
            value={performanceScore > 0 ? `${performanceScore}%` : "—"}
            valueColor={getPerfColor(performanceScore)}
          />
          <StatTile
            icon={<Calendar className="h-3.5 w-3.5 text-green-500" />}
            label="Training"
            value={trainingPct > 0 ? `${trainingPct}%` : "—"}
            valueColor={getAttendanceColor(trainingPct)}
          />
          <StatTile
            icon={<Target className="h-3.5 w-3.5 text-purple-500" />}
            label="Active Goals"
            value={activeGoalsCount > 0 ? String(activeGoalsCount) : "—"}
            valueColor={
              activeGoalsCount > 0 ? "text-purple-600" : "text-gray-400"
            }
          />
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-3">
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`font-bold text-xl ${valueColor}`}>{value}</span>
    </div>
  );
}
