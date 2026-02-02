"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { CheckSquare, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";

type StatusFilter = "all" | "open" | "in-progress" | "done";
type PriorityFilter = "all" | "high" | "medium" | "low";
type SortOption = "due-date" | "priority" | "created-date";

type TasksTabProps = {
  teamId: string;
  organizationId: string;
};

export function TasksTab({ teamId, organizationId }: TasksTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("due-date");
  const [_selectedTaskId, setSelectedTaskId] =
    useState<Id<"coachTasks"> | null>(null);

  const tasks = useQuery(api.models.teams.getTeamTasks, {
    teamId,
    organizationId,
  });

  // Extract available assignees from tasks
  const availableAssignees = useMemo(() => {
    if (!tasks) {
      return [];
    }
    const assignees = new Map<string, string>();
    for (const task of tasks) {
      if (task.assignedToUserId && task.assignedToName) {
        assignees.set(task.assignedToUserId, task.assignedToName);
      }
    }
    return Array.from(assignees.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) {
      return [];
    }

    const matchesStatus =
      statusFilter === "all"
        ? () => true
        : (t: (typeof tasks)[number]) => t.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all"
        ? () => true
        : (t: (typeof tasks)[number]) => t.priority === priorityFilter;

    const matchesAssignee =
      assigneeFilter === "all"
        ? () => true
        : (t: (typeof tasks)[number]) => t.assignedToUserId === assigneeFilter;

    const matchesSearch = searchQuery.trim()
      ? (t: (typeof tasks)[number]) =>
          t.text.toLowerCase().includes(searchQuery.toLowerCase())
      : () => true;

    const result = tasks.filter(
      (t) =>
        matchesStatus(t) &&
        matchesPriority(t) &&
        matchesAssignee(t) &&
        matchesSearch(t)
    );

    // Sort
    const sortFunctions = {
      "due-date": (a: (typeof tasks)[number], b: (typeof tasks)[number]) => {
        if (!a.dueDate) {
          return 1;
        }
        if (!b.dueDate) {
          return -1;
        }
        return a.dueDate - b.dueDate;
      },
      priority: (a: (typeof tasks)[number], b: (typeof tasks)[number]) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = a.priority || "medium";
        const bPriority = b.priority || "medium";
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      },
      "created-date": (a: (typeof tasks)[number], b: (typeof tasks)[number]) =>
        b.createdAt - a.createdAt,
    };

    result.sort(sortFunctions[sortBy]);
    return result;
  }, [
    tasks,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    searchQuery,
    sortBy,
  ]);

  // Loading state
  if (!tasks) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 max-w-sm flex-1" />
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[140px]" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
            <Skeleton className="h-32 w-full" key={key} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state (no tasks for team)
  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Tasks</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
        <Empty>
          <EmptyMedia>
            <CheckSquare className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No Tasks Created</EmptyTitle>
            <EmptyDescription>
              Create your first task to start tracking team to-dos and
              assignments.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Tasks</h3>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters
        assigneeFilter={assigneeFilter}
        availableAssignees={availableAssignees}
        onAssigneeFilterChange={setAssigneeFilter}
        onPriorityFilterChange={setPriorityFilter}
        onSearchQueryChange={setSearchQuery}
        onSortByChange={setSortBy}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        statusFilter={statusFilter}
      />

      {/* Task Grid */}
      {filteredTasks.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <CheckSquare className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No Tasks Match Filters</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or search query to find tasks.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              assignedToName={task.assignedToName}
              dueDate={task.dueDate}
              key={task._id}
              onTaskClick={setSelectedTaskId}
              playerName={task.playerName}
              priority={task.priority}
              status={task.status}
              taskId={task._id}
              text={task.text}
              voiceNoteId={task.voiceNoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
