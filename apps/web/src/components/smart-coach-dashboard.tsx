"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex, useQuery } from "convex/react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileText,
  MessageCircle,
  Share,
  Share2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { FABQuickActions } from "@/components/quick-actions/fab-variant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  type AIRecommendation,
  generateCoachingRecommendations,
  generateSessionPlan,
} from "@/lib/ai-service";
import {
  trackPlanCached,
  trackPlanGenerated,
  trackPlanRegenerated,
  trackPlanShared,
} from "@/lib/analytics-tracker";
import {
  downloadPDF,
  generateSessionPlanPDF,
  shareViaNative,
  shareViaWhatsApp,
} from "@/lib/pdf-generator";
import { sessionPlanConfig } from "@/lib/session-plan-config";
import { cn } from "@/lib/utils";

type TeamAnalytics = {
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
};

type CorrelationInsight = {
  type: "attendance" | "improvement" | "position";
  message: string;
  severity: "info" | "warning" | "success";
};

type TeamData = {
  _id: string;
  name: string;
  coachNotes?: string;
};

type SmartCoachDashboardProps = {
  players: any[];
  allPlayers?: any[]; // Unfiltered list for stat counts - if not provided, uses players
  coachTeams?: string[];
  onViewTeam?: (teamName: string) => void;
  onViewAnalytics?: (teamName?: string) => void;
  onFilterOverdueReviews?: () => void;
  onFilterAllPlayers?: () => void;
  onFilterCompletedReviews?: () => void;
  onClearTeamSelection?: () => void;
  onViewVoiceNotes?: () => void;
  onViewInjuries?: () => void;
  onViewGoals?: () => void;
  onViewMedical?: () => void;
  onViewMatchDay?: () => void;
  onAssessPlayers?: () => void;
  selectedTeam?: string | null;
  selectedTeamData?: TeamData | null; // Team data with coachNotes
  onSaveTeamNote?: (teamId: string, note: string) => Promise<boolean>;
  isClubView?: boolean;
};

// Regex constants at module scope for performance
const FIRST_CHAR_REGEX = /^./;

