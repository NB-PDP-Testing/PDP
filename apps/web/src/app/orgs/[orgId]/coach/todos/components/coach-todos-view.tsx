"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Plus,
  Target,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type CoachTodosViewProps = {
  orgId: string;
};

export function CoachTodosView({ orgId }: CoachTodosViewProps) {
  const { data: session } = authClient.useSession();
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Get current user ID
  const userId = session?.user?.id;

  // Task mutations
  const createTask = useMutation(api.models.coachTasks.createTask);
  const toggleTask = useMutation(api.models.coachTasks.toggleTask);
  const deleteTask = useMutation(api.models.coachTasks.deleteTask);

  // Get coach's tasks
  const tasks = useQuery(
    api.models.coachTasks.getTasksForCoach,
    orgId && session?.user?.email
      ? { coachEmail: session.user.email, organizationId: orgId }
      : "skip"
  );

  // Get coach assignments
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignments,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get all teams in org
  const teams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get coach's team IDs
  // Note: Some coach assignments may have team names instead of IDs (legacy data)
  // We need to handle both cases
  const coachTeamIds = useMemo(() => {
    if (!(coachAssignments && teams)) {
      return [];
    }
    const assignmentTeams = coachAssignments.teams || [];

    // Create maps for both ID and name lookup
    const teamIdSet = new Set(teams.map((t: any) => t._id));
    const teamNameToId = new Map(teams.map((t: any) => [t.name, t._id]));

    // Convert assignment values to team IDs (handles both ID and name formats)
    const resolvedIds = assignmentTeams
      .map((value: string) => {
        // If it's already a valid team ID, use it
        if (teamIdSet.has(value)) {
          return value;
        }
        // Otherwise, try to look up by name
        const idFromName = teamNameToId.get(value);
        if (idFromName) {
          console.log(
            `[coach-todos] Resolved team name "${value}" to ID "${idFromName}"`
          );
          return idFromName;
        }
        console.warn(`[coach-todos] Could not resolve team: "${value}"`);
        return null;
      })
      .filter((id: string | null): id is string => id !== null);

    // Deduplicate
    return Array.from(new Set(resolvedIds));
  }, [coachAssignments, teams]);

  // Get team-player links for coach's teams
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId && coachTeamIds.length > 0
      ? { organizationId: orgId, status: "active" }
      : "skip"
  );

  // Filter to only coach's players
  const coachTeamPlayerLinks = useMemo(() => {
    if (!teamPlayerLinks || coachTeamIds.length === 0) {
      return [];
    }
    return teamPlayerLinks.filter((link: any) =>
      coachTeamIds.includes(link.teamId)
    );
  }, [teamPlayerLinks, coachTeamIds]);

  // Get unique player IDs
  const coachPlayerIds = useMemo(
    () =>
      new Set(
        coachTeamPlayerLinks.map((link: any) =>
          link.playerIdentityId.toString()
        )
      ),
    [coachTeamPlayerLinks]
  );

  // Get all players (raw data from backend)
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Transform to legacy format with review status
  const allPlayers = useMemo(() => {
    if (!enrolledPlayersData) {
      return [];
    }
    return enrolledPlayersData.map(
      ({ enrollment, player, sportCode }: any) => ({
        _id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        ageGroup: enrollment.ageGroup,
        gender: player.gender,
        sport: sportCode || "Not assigned",
        dateOfBirth: player.dateOfBirth,
        lastReviewDate: enrollment.lastReviewDate,
        reviewStatus: enrollment.reviewStatus,
        coachNotes: enrollment.coachNotes,
        enrollmentId: enrollment._id,
        enrollmentStatus: enrollment.status,
      })
    );
  }, [enrolledPlayersData]);

  // Filter to coach's players
  const coachPlayers = useMemo(() => {
    if (!allPlayers || coachPlayerIds.size === 0) {
      return [];
    }
    return allPlayers.filter((player: any) =>
      coachPlayerIds.has(player._id.toString())
    );
  }, [allPlayers, coachPlayerIds]);

  // Get development goals for coach's players
  const allGoals = useQuery(
    api.models.passportGoals.getGoalsForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Filter to coach's players' goals that are active/in progress
  const activeGoals = useMemo(() => {
    if (!allGoals) {
      return [];
    }
    return allGoals.filter(
      (goal: any) =>
        coachPlayerIds.has(goal.playerIdentityId?.toString()) &&
        goal.status === "active"
    );
  }, [allGoals, coachPlayerIds]);

  // Get injuries for coach's players
  const allInjuries = useQuery(
    api.models.playerInjuries.getAllActiveInjuriesForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Filter to active injuries for coach's players
  const activeInjuries = useMemo(() => {
    if (!allInjuries) {
      return [];
    }
    return allInjuries.filter(
      (injury: any) =>
        coachPlayerIds.has(injury.playerIdentityId?.toString()) &&
        injury.status === "active"
    );
  }, [allInjuries, coachPlayerIds]);

  // Calculate players needing review - matches coach dashboard logic
  const playersNeedingReview = useMemo(() => {
    return coachPlayers.filter((player: any) => {
      // Match dashboard logic: Overdue status OR no review status OR never reviewed
      return (
        player.reviewStatus === "Overdue" ||
        !player.reviewStatus ||
        !player.lastReviewDate
      );
    });
  }, [coachPlayers]);

  // Handler functions
  const handleAddTask = async () => {
    if (!(newTaskText.trim() && session?.user?.email)) {
      return;
    }

    try {
      await createTask({
        text: newTaskText.trim(),
        coachEmail: session.user.email,
        organizationId: orgId,
      });
      setNewTaskText("");
      setIsAddingTask(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleToggleTask = async (taskId: any, completed: boolean) => {
    try {
      await toggleTask({ taskId, completed });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    try {
      await deleteTask({ taskId });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Show loading state
  if (!session?.user?.email) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Separate completed and pending tasks
  const pendingTasks = tasks?.filter((task) => !task.completed) || [];
  const completedTasks = tasks?.filter((task) => task.completed) || [];

  const totalActionItems =
    playersNeedingReview.length + activeGoals.length + activeInjuries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl text-gray-900">Action Center</h1>
        <p className="text-gray-600 text-sm">
          Your coaching tasks, action items, and insights
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <AlertCircle className="text-orange-600" size={20} />
              <div className="text-center sm:text-left">
                <p className="text-gray-600 text-xs sm:text-sm">Action Items</p>
                <p className="font-bold text-xl sm:text-2xl">
                  {totalActionItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Clock className="text-blue-600" size={20} />
              <div className="text-center sm:text-left">
                <p className="text-gray-600 text-xs sm:text-sm">Reviews Due</p>
                <p className="font-bold text-xl sm:text-2xl">
                  {playersNeedingReview.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Target className="text-purple-600" size={20} />
              <div className="text-center sm:text-left">
                <p className="text-gray-600 text-xs sm:text-sm">Active Goals</p>
                <p className="font-bold text-xl sm:text-2xl">
                  {activeGoals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <div className="text-center sm:text-left">
                <p className="text-gray-600 text-xs sm:text-sm">
                  Active Injuries
                </p>
                <p className="font-bold text-xl sm:text-2xl">
                  {activeInjuries.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="text-blue-600" size={20} />
              <CardTitle>My Checklist</CardTitle>
            </div>
            <Button
              onClick={() => setIsAddingTask(!isAddingTask)}
              size="sm"
              variant="outline"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Task
            </Button>
          </div>
          <CardDescription>
            Track your personal coaching tasks and to-dos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Task Form */}
          {isAddingTask && (
            <div className="mb-4 flex gap-2">
              <Input
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskText.trim()) {
                    handleAddTask();
                  } else if (e.key === "Escape") {
                    setIsAddingTask(false);
                    setNewTaskText("");
                  }
                }}
                placeholder="Enter task description..."
                value={newTaskText}
              />
              <Button onClick={handleAddTask} size="sm">
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskText("");
                }}
                size="sm"
                variant="outline"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-2">
            {/* Pending Tasks */}
            {pendingTasks.map((task) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={task._id}
              >
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                    onClick={() => handleToggleTask(task._id, true)}
                  >
                    {task.completed && (
                      <CheckCircle2 className="text-blue-600" size={16} />
                    )}
                  </button>
                  <span className="text-gray-900">{task.text}</span>
                </div>
                <Button
                  onClick={() => handleDeleteTask(task._id)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            ))}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <>
                {pendingTasks.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 font-medium text-gray-500 text-sm">
                      Completed
                    </p>
                  </div>
                )}
                {completedTasks.map((task) => (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                    key={task._id}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        className="flex h-5 w-5 items-center justify-center rounded border border-green-500 bg-green-50"
                        onClick={() => handleToggleTask(task._id, false)}
                      >
                        <CheckCircle2 className="text-green-600" size={16} />
                      </button>
                      <span className="text-gray-500 line-through">
                        {task.text}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleDeleteTask(task._id)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                ))}
              </>
            )}

            {/* Empty State */}
            {pendingTasks.length === 0 && completedTasks.length === 0 && (
              <div className="rounded-lg border p-3 text-center text-gray-500 text-sm">
                No tasks yet. Click "Add Task" to create your first to-do item.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automated Insights - Players Needing Review */}
      {playersNeedingReview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-orange-600" size={20} />
              Players Needing Review
            </CardTitle>
            <CardDescription>
              Players overdue or coming up for performance review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playersNeedingReview.slice(0, 5).map((player: any) => {
                const neverReviewed = !player.lastReviewDate;
                const isOverdue = player.reviewStatus === "Overdue";

                return (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={player._id}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="text-gray-400" size={20} />
                      <div>
                        <p className="font-medium">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {neverReviewed
                            ? "Never reviewed"
                            : player.lastReviewDate
                              ? `Last reviewed ${new Date(player.lastReviewDate).toLocaleDateString()}`
                              : "No review date"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isOverdue ? "destructive" : "secondary"}>
                      {neverReviewed
                        ? "Never"
                        : isOverdue
                          ? "Overdue"
                          : "Needs Review"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Development Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="text-purple-600" size={20} />
              Active Development Goals
            </CardTitle>
            <CardDescription>
              Goals in progress that may need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGoals.slice(0, 5).map((goal: any) => {
                const player = coachPlayers.find(
                  (p: any) =>
                    p._id.toString() === goal.playerIdentityId?.toString()
                );

                return (
                  <div className="rounded-lg border p-4" key={goal._id}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{goal.title}</h3>
                        {player && (
                          <p className="mt-1 text-gray-600 text-sm">
                            {player.firstName} {player.lastName}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    {goal.targetDate && (
                      <p className="text-gray-500 text-sm">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Injuries */}
      {activeInjuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              Active Injuries
            </CardTitle>
            <CardDescription>
              Injuries requiring monitoring or return-to-play updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeInjuries.slice(0, 5).map((injury: any) => {
                const player = coachPlayers.find(
                  (p: any) =>
                    p._id.toString() === injury.playerIdentityId?.toString()
                );

                return (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-red-50 p-3"
                    key={injury._id}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-600" size={20} />
                      <div>
                        <p className="font-medium">
                          {player
                            ? `${player.firstName} ${player.lastName}`
                            : "Unknown Player"}
                        </p>
                        <p className="text-gray-600 text-sm">{injury.type}</p>
                      </div>
                    </div>
                    <Badge
                      className="border-red-300 text-red-700"
                      variant="outline"
                    >
                      {injury.severity || "Active"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalActionItems === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
            <p className="font-medium text-gray-900 text-lg">All Caught Up!</p>
            <p className="mt-2 text-gray-500 text-sm">
              No action items right now. Great work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
