"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  Link2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Undo2,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

// Types
type Goal = {
  _id: Id<"passportGoals">;
  _creationTime: number;
  passportId: Id<"sportPassports">;
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  title: string;
  description: string;
  category: "technical" | "tactical" | "physical" | "mental" | "social";
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed" | "on_hold" | "cancelled";
  progress: number;
  targetDate?: string;
  completedDate?: string;
  linkedSkills?: string[];
  milestones?: Array<{
    id: string;
    description: string;
    completed: boolean;
    completedDate?: string;
  }>;
  parentActions?: string[];
  parentCanView: boolean;
  coachNotes?: string;
  playerNotes?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
};

type GoalWithPlayer = Goal & {
  playerName: string;
};

// Helper functions
const getCategoryColor = (category: string) => {
  switch (category) {
    case "technical":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "tactical":
      return "bg-indigo-100 text-indigo-800 border-indigo-300";
    case "physical":
      return "bg-green-100 text-green-800 border-green-300";
    case "mental":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "social":
      return "bg-orange-100 text-orange-800 border-orange-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    case "low":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const _getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-600";
    case "in_progress":
      return "bg-blue-600";
    case "not_started":
      return "bg-gray-400";
    case "on_hold":
      return "bg-orange-500";
    case "cancelled":
      return "bg-red-400";
    default:
      return "bg-gray-400";
  }
};

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatCategory = (category: string) =>
  category.charAt(0).toUpperCase() + category.slice(1);

