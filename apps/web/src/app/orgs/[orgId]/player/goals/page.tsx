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
  Undo2,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { useChildAccess } from "@/hooks/use-child-access";
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

type GoalWithSource = Goal & {
  isCoachGoal: boolean;
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

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatCategory = (category: string) =>
  category.charAt(0).toUpperCase() + category.slice(1);

export default function PlayerGoalsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: session } = authClient.useSession();

  // Child access gating for development goals (Phase 7)
  const { isChildAccount, accessLevel, toggles } = useChildAccess(orgId ?? "");

  // In view_interact mode, child can add/edit their OWN goals only
  const isViewInteract = isChildAccount && accessLevel === "view_interact";

  const userEmail = session?.user?.email;

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGoal, setSelectedGoal] = useState<GoalWithSource | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState<
    Record<string, string>
  >({});

  // Get player identity
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Get all goals for this player
  const goals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Get player's passports (for create dialog)
  const passports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Get skill definitions for linking
  const skillDefinitions = useQuery(
    api.models.referenceData.getAllSkillDefinitions
  );

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

  // Enrich goals with coach/personal flag
  // A goal is considered a "coach goal" if createdBy is set and doesn't match the player's own userId
  // (since coaches create goals with their userId, players create with their own or null)
  const playerUserId = session?.user?.id;

  const goalsWithSource: GoalWithSource[] = useMemo(() => {
    if (!goals) {
      return [];
    }
    return goals.map((goal) => ({
      ...goal,
      // A personal goal is one the player created themselves (createdBy matches their own userId).
      // Coach goals either have no createdBy (legacy) or a different userId (coach's).
      isCoachGoal: !goal.createdBy || goal.createdBy !== playerUserId,
    }));
  }, [goals, playerUserId]);

  // Sync selectedGoal with updated data from real-time query
  useEffect(() => {
    if (selectedGoal) {
      const updatedGoal = goalsWithSource.find(
        (g) => g._id === selectedGoal._id
      );
      if (updatedGoal) {
        setSelectedGoal(updatedGoal);
      }
    }
  }, [goalsWithSource, selectedGoal]);

  // Filter and sort goals
  const filteredGoals = useMemo(() => {
    let result = goalsWithSource;

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

    if (categoryFilter !== "all") {
      result = result.filter((g) => g.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description.toLowerCase().includes(term)
      );
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.progress - a.progress;
    });
  }, [goalsWithSource, statusFilter, categoryFilter, searchTerm]);

  // Stats (across all goals, not just filtered)
  const stats = useMemo(() => {
    if (!goalsWithSource.length) {
      return { total: 0, inProgress: 0, completed: 0, avgProgress: 0 };
    }
    const total = goalsWithSource.length;
    const inProgress = goalsWithSource.filter(
      (g) => g.status === "in_progress"
    ).length;
    const completed = goalsWithSource.filter(
      (g) => g.status === "completed"
    ).length;
    const avgProgress = Math.round(
      goalsWithSource.reduce((sum, g) => sum + g.progress, 0) / total
    );
    return { total, inProgress, completed, avgProgress };
  }, [goalsWithSource]);

  // Handlers
  const handleCompleteMilestone = async (
    goalId: Id<"passportGoals">,
    milestoneId: string
  ) => {
    try {
      await completeMilestone({ goalId, milestoneId });
      toast.success("Milestone completed!");
    } catch (_error) {
      toast.error("Failed to complete milestone");
    }
  };

  const handleAddMilestone = async (goalId: Id<"passportGoals">) => {
    const milestoneText = newMilestoneText[goalId];
    if (!milestoneText?.trim()) {
      toast.error("Please enter a milestone description");
      return;
    }
    try {
      await addMilestone({ goalId, description: milestoneText.trim() });
      setNewMilestoneText((prev) => ({ ...prev, [goalId]: "" }));
      toast.success("Milestone added!");
    } catch (_error) {
      toast.error("Failed to add milestone");
    }
  };

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
  if (!(goals !== undefined && passports !== undefined)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  // Child account: development goals access disabled by parent
  if (isChildAccount && !toggles?.includeDevelopmentGoals) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card className="border-muted">
          <CardContent className="pt-6 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Development Goals Not Available</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Your parent hasn&apos;t enabled development goals for your
              account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePassports = (passports ?? []).filter(
    (p) => p.status === "active"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="font-bold text-3xl tracking-tight">My Goals</h1>
            <p className="text-muted-foreground">
              Track your personal development goals
            </p>
          </div>
        </div>
        {/* Hide goal creation for view_only child accounts */}
        {(!isChildAccount || isViewInteract) && (
          <Button
            disabled={activePassports.length === 0}
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-3xl text-gray-800">
              {stats.total}
            </div>
            <div className="text-muted-foreground text-sm">Total Goals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-3xl text-blue-600">
              {stats.inProgress}
            </div>
            <div className="text-muted-foreground text-sm">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-3xl text-green-600">
              {stats.completed}
            </div>
            <div className="text-muted-foreground text-sm">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-3xl text-purple-600">
              {stats.avgProgress}%
            </div>
            <div className="text-muted-foreground text-sm">Avg Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search goals..."
                value={searchTerm}
              />
            </div>

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
          </div>
        </CardContent>
      </Card>

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
                : "Create your first personal goal to start tracking your development"}
            </EmptyDescription>
            {!searchTerm &&
              statusFilter === "active" &&
              categoryFilter === "all" &&
              (!isChildAccount || isViewInteract) && (
                <Button
                  disabled={activePassports.length === 0}
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Goal
                </Button>
              )}
          </EmptyContent>
        </Empty>
      )}

      {/* Goal Detail Dialog */}
      <GoalDetailDialog
        canWrite={
          !isChildAccount ||
          (isViewInteract && !(selectedGoal?.isCoachGoal ?? true))
        }
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
              await updateGoal({ goalId: selectedGoal._id, ...data });
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
            await createGoal({
              ...data,
              createdBy: playerUserId ?? undefined,
            });
            setShowCreateDialog(false);
            toast.success("Goal created successfully!");
          } catch (_error) {
            toast.error("Failed to create goal");
          }
        }}
        open={showCreateDialog}
        passports={activePassports}
      />
    </div>
  );
}

