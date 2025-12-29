"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Calendar,
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

interface ChildCardProps {
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
}

// Calculate average rating from skills
const calculateAverageRating = (
  skills: Record<string, number> | undefined
): number => {
  if (!skills) return 0;
  const values = Object.values(skills).filter(
    (v) => typeof v === "number" && v > 0
  );
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

// Get top 3 skills
const getTopSkills = (
  skills: Record<string, number> | undefined
): Array<{ name: string; rating: number }> => {
  if (!skills) return [];
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
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
};

// Get review status badge
const getReviewStatusBadge = (status: string | undefined) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-700">Review Complete</Badge>
      );
    case "due soon":
    case "due_soon":
      return <Badge className="bg-yellow-100 text-yellow-700">Due Soon</Badge>;
    case "overdue":
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
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

  // Get active injuries
  const injuries = useQuery(api.models.playerInjuries.getInjuriesForPlayer, {
    playerIdentityId: player._id,
  });

  // Get goals
  const goals = useQuery(api.models.passportGoals.getGoalsForPlayer, {
    playerIdentityId: player._id,
  });

  // Get first passport (primary sport)
  const primaryPassport = passportData?.passports?.[0];

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
    if (!injuries) return [];
    return injuries.filter(
      (i: any) => i.status === "active" || i.status === "recovering"
    );
  }, [injuries]);

  const activeGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter(
      (g: any) => g.status === "in_progress" || g.status === "not_started"
    );
  }, [goals]);

  const visibleGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter((g: any) => g.parentCanView !== false);
  }, [goals]);

  // Calculate performance score (0-100)
  const performanceScore = Math.round(averageRating * 20); // Convert 0-5 to 0-100

  // Attendance percentages
  const trainingAttendance = enrollment?.attendance?.training ?? 0;
  const matchAttendance = enrollment?.attendance?.matches ?? 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 pb-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">
                {player.firstName} {player.lastName}
              </CardTitle>
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                {enrollment?.ageGroup && (
                  <span>{enrollment.ageGroup.toUpperCase()}</span>
                )}
                {primaryPassport?.sportCode && (
                  <>
                    <span>•</span>
                    <span>{primaryPassport.sportCode.toUpperCase()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {getReviewStatusBadge(enrollment?.reviewStatus)}
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
              {topSkills.map((skill, idx) => (
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
                        key={i}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance */}
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

        {/* Injury Status */}
        <div className="flex items-center justify-between rounded-lg border p-2">
          <div className="flex items-center gap-2">
            <Heart
              className={`h-4 w-4 ${
                activeInjuries.length > 0 ? "text-red-500" : "text-green-500"
              }`}
            />
            <span className="text-sm">Injury Status</span>
          </div>
          {activeInjuries.length > 0 ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <Badge className="bg-red-100 text-red-700">
                {activeInjuries.length} Active
              </Badge>
            </div>
          ) : (
            <Badge className="bg-green-100 text-green-700">All Clear</Badge>
          )}
        </div>

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

        {/* View Passport Button */}
        <Link
          className="group flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 transition-colors hover:bg-blue-100"
          href={`/orgs/${orgId}/players/${player._id}`}
        >
          <span className="font-medium">View Full Passport</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
