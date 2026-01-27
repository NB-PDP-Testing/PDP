"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Brain,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Grid3x3,
  List,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Share,
  Share2,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Masonry from "react-masonry-css";
import { toast } from "sonner";
import { FABQuickActions } from "@/components/quick-actions/fab-variant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { generateSessionPlan } from "@/lib/ai-service";
import { authClient } from "@/lib/auth-client";
import {
  downloadPDF,
  generateSessionPlanPDF,
  shareViaNative,
  shareViaWhatsApp,
} from "@/lib/pdf-generator";
import { sessionPlanConfig } from "@/lib/session-plan-config";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import type { AvailableFilters, FilterState } from "./filter-sidebar";
import { QuickAccessCards } from "./quick-access-cards";
import { SearchBar } from "./search-bar";
import { SessionPlanSkeleton } from "./session-plan-skeleton";
import { SortDropdown, type SortOption } from "./sort-dropdown";
import { TemplateCard } from "./template-card";

type ExtendedUser = {
  isPlatformStaff?: boolean;
  activeOrganization?: {
    role?: string;
  };
};

// Helper function to get visibility color class
function getVisibilityColorClass(
  visibility?: "private" | "club" | "platform"
): string {
  if (visibility === "club") {
    return "text-blue-600";
  }
  if (visibility === "private") {
    return "text-gray-600";
  }
  return "text-purple-600";
}

