"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Eye,
  Layers,
  Loader2,
  Pin,
  PinOff,
  Shield,
  Star,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import type {
  AvailableFilters,
  FilterState,
} from "../../coach/session-plans/filter-sidebar";
import { FilterSidebar } from "../../coach/session-plans/filter-sidebar";

type SessionPlan = {
  _id: Id<"sessionPlans">;
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
  const userName = session?.user?.name || "Admin";

  const getIntensityColor = (intensity?: "low" | "medium" | "high") => {
    switch (intensity) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  // Status tab state
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "featured" | "high-usage"
  >("all");

  // State for rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SessionPlan | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch admin metrics
  const metrics = useQuery(
    api.models.sessionPlans.getAdminMetrics,
    userId ? { organizationId: orgId } : "skip"
  );

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
  const availableFilters: AvailableFilters = {
    ageGroups: [],
    sports: [],
    categories: [],
    skills: [],
  };

  if (allPlans) {
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

    availableFilters.ageGroups = Array.from(ageGroupCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    availableFilters.sports = Array.from(sportCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    availableFilters.categories = Array.from(categoryCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    availableFilters.skills = Array.from(skillCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Mutations
  const removeFromClubLibrary = useMutation(
    api.models.sessionPlans.removeFromClubLibrary
  );
  const pinPlan = useMutation(api.models.sessionPlans.pinPlan);
  const unpinPlan = useMutation(api.models.sessionPlans.unpinPlan);

  const handleRejectClick = (plan: SessionPlan) => {
    setSelectedPlan(plan);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!(selectedPlan && userId)) {
      return;
    }

    try {
      await removeFromClubLibrary({
        planId: selectedPlan._id,
        moderatorId: userId,
        moderatorName: userName,
        reason: rejectionReason || "No reason provided",
      });

      toast.success("Plan removed from club library");
      setRejectDialogOpen(false);
      setSelectedPlan(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject plan:", error);
      toast.error("Failed to remove plan");
    }
  };

  const handlePinToggle = async (plan: SessionPlan) => {
    try {
      if (plan.pinnedByAdmin) {
        await unpinPlan({ planId: plan._id });
        toast.success("Plan unpinned");
      } else {
        await pinPlan({ planId: plan._id });
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

  if (plans === undefined || metrics === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Separate plans by visibility
  const sharedPlans = plans.filter((p) => p.visibility === "club");
  const rejectedPlans = plans.filter(
    (p) => p.visibility === "private" && p.moderatedBy
  );

  // Filter plans based on active tab
  const getFilteredPlans = () => {
    switch (activeTab) {
      case "pending": {
        return sharedPlans.filter((p) => !(p.moderatedBy || p.pinnedByAdmin));
      }
      case "featured": {
        return sharedPlans.filter((p) => p.pinnedByAdmin);
      }
      case "high-usage": {
        // Plans with 5+ uses
        return sharedPlans.filter((p) => (p.timesUsed || 0) >= 5);
      }
      default: {
        return sharedPlans;
      }
    }
  };

  const filteredSharedPlans = getFilteredPlans();

  return (
    <div className="flex h-screen">
      {/* Filter Sidebar */}
      <FilterSidebar
        availableFilters={availableFilters}
        filters={filters}
        onFilterChange={setFilters}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="font-bold text-3xl">Session Plans Moderation</h1>
            </div>
            <p className="text-muted-foreground">
              Review and moderate session plans shared with the organization.
              Reject inappropriate plans or feature high-quality content.
            </p>
          </div>

          {/* Enhanced Metrics Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Total Plans - Default border */}
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-3xl">{metrics.total}</div>
                    <div className="text-muted-foreground text-sm">
                      Total Shared
                    </div>
                  </div>
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Pending Review - Blue border */}
            <Card className="border-blue-500 transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-3xl">
                      {metrics.pendingReview}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Pending Review
                    </div>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Flagged - Red border */}
            <Card className="border-red-500 transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-3xl">{metrics.flagged}</div>
                    <div className="text-muted-foreground text-sm">Flagged</div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            {/* Featured - Green border */}
            <Card className="border-green-500 transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-3xl">{metrics.featured}</div>
                    <div className="text-muted-foreground text-sm">
                      Featured
                    </div>
                  </div>
                  <Star className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Tabs */}
          <div className="mb-6">
            <Tabs
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              value={activeTab}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All ({sharedPlans.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({metrics.pendingReview})
                </TabsTrigger>
                <TabsTrigger value="featured">
                  Featured ({metrics.featured})
                </TabsTrigger>
                <TabsTrigger value="high-usage">
                  High Usage (
                  {sharedPlans.filter((p) => (p.timesUsed || 0) >= 5).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Shared Plans Section */}
          <div className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              {activeTab === "all" &&
                `All Plans (${filteredSharedPlans.length})`}
              {activeTab === "pending" &&
                `Pending Review (${filteredSharedPlans.length})`}
              {activeTab === "featured" &&
                `Featured Plans (${filteredSharedPlans.length})`}
              {activeTab === "high-usage" &&
                `High Usage Plans (${filteredSharedPlans.length})`}
            </h2>
            {filteredSharedPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <Shield className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 font-semibold text-lg">
                    No plans in this category
                  </h3>
                  <p className="text-center text-muted-foreground">
                    {activeTab === "pending" && "No plans are pending review."}
                    {activeTab === "featured" &&
                      "No plans have been featured yet."}
                    {activeTab === "high-usage" && "No plans have 5+ uses yet."}
                    {activeTab === "all" &&
                      "When coaches share their session plans with the organization, they will appear here for review."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSharedPlans.map((plan) => (
                  <Card
                    className="relative transition-shadow hover:shadow-lg"
                    key={plan._id}
                  >
                    <CardHeader>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className="bg-blue-100 text-blue-800"
                            variant="secondary"
                          >
                            SHARED
                          </Badge>
                          {plan.pinnedByAdmin && (
                            <Badge
                              className="bg-amber-100 text-amber-800"
                              variant="secondary"
                            >
                              <Pin className="mr-1 h-3 w-3 fill-current" />
                              FEATURED
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg">
                        {plan.title || "Untitled Session Plan"}
                      </CardTitle>
                      <CardDescription>
                        By {plan.coachName || "Unknown Coach"} • {plan.teamName}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {/* Metadata */}
                      <div className="mb-3 flex flex-wrap gap-2 text-sm">
                        {plan.ageGroup && (
                          <Badge variant="outline">{plan.ageGroup}</Badge>
                        )}
                        {plan.sport && (
                          <Badge variant="outline">{plan.sport}</Badge>
                        )}
                        {plan.duration && (
                          <Badge variant="outline">{plan.duration} min</Badge>
                        )}
                        {plan.extractedTags?.intensity && (
                          <Badge
                            className={getIntensityColor(
                              plan.extractedTags.intensity
                            )}
                            variant="secondary"
                          >
                            {plan.extractedTags.intensity}
                          </Badge>
                        )}
                      </div>

                      {/* Skills */}
                      {plan.extractedTags?.skills &&
                        plan.extractedTags.skills.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1.5">
                              {plan.extractedTags.skills
                                .slice(0, 3)
                                .map((skill) => (
                                  <Badge
                                    className="bg-slate-100 text-slate-700 text-xs"
                                    key={skill}
                                    variant="secondary"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              {plan.extractedTags.skills.length > 3 && (
                                <Badge
                                  className="bg-slate-100 text-slate-700 text-xs"
                                  variant="secondary"
                                >
                                  +{plan.extractedTags.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Stats */}
                      {(plan.timesUsed !== undefined ||
                        plan.successRate !== undefined) && (
                        <div className="mb-3 text-muted-foreground text-sm">
                          {plan.timesUsed !== undefined &&
                            plan.timesUsed > 0 && (
                              <span>{plan.timesUsed} uses</span>
                            )}
                          {plan.timesUsed !== undefined &&
                            plan.timesUsed > 0 &&
                            plan.successRate !== undefined &&
                            plan.successRate > 0 && <span> • </span>}
                          {plan.successRate !== undefined &&
                            plan.successRate > 0 && (
                              <span>{plan.successRate}% success rate</span>
                            )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleViewPlan(plan._id)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          onClick={() =>
                            plan.pinnedByAdmin
                              ? handlePinToggle(plan)
                              : handlePinToggle(plan)
                          }
                          size="sm"
                          title={
                            plan.pinnedByAdmin
                              ? "Unpin from featured"
                              : "Pin as featured"
                          }
                          variant="outline"
                        >
                          {plan.pinnedByAdmin ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRejectClick(plan)}
                          size="sm"
                          variant="destructive"
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Rejected Plans Section */}
          {rejectedPlans.length > 0 && (
            <div>
              <h2 className="mb-4 font-semibold text-xl">
                Recently Rejected Plans ({rejectedPlans.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rejectedPlans.map((plan) => (
                  <Card className="border-red-200" key={plan._id}>
                    <CardHeader>
                      <div className="mb-2">
                        <Badge
                          className="bg-red-100 text-red-800"
                          variant="secondary"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          REJECTED
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg">
                        {plan.title || "Untitled Session Plan"}
                      </CardTitle>
                      <CardDescription>
                        By {plan.coachName || "Unknown Coach"} • {plan.teamName}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {/* Moderation Info */}
                      <div className="mb-3 rounded-md bg-red-50 p-3 text-sm">
                        <div className="mb-1 font-medium text-red-900">
                          Rejected by {plan.moderatedBy}
                        </div>
                        <div className="text-red-700">
                          {plan.moderationNote || "No reason provided"}
                        </div>
                        {plan.moderatedAt && (
                          <div className="mt-1 text-red-600 text-xs">
                            {new Date(plan.moderatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => handleViewPlan(plan._id)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Dialog */}
          <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Session Plan</DialogTitle>
                <DialogDescription>
                  This plan will be removed from the club library and set back
                  to private. The coach will be able to see the rejection
                  reason.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedPlan && (
                  <div>
                    <div className="font-medium">
                      {selectedPlan.title || "Untitled Session Plan"}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      By {selectedPlan.coachName}
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className="mb-2 block font-medium text-sm"
                    htmlFor="rejection-reason"
                  >
                    Reason for Rejection
                  </label>
                  <Textarea
                    id="rejection-reason"
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this plan..."
                    rows={4}
                    value={rejectionReason}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
                    This message will be visible to the coach who created the
                    plan.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setRejectDialogOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleRejectConfirm} variant="destructive">
                  Reject Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
