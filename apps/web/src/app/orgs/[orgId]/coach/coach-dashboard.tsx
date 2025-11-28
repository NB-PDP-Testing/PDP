"use client";

import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle,
  Mic,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// TODO: Replace with actual data fetching from Convex
interface TeamAnalytics {
  teamId: string;
  teamName: string;
  playerCount: number;
  avgSkillLevel: number;
  strengths: Array<{ skill: string; avg: number }>;
  weaknesses: Array<{ skill: string; avg: number }>;
  overdueReviews: number;
  attendanceIssues: number;
  topPerformers: string[];
  needsAttention: string[];
}

interface CorrelationInsight {
  type: "attendance" | "improvement" | "position";
  message: string;
  severity: "info" | "warning" | "success";
}

export function CoachDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [showVoiceNotes, setShowVoiceNotes] = useState(false);

  // TODO: Fetch real data from Convex
  const mockData = {
    totalPlayers: 0,
    completedReviews: 0,
    overdueReviews: 0,
    avgSkillLevel: 0,
    teams: [] as TeamAnalytics[],
    insights: [] as CorrelationInsight[],
  };

  if (showVoiceNotes) {
    router.push(`/orgs/${orgId}/coach/voice-notes`);
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={28} />
            <div>
              <h2 className="font-bold text-2xl">Coach Dashboard</h2>
              <p className="text-green-100 text-sm">
                Team insights and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-600" size={20} />
              <div className="font-bold text-2xl text-gray-800">
                {mockData.totalPlayers}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-sm">
              Total Players
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div className="h-1 w-full rounded-full bg-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-600" size={20} />
              <div className="font-bold text-2xl text-gray-800">
                {mockData.completedReviews}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-sm">
              Reviews Complete
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div className="h-1 w-1/2 rounded-full bg-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertCircle className="text-red-600" size={20} />
              <div className="font-bold text-2xl text-gray-800">
                {mockData.overdueReviews}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-sm">
              Reviews Overdue
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-red-100">
              <div className="h-1 w-1/4 rounded-full bg-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="font-bold text-2xl text-gray-800">
                {mockData.avgSkillLevel.toFixed(1)}
              </div>
            </div>
            <div className="text-gray-600 text-sm">Avg Skill Level</div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div className="h-1 w-3/4 rounded-full bg-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-yellow-600" size={20} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowVoiceNotes(true)}
          >
            <Mic className="mr-2" size={16} />
            Voice Notes
          </Button>
          <Button variant="outline">
            <Target className="mr-2" size={16} />
            Session Planner
          </Button>
          <Button variant="outline">
            <BarChart3 className="mr-2" size={16} />
            Team Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Data Insights */}
      {mockData.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={20} />
              Team Data Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockData.insights.map((insight, idx) => (
              <div
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  insight.severity === "warning"
                    ? "border border-orange-200 bg-orange-50"
                    : insight.severity === "success"
                      ? "border border-green-200 bg-green-50"
                      : "border border-blue-200 bg-blue-50"
                }`}
                key={idx}
              >
                {insight.severity === "warning" ? (
                  <AlertCircle className="mt-0.5 text-orange-600" size={18} />
                ) : (
                  <Target className="mt-0.5 text-blue-600" size={18} />
                )}
                <p className="text-gray-700 text-sm leading-relaxed">
                  {insight.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Teams Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {mockData.teams.map((team, idx) => (
          <Card className="transition-shadow hover:shadow-xl" key={team.teamId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{team.teamName}</CardTitle>
                  <CardDescription>{team.playerCount} Players</CardDescription>
                </div>
                <div className="text-right">
                  <div className="font-bold text-3xl text-green-600">
                    {team.avgSkillLevel.toFixed(1)}
                  </div>
                  <div className="text-gray-500 text-xs">Avg Skill</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Strengths */}
              {team.strengths.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 text-green-600" size={16} />
                    <div className="flex-1">
                      <div className="mb-2 font-semibold text-green-800 text-sm">
                        Top Strengths
                      </div>
                      <div className="space-y-1">
                        {team.strengths.map((s, i) => (
                          <div className="flex items-center gap-2" key={i}>
                            <Badge variant="secondary">{s.skill}</Badge>
                            <span className="text-green-700 text-xs">
                              {s.avg.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {team.weaknesses.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-start gap-2">
                    <TrendingDown
                      className="mt-0.5 text-orange-600"
                      size={16}
                    />
                    <div className="flex-1">
                      <div className="mb-2 font-semibold text-orange-800 text-sm">
                        Areas to Improve
                      </div>
                      <div className="space-y-1">
                        {team.weaknesses.map((w, i) => (
                          <div className="flex items-center gap-2" key={i}>
                            <Badge variant="secondary">{w.skill}</Badge>
                            <span className="text-orange-700 text-xs">
                              {w.avg.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" variant="default">
                  View Team
                </Button>
                <Button className="flex-1" variant="outline">
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockData.teams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 font-semibold text-gray-700 text-lg">
              No Teams Found
            </h3>
            <p className="mb-4 text-gray-500">
              You don't have any teams assigned yet. Contact your administrator
              to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
