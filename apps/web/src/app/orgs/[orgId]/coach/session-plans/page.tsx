"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Grid3x3,
  List,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Masonry from "react-masonry-css";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
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

  // Mutations
  const toggleFavorite = useMutation(api.models.sessionPlans.toggleFavorite);

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
      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="min-w-0 border-b bg-background p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                className="shrink-0"
                onClick={() => router.push(`/orgs/${orgId}/coach`)}
                size="icon"
                variant="ghost"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-3xl">Session Plans</h1>
                <p className="text-muted-foreground">
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
              <div className="rounded-lg border-2 border-[#667eea]/20 bg-gradient-to-br from-[#667eea]/5 to-[#764ba2]/5 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Total Plans
                </div>
                <div className="mt-1 font-bold text-[#667eea] text-xl sm:text-2xl">
                  {stats.totalPlans}
                </div>
              </div>
              <div className="rounded-lg border-2 border-[#48bb78]/20 bg-gradient-to-br from-[#48bb78]/5 to-[#38f9d7]/5 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Used Plans
                </div>
                <div className="mt-1 font-bold text-[#48bb78] text-xl sm:text-2xl">
                  {stats.usedPlans}
                </div>
              </div>
              <div className="rounded-lg border-2 border-[#f093fb]/20 bg-gradient-to-br from-[#f093fb]/5 to-[#f5576c]/5 p-3 shadow-sm sm:p-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Success Rate
                </div>
                <div className="mt-1 font-bold text-[#f5576c] text-xl sm:text-2xl">
                  {stats.avgSuccessRate?.toFixed(0) ?? 0}%
                </div>
              </div>
              <div className="rounded-lg border-2 border-[#4facfe]/20 bg-gradient-to-br from-[#4facfe]/5 to-[#00f2fe]/5 p-3 shadow-sm sm:p-4">
                <div className="flex items-center gap-1 text-gray-600 text-xs sm:gap-2 sm:text-sm">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  This Month
                </div>
                <div className="mt-1 font-bold text-[#4facfe] text-xl sm:text-2xl">
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
    </div>
  );
}
