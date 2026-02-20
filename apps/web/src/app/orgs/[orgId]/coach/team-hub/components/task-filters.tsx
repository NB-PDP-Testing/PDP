"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "all" | "open" | "in-progress" | "done";
type PriorityFilter = "all" | "high" | "medium" | "low";
type SortOption = "due-date" | "priority" | "created-date";

type TaskFiltersProps = {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  availableAssignees: Array<{ id: string; name: string }>;
};

/**
 * Filter controls for Tasks Tab
 * - Status tabs: All, Open, In Progress, Done
 * - Priority dropdown: All, High, Medium, Low
 * - Assignee dropdown
 * - Search input
 * - Sort dropdown: Due Date, Priority, Created Date
 */
export function TaskFilters({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  availableAssignees,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <Tabs
        onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
        value={statusFilter}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative max-w-sm flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search tasks..."
            type="text"
            value={searchQuery}
          />
        </div>

        {/* Priority, Assignee, and Sort Filters */}
        <div className="flex gap-2">
          {/* Priority Filter */}
          <Select
            onValueChange={(v) => onPriorityFilterChange(v as PriorityFilter)}
            value={priorityFilter}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter */}
          <Select onValueChange={onAssigneeFilterChange} value={assigneeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {availableAssignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            onValueChange={(v) => onSortByChange(v as SortOption)}
            value={sortBy}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due-date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created-date">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