export default function SessionPlansPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Check if user is admin
  const user = session?.user as ExtendedUser | undefined;
  const isPlatformStaff = user?.isPlatformStaff;
  const activeOrg = user?.activeOrganization;
  const isOrgAdmin = activeOrg?.role === "admin" || activeOrg?.role === "owner";
  const isAdmin = isPlatformStaff || isOrgAdmin;

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    ageGroups: [],
    sports: [],
    intensities: [],
    skills: [],
    categories: [],
    favoriteOnly: false,
    featuredOnly: false,
    templateOnly: false,
    minSuccessRate: undefined,
  });

  // View mode (gallery or list)
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");

  // Active tab
  const [activeTab, setActiveTab] = useState<
    "my-plans" | "club-library" | "admin"
  >("my-plans");

  // Quick access filter state
  const [quickAccessFilter, setQuickAccessFilter] = useState<{
    type: string | null;
    planIds: string[] | null;
  }>({ type: null, planIds: null });

  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sessionPlans_sortBy");
      if (
        saved &&
        [
          "mostUsed",
          "highestRated",
          "recent",
          "duration",
          "alphabetical",
        ].includes(saved)
      ) {
        return saved as SortOption;
      }
    }
    return "recent";
  });

  // Persist sort preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sessionPlans_sortBy", sortBy);
    }
  }, [sortBy]);

  // Fetch filtered plans for "My Plans" tab
  const myPlans = useQuery(
    api.models.sessionPlans.getFilteredPlans,
    userId && activeTab === "my-plans"
      ? {
          organizationId: orgId,
          search: filters.search || undefined,
          ageGroups:
            filters.ageGroups.length > 0 ? filters.ageGroups : undefined,
          sports: filters.sports.length > 0 ? filters.sports : undefined,
          intensities:
            filters.intensities.length > 0 ? filters.intensities : undefined,
          categories:
            filters.categories.length > 0 ? filters.categories : undefined,
          skills: filters.skills.length > 0 ? filters.skills : undefined,
          favoriteOnly: filters.favoriteOnly || undefined,
          featuredOnly: filters.featuredOnly || undefined,
          templateOnly: filters.templateOnly || undefined,
        }
      : "skip"
  );

  // Fetch club library with filters
  const clubLibrary = useQuery(
    api.models.sessionPlans.getClubLibrary,
    activeTab === "club-library"
      ? {
          organizationId: orgId,
          search: filters.search || undefined,
          ageGroups:
            filters.ageGroups.length > 0 ? filters.ageGroups : undefined,
          sports: filters.sports.length > 0 ? filters.sports : undefined,
          intensities:
            filters.intensities.length > 0 ? filters.intensities : undefined,
          categories:
            filters.categories.length > 0 ? filters.categories : undefined,
          skills: filters.skills.length > 0 ? filters.skills : undefined,
          featuredOnly: filters.featuredOnly || undefined,
          sortBy: "recent",
        }
      : "skip"
  );

  // Fetch admin plans if admin
  const adminPlans = useQuery(
    api.models.sessionPlans.listForAdmin,
    isAdmin && activeTab === "admin" ? { organizationId: orgId } : "skip"
  );

  // Fetch all plans for filter aggregation
  const allMyPlans = useQuery(
    api.models.sessionPlans.listForCoach,
    userId && activeTab === "my-plans"
      ? { organizationId: orgId, coachId: userId }
      : "skip"
  );

  const allClubPlans = useQuery(
    api.models.sessionPlans.listClubLibrary,
    activeTab === "club-library" ? { organizationId: orgId } : "skip"
  );

  // Fetch stats
  const stats = useQuery(
    api.models.sessionPlans.getStats,
    userId ? { organizationId: orgId, coachId: userId } : "skip"
  );

  // Fetch coach's teams for session plan generation
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId ? { userId, organizationId: orgId } : "skip"
  );

  // Get the first team from coach assignments
  const firstTeam = coachAssignments?.teams?.[0];

  // Fetch players for the first team (for session plan generation)
  const teamPlayers = useQuery(
    api.models.teamPlayerIdentities.getPlayersForTeam,
    firstTeam ? { teamId: firstTeam.teamId } : "skip"
  );

  // Convex client for mutations
  const convex = useConvex();

  // Mutations
  const toggleFavorite = useMutation(api.models.sessionPlans.toggleFavorite);
  const deletePlan = useMutation(api.models.sessionPlans.deletePlan);

  // Session plan modal state (same as Overview page)
  const [showSessionPlan, setShowSessionPlan] = useState(false);
  const [sessionPlan, setSessionPlan] = useState("");
  const [loadingSessionPlan, setLoadingSessionPlan] = useState(false);
  const [_currentPlanId, setCurrentPlanId] =
    useState<Id<"sessionPlans"> | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const _isMobile = useMediaQuery("(max-width: 640px)");

  // Caching state for blue alert badge (Issue #292)
  const [showCachedBadge, setShowCachedBadge] = useState(false);
  const [cachedBadgeDismissed, setCachedBadgeDismissed] = useState(false);
  const [cachedPlanAge, setCachedPlanAge] = useState<string | null>(null);

  // Handle session plan generation (Issue #292 - with caching and manual save)
  const handleGenerateSessionPlan = useCallback(
    async (bypassCache = false) => {
      if (!(firstTeam && teamPlayers)) {
        toast.error("No team data available", {
          description:
            "Please make sure you have at least one team with players.",
        });
        return;
      }

      setLoadingSessionPlan(true);
      setShowSessionPlan(true);
      setPlanSaved(false); // Reset saved state for new generation

      try {
        // Check for cached plan first (unless bypassing cache for regeneration)
        if (bypassCache) {
          setShowCachedBadge(false);
          setCachedPlanAge(null);
          setCachedBadgeDismissed(false);
          setCurrentPlanId(null);
        } else {
          const cacheDuration = sessionPlanConfig.cacheDurationHours;

          const cachedPlan = await convex.query(
            api.models.sessionPlans.getRecentPlanForTeam,
            {
              teamId: firstTeam.teamId,
              maxAgeHours: cacheDuration,
            }
          );

          if (cachedPlan) {
            // Calculate age of cached plan
            const ageMs = Math.max(0, Date.now() - cachedPlan.generatedAt);
            const ageMinutes = Math.floor(ageMs / (1000 * 60));
            const ageHours = Math.floor(ageMinutes / 60);
            let ageStr = "just now";
            if (ageHours > 0) {
              ageStr = `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`;
            } else if (ageMinutes > 0) {
              ageStr = `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`;
            }

            setSessionPlan(cachedPlan.sessionPlan || "");
            setCurrentPlanId(cachedPlan._id);
            setShowCachedBadge(true);
            setCachedPlanAge(ageStr);
            setPlanSaved(true); // Cached plan is already saved
            setLoadingSessionPlan(false);
            return;
          }
        }

        // No cached plan found, generate new one
        setCurrentPlanId(null);

        // Note: Quick action doesn't have full skill data - AI will generate based on team basics
        const avgSkillLevel = 0;
        const strengths: { skill: string; avg: number }[] = [];
        const weaknesses: { skill: string; avg: number }[] = [];

        const teamDataForAI = {
          teamName: firstTeam.teamName,
          playerCount: teamPlayers.length,
          ageGroup: firstTeam.ageGroup || teamPlayers[0]?.ageGroup || "U12",
          avgSkillLevel,
          strengths,
          weaknesses,
          attendanceIssues: 0,
          overdueReviews: 0,
        };

        // Generate plan with AI
        const focus = weaknesses.length > 0 ? weaknesses[0].skill : undefined;
        const plan = await generateSessionPlan(teamDataForAI, focus);

        setSessionPlan(plan);
        setShowCachedBadge(false);
        setCachedPlanAge(null);
        toast.success("Session plan generated!", {
          description: "Click 'Save to Library' to keep this plan.",
        });
      } catch (error) {
        console.error("Error generating session plan:", error);
        setSessionPlan("Error generating session plan. Please try again.");
        toast.error("Failed to generate session plan");
      } finally {
        setLoadingSessionPlan(false);
      }
    },
    [firstTeam, teamPlayers, convex]
  );

  // Handle saving session plan to library (Issue #292 - manual save)
  const handleSaveToLibrary = useCallback(async () => {
    if (!(firstTeam && teamPlayers && sessionPlan)) {
      return;
    }

    try {
      const avgSkillLevel = 0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      const teamDataForDB = {
        organizationId: orgId, // CRITICAL: Include org ID so plan appears in library
        playerCount: teamPlayers.length,
        ageGroup: firstTeam.ageGroup || teamPlayers[0]?.ageGroup || "U12",
        avgSkillLevel,
        strengths,
        weaknesses,
        attendanceIssues: 0,
        overdueReviews: 0,
      };

      const focus = weaknesses.length > 0 ? weaknesses[0] : undefined;

      const planId = await convex.mutation(api.models.sessionPlans.savePlan, {
        teamId: firstTeam.teamId,
        teamName: firstTeam.teamName,
        sessionPlan,
        focus,
        teamData: teamDataForDB,
        usedRealAI: true,
        creationMethod: "quick_action",
      });

      setCurrentPlanId(planId);
      setPlanSaved(true);
      toast.success("Session plan saved to your library!");
    } catch (error) {
      console.error("Error saving session plan:", error);
      toast.error("Failed to save session plan. Please try again.");
    }
  }, [firstTeam, teamPlayers, sessionPlan, convex, orgId]);

  // Calculate available filters from all plans
  const availableFilters: AvailableFilters = useMemo(() => {
    let plans: typeof allMyPlans | typeof allClubPlans | [];
    if (activeTab === "my-plans") {
      plans = allMyPlans;
    } else if (activeTab === "club-library") {
      plans = allClubPlans;
    } else {
      plans = [];
    }

    if (!plans) {
      return {
        ageGroups: [],
        sports: [],
        categories: [],
        skills: [],
      };
    }

    const ageGroupsMap = new Map<string, number>();
    const sportsMap = new Map<string, number>();
    const categoriesMap = new Map<string, number>();
    const skillsMap = new Map<string, number>();

    for (const plan of plans) {
      if (plan.ageGroup) {
        ageGroupsMap.set(
          plan.ageGroup,
          (ageGroupsMap.get(plan.ageGroup) || 0) + 1
        );
      }
      if (plan.sport) {
        sportsMap.set(plan.sport, (sportsMap.get(plan.sport) || 0) + 1);
      }
      if (plan.extractedTags?.categories) {
        for (const category of plan.extractedTags.categories) {
          categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
        }
      }
      if (plan.extractedTags?.skills) {
        for (const skill of plan.extractedTags.skills) {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        }
      }
    }

    return {
      ageGroups: Array.from(ageGroupsMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      sports: Array.from(sportsMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      categories: Array.from(categoriesMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      skills: Array.from(skillsMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [allMyPlans, allClubPlans, activeTab]);

  // Handlers
  const handlePreview = (planId: Id<"sessionPlans">) => {
    router.push(`/orgs/${orgId}/coach/session-plans/${planId}`);
  };

  const handleToggleFavorite = async (planId: Id<"sessionPlans">) => {
    try {
      await toggleFavorite({ planId });
      toast.success("Favorite updated successfully");
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const handleDeletePlan = async (planId: Id<"sessionPlans">) => {
    try {
      await deletePlan({ planId });
      toast.success("Session plan deleted", {
        description: "The plan has been permanently removed.",
      });
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete session plan", {
        description: "Please try again or contact support.",
      });
    }
  };

  // Get current plans based on active tab
  let currentPlans: typeof myPlans | typeof clubLibrary | typeof adminPlans;
  if (activeTab === "my-plans") {
    currentPlans = myPlans;
  } else if (activeTab === "club-library") {
    currentPlans = clubLibrary;
  } else {
    currentPlans = adminPlans;
  }

  // Apply quick access filter if active
  let filteredPlans = currentPlans;
  if (
    quickAccessFilter.type &&
    quickAccessFilter.planIds &&
    currentPlans &&
    activeTab !== "admin"
  ) {
    filteredPlans = currentPlans.filter((p) =>
      quickAccessFilter.planIds?.includes(p._id)
    );
  }

  // Apply sorting
  if (filteredPlans && filteredPlans.length > 0) {
    filteredPlans = [...filteredPlans].sort((a, b) => {
      switch (sortBy) {
        case "mostUsed":
          return (b.timesUsed || 0) - (a.timesUsed || 0);
        case "highestRated": {
          const aRate = a.successRate || 0;
          const bRate = b.successRate || 0;
          return bRate - aRate;
        }
        case "recent": {
          const aTime = a._creationTime || 0;
          const bTime = b._creationTime || 0;
          return bTime - aTime;
        }
        case "duration":
          return (a.duration || 0) - (b.duration || 0);
        case "alphabetical": {
          const aTitle = a.title || "";
          const bTitle = b.title || "";
          return aTitle.localeCompare(bTitle);
        }
        default:
          return 0;
      }
    });
  }

  // Calculate active filter count (including quick access filter)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) {
      count += 1;
    }
    if (filters.ageGroups.length > 0) {
      count += 1;
    }
    if (filters.sports.length > 0) {
      count += 1;
    }
    if (filters.intensities.length > 0) {
      count += 1;
    }
    if (filters.skills.length > 0) {
      count += 1;
    }
    if (filters.categories.length > 0) {
      count += 1;
    }
    if (filters.favoriteOnly) {
      count += 1;
    }
    if (filters.featuredOnly) {
      count += 1;
    }
    if (filters.templateOnly) {
      count += 1;
    }
    // Include quick access filter in count
    if (quickAccessFilter.type) {
      count += 1;
    }
    return count;
  }, [filters, quickAccessFilter.type]);

  const isLoading = currentPlans === undefined;

  if (isLoading && activeTab !== "admin") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      {/* FAB Quick Actions - Session plan uses SessionPlanContext (Issue #234) */}
      <FABQuickActions />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="min-w-0 border-b bg-background p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9"
                onClick={() => router.push(`/orgs/${orgId}/coach`)}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <ClipboardList className="h-6 w-6 text-blue-600 sm:h-8 sm:w-8" />
              <div>
                <h1 className="font-bold text-foreground text-xl sm:text-3xl">
                  Session Plans
                </h1>
                <p className="text-muted-foreground text-sm">
                  AI-powered training session plans for your teams
                </p>
              </div>
            </div>
            <Link href={`/orgs/${orgId}/coach/session-plans/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate New Plan
              </Button>
            </Link>
          </div>

          {/* Stats Bar */}
          {stats && activeTab === "my-plans" && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Total Plans
                </div>
                <div className="mt-1 font-bold text-blue-600 text-xl sm:text-2xl">
                  {stats.totalPlans}
                </div>
              </div>
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Used Plans
                </div>
                <div className="mt-1 font-bold text-green-600 text-xl sm:text-2xl">
                  {stats.usedPlans}
                </div>
              </div>
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Success Rate
                </div>
                <div className="mt-1 font-bold text-purple-600 text-xl sm:text-2xl">
                  {stats.avgSuccessRate?.toFixed(0) ?? 0}%
                </div>
              </div>
              <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-3 shadow-sm sm:p-4">
                <div className="flex items-center gap-1 text-gray-600 text-xs sm:gap-2 sm:text-sm">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  This Month
                </div>
                <div className="mt-1 font-bold text-indigo-600 text-xl sm:text-2xl">
                  {stats.recentPlans}
                </div>
              </div>
            </div>
          )}

          {/* Quick Access Cards */}
          {activeTab === "my-plans" && (
            <div className="mt-6">
              <h2 className="mb-4 font-semibold text-lg">Quick Access</h2>
              <QuickAccessCards
                onCardClick={(filterType, planIds) => {
                  if (filterType === "topRated") {
                    // Switch to club library tab for top rated plans
                    setActiveTab("club-library");
                    setQuickAccessFilter({
                      type: filterType,
                      planIds: planIds || [],
                    });
                  } else {
                    // Stay on my-plans tab, apply filter
                    setQuickAccessFilter({
                      type: filterType,
                      planIds: planIds || [],
                    });
                  }
                }}
              />
            </div>
          )}

          {/* Search Bar */}
          <div className="mt-6">
            <SearchBar
              availableFilters={availableFilters}
              filters={filters}
              isSearching={isLoading}
              onChange={(value: string) =>
                setFilters((prev) => ({ ...prev, search: value }))
              }
              onFilterChange={setFilters}
              placeholder="Search by title, description, or drill names..."
              planCount={filteredPlans?.length ?? 0}
              resultsCount={filteredPlans?.length}
              value={filters.search}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          className="flex flex-1 flex-col"
          onValueChange={(value) => {
            // Clear quickAccessFilter when switching tabs
            setQuickAccessFilter({ type: null, planIds: null });
            setActiveTab(value as "my-plans" | "club-library" | "admin");
          }}
          value={activeTab}
        >
          <div className="flex items-center justify-between border-b px-4 sm:px-6">
            <TabsList>
              <TabsTrigger value="my-plans">My Plans</TabsTrigger>
              <TabsTrigger value="club-library">Club Library</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

            {/* View Mode Toggle */}
            {activeTab !== "admin" && (
              <div className="flex gap-1">
                <Button
                  onClick={() => setViewMode("gallery")}
                  size="sm"
                  variant={viewMode === "gallery" ? "default" : "outline"}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode("list")}
                  size="sm"
                  variant={viewMode === "list" ? "default" : "outline"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 sm:p-6">
            <TabsContent className="mt-0" value="my-plans">
              {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...new Array(6)].map((_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholders are static and never reorder
                    <SessionPlanSkeleton key={index} />
                  ))}
                </div>
              )}
              {!isLoading && (!filteredPlans || filteredPlans.length === 0) && (
                <EmptyState
                  orgId={orgId}
                  scenario={
                    filters.favoriteOnly
                      ? "no-favorites"
                      : filters.search ||
                          filters.ageGroups.length > 0 ||
                          filters.sports.length > 0 ||
                          filters.intensities.length > 0 ||
                          filters.skills.length > 0 ||
                          filters.categories.length > 0 ||
                          filters.featuredOnly ||
                          filters.templateOnly
                        ? "no-results"
                        : "no-plans"
                  }
                />
              )}
              {!isLoading &&
                filteredPlans &&
                filteredPlans.length > 0 &&
                viewMode === "gallery" && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {filteredPlans.length} plan
                          {filteredPlans.length !== 1 ? "s" : ""} found
                        </span>
                        {activeFilterCount > 0 && (
                          <>
                            <Badge variant="secondary">
                              {activeFilterCount} filter
                              {activeFilterCount !== 1 ? "s" : ""} active
                            </Badge>
                            <Button
                              className="h-8 text-xs"
                              onClick={() => {
                                setFilters({
                                  search: "",
                                  ageGroups: [],
                                  sports: [],
                                  intensities: [],
                                  skills: [],
                                  categories: [],
                                  favoriteOnly: false,
                                  featuredOnly: false,
                                  templateOnly: false,
                                });
                                setQuickAccessFilter({
                                  type: null,
                                  planIds: null,
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Clear filters
                            </Button>
                          </>
                        )}
                      </div>
                      <SortDropdown onChange={setSortBy} value={sortBy} />
                    </div>
                    <Masonry
                      breakpointCols={{ default: 3, 1024: 2, 640: 1 }}
                      className="sm:-ml-4 flex w-auto"
                      columnClassName="sm:pl-4 bg-clip-padding"
                    >
                      {filteredPlans.map((plan) => (
                        <div className="mb-4" key={plan._id}>
                          <TemplateCard
                            onDelete={handleDeletePlan}
                            onToggleFavorite={handleToggleFavorite}
                            onView={handlePreview}
                            plan={plan}
                          />
                        </div>
                      ))}
                    </Masonry>
                  </>
                )}
              {!isLoading &&
                filteredPlans &&
                filteredPlans.length > 0 &&
                viewMode === "list" && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {filteredPlans.length} plan
                          {filteredPlans.length !== 1 ? "s" : ""} found
                        </span>
                        {activeFilterCount > 0 && (
                          <>
                            <Badge variant="secondary">
                              {activeFilterCount} filter
                              {activeFilterCount !== 1 ? "s" : ""} active
                            </Badge>
                            <Button
                              className="h-8 text-xs"
                              onClick={() => {
                                setFilters({
                                  search: "",
                                  ageGroups: [],
                                  sports: [],
                                  intensities: [],
                                  skills: [],
                                  categories: [],
                                  favoriteOnly: false,
                                  featuredOnly: false,
                                  templateOnly: false,
                                });
                                setQuickAccessFilter({
                                  type: null,
                                  planIds: null,
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Clear filters
                            </Button>
                          </>
                        )}
                      </div>
                      <SortDropdown onChange={setSortBy} value={sortBy} />
                    </div>
                    <div className="space-y-2">
                      {filteredPlans.map((plan) => (
                        <Link
                          href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}
                          key={plan._id}
                        >
                          <Card className="cursor-pointer transition-shadow hover:shadow-md">
                            <CardHeader className="py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <CardTitle className="line-clamp-1 text-base">
                                      {plan.title || "Untitled Session Plan"}
                                    </CardTitle>
                                    {plan.moderatedBy && (
                                      <Badge
                                        className="bg-red-100 text-red-800"
                                        variant="secondary"
                                      >
                                        REJECTED
                                      </Badge>
                                    )}
                                  </div>
                                  <CardDescription className="mt-1">
                                    {plan.ageGroup && `${plan.ageGroup} • `}
                                    {plan.sport && `${plan.sport} • `}
                                    {plan.duration} min
                                    {plan.focusArea && ` • ${plan.focusArea}`}
                                  </CardDescription>
                                  {plan.moderatedBy && plan.moderationNote && (
                                    <div className="mt-2 text-red-600 text-xs">
                                      Reason: {plan.moderationNote}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                  {plan.favorited && (
                                    <span className="text-red-500">❤</span>
                                  )}
                                  {plan.timesUsed !== undefined &&
                                    plan.timesUsed > 0 && (
                                      <span>{plan.timesUsed} uses</span>
                                    )}
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
            </TabsContent>

            <TabsContent className="mt-0" value="club-library">
              {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...new Array(6)].map((_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholders are static and never reorder
                    <SessionPlanSkeleton key={index} />
                  ))}
                </div>
              )}
              {!isLoading && (!filteredPlans || filteredPlans.length === 0) && (
                <EmptyState
                  orgId={orgId}
                  scenario={
                    filters.search ||
                    filters.ageGroups.length > 0 ||
                    filters.sports.length > 0 ||
                    filters.intensities.length > 0 ||
                    filters.skills.length > 0 ||
                    filters.categories.length > 0 ||
                    filters.featuredOnly
                      ? "no-results"
                      : "no-plans"
                  }
                />
              )}
              {!isLoading &&
                filteredPlans &&
                filteredPlans.length > 0 &&
                viewMode === "gallery" && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {filteredPlans.length} plan
                          {filteredPlans.length !== 1 ? "s" : ""} found
                        </span>
                        {activeFilterCount > 0 && (
                          <>
                            <Badge variant="secondary">
                              {activeFilterCount} filter
                              {activeFilterCount !== 1 ? "s" : ""} active
                            </Badge>
                            <Button
                              className="h-8 text-xs"
                              onClick={() => {
                                setFilters({
                                  search: "",
                                  ageGroups: [],
                                  sports: [],
                                  intensities: [],
                                  skills: [],
                                  categories: [],
                                  favoriteOnly: false,
                                  featuredOnly: false,
                                  templateOnly: false,
                                });
                                setQuickAccessFilter({
                                  type: null,
                                  planIds: null,
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Clear filters
                            </Button>
                          </>
                        )}
                      </div>
                      <SortDropdown onChange={setSortBy} value={sortBy} />
                    </div>
                    <Masonry
                      breakpointCols={{ default: 3, 1024: 2, 640: 1 }}
                      className="sm:-ml-4 flex w-auto"
                      columnClassName="sm:pl-4 bg-clip-padding"
                    >
                      {filteredPlans.map((plan) => (
                        <div className="mb-4" key={plan._id}>
                          <TemplateCard
                            onToggleFavorite={handleToggleFavorite}
                            onView={handlePreview}
                            plan={plan}
                          />
                        </div>
                      ))}
                    </Masonry>
                  </>
                )}
              {!isLoading &&
                filteredPlans &&
                filteredPlans.length > 0 &&
                viewMode === "list" && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {filteredPlans.length} plan
                          {filteredPlans.length !== 1 ? "s" : ""} found
                        </span>
                        {activeFilterCount > 0 && (
                          <>
                            <Badge variant="secondary">
                              {activeFilterCount} filter
                              {activeFilterCount !== 1 ? "s" : ""} active
                            </Badge>
                            <Button
                              className="h-8 text-xs"
                              onClick={() => {
                                setFilters({
                                  search: "",
                                  ageGroups: [],
                                  sports: [],
                                  intensities: [],
                                  skills: [],
                                  categories: [],
                                  favoriteOnly: false,
                                  featuredOnly: false,
                                  templateOnly: false,
                                });
                                setQuickAccessFilter({
                                  type: null,
                                  planIds: null,
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Clear filters
                            </Button>
                          </>
                        )}
                      </div>
                      <SortDropdown onChange={setSortBy} value={sortBy} />
                    </div>
                    <div className="space-y-2">
                      {filteredPlans.map((plan) => (
                        <Card
                          className="cursor-pointer transition-shadow hover:shadow-md"
                          key={plan._id}
                          onClick={() => handlePreview(plan._id)}
                        >
                          <CardHeader className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <CardTitle className="line-clamp-1 text-base">
                                  {plan.title || "Untitled Session Plan"}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {plan.ageGroup && `${plan.ageGroup} • `}
                                  {plan.sport && `${plan.sport} • `}
                                  {plan.duration} min • By {plan.coachName}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                {plan.pinnedByAdmin && <span>📌</span>}
                                {plan.timesUsed !== undefined &&
                                  plan.timesUsed > 0 && (
                                    <span>{plan.timesUsed} uses</span>
                                  )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
            </TabsContent>

            {isAdmin && (
              <TabsContent className="mt-0" value="admin">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(adminPlans || []).map((plan) => (
                    <Link
                      href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}
                      key={plan._id}
                    >
                      <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                        <CardHeader>
                          <CardTitle className="line-clamp-1">
                            {plan.title}
                          </CardTitle>
                          <CardDescription>
                            {plan.teamName} • {plan.coachName}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={getVisibilityColorClass(
                                plan.visibility
                              )}
                            >
                              {plan.visibility}
                            </span>
                            <span className="text-muted-foreground">
                              {plan.status}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* Share Plan Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
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
                      teamName: firstTeam?.teamName || "Team",
                      sessionPlan,
                      sport: "GAA Football",
                      ageGroup: firstTeam?.ageGroup || "U12",
                      playerCount: teamPlayers?.length || 0,
                      generatedBy: "ai",
                    });
                    await downloadPDF(
                      pdfBlob,
                      `${firstTeam?.teamName || "Team"}_Session_Plan.pdf`
                    );
                    toast.success("PDF Downloaded!", {
                      description: "Session plan saved to your device",
                    });
                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error downloading PDF:", error);
                    toast.error("Failed to download PDF");
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
                        teamName: firstTeam?.teamName || "Team",
                        sessionPlan,
                        sport: "GAA Football",
                        ageGroup: firstTeam?.ageGroup || "U12",
                        playerCount: teamPlayers?.length || 0,
                        generatedBy: "ai",
                      });
                      await shareViaWhatsApp(
                        pdfBlob,
                        firstTeam?.teamName || "Team"
                      );
                      toast.success("Opening WhatsApp...", {
                        description: "Select a chat to share the plan",
                      });
                      setShowShareModal(false);
                    } catch (error) {
                      console.error("Error sharing via WhatsApp:", error);
                      toast.error("Failed to open WhatsApp");
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
                        teamName: firstTeam?.teamName || "Team",
                        sessionPlan,
                        sport: "GAA Football",
                        ageGroup: firstTeam?.ageGroup || "U12",
                        playerCount: teamPlayers?.length || 0,
                        generatedBy: "ai",
                      });
                      await shareViaNative(
                        pdfBlob,
                        firstTeam?.teamName || "Team"
                      );
                      toast.success("Share sheet opened!");
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

      {/* Session Plan Modal - Same as Overview page */}
      {showSessionPlan && (
        <div
          aria-describedby="session-plan-description"
          aria-labelledby="session-plan-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
        >
          {/* Mobile: Full-screen sheet from bottom | Desktop: Centered modal */}
          <div
            className={cn(
              "flex flex-col overflow-hidden bg-background shadow-2xl",
              // Desktop: centered modal with max width
              "sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:rounded-lg",
              // Mobile: full-screen sheet
              "max-sm:h-full max-sm:w-full max-sm:rounded-none"
            )}
          >
            <div className="flex h-full flex-col overflow-hidden">
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
                    <p
                      className="mt-1 text-muted-foreground text-xs leading-snug sm:text-sm"
                      id="session-plan-description"
                    >
                      {firstTeam
                        ? `Generated for ${firstTeam.teamName}`
                        : "Personalized for your team's needs"}
                    </p>
                  </div>
                </div>
                {/* Cached Plan Alert Badge (Issue #292) */}
                {showCachedBadge && cachedPlanAge && !cachedBadgeDismissed && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50/80 px-2.5 py-1.5 text-xs">
                    <Clock className="flex-shrink-0 text-blue-600" size={14} />
                    <div className="flex-1 text-blue-700">
                      <div className="font-semibold text-[13px] leading-tight">
                        You generated this {cachedPlanAge}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight opacity-85">
                        Tap Regenerate to create a fresh plan
                      </div>
                    </div>
                    <button
                      aria-label="Dismiss"
                      className="flex-shrink-0 rounded-sm p-1 text-blue-600 transition-colors hover:bg-blue-100/50"
                      onClick={() => setCachedBadgeDismissed(true)}
                      type="button"
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
                    "max-sm:px-3 max-sm:py-3 max-sm:pb-safe",
                    "sm:px-6 sm:py-4"
                  )}
                >
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-blue-600 font-medium text-sm shadow-sm transition-colors hover:bg-blue-700 sm:flex-1 md:text-base"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 className="flex-shrink-0" size={18} />
                      <span>Share Plan</span>
                    </Button>
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-green-600 font-medium text-sm shadow-sm transition-colors hover:bg-green-700 sm:flex-1 md:text-base"
                      onClick={() => handleGenerateSessionPlan(true)}
                    >
                      <Brain className="flex-shrink-0" size={18} />
                      <span>Regenerate Plan</span>
                    </Button>
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-purple-600 font-medium text-sm shadow-sm transition-colors hover:bg-purple-700 disabled:opacity-50 sm:flex-1 md:text-base"
                      disabled={planSaved}
                      onClick={handleSaveToLibrary}
                    >
                      <Save className="flex-shrink-0" size={18} />
                      <span>{planSaved ? "Saved!" : "Save to Library"}</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
