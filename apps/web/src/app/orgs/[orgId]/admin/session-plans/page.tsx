"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Grid3x3,
  Layers,
  List,
  Loader2,
  Shield,
  Star,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import type {
  AvailableFilters,
  FilterState,
} from "../../coach/session-plans/filter-sidebar";
import { SearchBar } from "../../coach/session-plans/search-bar";
import {
  SortDropdown,
  type SortOption,
} from "../../coach/session-plans/sort-dropdown";
import { AdminPlanCard } from "./admin-plan-card";

type SessionPlan = {
  _id: Id<"sessionPlans">;
  _creationTime?: number;
  title?: string;
  coachName?: string;
  teamName: string;
  duration?: number;
  ageGroup?: string;
  sport?: string;
  visibility?: "private" | "club" | "platform";
  pinnedByAdmin?: boolean;
  moderatedBy?: string;
  moderatedAt?: number;
  moderationNote?: string;
  createdAt: number;
  timesUsed?: number;
  successRate?: number;
  status?: string;
  likeCount?: number;
  dislikeCount?: number;
  extractedTags?: {
    categories: string[];
    skills: string[];
    equipment: string[];
    intensity?: "low" | "medium" | "high";
  };
};

export default function AdminSessionPlansPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

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
  });

  // View mode (gallery or list)
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");

  // Filter view state (all or rejected)
  const [filterView, setFilterView] = useState<"all" | "rejected">("all");

  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminSessionPlans_sortBy");
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

  // Persist sort preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminSessionPlans_sortBy", sortBy);
    }
  }, [sortBy]);

  // State for rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SessionPlan | null>(null);
  const [rejectionReason, setRejectionReason] = useState<
    | "inappropriate"
    | "safety"
    | "poor-quality"
    | "duplicate"
    | "violates-guidelines"
    | "other"
    | ""
  >("");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [notifyCoach, setNotifyCoach] = useState(true);

  // Fetch all plans for admin review
  const plans = useQuery(
    api.models.sessionPlans.listForAdmin,
    userId
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
        }
      : "skip"
  );

  // Fetch all plans (unfiltered) for filter aggregation
  const allPlans = useQuery(
    api.models.sessionPlans.listForAdmin,
    userId ? { organizationId: orgId } : "skip"
  );

  // Aggregate available filters from all plans
  const availableFilters: AvailableFilters = useMemo(() => {
    if (!allPlans) {
      return {
        ageGroups: [],
        sports: [],
        categories: [],
        skills: [],
      };
    }

    const ageGroupCounts = new Map<string, number>();
    const sportCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const skillCounts = new Map<string, number>();

    for (const plan of allPlans) {
      if (plan.ageGroup) {
        ageGroupCounts.set(
          plan.ageGroup,
          (ageGroupCounts.get(plan.ageGroup) || 0) + 1
        );
      }
      if (plan.sport) {
        sportCounts.set(plan.sport, (sportCounts.get(plan.sport) || 0) + 1);
      }
      if (plan.extractedTags?.categories) {
        for (const category of plan.extractedTags.categories) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      }
      if (plan.extractedTags?.skills) {
        for (const skill of plan.extractedTags.skills) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }
    }

    return {
      ageGroups: Array.from(ageGroupCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      sports: Array.from(sportCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      categories: Array.from(categoryCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      skills: Array.from(skillCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [allPlans]);

  // Mutations
  const removeFromClubLibraryEnhanced = useMutation(
    api.models.sessionPlans.removeFromClubLibraryEnhanced
  );
  const pinPlan = useMutation(api.models.sessionPlans.pinPlan);
  const unpinPlan = useMutation(api.models.sessionPlans.unpinPlan);

  const handleRejectClick = (planId: Id<"sessionPlans">) => {
    const plan = plans?.find((p) => p._id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setRejectionReason("");
      setRejectionMessage("");
      setNotifyCoach(true);
      setRejectDialogOpen(true);
    }
  };

  const handleRejectConfirm = async () => {
    if (!(selectedPlan && userId)) {
      return;
    }

    if (!rejectionReason) {
      toast.error("Please select a reason for removal");
      return;
    }

    try {
      await removeFromClubLibraryEnhanced({
        planId: selectedPlan._id,
        reason: rejectionReason,
        message: rejectionMessage || undefined,
        notifyCoach,
      });

      toast.success("Plan removed from club library");
      setRejectDialogOpen(false);
      setSelectedPlan(null);
      setRejectionReason("");
      setRejectionMessage("");
      setNotifyCoach(true);
    } catch (error) {
      console.error("Failed to reject plan:", error);
      toast.error("Failed to remove plan");
    }
  };

  const handlePinToggle = async (
    planId: Id<"sessionPlans">,
    isPinned: boolean
  ) => {
    try {
      if (isPinned) {
        await unpinPlan({ planId });
        toast.success("Plan unpinned");
      } else {
        await pinPlan({ planId });
        toast.success("Plan pinned as featured");
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update plan");
    }
  };

  const handleViewPlan = (planId: Id<"sessionPlans">) => {
    router.push(`/orgs/${orgId}/admin/session-plans/${planId}`);
  };

  // Separate plans by status
  const sharedPlans = plans?.filter((p) => p.visibility === "club") || [];
  const rejectedPlans =
    plans?.filter((p) => p.visibility === "private" && p.moderatedBy) || [];

  // Filter plans based on filter view
  const getFilteredPlans = () => {
    if (filterView === "rejected") {
      return rejectedPlans;
    }
    return sharedPlans;
  };

  let filteredPlans = getFilteredPlans();

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
          const aTime = a._creationTime || a.createdAt || 0;
          const bTime = b._creationTime || b.createdAt || 0;
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

  // Calculate active filter count
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
    if (filters.featuredOnly) {
      count += 1;
    }
    return count;
  }, [filters]);

  const isLoading = plans === undefined;

  if (isLoading) {
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
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Button
                  className="shrink-0"
                  onClick={() => router.push(`/orgs/${orgId}/admin`)}
                  size="icon"
                  variant="ghost"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="font-bold text-3xl tracking-tight">
                  Session Plans Moderation
                </h1>
              </div>
              <p className="ml-16 text-muted-foreground">
                Review and moderate session plans shared with the organization
              </p>
            </div>
          </div>

          {/* Clickable Filter Cards (All / Rejected) */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {/* All Shared Plans Card */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterView === "all"
                  ? "border-primary ring-2 ring-primary/20"
                  : ""
              }`}
              onClick={() => setFilterView("all")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      All Shared Plans
                    </p>
                    <p className="font-bold text-2xl">{sharedPlans.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Rejected Plans Card */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterView === "rejected"
                  ? "border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              onClick={() => setFilterView("rejected")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Rejected Plans
                    </p>
                    <p className="font-bold text-2xl text-red-600">
                      {rejectedPlans.length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <SearchBar
            availableFilters={availableFilters}
            filters={filters}
            isSearching={isLoading}
            onChange={(value: string) =>
              setFilters((prev) => ({ ...prev, search: value }))
            }
            onFilterChange={setFilters}
            placeholder="Search plans by title, coach, or team..."
            planCount={filteredPlans?.length ?? 0}
            resultsCount={filteredPlans?.length}
            value={filters.search}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6">
          {/* Results Bar */}
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
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SortDropdown onChange={setSortBy} value={sortBy} />
              {/* View Mode Toggle */}
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
            </div>
          </div>

          {/* Empty State */}
          {filteredPlans.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Shield className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 font-semibold text-lg">
                  No plans in this category
                </h3>
                <p className="text-center text-muted-foreground">
                  {filterView === "rejected"
                    ? "No plans have been rejected."
                    : "When coaches share their session plans with the organization, they will appear here for review."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Gallery View */}
          {filteredPlans.length > 0 && viewMode === "gallery" && (
            <Masonry
              breakpointCols={{ default: 3, 1024: 2, 640: 1 }}
              className="sm:-ml-4 flex w-auto"
              columnClassName="sm:pl-4 bg-clip-padding"
            >
              {filteredPlans.map((plan) => (
                <div className="mb-4" key={plan._id}>
                  <AdminPlanCard
                    onPinToggle={handlePinToggle}
                    onReject={handleRejectClick}
                    onView={handleViewPlan}
                    plan={plan}
                  />
                </div>
              ))}
            </Masonry>
          )}

          {/* List View */}
          {filteredPlans.length > 0 && viewMode === "list" && (
            <div className="space-y-2">
              {filteredPlans.map((plan) => (
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  key={plan._id}
                  onClick={() => handleViewPlan(plan._id)}
                >
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <CardTitle className="line-clamp-1 text-base">
                            {plan.title || "Untitled Session Plan"}
                          </CardTitle>
                          {plan.pinnedByAdmin && (
                            <Badge
                              className="bg-amber-100 text-amber-800"
                              variant="secondary"
                            >
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              FEATURED
                            </Badge>
                          )}
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
                          By {plan.coachName || "Unknown Coach"} •{" "}
                          {plan.teamName}
                          {plan.ageGroup && ` • ${plan.ageGroup}`}
                          {plan.duration && ` • ${plan.duration} min`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Session Plan</DialogTitle>
            <DialogDescription>
              This plan will be removed from the club library and set back to
              private. The coach will be able to see the rejection reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPlan && (
              <div className="rounded-lg bg-muted p-3">
                <div className="font-medium">
                  {selectedPlan.title || "Untitled Session Plan"}
                </div>
                <div className="text-muted-foreground text-sm">
                  By {selectedPlan.coachName}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block" htmlFor="rejection-reason-dropdown">
                Reason for Removal <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) =>
                  setRejectionReason(value as typeof rejectionReason)
                }
                value={rejectionReason}
              >
                <SelectTrigger id="rejection-reason-dropdown">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate">
                    Inappropriate Content
                  </SelectItem>
                  <SelectItem value="safety">Safety Concern</SelectItem>
                  <SelectItem value="poor-quality">Poor Quality</SelectItem>
                  <SelectItem value="duplicate">Duplicate Content</SelectItem>
                  <SelectItem value="violates-guidelines">
                    Violates Guidelines
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-muted-foreground text-xs">
                Required - Select the primary reason for removing this plan.
              </p>
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="rejection-message">
                Additional Message (Optional)
              </Label>
              <Textarea
                id="rejection-message"
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Provide additional context or instructions..."
                rows={3}
                value={rejectionMessage}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Optional - Add extra details if needed.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={notifyCoach}
                id="notify-coach"
                onCheckedChange={(checked) => setNotifyCoach(checked === true)}
              />
              <Label
                className="cursor-pointer font-normal text-sm"
                htmlFor="notify-coach"
              >
                Notify coach about this removal
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!rejectionReason}
              onClick={handleRejectConfirm}
              variant="destructive"
            >
              Remove Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
