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

type StatusFilter = "all" | "active" | "injured" | "on-break";
type SortOption = "name-asc" | "jersey-asc" | "position";

type PlayerFiltersProps = {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  positionFilter: string;
  onPositionFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  availablePositions: string[];
};

/**
 * Filter controls for Players Tab
 * - Status tabs: All, Active, Injured, On Break
 * - Position dropdown
 * - Search input
 * - Sort dropdown
 */
export function PlayerFilters({
  statusFilter,
  onStatusFilterChange,
  positionFilter,
  onPositionFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  availablePositions,
}: PlayerFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <Tabs
        onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
        value={statusFilter}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="injured">Injured</TabsTrigger>
          <TabsTrigger value="on-break">On Break</TabsTrigger>
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
            placeholder="Search by name..."
            type="text"
            value={searchQuery}
          />
        </div>

        {/* Position and Sort Filters */}
        <div className="flex gap-2">
          {/* Position Filter */}
          <Select onValueChange={onPositionFilterChange} value={positionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {availablePositions.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
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
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="jersey-asc">Jersey #</SelectItem>
              <SelectItem value="position">Position</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
