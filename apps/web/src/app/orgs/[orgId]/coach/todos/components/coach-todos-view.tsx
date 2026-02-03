"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Mic,
  Plus,
  Target,
  User,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

type CoachTodosViewProps = {
  orgId: string;
};

// Task type from the API
type Task = {
  _id: Id<"coachTasks">;
  _creationTime: number;
  text: string;
  completed: boolean;
  organizationId: string;
  assignedToUserId: string;
  assignedToName?: string;
  createdByUserId: string;
  coachEmail?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  source: "manual" | "voice_note";
  voiceNoteId?: Id<"voiceNotes">;
  insightId?: string;
  playerIdentityId?: Id<"orgPlayerEnrollments">;
  playerName?: string;
  teamId?: string;
  createdAt: number;
  completedAt?: number;
};

export function CoachTodosView({ orgId }: CoachTodosViewProps) {
  const { data: session } = authClient.useSession();
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("me");

  // Get current user ID and name
  const userId = session?.user?.id;
  const userName = session?.user?.name;

  // Task mutations
  const createTask = useMutation(api.models.coachTasks.createTask);
  const toggleTask = useMutation(api.models.coachTasks.toggleTask);
  const deleteTask = useMutation(api.models.coachTasks.deleteTask);

  // Get coach's personal tasks using new user-based query
  const myTasks = useQuery(
    api.models.coachTasks.getTasksForUser,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get coach assignments with enriched team data (Pattern B)
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get fellow coaches who share teams with current coach
  const fellowCoaches = useQuery(
    api.models.coaches.getFellowCoachesForTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get coach's team IDs (Pattern B - already resolved server-side)
  const coachTeamIds = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    return coachAssignments.teams.map((team) => team.teamId);
  }, [coachAssignments?.teams]);

  // Get all tasks for the org and filter to team tasks client-side
  // This avoids the hooks-in-loop issue while still getting team tasks
  const allOrgTasks = useQuery(
    api.models.coachTasks.getTasksForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Filter to team tasks (tasks that have a teamId matching one of coach's teams)
  const teamTasks = useMemo(() => {
    if (!allOrgTasks || coachTeamIds.length === 0) {
      return [];
    }
    const teamIdSet = new Set(coachTeamIds);
    return (allOrgTasks as Task[]).filter(
      (task) => task.teamId && teamIdSet.has(task.teamId)
    );
  }, [allOrgTasks, coachTeamIds]);

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
  // Performance: Uses getPlayersForCoachTeams for server-side filtering
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId ? { organizationId: orgId, coachUserId: userId } : "skip"
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

  // Calculate players needing review
  const playersNeedingReview = useMemo(
    () =>
      coachPlayers.filter(
        (player: any) =>
          player.reviewStatus === "Overdue" ||
          !player.reviewStatus ||
          !player.lastReviewDate
      ),
    [coachPlayers]
  );

  // Handler functions
  const handleAddTask = async () => {
    if (!(newTaskText.trim() && userId)) {
      return;
    }

    // Determine assignee based on selection
    let assigneeUserId = userId;
    let assigneeName = userName || undefined;
    let teamId: string | undefined;

    if (selectedAssignee !== "me") {
      const selectedCoach = fellowCoaches?.find(
        (c) => c.userId === selectedAssignee
      );
      if (selectedCoach) {
        assigneeUserId = selectedCoach.userId;
        assigneeName = selectedCoach.userName;
        // If assigning to another coach, make it a team task on the first shared team
        teamId = coachTeamIds[0];
      }
    }

    try {
      await createTask({
        text: newTaskText.trim(),
        organizationId: orgId,
        assignedToUserId: assigneeUserId,
        assignedToName: assigneeName,
        createdByUserId: userId,
        actorName: userName || "Unknown",
        teamId,
        // Include legacy email for backward compatibility
        coachEmail: session?.user?.email || undefined,
      });
      setNewTaskText("");
      setSelectedAssignee("me");
      setIsAddingTask(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleToggleTask = async (
    taskId: Id<"coachTasks">,
    completed: boolean
  ) => {
    try {
      await toggleTask({ taskId, completed });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleDeleteTask = async (taskId: Id<"coachTasks">) => {
    try {
      await deleteTask({ taskId });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Show loading state
  if (!userId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Separate completed and pending tasks for my tasks
  const myPendingTasks =
    (myTasks as Task[] | undefined)?.filter((task) => !task.completed) || [];
  const myCompletedTasks =
    (myTasks as Task[] | undefined)?.filter((task) => task.completed) || [];

  // Separate completed and pending tasks for team tasks
  const teamPendingTasks = teamTasks.filter((task) => !task.completed);
  const teamCompletedTasks = teamTasks.filter((task) => task.completed);

  const totalActionItems =
    playersNeedingReview.length + activeGoals.length + activeInjuries.length;

  // Task item component with source badge
  const TaskItem = ({
    task,
    showAssignee = false,
  }: {
    task: Task;
    showAssignee?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        task.completed ? "bg-gray-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          className={`flex h-5 w-5 items-center justify-center rounded border ${
            task.completed
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
          }`}
          onClick={() => handleToggleTask(task._id, !task.completed)}
        >
          {task.completed && (
            <CheckCircle2 className="text-green-600" size={16} />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={
                task.completed ? "text-gray-500 line-through" : "text-gray-900"
              }
            >
              {task.text}
            </span>
            {/* Source badge */}
            {task.source === "voice_note" && (
              <Badge
                className="h-5 gap-1 bg-purple-100 text-purple-700"
                variant="secondary"
              >
                <Mic className="h-3 w-3" />
                Voice
              </Badge>
            )}
            {/* Priority badge */}
            {task.priority && (
              <Badge
                className={`h-5 ${
                  task.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                }`}
                variant="secondary"
              >
                {task.priority}
              </Badge>
            )}
          </div>
          {/* Player link */}
          {task.playerName && (
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <User className="h-3 w-3" />
              {task.playerName}
            </div>
          )}
          {/* Assignee (for team tasks) */}
          {showAssignee && task.assignedToName && (
            <div className="flex items-center gap-1 text-blue-600 text-xs">
              <Users className="h-3 w-3" />
              Assigned to: {task.assignedToName}
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={() => handleDeleteTask(task._id)}
        size="sm"
        variant="ghost"
      >
        <X className="h-4 w-4 text-gray-400" />
      </Button>
    </div>
  );

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

      {/* Task List with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="text-blue-600" size={20} />
              <CardTitle>Task List</CardTitle>
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
            Personal and team tasks for coaching activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Task Form */}
          {isAddingTask && (
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskText.trim()) {
                      handleAddTask();
                    } else if (e.key === "Escape") {
                      setIsAddingTask(false);
                      setNewTaskText("");
                      setSelectedAssignee("me");
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
                    setSelectedAssignee("me");
                  }}
                  size="sm"
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Assignee selector */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Assign to:</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  value={selectedAssignee}
                >
                  <option value="me">Me ({userName || "Me"})</option>
                  {fellowCoaches?.map((coach) => (
                    <option key={coach.userId} value={coach.userId}>
                      {coach.userName}
                    </option>
                  ))}
                </select>
                {selectedAssignee !== "me" && (
                  <span className="text-blue-600 text-xs">→ Team task</span>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            defaultValue="my-tasks"
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger className="flex-1 sm:flex-none" value="my-tasks">
                My Tasks
                {myPendingTasks.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {myPendingTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger className="flex-1 sm:flex-none" value="team-tasks">
                Team Tasks
                {teamPendingTasks.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {teamPendingTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* My Tasks Tab */}
            <TabsContent className="mt-0" value="my-tasks">
              <div className="space-y-2">
                {/* Pending Tasks */}
                {myPendingTasks.map((task) => (
                  <TaskItem key={task._id} task={task} />
                ))}

                {/* Completed Tasks */}
                {myCompletedTasks.length > 0 && (
                  <>
                    {myPendingTasks.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="mb-2 font-medium text-gray-500 text-sm">
                          Completed
                        </p>
                      </div>
                    )}
                    {myCompletedTasks.map((task) => (
                      <TaskItem key={task._id} task={task} />
                    ))}
                  </>
                )}

                {/* Empty State */}
                {myPendingTasks.length === 0 &&
                  myCompletedTasks.length === 0 && (
                    <div className="rounded-lg border p-3 text-center text-gray-500 text-sm">
                      No personal tasks yet. Click "Add Task" to create your
                      first to-do item.
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* Team Tasks Tab */}
            <TabsContent className="mt-0" value="team-tasks">
              <div className="space-y-2">
                {/* Pending Tasks */}
                {teamPendingTasks.map((task) => (
                  <TaskItem key={task._id} showAssignee task={task} />
                ))}

                {/* Completed Tasks */}
                {teamCompletedTasks.length > 0 && (
                  <>
                    {teamPendingTasks.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="mb-2 font-medium text-gray-500 text-sm">
                          Completed
                        </p>
                      </div>
                    )}
                    {teamCompletedTasks.map((task) => (
                      <TaskItem key={task._id} showAssignee task={task} />
                    ))}
                  </>
                )}

                {/* Empty State */}
                {teamPendingTasks.length === 0 &&
                  teamCompletedTasks.length === 0 && (
                    <div className="rounded-lg border p-3 text-center text-gray-500 text-sm">
                      {coachTeamIds.length === 0
                        ? "No team assignments found. Team tasks will appear here once you're assigned to a team."
                        : "No team tasks yet. Team tasks are created when voice note TODOs are assigned to the team."}
                    </div>
                  )}
              </div>
            </TabsContent>
          </Tabs>
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
