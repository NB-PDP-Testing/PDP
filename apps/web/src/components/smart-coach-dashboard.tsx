"use client";

import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  Mic,
  Search,
  Share,
  Share2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AIRecommendation,
  generateCoachingRecommendations,
  generateSessionPlan,
} from "@/lib/ai-service";
import {
  downloadPDF,
  generateSessionPlanPDF,
  shareViaEmail,
  shareViaNative,
  shareViaWhatsApp,
} from "@/lib/pdf-generator";

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

interface TeamData {
  _id: string;
  name: string;
  coachNotes?: string;
}

interface SmartCoachDashboardProps {
  players: any[];
  coachTeams?: string[];
  onViewTeam?: (teamName: string) => void;
  onViewAnalytics?: (teamName?: string) => void;
  onFilterOverdueReviews?: () => void;
  onFilterAllPlayers?: () => void;
  onFilterCompletedReviews?: () => void;
  onViewPlayer?: (player: any) => void;
  onEditPlayer?: (player: any) => void;
  onClearTeamSelection?: () => void;
  onViewVoiceNotes?: () => void;
  onViewInjuries?: () => void;
  onViewGoals?: () => void;
  onAssessPlayers?: () => void;
  selectedTeam?: string | null;
  selectedTeamData?: TeamData | null; // Team data with coachNotes
  onSaveTeamNote?: (teamId: string, note: string) => Promise<boolean>;
  isClubView?: boolean;
  // Search and filter props
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  teamFilter?: string | null;
  onTeamFilterChange?: (value: string | null) => void;
  ageGroupFilter?: string;
  onAgeGroupFilterChange?: (value: string) => void;
  sportFilter?: string;
  onSportFilterChange?: (value: string) => void;
  genderFilter?: string;
  onGenderFilterChange?: (value: string) => void;
  uniqueAgeGroups?: string[];
  uniqueSports?: string[];
  uniqueGenders?: string[];
}