export function SmartCoachDashboard({
  players,
  allPlayers: allPlayersProp,
  coachTeams,
  onViewTeam,
  onViewAnalytics,
  onFilterOverdueReviews,
  onFilterAllPlayers,
  onFilterCompletedReviews,
  onClearTeamSelection,
  onViewVoiceNotes,
  onViewInjuries,
  onViewGoals,
  onViewMedical,
  onViewMatchDay,
  onAssessPlayers,
  selectedTeam,
  selectedTeamData,
  onSaveTeamNote,
  isClubView = false,
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

  // Session plan caching state
  const [currentPlanId, setCurrentPlanId] = useState<Id<"sessionPlans"> | null>(
    null
  );
  const [showCachedBadge, setShowCachedBadge] = useState(false);
  const [cachedBadgeDismissed, setCachedBadgeDismissed] = useState(false);
  const [cachedPlanAge, setCachedPlanAge] = useState<string | null>(null);

  // Team notes state
  const [showAddTeamNote, setShowAddTeamNote] = useState(false);
  const [newTeamNote, setNewTeamNote] = useState("");
  const [savingTeamNote, setSavingTeamNote] = useState(false);

  // Responsive layout detection
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Convex client for database operations
  const convex = useConvex();

  // Query sports for sport name lookup
  const sports = useQuery(api.models.referenceData.getSports);

  // Helper: Sport code to display name mapping
  const sportCodeToName = useMemo(() => {
    const map = new Map<string, string>();
    if (sports) {
      for (const sport of sports) {
        map.set(sport.code, sport.name);
      }
    }
    return map;
  }, [sports]);

  const getSportDisplayName = (sportCode: string | undefined) => {
    if (!sportCode) {
      return "GAA Football"; // Fallback
    }
    return sportCodeToName.get(sportCode) || sportCode;
  };

  // Handle saving team note
  const handleSaveTeamNote = async () => {
    if (!(selectedTeamData && newTeamNote.trim() && onSaveTeamNote)) {
      return;
    }

    setSavingTeamNote(true);
    try {
      const success = await onSaveTeamNote(
        selectedTeamData._id,
        newTeamNote.trim()
      );
      if (success) {
        setNewTeamNote("");
        setShowAddTeamNote(false);
      }
    } finally {
      setSavingTeamNote(false);
    }
  };

  // Helper to get all teams for a player
  const getPlayerTeams = useCallback((player: any): string[] => {
    // First check if player has explicit teams array (from updated coach dashboard)
    if (
      player.teams &&
      Array.isArray(player.teams) &&
      player.teams.length > 0
    ) {
      return player.teams;
    }

    // Fallback to single team (backwards compatibility)
    const teamName = player.teamName || player.team;
    if (teamName) {
      return [teamName];
    }
    return [];
  }, []);

  const calculateSkillAverages = useCallback((teamPlayers: any[]) => {
    if (teamPlayers.length === 0) {
      return {};
    }
    const skillKeys = Object.keys(teamPlayers[0].skills || {}).filter(
      (k) => k !== "kickingDistanceMax"
    );
    const averages: Record<string, number> = {};

    for (const skillKey of skillKeys) {
      const sum = teamPlayers.reduce((acc, player) => {
        const value = (player.skills as any)[skillKey];
        return acc + (typeof value === "number" ? value : 0);
      }, 0);
      averages[skillKey] = sum / teamPlayers.length;
    }

    return averages;
  }, []);

  const calculatePlayerAvgSkill = useCallback((player: any): number => {
    const skills = player.skills || {};
    const skillValues = Object.values(skills).filter(
      (v) => typeof v === "number"
    ) as number[];
    if (skillValues.length === 0) {
      return 0;
    }
    return skillValues.reduce((a, b) => a + b, 0) / skillValues.length;
  }, []);

  const formatSkillName = useCallback(
    (key: string): string =>
      key
        .replace(/([A-Z])/g, " $1")
        .replace(FIRST_CHAR_REGEX, (str) => str.toUpperCase())
        .trim(),
    []
  );

  // Main analytics calculation (wrapped with useCallback to prevent hoisting issues)
  const calculateTeamAnalytics = useCallback(() => {
    // Use coach's assigned teams if provided, otherwise extract from player data
    let uniqueTeams: string[];
    if (coachTeams && coachTeams.length > 0 && !isClubView) {
      // For coach view, only show their assigned teams
      uniqueTeams = [...coachTeams].sort();
    } else {
      // For club view or when no coach teams provided, get from player data
      uniqueTeams = Array.from(
        new Set(
          players
            .map((p) => (p as any).teamName || (p as any).team)
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
      const teamPlayers = players.filter((p) => {
        const playerTeamsList = getPlayerTeams(p);
        return playerTeamsList.includes(team.name) && p;
      });

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

      const skillAverages = calculateSkillAverages(teamPlayers);

      const strengths = Object.entries(skillAverages)
        .filter(([_, avg]) => avg >= 4.0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill, avg]) => ({ skill: formatSkillName(skill), avg }));

      const weaknesses = Object.entries(skillAverages)
        .filter(([_, avg]) => avg < 2.5)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([skill, avg]) => ({ skill: formatSkillName(skill), avg }));

      const overdueReviews = teamPlayers.filter(
        (p) => p.reviewStatus === "Overdue"
      ).length;

      const attendanceIssues = teamPlayers.filter((p) => {
        const trainPct = Number.parseInt(
          (p.attendance?.training as string) || "100",
          10
        );
        return trainPct < 70;
      }).length;

      const topPerformers = teamPlayers
        .filter((p) => calculatePlayerAvgSkill(p) >= 4.0)
        .map((p) => p.name)
        .slice(0, 3);

      const needsAttention = teamPlayers
        .filter((p) => {
          const avgSkill = calculatePlayerAvgSkill(p);
          const trainPct = Number.parseInt(
            (p.attendance?.training as string) || "100",
            10
          );
          return avgSkill < 2.5 || trainPct < 70;
        })
        .map((p) => p.name)
        .slice(0, 5);

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
  }, [
    players,
    coachTeams,
    isClubView,
    calculatePlayerAvgSkill,
    calculateSkillAverages,
    formatSkillName,
    getPlayerTeams,
  ]);

  const generateCorrelationInsights = useCallback(() => {
    const allPlayers = players;
    const correlationInsights: CorrelationInsight[] = [];

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
        correlationInsights.push({
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
        correlationInsights.push({
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
        Number.parseInt((p.attendance.training as string) || "100", 10) >= 90
    );
    const lowAttendance = allPlayers.filter(
      (p) =>
        p.attendance &&
        Number.parseInt((p.attendance.training as string) || "100", 10) < 60
    );

    if (highAttendance.length > 0 && lowAttendance.length > 0) {
      const highAvg =
        highAttendance.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) /
        highAttendance.length;
      const lowAvg =
        lowAttendance.reduce((sum, p) => sum + calculatePlayerAvgSkill(p), 0) /
        lowAttendance.length;
      const diff = highAvg - lowAvg;

      correlationInsights.push({
        type: "attendance",
        message: `📊 Players with 90%+ attendance average ${diff.toFixed(1)} points higher in skills (${highAttendance.length} players) vs <60% attendance (${lowAttendance.length} players).`,
        severity: diff > 1.0 ? "warning" : "info",
      });
    }

    // Review status
    const needsReviewCount = allPlayers.filter(
      (p) =>
        p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate
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
        message += " (never assessed)";
      } else {
        message += " (90+ days overdue)";
      }
      message += `. Review completion rate: ${reviewRate.toFixed(0)}%.`;

      correlationInsights.push({
        type: "attendance",
        message,
        severity: "warning",
      });
    } else if (reviewRate >= 80) {
      correlationInsights.push({
        type: "attendance",
        message: `✅ Excellent review completion rate: ${reviewRate.toFixed(0)}%. All players are on track with regular assessments.`,
        severity: "success",
      });
    }

    setInsights(correlationInsights);
  }, [
    players,
    isClubView,
    calculatePlayerAvgSkill,
    calculateSkillAverages,
    formatSkillName,
  ]);

  // Run analytics when data dependencies change (not when callbacks change)
  useEffect(() => {
    calculateTeamAnalytics();
    generateCorrelationInsights();
    // Intentionally only depend on data, not on the callback functions themselves
    // The callbacks are stable enough and recreating them doesn't mean we need to rerun analytics
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateTeamAnalytics, generateCorrelationInsights]);

  // Stable callback wrappers for Quick Actions (prevents infinite re-registration)
  const handleAssessPlayers = useCallback(() => {
    onAssessPlayers?.();
  }, [onAssessPlayers]);

  const handleViewAnalytics = useCallback(() => {
    onViewAnalytics?.();
  }, [onViewAnalytics]);

  const handleVoiceNotes = useCallback(() => {
    onViewVoiceNotes?.();
  }, [onViewVoiceNotes]);

  const handleInjuries = useCallback(() => {
    onViewInjuries?.();
  }, [onViewInjuries]);

  const handleGoals = useCallback(() => {
    onViewGoals?.();
  }, [onViewGoals]);

  const handleMedical = useCallback(() => {
    onViewMedical?.();
  }, [onViewMedical]);

  const handleMatchDay = useCallback(() => {
    onViewMatchDay?.();
  }, [onViewMatchDay]);

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

  const handleGenerateSessionPlan = useCallback(
    async (bypassCache = false, isRegeneration = false) => {
      setLoadingSessionPlan(true);
      setShowSessionPlan(true);
      setCachedBadgeDismissed(false); // Reset dismissed state for new/regenerated plans

      try {
        // Use first team with players for session plan
        const team = teamAnalytics.find((t) => t.playerCount > 0);
        if (!team) {
          setSessionPlan("No teams with players found.");
          return;
        }

        const teamPlayers = players.filter((p) => {
          // Check if player is on this team (supports multi-team)
          const playerTeamsList = getPlayerTeams(p);
          return playerTeamsList.includes(team.teamName) && p;
        });

        // Team data for AI generation (includes teamName)
        const teamDataForAI = {
          teamName: team.teamName,
          playerCount: teamPlayers.length,
          ageGroup: teamPlayers[0]?.ageGroup || "U12",
          avgSkillLevel: team.avgSkillLevel,
          strengths: team.strengths,
          weaknesses: team.weaknesses,
          attendanceIssues: team.attendanceIssues,
          overdueReviews: team.overdueReviews,
        };

        // Team data for database (without teamName - it's passed separately)
        const teamDataForDB = {
          playerCount: teamPlayers.length,
          ageGroup: teamPlayers[0]?.ageGroup || "U12",
          avgSkillLevel: team.avgSkillLevel,
          strengths: team.strengths,
          weaknesses: team.weaknesses,
          attendanceIssues: team.attendanceIssues,
          overdueReviews: team.overdueReviews,
        };

        // Check for cached plan first (unless bypassing cache for regeneration)
        if (bypassCache) {
          setShowCachedBadge(false);
          setCachedPlanAge(null);
        } else {
          const cacheDuration = sessionPlanConfig.cacheDurationHours;

          const cachedPlan = await convex.query(
            api.models.sessionPlans.getRecentPlanForTeam,
            {
              teamId: team.teamId,
              maxAgeHours: cacheDuration,
            }
          );

          if (cachedPlan) {
            const ageMs = Date.now() - cachedPlan.generatedAt;
            const ageMinutes = Math.floor(ageMs / (1000 * 60));
            const ageHours = Math.floor(ageMinutes / 60);
            const ageStr =
              ageHours > 0
                ? `${ageHours} hour${ageHours > 1 ? "s" : ""}`
                : `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""}`;

            setSessionPlan(cachedPlan.sessionPlan || "");
            setCurrentPlanId(cachedPlan._id);
            setShowCachedBadge(true);
            setCachedPlanAge(ageStr);

            // Track cache hit in PostHog
            trackPlanCached({
              teamId: team.teamId,
              teamName: team.teamName,
              playerCount: teamDataForDB.playerCount,
              ageGroup: teamDataForDB.ageGroup,
              creationMethod: "ai_generated",
              usedRealAI: cachedPlan.usedRealAI,
              cacheAge: ageMs,
              planId: cachedPlan._id,
            });

            // Increment view count
            await convex.mutation(api.models.sessionPlans.incrementViewCount, {
              planId: cachedPlan._id,
            });

            return;
          }
        }

        // Generate new plan
        const focus =
          team.weaknesses.length > 0 ? team.weaknesses[0].skill : undefined;
        const plan = await generateSessionPlan(teamDataForAI, focus);

        setSessionPlan(plan);

        // Save plan to database
        const planId = await convex.mutation(api.models.sessionPlans.savePlan, {
          teamId: team.teamId,
          teamName: team.teamName,
          sessionPlan: plan,
          focus,
          teamData: teamDataForDB,
          usedRealAI: true, // TODO: Track from API response
          creationMethod: "ai_generated",
        });

        setCurrentPlanId(planId);

        // Track plan generation in PostHog (skip if this is a regeneration - already tracked)
        if (!isRegeneration) {
          trackPlanGenerated({
            teamId: team.teamId,
            teamName: team.teamName,
            playerCount: teamDataForDB.playerCount,
            ageGroup: teamDataForDB.ageGroup,
            creationMethod: "ai_generated",
            usedRealAI: true,
            focus,
            planId,
          });
        }
      } catch (error) {
        console.error("Error generating session plan:", error);
        setSessionPlan("Error generating session plan. Please try again.");
      } finally {
        setLoadingSessionPlan(false);
      }
    },
    [teamAnalytics, players, convex, getPlayerTeams]
  );

  // Keyboard shortcuts for session plan modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when modal is open
      if (!showSessionPlan || loadingSessionPlan) {
        return;
      }

      // Don't interfere with input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // CMD/Ctrl + R: Regenerate plan
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleGenerateSessionPlan(true);
      }

      // CMD/Ctrl + S: Share plan
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const team = teamAnalytics.find((t) => t.playerCount > 0);
        if (team) {
          const teamPlayers = players.filter((p) => {
            const playerTeamsList = getPlayerTeams(p);
            return playerTeamsList.includes(team.teamName);
          });
          setPlanToShare({
            player: {
              name: `${team.teamName} Session Plan`,
              sport: teamPlayers[0]?.sport || "GAA Football",
              ageGroup: teamPlayers[0]?.ageGroup || "U12",
            },
            sessionPlan,
            teamName: team.teamName,
            teamId: team.teamId,
            playerCount: teamPlayers.length,
          });
          setShowShareModal(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    showSessionPlan,
    loadingSessionPlan,
    sessionPlan,
    teamAnalytics,
    players,
    handleGenerateSessionPlan,
    getPlayerTeams,
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Actions - Connects header buttons to handler functions */}
      <FABQuickActions
        onAssessPlayers={handleAssessPlayers}
        onGenerateSessionPlan={handleGenerateSessionPlan}
        onGoals={handleGoals}
        onInjuries={handleInjuries}
        onMatchDay={handleMatchDay}
        onMedical={handleMedical}
        onViewAnalytics={handleViewAnalytics}
        onVoiceNotes={handleVoiceNotes}
      />

      {/* My Teams Section */}
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="flex-shrink-0" size={28} />
            <div>
              <h2 className="font-bold text-xl md:text-2xl">My Teams</h2>
              <p className="text-xs opacity-80 md:text-sm">
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
      </OrgThemedGradient>

      {/* Overall Statistics - Always use allPlayers for counts (unfiltered) */}
      {(() => {
        // Use allPlayers for stats if provided, otherwise fall back to players
        const statsPlayers = allPlayersProp || players;
        const totalCount = statsPlayers.length;
        const completedCount = statsPlayers.filter(
          (p) => p.reviewStatus === "Completed"
        ).length;
        const needsReviewCount = statsPlayers.filter(
          (p) =>
            p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate
        ).length;
        const playersWithSkills = statsPlayers.filter(
          (p) => Object.keys(p.skills || {}).length > 0
        );
        const avgSkill =
          playersWithSkills.length > 0
            ? playersWithSkills.reduce(
                (sum, p) => sum + calculatePlayerAvgSkill(p),
                0
              ) / playersWithSkills.length
            : 0;

        return (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card
              className="cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-blue-50 hover:shadow-lg"
              onClick={() => onFilterAllPlayers?.()}
            >
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <Users className="text-blue-600" size={20} />
                  <div className="font-bold text-gray-800 text-xl transition-all duration-300 md:text-2xl">
                    {totalCount}
                  </div>
                </div>
                <div className="font-medium text-gray-600 text-xs md:text-sm">
                  Total Players
                </div>
                <div className="mt-1 text-blue-600 text-xs">
                  Click to view all
                </div>
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
                  <div className="font-bold text-gray-800 text-xl transition-all duration-300 md:text-2xl">
                    {completedCount}
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
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
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
                  <div className="font-bold text-gray-800 text-xl transition-all duration-300 md:text-2xl">
                    {needsReviewCount}
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
                      width: `${totalCount > 0 ? (needsReviewCount / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="transition-shadow duration-200 hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <TrendingUp className="text-purple-600" size={20} />
                  <div className="font-bold text-gray-800 text-xl transition-all duration-300 md:text-2xl">
                    {playersWithSkills.length === 0 ? "—" : avgSkill.toFixed(1)}
                  </div>
                </div>
                <div className="text-gray-600 text-sm">Avg Skill Level</div>
                <div className="mt-1 text-purple-600 text-xs">
                  {playersWithSkills.length === 0
                    ? "No assessments yet"
                    : `${playersWithSkills.length} assessed`}
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
                  <div
                    className="h-1 rounded-full bg-purple-600 transition-all duration-500"
                    style={{
                      width: `${playersWithSkills.length === 0 ? 0 : (avgSkill / 5) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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
          .map((team, _idx) => (
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
                    <CardTitle
                      className="truncate text-lg md:text-xl"
                      title={team.teamName}
                    >
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
                          {team.strengths.map((s) => (
                            <div
                              className="flex items-center gap-2"
                              key={s.skill}
                            >
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
                          {team.weaknesses.map((w) => (
                            <div
                              className="flex items-center gap-2"
                              key={w.skill}
                            >
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
            insights.map((insight) => (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 md:gap-3 ${
                  insight.severity === "warning"
                    ? "border border-orange-200 bg-orange-50"
                    : insight.severity === "success"
                      ? "border border-green-200 bg-green-50"
                      : "border border-blue-200 bg-blue-50"
                }`}
                key={`${insight.type}-${insight.message.slice(0, 50)}`}
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
              <BarChart3 className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="mb-2 font-medium text-gray-600">No insights yet</p>
              <p className="mb-3 text-gray-500 text-sm">
                Insights will appear automatically when players have skill
                assessments recorded.
              </p>
              <p className="text-gray-400 text-xs">
                💡 Navigate to the Assess page to record player skills, or
                import benchmark data from Dev Tools.
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
                aiRecommendations.map((rec) => (
                  <div
                    className="rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-white p-3 md:p-4"
                    key={rec.title}
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
                            {rec.actionItems.map((action) => (
                              <li
                                className="flex items-start gap-2 text-gray-600 text-xs"
                                key={action}
                              >
                                <CheckCircle
                                  className="mt-0.5 flex-shrink-0 text-green-600"
                                  size={12}
                                />
                                <span className="leading-relaxed">
                                  {action}
                                </span>
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
                    <X className="mr-1" size={16} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="mr-1" size={16} />
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
                {selectedTeamData.coachNotes
                  .split("\n\n")
                  .map((note: string) => (
                    <div
                      className="rounded-lg border border-blue-200 bg-white p-3"
                      key={note.slice(0, 100)}
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
                  Add notes about training sessions, matches, or team
                  development
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Practice Plan Modal */}
      {showShareModal && planToShare && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-2 md:p-4">
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
            <CardContent className="space-y-4">
              {/* Primary Action - Download */}
              <Button
                className="h-12 w-full bg-blue-600 font-semibold text-base transition-colors hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: planToShare.teamName,
                      sessionPlan: planToShare.sessionPlan,
                      sport: getSportDisplayName(planToShare.player.sport),
                      ageGroup: planToShare.player.ageGroup,
                      playerCount: planToShare.playerCount,
                      generatedBy: "ai",
                    });
                    await downloadPDF(
                      pdfBlob,
                      `${planToShare.teamName}_Session_Plan.pdf`
                    );
                    toast.success("PDF Downloaded!", {
                      description: "Session plan saved to your device",
                    });

                    // Track download (happens AFTER successful download, not at share button click)
                    if (currentPlanId && planToShare.teamId) {
                      trackPlanShared({
                        teamId: planToShare.teamId,
                        teamName: planToShare.teamName,
                        creationMethod: "ai_generated",
                        planId: currentPlanId,
                        shareMethod: "download",
                      });
                    }

                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error downloading PDF:", error);
                    toast.error("Failed to download PDF", {
                      description:
                        "Please try again or contact support if the issue persists.",
                    });
                  }
                }}
              >
                <Download size={20} />
                Download as PDF
              </Button>

              {/* Secondary Actions - Quick Share */}
              <div className="grid grid-cols-2 gap-3">
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
                        generatedBy: "ai",
                      });
                      await shareViaWhatsApp(pdfBlob, planToShare.teamName);
                      toast.success("Opening WhatsApp...", {
                        description: "Select a chat to share the plan",
                      });

                      // Track WhatsApp share
                      if (currentPlanId && planToShare.teamId) {
                        trackPlanShared({
                          teamId: planToShare.teamId,
                          teamName: planToShare.teamName,
                          creationMethod: "ai_generated",
                          planId: currentPlanId,
                          shareMethod: "whatsapp",
                        });
                      }

                      setShowShareModal(false);
                    } catch (error) {
                      console.error("Error sharing via WhatsApp:", error);
                      toast.error("Failed to open WhatsApp", {
                        description: "Please try another sharing method.",
                      });
                    }
                  }}
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </Button>

                <Button
                  className="w-full bg-gray-700 font-medium transition-colors hover:bg-gray-800"
                  onClick={async () => {
                    try {
                      const pdfBlob = await generateSessionPlanPDF({
                        teamName: planToShare.teamName,
                        sessionPlan: planToShare.sessionPlan,
                        sport: planToShare.player.sport,
                        ageGroup: planToShare.player.ageGroup,
                        playerCount: planToShare.playerCount,
                        generatedBy: "ai",
                      });
                      await shareViaNative(pdfBlob, planToShare.teamName);
                      toast.success("Share sheet opened!", {
                        description: "Choose how to share your plan",
                      });

                      // Track native share
                      if (currentPlanId && planToShare.teamId) {
                        trackPlanShared({
                          teamId: planToShare.teamId,
                          teamName: planToShare.teamName,
                          creationMethod: "ai_generated",
                          planId: currentPlanId,
                          shareMethod: "native",
                        });
                      }

                      setShowShareModal(false);
                    } catch (error) {
                      console.error("Error using native share:", error);
                      toast.error("Native sharing not supported", {
                        description: "Please download the PDF instead.",
                      });
                    }
                  }}
                >
                  <Share2 size={18} />
                  Share...
                </Button>
              </div>

              {/* Tip */}
              <p className="text-center text-muted-foreground text-xs">
                💡 Share with your team via WhatsApp or messaging apps
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Plan Modal */}
      {showSessionPlan && (
        <div
          aria-describedby="session-plan-description"
          aria-labelledby="session-plan-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/50"
          role="dialog"
        >
          {/* Mobile: Full-screen from bottom | Desktop: Centered modal */}
          <div
            className={cn(
              "fixed flex flex-col overflow-hidden bg-background shadow-2xl",
              // Desktop: centered modal
              "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2 sm:left-1/2 sm:max-h-[90vh] sm:max-w-3xl sm:rounded-lg",
              // Mobile: full-screen - covers entire viewport including bottom nav
              "max-sm:inset-0 max-sm:h-full max-sm:w-full max-sm:rounded-none"
            )}
          >
            <Card className="flex h-full flex-col overflow-hidden border-0 shadow-none">
              <CardHeader
                className={cn(
                  "sticky top-0 z-10 flex-shrink-0 border-b bg-background",
                  "max-sm:px-3 max-sm:py-2",
                  "sm:px-6 sm:py-4"
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Close button - left on mobile, right on desktop */}
                  <Button
                    aria-label="Close session plan"
                    className={cn(
                      "h-8 w-8 flex-shrink-0",
                      "max-sm:order-first",
                      "sm:order-last sm:h-9 sm:w-9"
                    )}
                    onClick={() => setShowSessionPlan(false)}
                    size="icon"
                    variant="ghost"
                  >
                    <X size={18} />
                  </Button>

                  <div className="min-w-0 flex-1">
                    <CardTitle
                      className="flex items-center gap-2 text-base leading-tight sm:text-lg md:text-xl"
                      id="session-plan-title"
                    >
                      <FileText
                        className="flex-shrink-0 text-green-600"
                        size={20}
                      />
                      <span className="line-clamp-1">
                        AI Training Session Plan
                      </span>
                    </CardTitle>

                    {/* Only show subtitle on desktop, or when no cached badge on mobile */}
                    {(!(isMobile && showCachedBadge) ||
                      cachedBadgeDismissed) && (
                      <p
                        className="mt-1 text-muted-foreground text-xs leading-snug sm:text-sm"
                        id="session-plan-description"
                      >
                        Personalized for your team's needs
                      </p>
                    )}
                  </div>
                </div>

                {/* Compact Cached Badge - Centered full width */}
                {showCachedBadge && cachedPlanAge && !cachedBadgeDismissed && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50/80 px-2.5 py-1.5 text-xs">
                    <Clock className="flex-shrink-0 text-blue-600" size={14} />
                    <div className="flex-1 text-blue-700">
                      <div className="font-semibold text-[13px] leading-tight">
                        You generated this {cachedPlanAge} ago
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight opacity-85">
                        Tap Regenerate to create a fresh plan
                      </div>
                    </div>
                    <button
                      aria-label="Dismiss"
                      className="flex-shrink-0 rounded-sm p-1 text-blue-600 transition-colors hover:bg-blue-100/50"
                      onClick={() => setCachedBadgeDismissed(true)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent
                className={cn(
                  "flex-1 overflow-y-auto",
                  "max-sm:px-3 max-sm:py-2",
                  "sm:px-6 sm:py-4"
                )}
              >
                {loadingSessionPlan ? (
                  <div className="py-8 text-center md:py-12">
                    <Brain
                      className="mx-auto mb-4 animate-pulse text-green-600"
                      size={40}
                    />
                    <p className="text-muted-foreground text-sm md:text-base">
                      AI is generating your personalized training session
                      plan...
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs opacity-75 md:text-sm">
                      This may take a few moments
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed md:text-base">
                      {sessionPlan}
                    </div>
                  </div>
                )}
              </CardContent>
              {!loadingSessionPlan && (
                <div
                  className={cn(
                    "sticky bottom-0 z-10 flex-shrink-0 border-t bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.08)]",
                    "max-sm:px-3 max-sm:py-2",
                    "sm:px-6 sm:py-4"
                  )}
                >
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-blue-600 font-medium text-sm shadow-sm transition-colors hover:bg-blue-700 sm:flex-1 md:text-base"
                      onClick={async () => {
                        const team = teamAnalytics.find(
                          (t) => t.playerCount > 0
                        );
                        if (team) {
                          const teamPlayers = players.filter((p) => {
                            const playerTeamsList = getPlayerTeams(p);
                            return playerTeamsList.includes(team.teamName) && p;
                          });
                          setPlanToShare({
                            player: {
                              name: `${team.teamName} Session Plan`,
                              sport: teamPlayers[0]?.sport || "GAA Football",
                              ageGroup: teamPlayers[0]?.ageGroup || "U12",
                            },
                            sessionPlan,
                            teamName: team.teamName,
                            teamId: team.teamId,
                            playerCount: teamPlayers.length,
                          });
                          setShowShareModal(true);

                          // Increment share count in database (tracks share intent)
                          if (currentPlanId) {
                            await convex.mutation(
                              api.models.sessionPlans.incrementShareCount,
                              {
                                planId: currentPlanId,
                              }
                            );
                          }
                          // Note: Actual share method tracking happens in the share modal buttons
                        }
                      }}
                    >
                      <Share2 className="flex-shrink-0" size={18} />
                      <span>Share Plan</span>
                    </Button>
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-green-600 font-medium text-sm shadow-sm transition-colors hover:bg-green-700 sm:flex-1 md:text-base"
                      onClick={async () => {
                        // Track regeneration before generating
                        if (currentPlanId) {
                          await convex.mutation(
                            api.models.sessionPlans.incrementRegenerateCount,
                            {
                              planId: currentPlanId,
                            }
                          );

                          const team = teamAnalytics.find(
                            (t) => t.playerCount > 0
                          );
                          if (team) {
                            trackPlanRegenerated({
                              teamId: team.teamId,
                              teamName: team.teamName,
                              creationMethod: "ai_generated",
                              planId: currentPlanId,
                            });
                          }
                        }

                        // Regenerate with cache bypass (pass isRegeneration=true to avoid double-tracking)
                        await handleGenerateSessionPlan(true, true);
                      }}
                    >
                      <Brain className="flex-shrink-0" size={18} />
                      <span>Regenerate Plan</span>
                    </Button>
                    <Button
                      className="h-10 w-full bg-gray-600 font-medium text-sm shadow-sm transition-colors hover:bg-gray-700 sm:flex-1 md:text-base"
                      onClick={() => setShowSessionPlan(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
