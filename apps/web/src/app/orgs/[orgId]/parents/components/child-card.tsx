"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Activity,
  Calendar,
  CheckCircle,
  ChevronRight,
  Heart,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ChildCardProps = {
  child: {
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
    };
    enrollment?: {
      ageGroup?: string;
      status?: string;
      attendance?: { training?: number; matches?: number };
      lastReviewDate?: string;
      reviewStatus?: string;
    };
  };
  orgId: string;
};

// Calculate average rating from skills
const calculateAverageRating = (
  skills: Record<string, number> | undefined
): number => {
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
};

// Get top 3 skills
const getTopSkills = (
  skills: Record<string, number> | undefined
): Array<{ name: string; rating: number }> => {
  if (!skills) {
    return [];
  }
  return Object.entries(skills)
    .filter(([_, value]) => typeof value === "number" && value > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      rating: value as number,
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
};

// Get attendance color
const getAttendanceColor = (percentage: number): string => {
  if (percentage >= 80) {
    return "text-green-600";
  }
  if (percentage >= 60) {
    return "text-yellow-600";
  }
  return "text-red-600";
};

// Get emoji icon for a sport code
const getSportEmoji = (sportCode: string): string => {
  const sportEmojis: Record<string, string> = {
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
  return sportEmojis[sportCode.toLowerCase()] || "🏅";
};

// Format sport code to display name
const formatSportName = (sportCode: string): string =>
  sportCode.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// Get assessment status badge based on passport data
const getAssessmentStatusBadge = (
  assessmentCount: number | undefined,
  overallRating: number | undefined
) => {
  if (!assessmentCount || assessmentCount === 0) {
    return (
      <Badge className="shrink-0 bg-gray-100 text-gray-600" variant="outline">
        No Assessments
      </Badge>
    );
  }

  // Show rating if available, otherwise just show assessment count
  if (overallRating && overallRating > 0) {
    const ratingText =
      overallRating >= 4
        ? "Excellent"
        : overallRating >= 3
          ? "Good"
          : overallRating >= 2
            ? "Developing"
            : "Needs Support";
    const ratingColor =
      overallRating >= 4
        ? "bg-green-100 text-green-700"
        : overallRating >= 3
          ? "bg-blue-100 text-blue-700"
          : overallRating >= 2
            ? "bg-yellow-100 text-yellow-700"
            : "bg-orange-100 text-orange-700";

    return <Badge className={`shrink-0 ${ratingColor}`}>{ratingText}</Badge>;
  }

  return (
    <Badge className="shrink-0 bg-blue-100 text-blue-700">
      {assessmentCount} Assessment{assessmentCount > 1 ? "s" : ""}
    </Badge>
  );
};

export function ChildCard({ child, orgId }: ChildCardProps) {
  const { player, enrollment } = child;

  // Get passport data for this child
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    {
      playerIdentityId: player._id,
      organizationId: orgId,
    }
  );

  // Get ALL sport passports for multi-sport passport buttons
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    { playerIdentityId: player._id }
  );

  // Get active injuries
  const injuries = useQuery(api.models.playerInjuries.getInjuriesForPlayer, {
    playerIdentityId: player._id,
  });

  // Get goals
  const goals = useQuery(api.models.passportGoals.getGoalsForPlayer, {
    playerIdentityId: player._id,
  });

  // Get medical profile
  const medicalProfile = useQuery(
    api.models.medicalProfiles.getByPlayerIdentityId,
    { playerIdentityId: player._id, organizationId: orgId }
  );

  // Get first passport (primary sport)
  const primaryPassport = passportData?.passports?.[0];

  // Get active sports for badges
  const activeSports = useMemo(() => {
    if (!allPassports) {
      return [];
    }
    return allPassports.filter((p: any) => p.status === "active");
  }, [allPassports]);

  const isMultiSport = activeSports.length > 1;

  // Process data
  const averageRating = useMemo(() => {
    const skills = passportData?.skills;
    return calculateAverageRating(skills as Record<string, number> | undefined);
  }, [passportData]);

  const topSkills = useMemo(() => {
    const skills = passportData?.skills;
    return getTopSkills(skills as Record<string, number> | undefined);
  }, [passportData]);

  const activeInjuries = useMemo(() => {
    if (!injuries) {
      return [];
    }
    return injuries.filter(
      (i: any) => i.status === "active" || i.status === "recovering"
    );
  }, [injuries]);

  const activeGoals = useMemo(() => {
    if (!goals) {
      return [];
    }
    return goals.filter(
      (g: any) => g.status === "in_progress" || g.status === "not_started"
    );
  }, [goals]);

  const visibleGoals = useMemo(() => {
    if (!goals) {
      return [];
    }
    return goals.filter((g: any) => g.parentCanView !== false);
  }, [goals]);

  // Get medical alerts (conditions + allergies) with labels
  const medicalAlerts = useMemo(() => {
    const alerts: { type: "condition" | "allergy"; name: string }[] = [];
    if (medicalProfile?.conditions && medicalProfile.conditions.length > 0) {
      for (const condition of medicalProfile.conditions) {
        alerts.push({ type: "condition", name: condition });
      }
    }
    if (medicalProfile?.allergies && medicalProfile.allergies.length > 0) {
      for (const allergy of medicalProfile.allergies) {
        alerts.push({ type: "allergy", name: allergy });
      }
    }
    return alerts;
  }, [medicalProfile]);

  // Format medical alert for display
  const formatMedicalAlert = (alert: {
    type: "condition" | "allergy";
    name: string;
  }) => {
    const prefix = alert.type === "allergy" ? "Allergy:" : "Condition:";
    return `${prefix} ${alert.name}`;
  };

  // Calculate performance score (0-100)
  const performanceScore = Math.round(averageRating * 20); // Convert 0-5 to 0-100

  // Attendance percentages
  const trainingAttendance = enrollment?.attendance?.training ?? 0;
  const matchAttendance = enrollment?.attendance?.matches ?? 0;

  return (
    <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 pb-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-lg text-white">
                  {player.firstName} {player.lastName}
                </CardTitle>
                {enrollment?.ageGroup && (
                  <p className="text-blue-100 text-sm">
                    {enrollment.ageGroup.toUpperCase()}
                  </p>
                )}
                {/* Sport Badges with Emojis */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeSports.length > 0 ? (
                    <>
                      {activeSports.map((sport: any) => (
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
          {getAssessmentStatusBadge(
            primaryPassport?.assessmentCount,
            primaryPassport?.currentOverallRating
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Performance Score */}
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

        {/* Top Strengths */}
        {topSkills.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              Top Strengths
            </h4>
            <div className="space-y-2">
              {topSkills.map((skill, _idx) => (
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

        {/* Attendance - only show if data exists */}
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

        {/* Development Goals */}
        {visibleGoals.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
              <Target className="h-4 w-4 text-purple-600" />
              Current Goals ({activeGoals.length})
            </h4>
            <div className="space-y-2">
              {visibleGoals.slice(0, 2).map((goal: any) => (
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
                  {goal.parentActions && goal.parentActions.length > 0 && (
                    <p className="mt-1 text-muted-foreground text-xs">
                      💡 {goal.parentActions[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Injury Status - Simple summary with link like MVP */}
        <Link
          className={`block rounded-lg border-l-4 p-3 transition-colors hover:opacity-90 ${
            activeInjuries.length > 0
              ? "border-red-500 bg-red-50"
              : "border-green-500 bg-green-50"
          }`}
          href={`/orgs/${orgId}/parents/injuries`}
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
                    {activeInjuries.filter((i: any) => i.status === "active")
                      .length > 0 && (
                      <span className="font-medium">
                        {
                          activeInjuries.filter(
                            (i: any) => i.status === "active"
                          ).length
                        }{" "}
                        active
                        {activeInjuries.filter(
                          (i: any) => i.status === "recovering"
                        ).length > 0 && ", "}
                      </span>
                    )}
                    {activeInjuries.filter(
                      (i: any) => i.status === "recovering"
                    ).length > 0 && (
                      <span>
                        {
                          activeInjuries.filter(
                            (i: any) => i.status === "recovering"
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

        {/* Medical Status - Compact summary with link */}
        <Link
          className={`block rounded-lg border-l-4 p-2 transition-colors hover:opacity-90 ${
            medicalAlerts.length > 0
              ? "border-orange-500 bg-orange-50"
              : "border-blue-500 bg-blue-50"
          }`}
          href={`/orgs/${orgId}/parents/medical`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4
                className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wide ${
                  medicalAlerts.length > 0 ? "text-orange-700" : "text-blue-700"
                }`}
              >
                <Heart className="h-3 w-3" />
                Medical
              </h4>
              <p
                className={`mt-0.5 truncate text-xs ${
                  medicalAlerts.length > 0 ? "text-orange-800" : "text-blue-800"
                }`}
              >
                {medicalAlerts.length > 0
                  ? medicalAlerts
                      .slice(0, 2)
                      .map(formatMedicalAlert)
                      .join(", ") +
                    (medicalAlerts.length > 2
                      ? ` +${medicalAlerts.length - 2} more`
                      : "")
                  : "No alerts"}
              </p>
            </div>
            <ChevronRight
              className={`h-4 w-4 shrink-0 ${
                medicalAlerts.length > 0 ? "text-orange-400" : "text-blue-400"
              }`}
            />
          </div>
        </Link>

        {/* Last Review */}
        {enrollment?.lastReviewDate && (
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last Review
            </span>
            <span>
              {new Date(enrollment.lastReviewDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* View Passport Buttons - one per sport */}
        {allPassports && allPassports.length > 1 ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              View Passports
            </span>
            <div className="grid grid-cols-1 gap-2">
              {allPassports
                .filter((p) => p.status === "active")
                .map((passport) => {
                  // Format sport name nicely
                  const sportName = passport.sportCode
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());
                  return (
                    <Link
                      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 transition-colors hover:bg-blue-100"
                      href={`/orgs/${orgId}/players/${player._id}?sport=${passport.sportCode}`}
                      key={passport._id}
                    >
                      <span className="font-medium text-sm">
                        {sportName} Passport
                      </span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  );
                })}
            </div>
          </div>
        ) : (
          <Link
            className="group flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 transition-colors hover:bg-blue-100"
            href={`/orgs/${orgId}/players/${player._id}`}
          >
            <span className="font-medium">View Full Passport</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
