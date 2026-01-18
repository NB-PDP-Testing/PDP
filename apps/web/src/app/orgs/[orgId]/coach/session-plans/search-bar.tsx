"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterModal } from "./filter-modal";
import type { AvailableFilters, FilterState } from "./filter-sidebar";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  resultsCount?: number;
  placeholder?: string;
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  availableFilters?: AvailableFilters;
  planCount?: number;
};

/**
 * Debounced search bar component for session plans
 * - 300ms debounce to prevent excessive queries
 * - Loading indicator while searching
 * - Clear button (X) when search has text
 * - Results count displayed
 * - Filter modal button (optional)
 */
export function SearchBar({
  value,
  onChange,
  isSearching = false,
  resultsCount,
  placeholder = "Search session plans...",
  filters,
  onFilterChange,
  availableFilters,
  planCount,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce: update parent value after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync local value if parent value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
          <Input
            className="border-2 border-gray-200 pr-20 pl-9 transition-all focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20"
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            type="text"
            value={localValue}
          />
          <div className="-translate-y-1/2 absolute top-1/2 right-2 flex items-center gap-2">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-[#667eea]" />
            )}
            {localValue && (
              <Button
                aria-label="Clear search"
                className="h-6 w-6 p-0"
                onClick={handleClear}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {filters &&
          onFilterChange &&
          availableFilters &&
          planCount !== undefined && (
            <FilterModal
              availableFilters={availableFilters}
              filters={filters}
              onFilterChange={onFilterChange}
              planCount={planCount}
            />
          )}
      </div>
      {resultsCount !== undefined && localValue && (
        <p className="mt-1 text-muted-foreground text-sm">
          {resultsCount} {resultsCount === 1 ? "result" : "results"} found
        </p>
      )}
    </div>
  );
}