export default function GoalsDashboardPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();

  // Fallback: use session user ID if Convex user query returns null
  const userId = currentUser?._id || session?.user?.id;

  // State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGoal, setSelectedGoal] = useState<GoalWithPlayer | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState<
    Record<string, string>
  >({});

  // Queries
  const goals = useQuery(api.models.passportGoals.getGoalsForOrg, {
    organizationId: orgId,
  });

  // Performance: Uses getPlayersForCoachTeams for server-side filtering
  const playersWithEnrollments = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId ? { organizationId: orgId, coachUserId: userId } : "skip"
  );

  const passports = useQuery(api.models.sportPassports.getPassportsForOrg, {
    organizationId: orgId,
  });

  // Mutations
  const createGoal = useMutation(api.models.passportGoals.createGoal);
  const updateGoal = useMutation(api.models.passportGoals.updateGoal);
  const deleteGoal = useMutation(api.models.passportGoals.deleteGoal);
  const completeMilestone = useMutation(
    api.models.passportGoals.completeMilestone
  );
  const addMilestone = useMutation(api.models.passportGoals.addMilestone);
  const updateGoalSkills = useMutation(
    api.models.passportGoals.updateLinkedSkills
  );
  const deleteMilestoneMutation = useMutation(
    api.models.passportGoals.deleteMilestone
  );
  const updateMilestoneMutation = useMutation(
    api.models.passportGoals.updateMilestone
  );
  const uncompleteMilestoneMutation = useMutation(
    api.models.passportGoals.uncompleteMilestone
  );

  // Get skill definitions for linking
  const skillDefinitions = useQuery(
    api.models.referenceData.getAllSkillDefinitions
  );

  // Get coach's teams
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get teams for bulk creation
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get team-player links
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  // Create player name lookup from enrollments
  const playerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (playersWithEnrollments) {
      for (const enrollment of playersWithEnrollments) {
        if (enrollment.player) {
          map.set(
            enrollment.playerIdentityId,
            `${enrollment.player.firstName} ${enrollment.player.lastName}`
          );
        }
      }
    }
    return map;
  }, [playersWithEnrollments]);

  // Process goals with player names
  const goalsWithPlayers: GoalWithPlayer[] = useMemo(() => {
    if (!goals) {
      return [];
    }

    return goals.map((goal) => ({
      ...goal,
      playerName: playerNameMap.get(goal.playerIdentityId) || "Unknown Player",
    }));
  }, [goals, playerNameMap]);

  // Sync selectedGoal with updated data from real-time query
  // This ensures the dialog reflects changes after mutations
  useEffect(() => {
    if (selectedGoal) {
      const updatedGoal = goalsWithPlayers.find(
        (g) => g._id === selectedGoal._id
      );
      if (updatedGoal) {
        setSelectedGoal(updatedGoal);
      }
    }
  }, [goalsWithPlayers, selectedGoal]);

  // Deduplicated team list for selector
  const coachTeamsList = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    const seen = new Set<string>();
    return coachAssignments.teams.filter((t) => {
      if (!t.teamId || t.teamId.includes("players")) {
        return false;
      }
      if (seen.has(t.teamId)) {
        return false;
      }
      seen.add(t.teamId);
      return true;
    });
  }, [coachAssignments?.teams]);

  // Player IDs per team
  const playerIdsByTeam = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!teamPlayerLinks) {
      return map;
    }
    for (const link of teamPlayerLinks) {
      if (!map.has(link.teamId)) {
        map.set(link.teamId, new Set());
      }
      map.get(link.teamId)?.add(link.playerIdentityId.toString());
    }
    return map;
  }, [teamPlayerLinks]);

  // Filter and sort goals
  const filteredGoals = useMemo(() => {
    let result = goalsWithPlayers;

    // Team filter
    if (selectedTeamId !== "all") {
      const playerIds = playerIdsByTeam.get(selectedTeamId) ?? new Set();
      result = result.filter((g) =>
        playerIds.has(g.playerIdentityId.toString())
      );
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter(
        (g) =>
          g.status === "in_progress" ||
          g.status === "not_started" ||
          g.status === "on_hold"
      );
    } else if (statusFilter !== "all") {
      result = result.filter((g) => g.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((g) => g.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description.toLowerCase().includes(term) ||
          g.playerName.toLowerCase().includes(term)
      );
    }

    // Sort by priority then progress
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.progress - a.progress;
    });
  }, [
    goalsWithPlayers,
    selectedTeamId,
    playerIdsByTeam,
    statusFilter,
    categoryFilter,
    searchTerm,
  ]);

  // Stats
  const stats = useMemo(() => {
    if (!goalsWithPlayers.length) {
      return { total: 0, inProgress: 0, completed: 0, avgProgress: 0 };
    }

    const total = goalsWithPlayers.length;
    const inProgress = goalsWithPlayers.filter(
      (g) => g.status === "in_progress"
    ).length;
    const completed = goalsWithPlayers.filter(
      (g) => g.status === "completed"
    ).length;
    const avgProgress = Math.round(
      goalsWithPlayers.reduce((sum, g) => sum + g.progress, 0) / total
    );

    return { total, inProgress, completed, avgProgress };
  }, [goalsWithPlayers]);

  // Goal stats per team
  const goalStatsByTeam = useMemo(() => {
    const map = new Map<
      string,
      { inProgress: number; completed: number; avgProgress: number }
    >();
    for (const team of coachTeamsList) {
      const playerIds = playerIdsByTeam.get(team.teamId) ?? new Set();
      const teamGoals = goalsWithPlayers.filter((g) =>
        playerIds.has(g.playerIdentityId.toString())
      );
      const inProgress = teamGoals.filter(
        (g) => g.status === "in_progress"
      ).length;
      const completed = teamGoals.filter(
        (g) => g.status === "completed"
      ).length;
      const avgProgress =
        teamGoals.length > 0
          ? Math.round(
              teamGoals.reduce((sum, g) => sum + g.progress, 0) /
                teamGoals.length
            )
          : 0;
      map.set(team.teamId, { inProgress, completed, avgProgress });
    }
    return map;
  }, [coachTeamsList, goalsWithPlayers, playerIdsByTeam]);

  // Handle milestone completion
  const handleCompleteMilestone = async (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => {
    try {
      await completeMilestone({ goalId, milestoneId });
      toast.success("Milestone completed!");
      // Refresh selected goal
      if (selectedGoal && selectedGoal._id === goalId) {
        const updatedGoal = goalsWithPlayers.find((g) => g._id === goalId);
        if (updatedGoal) {
          setSelectedGoal(updatedGoal);
        }
      }
    } catch (_error) {
      toast.error("Failed to complete milestone");
    }
  };

  // Handle adding new milestone
  const handleAddMilestone = async (goalId: Id<"passportGoals">) => {
    const milestoneText = newMilestoneText[goalId];
    if (!milestoneText?.trim()) {
      toast.error("Please enter a milestone description");
      return;
    }

    try {
      await addMilestone({
        goalId,
        description: milestoneText.trim(),
      });
      setNewMilestoneText((prev) => ({ ...prev, [goalId]: "" }));
      toast.success("Milestone added!");
    } catch (_error) {
      toast.error("Failed to add milestone");
    }
  };

  // Handle updating linked skills
  const handleUpdateSkills = async (
    goalId: Id<"passportGoals">,
    skills: string[]
  ) => {
    try {
      await updateGoalSkills({ goalId, linkedSkills: skills });
      toast.success("Skills linked!");
    } catch (_error) {
      toast.error("Failed to update linked skills");
    }
  };

  // Handle deleting a milestone
  const handleDeleteMilestone = async (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => {
    try {
      await deleteMilestoneMutation({ goalId, milestoneId });
      toast.success("Milestone deleted");
    } catch (_error) {
      toast.error("Failed to delete milestone");
    }
  };

  // Handle updating a milestone description
  const handleUpdateMilestone = async (
    goalId: Id<"passportGoals">,
    milestoneId: string,
    description: string
  ) => {
    try {
      await updateMilestoneMutation({ goalId, milestoneId, description });
      toast.success("Milestone updated");
    } catch (_error) {
      toast.error("Failed to update milestone");
    }
  };

  // Handle uncompleting a milestone
  const handleUncompleteMilestone = async (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => {
    try {
      await uncompleteMilestoneMutation({ goalId, milestoneId });
      toast.success("Milestone marked incomplete");
    } catch (_error) {
      toast.error("Failed to uncomplete milestone");
    }
  };

  // Loading state
  if (!(goals && playersWithEnrollments)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  const hasActiveFilters =
    selectedTeamId !== "all" ||
    searchTerm !== "" ||
    statusFilter !== "active" ||
    categoryFilter !== "all";

  const clearAllFilters = () => {
    setSelectedTeamId("all");
    setSearchTerm("");
    setStatusFilter("active");
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Target className="h-7 w-7 flex-shrink-0" />
            <div>
              <h1 className="font-bold text-xl md:text-2xl">
                Development Goals
              </h1>
              <p className="text-xs opacity-80 md:text-sm">
                Track and manage player development goals
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowBulkCreateDialog(true)}
              variant="secondary"
            >
              <Users className="mr-2 h-4 w-4" />
              Team Goals
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Target className="text-blue-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.total}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total Goals
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{ width: "100%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Pencil className="text-amber-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.inProgress}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              In Progress
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-amber-100">
              <div
                className="h-1 rounded-full bg-amber-600"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.inProgress / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.completed}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Completed
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.completed / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {stats.avgProgress}%
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Avg Progress
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-600"
                style={{ width: `${stats.avgProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Selector */}
      {coachTeamsList.length > 0 && (
        <div>
          <button
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
            onClick={() => setTeamsExpanded((prev) => !prev)}
            type="button"
          >
            <span className="font-semibold text-gray-700 text-sm">
              {selectedTeamId === "all"
                ? "All Teams"
                : `${
                    coachTeamsList.find((t) => t.teamId === selectedTeamId)
                      ?.teamName ?? "All Teams"
                  } · selected`}
            </span>
            <ChevronDown
              className={`text-gray-500 transition-transform ${teamsExpanded ? "rotate-180" : ""}`}
              size={18}
            />
          </button>
          {teamsExpanded && (
            <div
              className={`grid gap-3 md:gap-4 ${coachTeamsList.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}
            >
              {coachTeamsList.length > 1 && (
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${selectedTeamId === "all" ? "ring-2 ring-green-500" : ""}`}
                  onClick={() => setSelectedTeamId("all")}
                  style={{
                    backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                    borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                  }}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                          All Teams
                        </p>
                        <p className="text-gray-500 text-xs">
                          {coachTeamsList.length} teams
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-sm leading-tight">
                          {stats.total}
                        </p>
                        <p className="text-gray-500 text-xs">goals</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {coachTeamsList.map((team) => {
                const isSelected = selectedTeamId === team.teamId;
                const ageMeta = [team.ageGroup, team.gender]
                  .filter(Boolean)
                  .join(" • ");
                const ts = goalStatsByTeam.get(team.teamId) ?? {
                  inProgress: 0,
                  completed: 0,
                  avgProgress: 0,
                };
                return (
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${isSelected ? "ring-2 ring-green-500" : ""}`}
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    style={{
                      backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                      borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                    }}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-gray-800 text-sm leading-tight"
                            title={team.teamName}
                          >
                            {team.teamName}
                          </p>
                          {ageMeta && (
                            <p className="text-gray-500 text-xs">{ageMeta}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span
                          className="flex items-center gap-1 text-amber-600"
                          title="In Progress"
                        >
                          <Pencil size={10} />
                          {ts.inProgress}
                        </span>
                        <span
                          className="flex items-center gap-1 text-green-600"
                          title="Completed"
                        >
                          <CheckCircle size={10} />
                          {ts.completed}
                        </span>
                        <span
                          className="flex items-center gap-1 text-purple-600"
                          title="Avg Progress"
                        >
                          <TrendingUp size={10} />
                          {ts.avgProgress}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search goals or players..."
                value={searchTerm}
              />
            </div>

            {/* Status Filter */}
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select onValueChange={setCategoryFilter} value={categoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="tactical">Tactical</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="mental">Mental</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <button
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-500 text-sm transition-colors hover:border-gray-400 hover:text-gray-700"
                onClick={clearAllFilters}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtered indicator */}
      {hasActiveFilters && (
        <p className="text-orange-500 text-xs">
          Filtered — not showing all goals
        </p>
      )}

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredGoals.map((goal) => (
            <GoalCard
              goal={goal}
              key={goal._id}
              onClick={() => setSelectedGoal(goal)}
            />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Target className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>
              {searchTerm ||
              statusFilter !== "active" ||
              categoryFilter !== "all"
                ? "No results found"
                : "No goals yet"}
            </EmptyTitle>
            <EmptyDescription>
              {searchTerm ||
              statusFilter !== "active" ||
              categoryFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Create your first development goal to start tracking player progress"}
            </EmptyDescription>
            {!searchTerm &&
              statusFilter === "active" &&
              categoryFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Goal
                </Button>
              )}
          </EmptyContent>
        </Empty>
      )}

      {/* Goal Detail Dialog */}
      <GoalDetailDialog
        goal={selectedGoal}
        newMilestoneText={newMilestoneText[selectedGoal?._id ?? ""] ?? ""}
        onAddMilestone={handleAddMilestone}
        onClose={() => setSelectedGoal(null)}
        onCompleteMilestone={handleCompleteMilestone}
        onDelete={async (goalId) => {
          try {
            await deleteGoal({ goalId });
            setSelectedGoal(null);
            toast.success("Goal deleted");
          } catch (_error) {
            toast.error("Failed to delete goal");
          }
        }}
        onDeleteMilestone={handleDeleteMilestone}
        onEdit={() => setShowEditDialog(true)}
        onMilestoneTextChange={(text) =>
          setNewMilestoneText((prev) => ({
            ...prev,
            [selectedGoal?._id ?? ""]: text,
          }))
        }
        onUncompleteMilestone={handleUncompleteMilestone}
        onUpdateMilestone={handleUpdateMilestone}
        onUpdateSkills={handleUpdateSkills}
        onUpdateStatus={async (goalId, status) => {
          try {
            await updateGoal({ goalId, status });
            toast.success("Goal status updated");
          } catch (_error) {
            toast.error("Failed to update goal");
          }
        }}
        skillDefinitions={skillDefinitions || []}
      />

      {/* Edit Goal Dialog */}
      {selectedGoal && (
        <EditGoalDialog
          goal={selectedGoal}
          onClose={() => setShowEditDialog(false)}
          onSubmit={async (data) => {
            try {
              await updateGoal({
                goalId: selectedGoal._id,
                ...data,
              });
              setShowEditDialog(false);
              toast.success("Goal updated successfully!");
            } catch (_error) {
              toast.error("Failed to update goal");
            }
          }}
          open={showEditDialog}
        />
      )}

      {/* Create Goal Dialog */}
      <CreateGoalDialog
        onClose={() => setShowCreateDialog(false)}
        onSubmit={async (data) => {
          try {
            await createGoal({ ...data, createdBy: userId });
            setShowCreateDialog(false);
            toast.success("Goal created successfully!");
          } catch (_error) {
            toast.error("Failed to create goal");
          }
        }}
        open={showCreateDialog}
        passports={passports || []}
        playerNameMap={playerNameMap}
      />

      {/* Bulk Create Goals Dialog */}
      <BulkCreateGoalsDialog
        onClose={() => setShowBulkCreateDialog(false)}
        onSubmit={async (data) => {
          let created = 0;
          for (const passportId of data.passportIds) {
            try {
              await createGoal({
                passportId,
                title: data.title,
                description: data.description,
                category: data.category,
                priority: data.priority,
                targetDate: data.targetDate,
                linkedSkills: data.linkedSkills,
                parentCanView: data.parentCanView,
                createdBy: userId,
              });
              created += 1;
            } catch (_error) {
              console.error("Failed to create goal for passport:", passportId);
            }
          }
          setShowBulkCreateDialog(false);
          toast.success(`Created ${created} goals for team members!`);
        }}
        open={showBulkCreateDialog}
        passports={passports || []}
        playerNameMap={playerNameMap}
        skillDefinitions={skillDefinitions || []}
        teamPlayerLinks={teamPlayerLinks || []}
        teams={teams || []}
      />
    </div>
  );
}

// GoalCard Component
function GoalCard({
  goal,
  onClick,
}: {
  goal: GoalWithPlayer;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={getPriorityColor(goal.priority)}>
                {goal.priority}
              </Badge>
              <Badge
                className={getCategoryColor(goal.category)}
                variant="outline"
              >
                {formatCategory(goal.category)}
              </Badge>
            </div>
            <h3 className="mb-1 font-bold text-lg">{goal.title}</h3>
            <p className="text-muted-foreground text-sm">{goal.playerName}</p>
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {goal.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <Progress className="h-2" value={goal.progress} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>
              {goal.milestones?.filter((m) => m.completed).length || 0}/
              {goal.milestones?.length || 0} milestones
            </span>
          </div>
          {goal.targetDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Linked Skills */}
        {goal.linkedSkills && goal.linkedSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {goal.linkedSkills.slice(0, 3).map((skill) => (
              <Badge className="text-xs" key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
            {goal.linkedSkills.length > 3 && (
              <Badge className="text-xs" variant="secondary">
                +{goal.linkedSkills.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Goal Detail Dialog
function GoalDetailDialog({
  goal,
  onClose,
  onCompleteMilestone,
  onAddMilestone,
  newMilestoneText,
  onMilestoneTextChange,
  skillDefinitions,
  onUpdateSkills,
  onDelete,
  onUpdateStatus,
  onEdit,
  onDeleteMilestone,
  onUpdateMilestone,
  onUncompleteMilestone,
}: {
  goal: GoalWithPlayer | null;
  onClose: () => void;
  onCompleteMilestone: (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => void;
  onAddMilestone: (goalId: Id<"passportGoals">) => void;
  newMilestoneText: string;
  onMilestoneTextChange: (text: string) => void;
  skillDefinitions: Array<{
    _id: string;
    code: string;
    name: string;
    sportCode: string;
  }>;
  onUpdateSkills: (goalId: Id<"passportGoals">, skills: string[]) => void;
  onDelete: (goalId: Id<"passportGoals">) => void;
  onUpdateStatus: (
    goalId: Id<"passportGoals">,
    status:
      | "not_started"
      | "in_progress"
      | "completed"
      | "on_hold"
      | "cancelled"
  ) => void;
  onEdit: () => void;
  onDeleteMilestone: (goalId: Id<"passportGoals">, milestoneId: string) => void;
  onUpdateMilestone: (
    goalId: Id<"passportGoals">,
    milestoneId: string,
    description: string
  ) => void;
  onUncompleteMilestone: (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => void;
}) {
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    goal?.linkedSkills || []
  );
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null
  );
  const [editingMilestoneText, setEditingMilestoneText] = useState("");

  if (!goal) {
    return null;
  }

  return (
    <Dialog onOpenChange={onClose} open={!!goal}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority} Priority
            </Badge>
            <Badge
              className={getCategoryColor(goal.category)}
              variant="outline"
            >
              {formatCategory(goal.category)}
            </Badge>
          </div>
          <DialogTitle className="text-2xl">{goal.title}</DialogTitle>
          <DialogDescription>{goal.playerName}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="font-bold">{goal.progress}%</span>
          </div>
          <Progress className="h-4" value={goal.progress} />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="mb-1 text-muted-foreground text-xs">Status</div>
            <div className="font-semibold">{formatStatus(goal.status)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-1 text-muted-foreground text-xs">
              Target Date
            </div>
            <div className="font-semibold">
              {goal.targetDate
                ? new Date(goal.targetDate).toLocaleDateString()
                : "Not set"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-1 text-muted-foreground text-xs">Created</div>
            <div className="font-semibold">
              {new Date(goal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="mb-2 font-bold">Description</h3>
          <p className="text-muted-foreground">{goal.description}</p>
        </div>

        {/* Milestones */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Milestones</h3>
            <span className="text-muted-foreground text-sm">
              {goal.milestones?.filter((m) => m.completed).length || 0}/
              {goal.milestones?.length || 0} completed
            </span>
          </div>
          <div className="space-y-2">
            {goal.milestones?.map((milestone, index) => (
              <div
                className={`flex items-start justify-between rounded-lg border p-4 ${
                  milestone.completed
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200"
                }`}
                key={milestone.id}
              >
                <div className="flex flex-1 items-start gap-3">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      milestone.completed ? "bg-green-600" : "bg-gray-300"
                    }`}
                  >
                    {milestone.completed ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <span className="font-bold text-white text-xs">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    {editingMilestoneId === milestone.id ? (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          className="h-8"
                          onBlur={() => {
                            if (editingMilestoneText.trim()) {
                              onUpdateMilestone(
                                goal._id,
                                milestone.id,
                                editingMilestoneText.trim()
                              );
                            }
                            setEditingMilestoneId(null);
                            setEditingMilestoneText("");
                          }}
                          onChange={(e) =>
                            setEditingMilestoneText(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              editingMilestoneText.trim()
                            ) {
                              onUpdateMilestone(
                                goal._id,
                                milestone.id,
                                editingMilestoneText.trim()
                              );
                              setEditingMilestoneId(null);
                              setEditingMilestoneText("");
                            } else if (e.key === "Escape") {
                              setEditingMilestoneId(null);
                              setEditingMilestoneText("");
                            }
                          }}
                          value={editingMilestoneText}
                        />
                      </div>
                    ) : (
                      <button
                        className={`cursor-pointer text-left font-medium hover:underline ${
                          milestone.completed
                            ? "text-green-800"
                            : "text-gray-800"
                        }`}
                        onClick={() => {
                          setEditingMilestoneId(milestone.id);
                          setEditingMilestoneText(milestone.description);
                        }}
                        title="Click to edit"
                        type="button"
                      >
                        {milestone.description}
                      </button>
                    )}
                    {milestone.completedDate && (
                      <p className="mt-1 text-green-600 text-xs">
                        ✓ Completed:{" "}
                        {new Date(milestone.completedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  {!milestone.completed && goal.status !== "completed" && (
                    <Button
                      onClick={() =>
                        onCompleteMilestone(goal._id, milestone.id)
                      }
                      size="sm"
                    >
                      Complete
                    </Button>
                  )}
                  {milestone.completed && goal.status !== "completed" && (
                    <Button
                      onClick={() =>
                        onUncompleteMilestone(goal._id, milestone.id)
                      }
                      size="sm"
                      title="Mark as incomplete"
                      variant="outline"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => onDeleteMilestone(goal._id, milestone.id)}
                    size="sm"
                    title="Delete milestone"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Milestone */}
          {goal.status !== "completed" && (
            <div className="mt-4 flex gap-2">
              <Input
                onChange={(e) => onMilestoneTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMilestoneText.trim()) {
                    onAddMilestone(goal._id);
                  }
                }}
                placeholder="Add a new milestone..."
                value={newMilestoneText}
              />
              <Button
                disabled={!newMilestoneText.trim()}
                onClick={() => onAddMilestone(goal._id)}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Linked Skills */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <Link2 className="h-4 w-4" />
              Linked Skills
            </h3>
            <Button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              size="sm"
              variant="outline"
            >
              {showSkillPicker ? "Done" : "Edit Skills"}
            </Button>
          </div>

          {showSkillPicker ? (
            <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
              <p className="text-muted-foreground text-sm">
                Select skills to link to this goal:
              </p>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {skillDefinitions.map((skill) => (
                  <Badge
                    className={`cursor-pointer transition-colors ${
                      selectedSkills.includes(skill.code)
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    key={`${skill.sportCode}-${skill.code}`}
                    onClick={() => {
                      setSelectedSkills((prev) =>
                        prev.includes(skill.code)
                          ? prev.filter((s) => s !== skill.code)
                          : [...prev, skill.code]
                      );
                    }}
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
              <Button
                onClick={() => {
                  onUpdateSkills(goal._id, selectedSkills);
                  setShowSkillPicker(false);
                }}
                size="sm"
              >
                Save Linked Skills
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {goal.linkedSkills && goal.linkedSkills.length > 0 ? (
                goal.linkedSkills.map((skillCode) => {
                  const skill = skillDefinitions.find(
                    (s) => s.code === skillCode
                  );
                  return (
                    <Badge key={skillCode} variant="secondary">
                      {skill?.name || skillCode}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">
                  No skills linked yet. Click "Edit Skills" to add some.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Parent Actions */}
        {goal.parentActions && goal.parentActions.length > 0 && (
          <div>
            <h3 className="mb-2 font-bold">What Parents Can Do</h3>
            <ul className="space-y-1">
              {goal.parentActions.map((action) => (
                <li
                  className="flex items-start gap-2 text-muted-foreground"
                  key={`action-${action}`}
                >
                  <span className="mt-1 text-blue-600">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Coach Notes */}
        {goal.coachNotes && (
          <div>
            <h3 className="mb-2 font-bold">Coach Notes</h3>
            <p className="text-muted-foreground">{goal.coachNotes}</p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={onEdit} variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Goal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Update Status <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(goal._id, "not_started")}
              >
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(goal._id, "in_progress")}
              >
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(goal._id, "completed")}
              >
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateStatus(goal._id, "on_hold")}
              >
                On Hold
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => onDelete(goal._id)} variant="destructive">
            Delete Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Goal Dialog
function CreateGoalDialog({
  open,
  onClose,
  passports,
  playerNameMap,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  passports: Array<{
    _id: Id<"sportPassports">;
    playerIdentityId: Id<"playerIdentities">;
    sportCode: string;
  }>;
  playerNameMap: Map<string, string>;
  onSubmit: (data: {
    passportId: Id<"sportPassports">;
    title: string;
    description: string;
    category: "technical" | "tactical" | "physical" | "mental" | "social";
    priority: "high" | "medium" | "low";
    targetDate?: string;
    linkedSkills?: string[];
    parentCanView?: boolean;
  }) => Promise<void>;
}) {
  const [passportId, setPassportId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("technical");
  const [priority, setPriority] = useState<string>("medium");
  const [targetDate, setTargetDate] = useState("");
  const [parentCanView, setParentCanView] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!(passportId && title && description)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        passportId: passportId as Id<"sportPassports">,
        title,
        description,
        category: category as
          | "technical"
          | "tactical"
          | "physical"
          | "mental"
          | "social",
        priority: priority as "high" | "medium" | "low",
        targetDate: targetDate || undefined,
        parentCanView,
      });
      // Reset form
      setPassportId("");
      setTitle("");
      setDescription("");
      setCategory("technical");
      setPriority("medium");
      setTargetDate("");
      setParentCanView(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Development Goal</DialogTitle>
          <DialogDescription>
            Set a new development goal for a player
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Player Selection */}
          <div className="space-y-2">
            <Label htmlFor="player">Player *</Label>
            <Select onValueChange={setPassportId} value={passportId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {passports.map((passport) => (
                  <SelectItem key={passport._id} value={passport._id}>
                    {playerNameMap.get(passport.playerIdentityId) ||
                      "Unknown Player"}{" "}
                    ({passport.sportCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Improve First Touch"
              value={title}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the goal and success criteria..."
              rows={3}
              value={description}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="tactical">Tactical</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="mental">Mental</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select onValueChange={setPriority} value={priority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              onChange={(e) => setTargetDate(e.target.value)}
              type="date"
              value={targetDate}
            />
          </div>

          {/* Parent Visibility */}
          <div className="flex items-center gap-2">
            <input
              checked={parentCanView}
              className="h-4 w-4 rounded border-gray-300"
              id="parentCanView"
              onChange={(e) => setParentCanView(e.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="parentCanView">Visible to parents</Label>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={submitting} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Creating..." : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Goal Dialog
function EditGoalDialog({
  open,
  onClose,
  goal,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  goal: GoalWithPlayer;
  onSubmit: (data: {
    title?: string;
    description?: string;
    priority?: "high" | "medium" | "low";
    targetDate?: string;
    parentCanView?: boolean;
    coachNotes?: string;
    parentActions?: string[];
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [priority, setPriority] = useState<string>(goal.priority);
  const [targetDate, setTargetDate] = useState(goal.targetDate || "");
  const [parentCanView, setParentCanView] = useState(goal.parentCanView);
  const [coachNotes, setCoachNotes] = useState(goal.coachNotes || "");
  const [parentActionsText, setParentActionsText] = useState(
    goal.parentActions?.join("\n") || ""
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset form when goal changes
  useState(() => {
    setTitle(goal.title);
    setDescription(goal.description);
    setPriority(goal.priority);
    setTargetDate(goal.targetDate || "");
    setParentCanView(goal.parentCanView);
    setCoachNotes(goal.coachNotes || "");
    setParentActionsText(goal.parentActions?.join("\n") || "");
  });

  const handleSubmit = async () => {
    if (!(title && description)) {
      toast.error("Title and description are required");
      return;
    }

    setSubmitting(true);
    try {
      const parentActions = parentActionsText
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await onSubmit({
        title,
        description,
        priority: priority as "high" | "medium" | "low",
        targetDate: targetDate || undefined,
        parentCanView,
        coachNotes: coachNotes || undefined,
        parentActions: parentActions.length > 0 ? parentActions : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>
            Update the goal details for {goal.playerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Goal Title *</Label>
            <Input
              id="edit-title"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              value={description}
            />
          </div>

          {/* Category (locked) and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                <span className="text-muted-foreground text-sm">
                  {formatCategory(goal.category)}
                </span>
                <span className="ml-2 text-muted-foreground text-xs">
                  (locked)
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select onValueChange={setPriority} value={priority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="edit-targetDate">Target Date</Label>
            <Input
              id="edit-targetDate"
              onChange={(e) => setTargetDate(e.target.value)}
              type="date"
              value={targetDate}
            />
          </div>

          {/* Coach Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-coachNotes">Coach Notes</Label>
            <Textarea
              id="edit-coachNotes"
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Private notes visible only to coaches..."
              rows={2}
              value={coachNotes}
            />
          </div>

          {/* Parent Actions */}
          <div className="space-y-2">
            <Label htmlFor="edit-parentActions">
              Parent Actions (one per line)
            </Label>
            <Textarea
              id="edit-parentActions"
              onChange={(e) => setParentActionsText(e.target.value)}
              placeholder="Practice at home&#10;Watch technique videos&#10;Attend extra sessions"
              rows={3}
              value={parentActionsText}
            />
          </div>

          {/* Parent Visibility */}
          <div className="flex items-center gap-2">
            <input
              checked={parentCanView}
              className="h-4 w-4 rounded border-gray-300"
              id="edit-parentCanView"
              onChange={(e) => setParentCanView(e.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="edit-parentCanView">Visible to parents</Label>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={submitting} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Create Goals Dialog
function BulkCreateGoalsDialog({
  open,
  onClose,
  teams,
  teamPlayerLinks,
  passports,
  playerNameMap,
  skillDefinitions,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  teams: Array<{ _id: string; name: string }>;
  teamPlayerLinks: Array<{ teamId: string; playerIdentityId: string }>;
  passports: Array<{
    _id: Id<"sportPassports">;
    playerIdentityId: Id<"playerIdentities">;
    sportCode: string;
  }>;
  playerNameMap: Map<string, string>;
  skillDefinitions: Array<{
    _id: string;
    code: string;
    name: string;
    sportCode: string;
  }>;
  onSubmit: (data: {
    passportIds: Id<"sportPassports">[];
    title: string;
    description: string;
    category: "technical" | "tactical" | "physical" | "mental" | "social";
    priority: "high" | "medium" | "low";
    targetDate?: string;
    linkedSkills?: string[];
    parentCanView: boolean;
  }) => Promise<void>;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("technical");
  const [priority, setPriority] = useState<string>("medium");
  const [targetDate, setTargetDate] = useState("");
  const [linkedSkills, setLinkedSkills] = useState<string[]>([]);
  const [parentCanView, setParentCanView] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Get players in selected team
  const teamPlayers = useMemo(() => {
    if (!selectedTeamId) {
      return [];
    }
    const players = teamPlayerLinks.filter(
      (link) => link.teamId === selectedTeamId
    );
    console.log(
      `[BulkGoals] Team ${selectedTeamId} has ${players.length} player links:`,
      players.map((p) => p.playerIdentityId)
    );
    return players;
  }, [selectedTeamId, teamPlayerLinks]);

  // Get passports for team players
  const teamPassports = useMemo(() => {
    const playerIds = new Set(teamPlayers.map((tp) => tp.playerIdentityId));
    const foundPassports = passports.filter((p) =>
      playerIds.has(p.playerIdentityId)
    );

    // Debug: show which players don't have passports
    if (teamPlayers.length > 0 && foundPassports.length < teamPlayers.length) {
      const passportPlayerIds = new Set<string>(
        foundPassports.map((p) => p.playerIdentityId)
      );
      const missingPlayers = teamPlayers
        .filter((tp) => !passportPlayerIds.has(tp.playerIdentityId as string))
        .map((tp) => tp.playerIdentityId);
      console.warn(
        `[BulkGoals] ${missingPlayers.length} players in team don't have sport passports:`,
        missingPlayers
      );
    }

    console.log(
      `[BulkGoals] Found ${foundPassports.length} passports for ${teamPlayers.length} team players`
    );
    return foundPassports;
  }, [teamPlayers, passports]);

  const handleSubmit = async () => {
    if (!(selectedTeamId && title && description)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (teamPassports.length === 0) {
      toast.error("No players found in selected team with sport passports");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        passportIds: teamPassports.map((p) => p._id),
        title,
        description,
        category: category as
          | "technical"
          | "tactical"
          | "physical"
          | "mental"
          | "social",
        priority: priority as "high" | "medium" | "low",
        targetDate: targetDate || undefined,
        linkedSkills: linkedSkills.length > 0 ? linkedSkills : undefined,
        parentCanView,
      });
      // Reset form
      setSelectedTeamId("");
      setTitle("");
      setDescription("");
      setCategory("technical");
      setPriority("medium");
      setTargetDate("");
      setLinkedSkills([]);
      setParentCanView(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Team Goals
          </DialogTitle>
          <DialogDescription>
            Create the same goal for all players in a team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team Selection */}
          <div className="space-y-2">
            <Label>Select Team *</Label>
            <Select onValueChange={setSelectedTeamId} value={selectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeamId && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {teamPassports.length} player(s) will receive this goal
                </p>
                {teamPlayers.length > teamPassports.length && (
                  <p className="text-amber-600 text-xs">
                    ⚠️ {teamPlayers.length - teamPassports.length} player(s) in
                    this team don't have sport passports yet. Goals require
                    sport passports to be created first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Goal Title *</Label>
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Improve Team Communication"
              value={title}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the goal and success criteria..."
              rows={3}
              value={description}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="tactical">Tactical</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="mental">Mental</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select onValueChange={setPriority} value={priority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Input
              onChange={(e) => setTargetDate(e.target.value)}
              type="date"
              value={targetDate}
            />
          </div>

          {/* Linked Skills */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link to Skills (Optional)
            </Label>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-gray-50 p-3">
              {skillDefinitions.length > 0 ? (
                skillDefinitions.map((skill) => (
                  <Badge
                    className={`cursor-pointer transition-colors ${
                      linkedSkills.includes(skill.code)
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    key={`${skill.sportCode}-${skill.code}`}
                    onClick={() => {
                      setLinkedSkills((prev) =>
                        prev.includes(skill.code)
                          ? prev.filter((s) => s !== skill.code)
                          : [...prev, skill.code]
                      );
                    }}
                  >
                    {skill.name}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No skills available
                </p>
              )}
            </div>
            {linkedSkills.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {linkedSkills.length} skill(s) selected
              </p>
            )}
          </div>

          {/* Parent Visibility */}
          <div className="flex items-center gap-2">
            <input
              checked={parentCanView}
              className="h-4 w-4 rounded border-gray-300"
              id="bulkParentCanView"
              onChange={(e) => setParentCanView(e.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="bulkParentCanView">Visible to parents</Label>
          </div>

          {/* Preview */}
          {selectedTeamId && teamPassports.length > 0 && (
            <div className="rounded-lg border bg-blue-50 p-3">
              <p className="mb-2 font-medium text-blue-900 text-sm">
                Goals will be created for:
              </p>
              <div className="flex flex-wrap gap-1">
                {teamPassports.slice(0, 8).map((passport) => (
                  <Badge
                    className="text-xs"
                    key={passport._id}
                    variant="secondary"
                  >
                    {playerNameMap.get(passport.playerIdentityId) || "Unknown"}
                  </Badge>
                ))}
                {teamPassports.length > 8 && (
                  <Badge className="text-xs" variant="secondary">
                    +{teamPassports.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button disabled={submitting} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={submitting || teamPassports.length === 0}
            onClick={handleSubmit}
          >
            {submitting
              ? "Creating..."
              : `Create ${teamPassports.length} Goal${teamPassports.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