export function SmartCoachDashboard({
  players,
  coachTeams,
  onViewTeam,
  onViewAnalytics,
  onFilterOverdueReviews,
  onFilterAllPlayers,
  onFilterCompletedReviews,
  onViewPlayer,
  onEditPlayer,
  onClearTeamSelection,
  onViewVoiceNotes,
  onViewInjuries,
  onViewGoals,
  onAssessPlayers,
  selectedTeam,
  selectedTeamData,
  onSaveTeamNote,
  isClubView = false,
  // Search and filter props
  searchTerm = "",
  onSearchChange,
  teamFilter = null,
  onTeamFilterChange,
  ageGroupFilter = "all",
  onAgeGroupFilterChange,
  sportFilter = "all",
  onSportFilterChange,
  genderFilter = "all",
  onGenderFilterChange,
  uniqueAgeGroups = [],
  uniqueSports = [],
  uniqueGenders = [],
}: SmartCoachDashboardProps) {
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics[]>([]);
  const [insights, setInsights] = useState<CorrelationInsight[]>([]);
  const [aiRecommendations, setAIRecommendations] = useState<
    AIRecommendation[]
  >([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSessionPlan, setShowSessionPlan] = useState(false);
  const [sessionPlan, setSessionPlan] = useState("");
  const [loadingSessionPlan, setLoadingSessionPlan] = useState(false);
  const [actualAIMode, setActualAIMode] = useState<"real" | "simulated">(
    "simulated"
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [planToShare, setPlanToShare] = useState<any>(null);
  const [sortColumn, setSortColumn] = useState<
    "name" | "team" | "ageGroup" | "lastReview"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Team notes state
  const [showAddTeamNote, setShowAddTeamNote] = useState(false);
  const [newTeamNote, setNewTeamNote] = useState("");
  const [savingTeamNote, setSavingTeamNote] = useState(false);

  // Handle saving team note
  const handleSaveTeamNote = async () => {
    if (!selectedTeamData || !newTeamNote.trim() || !onSaveTeamNote) return;
    
    setSavingTeamNote(true);
    try {
      const success = await onSaveTeamNote(selectedTeamData._id, newTeamNote.trim());
      if (success) {
        setNewTeamNote("");
        setShowAddTeamNote(false);
      }
    } finally {
      setSavingTeamNote(false);
    }
  };

  useEffect(() => {
    calculateTeamAnalytics();
    generateCorrelationInsights();
  }, [players, coachTeams]);

  // Handle column sort
  const handleSort = (column: "name" | "team" | "ageGroup" | "lastReview") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case "name": {
        const surnameA = (a.name || "").split(" ").pop()?.toLowerCase() || "";
        const surnameB = (b.name || "").split(" ").pop()?.toLowerCase() || "";
        comparison = surnameA.localeCompare(surnameB);
        break;
      }
      case "team": {
        const teamA = (a.teamName || a.team || "").toLowerCase();
        const teamB = (b.teamName || b.team || "").toLowerCase();
        comparison = teamA.localeCompare(teamB);
        break;
      }
      case "ageGroup": {
        const ageOrder: Record<string, number> = {
          U8: 1,
          U9: 2,
          U10: 3,
          U11: 4,
          U12: 5,
          U13: 6,
          U14: 7,
          U15: 8,
          U16: 9,
          U17: 10,
          U18: 11,
          Minor: 12,
          Adult: 13,
          Senior: 14,
        };
        comparison =
          (ageOrder[a.ageGroup] ?? 99) - (ageOrder[b.ageGroup] ?? 99);
        break;
      }
      case "lastReview": {
        const dateA = a.lastReviewDate
          ? new Date(a.lastReviewDate).getTime()
          : 0;
        const dateB = b.lastReviewDate
          ? new Date(b.lastReviewDate).getTime()
          : 0;
        comparison = dateA - dateB;
        break;
      }
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Helper to get all teams for a player
  const getPlayerTeams = (player: any): string[] => {
    const teamName = player.teamName || player.team;
    if (teamName) {
      return [teamName];
    }
    return [];
  };

  const calculateTeamAnalytics = () => {
    // Use coach's assigned teams if provided, otherwise extract from player data
    let uniqueTeams: string[];
    if (coachTeams && coachTeams.length > 0 && !isClubView) {
      // For coach view, only show their assigned teams
      uniqueTeams = [...coachTeams].sort();
    } else {
      // For club view or when no coach teams provided, get from player data
      // Get team names from teamPlayers links - we'll need to get this from the backend
      // For now, extract from player data if available
      uniqueTeams = Array.from(
        new Set(
          players
            .map((p) => {
              // Players might have team info in different formats
              // Check if player has a team property or if we need to look it up
              return (p as any).teamName || (p as any).team;
            })
            .filter(Boolean)
        )
      ).sort();
    }

    // Create team objects dynamically
    const dynamicTeams = uniqueTeams.map((teamName, idx) => ({
      id: `team_${idx + 1}`,
      name: teamName,
    }));

    const analytics = dynamicTeams.map((team) => {
      const teamPlayers = players.filter(
        (p) =>
          ((p as any).teamName === team.name ||
            (p as any).team === team.name) &&
          p
      );

      if (teamPlayers.length === 0) {
        return {
          teamId: team.id,
          teamName: team.name,
          playerCount: 0,
          avgSkillLevel: 0,
          strengths: [],
          weaknesses: [],
          overdueReviews: 0,
          attendanceIssues: 0,
          topPerformers: [],
          needsAttention: [],
        };
      }

      // Calculate skill averages
      const skillAverages = calculateSkillAverages(teamPlayers);

      // Find strengths (avg >= 4.0)
      const strengths = Object.entries(skillAverages)
        .filter(([_, avg]) => avg >= 4.0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill, avg]) => ({ skill: formatSkillName(skill), avg }));

      // Find weaknesses (avg < 2.5)
      const weaknesses = Object.entries(skillAverages)
        .filter(([_, avg]) => avg < 2.5)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([skill, avg]) => ({ skill: formatSkillName(skill), avg }));

      // Count overdue reviews
      const overdueReviews = teamPlayers.filter(
        (p) => p.reviewStatus === "Overdue"
      ).length;

      // Count attendance issues (<70%)
      const attendanceIssues = teamPlayers.filter((p) => {
        const trainPct = Number.parseInt(
          (p.attendance?.training as string) || "100"
        );
        return trainPct < 70;
      }).length;

      // Find top performers (avg skill > 4.0)
      const topPerformers = teamPlayers
        .filter((p) => calculatePlayerAvgSkill(p) >= 4.0)
        .map((p) => p.name)
        .slice(0, 3);

      // Find players needing attention (avg < 2.5 OR low attendance)
      const needsAttention = teamPlayers
        .filter((p) => {
          const avgSkill = calculatePlayerAvgSkill(p);
          const trainPct = Number.parseInt(
            (p.attendance?.training as string) || "100"
          );
          return avgSkill < 2.5 || trainPct < 70;
        })
        .map((p) => p.name)
        .slice(0, 5);

      // Overall avg skill level
      const avgSkillLevel =
        teamPlayers.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) /
        teamPlayers.length;

      return {
        teamId: team.id,
        teamName: team.name,
        playerCount: teamPlayers.length,
        avgSkillLevel: Number.parseFloat(avgSkillLevel.toFixed(2)),
        strengths,
        weaknesses,
        overdueReviews,
        attendanceIssues,
        topPerformers,
        needsAttention,
      };
    });

    setTeamAnalytics(analytics);
  };

  const calculateSkillAverages = (teamPlayers: any[]) => {
    if (teamPlayers.length === 0) return {};
    const skillKeys = Object.keys(teamPlayers[0].skills || {}).filter(
      (k) => k !== "kickingDistanceMax"
    );
    const averages: Record<string, number> = {};

    skillKeys.forEach((skillKey) => {
      const sum = teamPlayers.reduce((acc, player) => {
        const value = (player.skills as any)[skillKey];
        return acc + (typeof value === "number" ? value : 0);
      }, 0);
      averages[skillKey] = sum / teamPlayers.length;
    });

    return averages;
  };

  const calculatePlayerAvgSkill = (player: any): number => {
    const skills = player.skills || {};
    const skillValues = Object.values(skills).filter(
      (v) => typeof v === "number"
    ) as number[];
    if (skillValues.length === 0) return 0;
    return skillValues.reduce((a, b) => a + b, 0) / skillValues.length;
  };

  const formatSkillName = (key: string): string =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

  const generateCorrelationInsights = () => {
    const allPlayers = players;
    const insights: CorrelationInsight[] = [];

    // Team-specific skills analysis (for coaches)
    if (!isClubView && allPlayers.length > 0) {
      const teamSkillAverages = calculateSkillAverages(allPlayers);
      const skillEntries = Object.entries(teamSkillAverages);

      // Team strengths (top 3 skills)
      const topTeamSkills = skillEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topTeamSkills.length > 0) {
        const skillList = topTeamSkills
          .map(
            ([skill, avg]) => `${formatSkillName(skill)} (${avg.toFixed(1)})`
          )
          .join(", ");
        insights.push({
          type: "improvement",
          message: `🏆 Team strengths: ${skillList}. Build training sessions around these strong areas.`,
          severity: "success",
        });
      }

      // Team weaknesses (bottom 3 skills needing work)
      const weakTeamSkills = skillEntries
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);

      if (weakTeamSkills.length > 0 && weakTeamSkills[0][1] < 3.0) {
        const skillList = weakTeamSkills
          .map(
            ([skill, avg]) => `${formatSkillName(skill)} (${avg.toFixed(1)})`
          )
          .join(", ");
        insights.push({
          type: "improvement",
          message: `📊 Focus areas for development: ${skillList}. Consider dedicating practice time to these skills.`,
          severity: "warning",
        });
      }
    }

    // Attendance correlation
    const highAttendance = allPlayers.filter(
      (p) =>
        p.attendance &&
        Number.parseInt((p.attendance.training as string) || "100") >= 90
    );
    const lowAttendance = allPlayers.filter(
      (p) =>
        p.attendance &&
        Number.parseInt((p.attendance.training as string) || "100") < 60
    );

    if (highAttendance.length > 0 && lowAttendance.length > 0) {
      const highAvg =
        highAttendance.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) /
        highAttendance.length;
      const lowAvg =
        lowAttendance.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) /
        lowAttendance.length;
      const diff = highAvg - lowAvg;

      insights.push({
        type: "attendance",
        message: `📊 Players with 90%+ attendance average ${diff.toFixed(1)} points higher in skills (${highAttendance.length} players) vs <60% attendance (${lowAttendance.length} players).`,
        severity: diff > 1.0 ? "warning" : "info",
      });
    }

    // Review status - count players who need review (overdue OR never reviewed)
    const needsReviewCount = allPlayers.filter(
      (p) => p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate
    ).length;
    const completedCount = allPlayers.filter(
      (p) => p.reviewStatus === "Completed"
    ).length;
    const reviewRate =
      allPlayers.length > 0 ? (completedCount / allPlayers.length) * 100 : 0;

    if (needsReviewCount > 0) {
      const neverReviewedCount = allPlayers.filter(
        (p) => !p.lastReviewDate
      ).length;
      const overdueCount = allPlayers.filter(
        (p) => p.reviewStatus === "Overdue"
      ).length;
      
      let message = `⏰ ${needsReviewCount} player${needsReviewCount > 1 ? "s need" : " needs"} passport reviews`;
      if (neverReviewedCount > 0 && overdueCount > 0) {
        message += ` (${neverReviewedCount} never reviewed, ${overdueCount} overdue)`;
      } else if (neverReviewedCount > 0) {
        message += ` (never assessed)`;
      } else {
        message += ` (90+ days overdue)`;
      }
      message += `. Review completion rate: ${reviewRate.toFixed(0)}%.`;
      
      insights.push({
        type: "attendance",
        message,
        severity: "warning",
      });
    } else if (reviewRate >= 80) {
      insights.push({
        type: "attendance",
        message: `✅ Excellent review completion rate: ${reviewRate.toFixed(0)}%. All players are on track with regular assessments.`,
        severity: "success",
      });
    }

    setInsights(insights);
  };

  const generateAIRecommendations = async () => {
    // Prevent duplicate calls if already loading
    if (loadingAI) {
      console.log("⚠️ AI recommendations already loading, skipping...");
      return;
    }

    setLoadingAI(true);

    try {
      console.log(
        "🤖 Generating AI recommendations for all teams in a single call..."
      );

      // Combine all teams into one request for efficient AI call
      const allTeamsData = {
        teamName: "All Teams Combined",
        players,
        avgSkillLevel:
          players.length > 0
            ? players.reduce((sum, p) => {
                const skills = Object.values(p.skills || {}).filter(
                  (v) => typeof v === "number"
                );
                const avg =
                  skills.length > 0
                    ? skills.reduce((a, b) => a + Number(b), 0) / skills.length
                    : 0;
                return sum + avg;
              }, 0) / players.length
            : 0,
        strengths: teamAnalytics.flatMap((t) => t.strengths).slice(0, 5),
        weaknesses: teamAnalytics.flatMap((t) => t.weaknesses).slice(0, 5),
        attendanceIssues: teamAnalytics.reduce(
          (sum, t) => sum + t.attendanceIssues,
          0
        ),
        overdueReviews: teamAnalytics.reduce(
          (sum, t) => sum + t.overdueReviews,
          0
        ),
      };

      const response = await generateCoachingRecommendations(allTeamsData);

      // Update the actual AI mode based on what was used
      setActualAIMode(response.usedRealAI ? "real" : "simulated");
      setAIRecommendations(response.recommendations);

      console.log(
        `✅ Completed AI analysis - showing ${response.recommendations.length} recommendations (Mode: ${response.usedRealAI ? "Real AI" : "Simulated"})`
      );
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      setActualAIMode("simulated");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleGenerateSessionPlan = async () => {
    setLoadingSessionPlan(true);
    setShowSessionPlan(true);

    try {
      // Use first team with players for session plan
      const team = teamAnalytics.find((t) => t.playerCount > 0);
      if (!team) {
        setSessionPlan("No teams with players found.");
        return;
      }

      const teamPlayers = players.filter(
        (p) =>
          ((p as any).teamName === team.teamName ||
            (p as any).team === team.teamName) &&
          p
      );

      // ⚡ OPTIMIZED: Only send minimal data needed by backend (not full player objects)
      const teamData = {
        teamName: team.teamName,
        playerCount: teamPlayers.length,
        ageGroup: teamPlayers[0]?.ageGroup || "U12",
        avgSkillLevel: team.avgSkillLevel,
        strengths: team.strengths,
        weaknesses: team.weaknesses,
        attendanceIssues: team.attendanceIssues,
        overdueReviews: team.overdueReviews,
      };

      console.log(
        `📊 Generating session plan for ${team.teamName} (${teamPlayers.length} players)`
      );

      // Use weaknesses as focus if available
      const focus =
        team.weaknesses.length > 0 ? team.weaknesses[0].skill : undefined;
      const plan = await generateSessionPlan(teamData, focus);
      setSessionPlan(plan);
    } catch (error) {
      console.error("Error generating session plan:", error);
      setSessionPlan("Error generating session plan. Please try again.");
    } finally {
      setLoadingSessionPlan(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* My Teams Section */}
      <div
        className="rounded-lg p-4 text-white shadow-md md:p-6"
        style={{
          background: "linear-gradient(to right, var(--org-primary), var(--org-primary))",
          filter: "brightness(0.95)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="flex-shrink-0" size={28} />
            <div>
              <h2 className="font-bold text-xl md:text-2xl">My Teams</h2>
              <p className="text-white/80 text-xs md:text-sm">
                Dashboard & Insights
              </p>
            </div>
          </div>
          {/* AI Mode Indicator - Only show after AI recommendations have been generated */}
          {aiRecommendations.length > 0 && (
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm transition-colors ${
                actualAIMode === "real"
                  ? "border-purple-300/50 bg-purple-500/30"
                  : "border-white/30 bg-white/20"
              }`}
            >
              <Brain className="flex-shrink-0" size={14} />
              <span className="whitespace-nowrap font-medium text-xs">
                {actualAIMode === "real" ? "Real AI ✓" : "Simulated AI"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-blue-50 hover:shadow-lg"
          onClick={() => onFilterAllPlayers?.()}
        >
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-600" size={20} />
              <div className="font-bold text-2xl text-gray-800 transition-all duration-300">
                {players.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total Players
            </div>
            <div className="mt-1 text-blue-600 text-xs">Click to view all</div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{ width: "100%" }}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-green-50 hover:shadow-lg"
          onClick={() => onFilterCompletedReviews?.()}
        >
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-600" size={20} />
              <div className="font-bold text-2xl text-gray-800 transition-all duration-300">
                {players.filter((p) => p.reviewStatus === "Completed").length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Reviews Complete
            </div>
            <div className="mt-1 text-green-600 text-xs">Click to view</div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600 transition-all duration-500"
                style={{
                  width: `${
                    (players.filter((p) => p.reviewStatus === "Completed")
                      .length /
                      players.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-red-50 hover:shadow-lg"
          onClick={() => onFilterOverdueReviews?.()}
        >
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertCircle className="text-red-600" size={20} />
              <div className="font-bold text-2xl text-gray-800 transition-all duration-300">
                {players.filter((p) => p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate).length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Needs Review
            </div>
            <div className="mt-1 text-red-600 text-xs">Click to view</div>
            <div className="mt-2 h-1 w-full rounded-full bg-red-100">
              <div
                className="h-1 rounded-full bg-red-600 transition-all duration-500"
                style={{
                  width: `${
                    (players.filter((p) => p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate)
                      .length /
                      players.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="font-bold text-2xl text-gray-800 transition-all duration-300">
                {(() => {
                  const playersWithSkills = players.filter(p => Object.keys(p.skills || {}).length > 0);
                  if (playersWithSkills.length === 0) return "—";
                  const avg = playersWithSkills.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) / playersWithSkills.length;
                  return avg.toFixed(1);
                })()}
              </div>
            </div>
            <div className="text-gray-600 text-sm">Avg Skill Level</div>
            <div className="mt-1 text-purple-600 text-xs">
              {players.filter(p => Object.keys(p.skills || {}).length > 0).length === 0 
                ? "No assessments yet" 
                : `${players.filter(p => Object.keys(p.skills || {}).length > 0).length} assessed`}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-600 transition-all duration-500"
                style={{
                  width: `${(() => {
                    const playersWithSkills = players.filter(p => Object.keys(p.skills || {}).length > 0);
                    if (playersWithSkills.length === 0) return 0;
                    const avg = playersWithSkills.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) / playersWithSkills.length;
                    return (avg / 5) * 100;
                  })()}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Show selected team indicator if a team is selected */}
      {selectedTeam && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Viewing: {selectedTeam}
                </p>
                <p className="text-gray-600 text-sm">
                  Showing only players and analytics for this team
                </p>
              </div>
            </div>
            {onClearTeamSelection && (
              <Button
                className="bg-green-600 font-medium transition-colors hover:bg-green-700"
                onClick={onClearTeamSelection}
                variant="default"
              >
                Show All Teams
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {teamAnalytics
          .filter((team) => !selectedTeam || team.teamName === selectedTeam)
          .map((team, idx) => (
            <Card
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                selectedTeam === team.teamName
                  ? "border-2 border-green-500 bg-green-50"
                  : ""
              }`}
              key={team.teamId}
              onClick={() => onViewTeam?.(team.teamName)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg md:text-xl">
                      {team.teamName}
                    </CardTitle>
                    <p className="text-gray-600 text-xs md:text-sm">
                      {team.playerCount} Players
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <div className="font-bold text-2xl text-green-600 md:text-3xl">
                      {team.avgSkillLevel.toFixed(1)}
                    </div>
                    <div className="whitespace-nowrap text-gray-500 text-xs">
                      Avg Skill
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Skill Level Progress Bar */}
                <div>
                  <div className="mb-1 flex justify-between text-gray-600 text-xs">
                    <span>Team Skill Level</span>
                    <span>{team.avgSkillLevel.toFixed(1)}/5.0</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        team.avgSkillLevel >= 4
                          ? "bg-green-600"
                          : team.avgSkillLevel >= 3
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                      }`}
                      style={{ width: `${(team.avgSkillLevel / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Strengths */}
                {team.strengths.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-start gap-2">
                      <TrendingUp
                        className="mt-0.5 flex-shrink-0 text-green-600"
                        size={16}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 font-semibold text-green-800 text-xs md:text-sm">
                          Top Strengths
                        </div>
                        <div className="space-y-1">
                          {team.strengths.map((s, i) => (
                            <div className="flex items-center gap-2" key={i}>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-gray-700 text-xs">
                                  {s.skill}
                                </div>
                                <div className="mt-0.5 h-1.5 w-full rounded-full bg-green-200">
                                  <div
                                    className="h-1.5 rounded-full bg-green-600"
                                    style={{ width: `${(s.avg / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="flex-shrink-0 font-semibold text-green-700 text-xs">
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
                        className="mt-0.5 flex-shrink-0 text-orange-600"
                        size={16}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 font-semibold text-orange-800 text-xs md:text-sm">
                          Areas to Improve
                        </div>
                        <div className="space-y-1">
                          {team.weaknesses.map((w, i) => (
                            <div className="flex items-center gap-2" key={i}>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-gray-700 text-xs">
                                  {w.skill}
                                </div>
                                <div className="mt-0.5 h-1.5 w-full rounded-full bg-orange-200">
                                  <div
                                    className="h-1.5 rounded-full bg-orange-600"
                                    style={{ width: `${(w.avg / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="flex-shrink-0 font-semibold text-orange-700 text-xs">
                                {w.avg.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {(team.overdueReviews > 0 || team.attendanceIssues > 0) && (
                  <div className="flex flex-col gap-2">
                    {team.overdueReviews > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-600 text-xs md:text-sm">
                        <AlertCircle className="flex-shrink-0" size={14} />
                        <span className="truncate">
                          {team.overdueReviews} overdue review
                          {team.overdueReviews > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {team.attendanceIssues > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-orange-600 text-xs md:text-sm">
                        <AlertCircle className="flex-shrink-0" size={14} />
                        <span className="truncate">
                          {team.attendanceIssues} player
                          {team.attendanceIssues > 1 ? "s" : ""} with low
                          attendance
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className={`flex-1 font-medium transition-colors ${
                      selectedTeam === team.teamName
                        ? "bg-blue-700 hover:bg-blue-800"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTeam?.(team.teamName);
                    }}
                  >
                    {selectedTeam === team.teamName
                      ? "Viewing Team"
                      : "View Team"}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 font-medium transition-colors hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewAnalytics?.(team.teamName);
                    }}
                  >
                    Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="flex-shrink-0 text-yellow-600" size={20} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-3">
          {onAssessPlayers && (
            <Button
              className="flex items-center justify-center gap-2 bg-emerald-600 py-3 font-medium text-sm transition-colors hover:bg-emerald-700"
              onClick={onAssessPlayers}
            >
              <Edit className="flex-shrink-0" size={16} />
              <span className="truncate">Assess Players</span>
            </Button>
          )}
          <Button
            className="flex items-center justify-center gap-2 bg-green-600 py-3 font-medium text-sm transition-colors hover:bg-green-700"
            onClick={handleGenerateSessionPlan}
          >
            <Target className="flex-shrink-0" size={16} />
            <span className="truncate">Generate Session Plan (AI)</span>
          </Button>
          <Button
            className="flex items-center justify-center gap-2 bg-blue-600 py-3 font-medium text-sm transition-colors hover:bg-blue-700"
            onClick={() => onViewAnalytics?.()}
          >
            <BarChart3 className="flex-shrink-0" size={16} />
            <span className="truncate">View Team Analytics</span>
          </Button>
          {onViewVoiceNotes && (
            <Button
              className="flex items-center justify-center gap-2 bg-purple-600 py-3 font-medium text-sm transition-colors hover:bg-purple-700"
              onClick={onViewVoiceNotes}
            >
              <Mic className="flex-shrink-0" size={16} />
              <span className="truncate">Voice Notes</span>
            </Button>
          )}
          {onViewInjuries && (
            <Button
              className="flex items-center justify-center gap-2 bg-red-600 py-3 font-medium text-sm transition-colors hover:bg-red-700"
              onClick={onViewInjuries}
            >
              <AlertCircle className="flex-shrink-0" size={16} />
              <span className="truncate">Injury Tracking</span>
            </Button>
          )}
          {onViewGoals && (
            <Button
              className="flex items-center justify-center gap-2 bg-amber-600 py-3 font-medium text-sm transition-colors hover:bg-amber-700"
              onClick={onViewGoals}
            >
              <Target className="flex-shrink-0" size={16} />
              <span className="truncate">Goals Dashboard</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data Insights - Always show, even if empty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="flex-shrink-0 text-blue-600" size={20} />
            {isClubView ? "Club-Wide Data Insights" : "Team Data Insights"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 md:gap-3 ${
                  insight.severity === "warning"
                    ? "border border-orange-200 bg-orange-50"
                    : insight.severity === "success"
                      ? "border border-green-200 bg-green-50"
                      : "border border-blue-200 bg-blue-50"
                }`}
                key={idx}
              >
                {insight.severity === "warning" ? (
                  <AlertCircle
                    className="mt-0.5 flex-shrink-0 text-orange-600"
                    size={18}
                  />
                ) : (
                  <Target
                    className="mt-0.5 flex-shrink-0 text-blue-600"
                    size={18}
                  />
                )}
                <p className="text-gray-700 text-xs leading-relaxed md:text-sm">
                  {insight.message}
                </p>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <BarChart3
                className="mx-auto mb-3 text-gray-300"
                size={48}
              />
              <p className="mb-2 font-medium text-gray-600">
                No insights yet
              </p>
              <p className="mb-3 text-gray-500 text-sm">
                Insights will appear automatically when players have skill
                assessments recorded.
              </p>
              <p className="text-gray-400 text-xs">
                💡 Navigate to the Assess page to record player skills, or import
                benchmark data from Dev Tools.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="flex-shrink-0 text-purple-600" size={20} />
                {isClubView
                  ? "Club-Wide AI Recommendations"
                  : "AI Recommendations"}
              </CardTitle>
              {isClubView && (
                <p className="mt-1 text-gray-600 text-xs">
                  Strategic initiatives for the club admin to lead across ALL
                  teams
                </p>
              )}
            </div>
            {loadingAI && (
              <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                <div className="h-3 w-3 animate-spin rounded-full border-purple-600 border-b-2 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Analyzing...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingAI ? (
            <div className="py-8 text-center text-gray-500 md:py-12">
              <Brain
                className="mx-auto mb-3 animate-pulse text-purple-600"
                size={40}
              />
              <p className="text-sm md:text-base">
                {isClubView
                  ? "AI analyzing all team data across the club..."
                  : "AI analyzing your team data..."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec, idx) => (
                <div
                  className="rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-white p-3 md:p-4"
                  key={idx}
                >
                  <div className="mb-3 flex items-start gap-2 md:gap-3">
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-bold text-white text-xs md:h-8 md:w-8 md:text-sm ${
                        rec.priority === 1
                          ? "bg-red-600"
                          : rec.priority === 2
                            ? "bg-orange-600"
                            : "bg-green-600"
                      }`}
                    >
                      {rec.priority}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 font-bold text-gray-800 text-sm leading-tight md:text-base">
                        {rec.title}
                      </h4>
                      <p className="mb-3 text-gray-600 text-xs leading-relaxed md:text-sm">
                        {rec.description}
                      </p>

                      <div className="mb-3">
                        <div className="mb-2 font-semibold text-gray-700 text-xs">
                          {isClubView
                            ? "Recommended Club-Wide Actions:"
                            : "Recommended Actions:"}
                        </div>
                        <ul className="space-y-1.5">
                          {rec.actionItems.map((action, i) => (
                            <li
                              className="flex items-start gap-2 text-gray-600 text-xs"
                              key={i}
                            >
                              <CheckCircle
                                className="mt-0.5 flex-shrink-0 text-green-600"
                                size={12}
                              />
                              <span className="leading-relaxed">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rec.playersAffected.length > 0 && (
                        <div
                          className={`rounded border p-2 text-gray-600 text-xs ${
                            isClubView
                              ? "border-purple-200 bg-purple-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <span className="font-semibold">
                            {isClubView
                              ? "Teams/Players Impacted: "
                              : "Focus on: "}
                          </span>
                          <span className="break-words">
                            {rec.playersAffected.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Brain className="mx-auto mb-3 text-purple-300" size={48} />
                  <p className="mb-2 font-medium text-gray-600">
                    Ready to generate AI recommendations
                  </p>
                  <p className="mb-4 text-gray-500 text-sm">
                    Click the button below to get personalized coaching insights
                    powered by AI.
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-purple-600 py-2.5 font-medium transition-colors hover:bg-purple-700"
                onClick={generateAIRecommendations}
              >
                <Brain size={16} />
                {isClubView
                  ? "Refresh Club-Wide AI Analysis"
                  : "Refresh AI Recommendations"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Notes Section - Shown when a team is selected (even when empty) */}
      {selectedTeam && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                Team Notes: {selectedTeam}
              </CardTitle>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAddTeamNote(!showAddTeamNote)}
                size="sm"
              >
                {showAddTeamNote ? (
                  <>
                    <X size={16} className="mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit size={16} className="mr-1" />
                    Add Note
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Note Form */}
            {showAddTeamNote && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-4">
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setNewTeamNote(e.target.value)}
                  placeholder="Add a note about this team (e.g., training observations, match notes, areas to focus on)..."
                  value={newTeamNote}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setShowAddTeamNote(false);
                      setNewTeamNote("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!newTeamNote.trim() || savingTeamNote}
                    onClick={handleSaveTeamNote}
                    size="sm"
                  >
                    {savingTeamNote ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                    ) : null}
                    Save Note
                  </Button>
                </div>
              </div>
            )}

            {/* Display existing notes */}
            {selectedTeamData?.coachNotes ? (
              <div className="space-y-3">
                {selectedTeamData.coachNotes.split("\n\n").map((note: string, idx: number) => (
                  <div
                    className="rounded-lg border border-blue-200 bg-white p-3"
                    key={idx}
                  >
                    <p className="whitespace-pre-wrap text-gray-700 text-sm">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <FileText className="mx-auto mb-2 text-gray-300" size={32} />
                <p className="text-gray-500 text-sm">
                  No notes yet for this team
                </p>
                <p className="text-gray-400 text-xs">
                  Add notes about training sessions, matches, or team development
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters Section - Positioned right above player table */}
      {(onSearchChange ||
        onTeamFilterChange ||
        onAgeGroupFilterChange ||
        onSportFilterChange ||
        onGenderFilterChange) && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* Primary filters: Search and Team */}
              <div className="flex flex-col gap-3 sm:flex-row">
                {onSearchChange && (
                  <div className="relative flex-1">
                    <Search
                      className="-translate-y-1/2 absolute top-1/2 left-3 text-gray-400"
                      size={20}
                    />
                    <input
                      className="w-full rounded-lg border-2 border-gray-300 py-3 pr-10 pl-10 text-lg focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Search by player name..."
                      type="text"
                      value={searchTerm}
                    />
                    {searchTerm && (
                      <button
                        className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 transition-colors hover:text-gray-600"
                        onClick={() => onSearchChange("")}
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                )}
                {onTeamFilterChange && coachTeams && coachTeams.length > 0 && (
                  <div className="relative sm:w-64">
                    <select
                      className={`w-full rounded-lg border-2 px-4 py-3 font-medium text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500 ${
                        teamFilter
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-300"
                      }`}
                      onChange={(e) =>
                        onTeamFilterChange(
                          e.target.value === "all" ? null : e.target.value
                        )
                      }
                      value={teamFilter || "all"}
                    >
                      <option value="all">🏆 All Teams</option>
                      {coachTeams.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                    {teamFilter && (
                      <button
                        className="-translate-y-1/2 absolute top-1/2 right-10 text-purple-600 transition-colors hover:text-purple-800"
                        onClick={() => onTeamFilterChange(null)}
                        title="Clear team filter"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Secondary filters */}
              {(onAgeGroupFilterChange ||
                onSportFilterChange ||
                onGenderFilterChange) && (
                <div className="flex flex-wrap gap-3">
                  {onAgeGroupFilterChange && uniqueAgeGroups.length > 0 && (
                    <select
                      className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                      onChange={(e) => onAgeGroupFilterChange(e.target.value)}
                      value={ageGroupFilter}
                    >
                      <option value="all">All Ages</option>
                      {uniqueAgeGroups.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  )}
                  {onSportFilterChange && uniqueSports.length > 0 && (
                    <select
                      className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                      onChange={(e) => onSportFilterChange(e.target.value)}
                      value={sportFilter}
                    >
                      <option value="all">All Sports</option>
                      {uniqueSports.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                  {onGenderFilterChange && uniqueGenders.length > 0 && (
                    <select
                      className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                      onChange={(e) => onGenderFilterChange(e.target.value)}
                      value={genderFilter}
                    >
                      <option value="all">All Genders</option>
                      {uniqueGenders.map((g) => (
                        <option key={g} value={g}>
                          {g.charAt(0) + g.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players List Table */}
      <Card data-players-list>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-green-600" size={20} />
            Players ({sortedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPlayers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">No players found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-gray-200 border-b">
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === "name" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100"
                      onClick={() => handleSort("team")}
                    >
                      <div className="flex items-center gap-1">
                        Team(s)
                        {sortColumn === "team" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100 md:table-cell"
                      onClick={() => handleSort("ageGroup")}
                    >
                      <div className="flex items-center gap-1">
                        Age Group
                        {sortColumn === "ageGroup" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100 lg:table-cell"
                      onClick={() => handleSort("lastReview")}
                    >
                      <div className="flex items-center gap-1">
                        Last Review
                        {sortColumn === "lastReview" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPlayers.map((player) => (
                    <tr
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      key={player._id || player.id}
                      onClick={() => onViewPlayer?.(player)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <span className="font-medium text-green-600 text-xs">
                              {(player.name || "U")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {player.name || "Unnamed"}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-500 text-xs md:hidden">
                                {player.ageGroup}
                              </p>
                              {player.coachNotes && (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 text-[10px]" title={player.coachNotes}>
                                  <FileText size={10} />
                                  Notes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {getPlayerTeams(player).join(", ") || "Not assigned"}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 text-sm md:table-cell">
                        {player.ageGroup}
                      </td>
                      <td className="hidden px-4 py-3 text-sm lg:table-cell">
                        {player.lastReviewDate ? (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${(() => {
                              const days = Math.floor(
                                (Date.now() -
                                  new Date(player.lastReviewDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              );
                              if (days <= 60)
                                return "bg-green-100 text-green-700";
                              if (days <= 90)
                                return "bg-orange-100 text-orange-700";
                              return "bg-red-100 text-red-700";
                            })()}`}
                          >
                            {new Date(
                              player.lastReviewDate
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Not reviewed
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {onViewPlayer && (
                            <Button
                              className="h-8 w-8 rounded-lg p-0 text-blue-600 transition-colors hover:bg-blue-50"
                              onClick={() => onViewPlayer(player)}
                              size="icon"
                              title="View Passport"
                              variant="ghost"
                            >
                              <Eye size={16} />
                            </Button>
                          )}
                          {onEditPlayer && (
                            <Button
                              className="h-8 w-8 rounded-lg p-0 text-green-600 transition-colors hover:bg-green-50"
                              onClick={() => onEditPlayer(player)}
                              size="icon"
                              title="Edit Passport"
                              variant="ghost"
                            >
                              <Edit size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sortedPlayers.length > 0 && (
            <div className="border-gray-200 border-t bg-gray-50 px-4 py-3 text-gray-600 text-sm">
              {sortedPlayers.length} player
              {sortedPlayers.length !== 1 ? "s" : ""} • Sorted by{" "}
              {sortColumn === "name"
                ? "surname"
                : sortColumn === "team"
                  ? "team"
                  : sortColumn === "ageGroup"
                    ? "age group"
                    : "last review"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Practice Plan Modal */}
      {showShareModal && planToShare && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 md:p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Share className="text-blue-600" size={20} />
                  Share Practice Plan
                </CardTitle>
                <Button
                  onClick={() => setShowShareModal(false)}
                  size="icon"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-red-600 font-medium transition-colors hover:bg-red-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: planToShare.teamName,
                      sessionPlan: planToShare.sessionPlan,
                      sport: planToShare.player.sport,
                      ageGroup: planToShare.player.ageGroup,
                      playerCount: planToShare.playerCount,
                    });
                    await downloadPDF(
                      pdfBlob,
                      `${planToShare.teamName}_Session_Plan.pdf`
                    );
                  } catch (error) {
                    console.error("Error downloading PDF:", error);
                    alert("Failed to download PDF. Please try again.");
                  }
                }}
              >
                <Download size={18} />
                Download as PDF
              </Button>

              <Button
                className="w-full bg-blue-600 font-medium transition-colors hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: planToShare.teamName,
                      sessionPlan: planToShare.sessionPlan,
                      sport: planToShare.player.sport,
                      ageGroup: planToShare.player.ageGroup,
                      playerCount: planToShare.playerCount,
                    });
                    await shareViaEmail(pdfBlob, planToShare.teamName);
                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error sharing via email:", error);
                    alert(
                      "Failed to open email client. Please try downloading instead."
                    );
                  }
                }}
              >
                <Mail size={18} />
                Share via Email
              </Button>

              <Button
                className="w-full bg-green-600 font-medium transition-colors hover:bg-green-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: planToShare.teamName,
                      sessionPlan: planToShare.sessionPlan,
                      sport: planToShare.player.sport,
                      ageGroup: planToShare.player.ageGroup,
                      playerCount: planToShare.playerCount,
                    });
                    await shareViaWhatsApp(pdfBlob, planToShare.teamName);
                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error sharing via WhatsApp:", error);
                    alert(
                      "Failed to open WhatsApp. Please try another method."
                    );
                  }
                }}
              >
                <MessageCircle size={18} />
                Share via WhatsApp
              </Button>

              <Button
                className="w-full bg-purple-600 font-medium transition-colors hover:bg-purple-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: planToShare.teamName,
                      sessionPlan: planToShare.sessionPlan,
                      sport: planToShare.player.sport,
                      ageGroup: planToShare.player.ageGroup,
                      playerCount: planToShare.playerCount,
                    });
                    await shareViaNative(pdfBlob, planToShare.teamName);
                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error using native share:", error);
                    alert(
                      "Native sharing not supported. Please use another method."
                    );
                  }
                }}
              >
                <Share2 size={18} />
                More Share Options
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Plan Modal */}
      {showSessionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
          <Card className="max-h-[95vh] w-full max-w-3xl overflow-y-auto md:max-h-[90vh]">
            <CardHeader className="sticky top-0 z-10 border-gray-200 border-b bg-white">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  <CardTitle className="flex items-center gap-2 leading-tight">
                    <FileText
                      className="flex-shrink-0 text-green-600"
                      size={20}
                    />
                    <span className="line-clamp-2">
                      AI Training Session Plan
                    </span>
                  </CardTitle>
                  <p className="mt-1 text-gray-600 text-xs md:text-sm">
                    Personalized for your team's needs
                  </p>
                </div>
                <Button
                  className="flex-shrink-0"
                  onClick={() => setShowSessionPlan(false)}
                  size="icon"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              {loadingSessionPlan ? (
                <div className="py-8 text-center md:py-12">
                  <Brain
                    className="mx-auto mb-4 animate-pulse text-green-600"
                    size={40}
                  />
                  <p className="text-gray-600 text-sm md:text-base">
                    AI is generating your personalized training session plan...
                  </p>
                  <p className="mt-2 text-gray-500 text-xs md:text-sm">
                    This may take a few moments
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed md:text-base">
                    {sessionPlan}
                  </div>
                </div>
              )}
            </CardContent>
            {!loadingSessionPlan && (
              <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-gray-200 border-t bg-gray-50 p-3 sm:flex-row md:gap-3 md:p-4">
                <Button
                  className="flex flex-1 items-center justify-center gap-2 bg-blue-600 font-medium transition-colors hover:bg-blue-700"
                  onClick={() => {
                    const team = teamAnalytics.find((t) => t.playerCount > 0);
                    if (team) {
                      const teamPlayers = players.filter(
                        (p) =>
                          ((p as any).teamName === team.teamName ||
                            (p as any).team === team.teamName) &&
                          p
                      );
                      setPlanToShare({
                        player: {
                          name: `${team.teamName} Session Plan`,
                          sport: teamPlayers[0]?.sport || "GAA Football",
                          ageGroup: teamPlayers[0]?.ageGroup || "U12",
                        },
                        sessionPlan,
                        teamName: team.teamName,
                        playerCount: teamPlayers.length,
                      });
                      setShowShareModal(true);
                    }
                  }}
                >
                  <Share2 className="flex-shrink-0" size={16} />
                  <span>Share Plan</span>
                </Button>
                <Button
                  className="flex flex-1 items-center justify-center gap-2 bg-green-600 font-medium transition-colors hover:bg-green-700"
                  onClick={handleGenerateSessionPlan}
                >
                  <Brain className="flex-shrink-0" size={16} />
                  <span>Regenerate Plan</span>
                </Button>
                <Button
                  className="flex-1 bg-gray-600 font-medium transition-colors hover:bg-gray-700"
                  onClick={() => setShowSessionPlan(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