// GoalCard Component
function GoalCard({
  goal,
  onClick,
}: {
  goal: GoalWithSource;
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
              {goal.isCoachGoal ? (
                <Badge
                  className="border-amber-300 bg-amber-100 text-amber-800"
                  variant="outline"
                >
                  Coach Goal
                </Badge>
              ) : (
                <Badge
                  className="border-blue-300 bg-blue-100 text-blue-800"
                  variant="outline"
                >
                  Player Goal
                </Badge>
              )}
            </div>
            <h3 className="mb-1 font-bold text-lg">{goal.title}</h3>
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
  canWrite,
}: {
  goal: GoalWithSource | null;
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
  /** Whether the current user can edit/delete this goal. False for read-only child accounts. */
  canWrite: boolean;
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority} Priority
            </Badge>
            <Badge
              className={getCategoryColor(goal.category)}
              variant="outline"
            >
              {formatCategory(goal.category)}
            </Badge>
            {goal.isCoachGoal ? (
              <Badge
                className="border-amber-300 bg-amber-100 text-amber-800"
                variant="outline"
              >
                <User className="mr-1 h-3 w-3" />
                Coach Goal
              </Badge>
            ) : (
              <Badge
                className="border-blue-300 bg-blue-100 text-blue-800"
                variant="outline"
              >
                Player Goal
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl">{goal.title}</DialogTitle>
          <DialogDescription>{goal.description}</DialogDescription>
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

        {/* Milestones */}
        <div>
          <h3 className="mb-3 font-bold">Milestones</h3>
          <div className="space-y-2">
            {goal.milestones && goal.milestones.length > 0 ? (
              goal.milestones.map((milestone) => (
                <div
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={milestone.id}
                >
                  <button
                    className="mt-0.5 shrink-0"
                    onClick={() => {
                      if (milestone.completed) {
                        onUncompleteMilestone(goal._id, milestone.id);
                      } else {
                        onCompleteMilestone(goal._id, milestone.id);
                      }
                    }}
                    type="button"
                  >
                    <CheckCircle
                      className={`h-5 w-5 ${
                        milestone.completed
                          ? "fill-green-500 text-green-500"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    {editingMilestoneId === milestone.id ? (
                      <div className="flex gap-2">
                        <Input
                          className="h-8 text-sm"
                          onChange={(e) =>
                            setEditingMilestoneText(e.target.value)
                          }
                          value={editingMilestoneText}
                        />
                        <Button
                          onClick={() => {
                            onUpdateMilestone(
                              goal._id,
                              milestone.id,
                              editingMilestoneText
                            );
                            setEditingMilestoneId(null);
                          }}
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingMilestoneId(null)}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p
                        className={`text-sm ${
                          milestone.completed
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {milestone.description}
                      </p>
                    )}
                    {milestone.completedDate && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        Completed:{" "}
                        {new Date(milestone.completedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingMilestoneId(milestone.id);
                          setEditingMilestoneText(milestone.description);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() =>
                          onDeleteMilestone(goal._id, milestone.id)
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No milestones yet. Add one below.
              </p>
            )}
          </div>

          {/* Add new milestone (write access only) */}
          {canWrite && (
            <div className="mt-3 flex gap-2">
              <Input
                onChange={(e) => onMilestoneTextChange(e.target.value)}
                placeholder="Add a milestone..."
                value={newMilestoneText}
              />
              <Button
                disabled={!newMilestoneText.trim()}
                onClick={() => onAddMilestone(goal._id)}
                size="sm"
              >
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Linked Skills */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Linked Skills</h3>
            {canWrite && (
              <Button
                onClick={() => setShowSkillPicker(!showSkillPicker)}
                size="sm"
                variant="outline"
              >
                <Link2 className="mr-1 h-3 w-3" />
                {showSkillPicker ? "Cancel" : "Edit Skills"}
              </Button>
            )}
          </div>
          {showSkillPicker ? (
            <div className="space-y-2">
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-gray-50 p-3">
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

        {/* Coach Notes (read-only for coach-set goals) */}
        {goal.coachNotes && (
          <div>
            <h3 className="mb-2 font-bold">Coach Notes</h3>
            <p className="text-muted-foreground">{goal.coachNotes}</p>
          </div>
        )}

        {/* Parent Actions */}
        {goal.parentActions && goal.parentActions.length > 0 && (
          <div>
            <h3 className="mb-2 font-bold">Support Actions</h3>
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

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {canWrite && (
            <Button onClick={onEdit} variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Goal
            </Button>
          )}
          {canWrite && (
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
                  <Undo2 className="mr-2 h-4 w-4" />
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
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(goal._id, "on_hold")}
                >
                  On Hold
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canWrite && (
            <Button onClick={() => onDelete(goal._id)} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Goal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Goal Dialog — no player selection, auto-selects from player's own passports
function CreateGoalDialog({
  open,
  onClose,
  passports,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  passports: Array<{
    _id: Id<"sportPassports">;
    sportCode: string;
    status: string;
  }>;
  onSubmit: (data: {
    passportId: Id<"sportPassports">;
    title: string;
    description: string;
    category: "technical" | "tactical" | "physical" | "mental" | "social";
    priority: "high" | "medium" | "low";
    targetDate?: string;
    parentCanView?: boolean;
  }) => Promise<void>;
}) {
  const [passportId, setPassportId] = useState<string>(
    passports.length === 1 ? passports[0]._id : ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("technical");
  const [priority, setPriority] = useState<string>("medium");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-select if only one passport
  useEffect(() => {
    if (passports.length === 1) {
      setPassportId(passports[0]._id);
    }
  }, [passports]);

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
        parentCanView: true,
      });
      setPassportId(passports.length === 1 ? passports[0]._id : "");
      setTitle("");
      setDescription("");
      setCategory("technical");
      setPriority("medium");
      setTargetDate("");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSportName = (code: string) =>
    code.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Personal Goal</DialogTitle>
          <DialogDescription>
            Set a new development goal for yourself
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sport/Passport selection — only shown if multi-sport */}
          {passports.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="passport">Sport *</Label>
              <Select onValueChange={setPassportId} value={passportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {passports.map((passport) => (
                    <SelectItem key={passport._id} value={passport._id}>
                      {formatSportName(passport.sportCode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {passports.length === 1 && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
              Sport:{" "}
              <span className="font-medium text-foreground">
                {formatSportName(passports[0].sportCode)}
              </span>
            </div>
          )}

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
              placeholder="Describe the goal and what success looks like..."
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
  goal: GoalWithSource;
  onSubmit: (data: {
    title?: string;
    description?: string;
    priority?: "high" | "medium" | "low";
    targetDate?: string;
    parentCanView?: boolean;
    coachNotes?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [priority, setPriority] = useState<string>(goal.priority);
  const [targetDate, setTargetDate] = useState(goal.targetDate || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!(title && description)) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        priority: priority as "high" | "medium" | "low",
        targetDate: targetDate || undefined,
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
          <DialogDescription>Update your goal details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Goal Title *</Label>
            <Input
              id="edit-title"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              value={description}
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="edit-targetDate">Target Date</Label>
            <Input
              id="edit-targetDate"
              onChange={(e) => setTargetDate(e.target.value)}
              type="date"
              value={targetDate}
            />
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
