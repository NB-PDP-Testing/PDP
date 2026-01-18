"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { AvailableFilters, FilterState } from "./filter-sidebar";

type FilterModalProps = {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableFilters: AvailableFilters;
  planCount: number;
};

export function FilterModal({
  filters,
  onFilterChange,
  availableFilters,
  planCount,
}: FilterModalProps) {
  const [open, setOpen] = useState(false);

  // Instant apply - check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.ageGroups.length > 0 ||
    filters.sports.length > 0 ||
    filters.intensities.length > 0 ||
    filters.skills.length > 0 ||
    filters.categories.length > 0 ||
    filters.favoriteOnly ||
    filters.featuredOnly ||
    filters.templateOnly ||
    (filters.minDuration !== undefined && filters.minDuration !== 30) ||
    (filters.maxDuration !== undefined && filters.maxDuration !== 120) ||
    filters.minSuccessRate !== undefined;

  // Instant apply: clear all filters immediately
  const clearAllFilters = () => {
    onFilterChange({
      search: filters.search, // Keep search term
      ageGroups: [],
      sports: [],
      intensities: [],
      skills: [],
      categories: [],
      favoriteOnly: false,
      featuredOnly: false,
      templateOnly: false,
      minDuration: undefined,
      maxDuration: undefined,
      minSuccessRate: undefined,
    });
  };

  // Instant apply: toggle array filter and apply immediately
  const toggleArrayFilter = (
    key: keyof Pick<
      FilterState,
      "ageGroups" | "sports" | "intensities" | "skills" | "categories"
    >,
    value: string
  ) => {
    const currentValues = filters[key] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onFilterChange({ ...filters, [key]: newValues });
  };

  // Instant apply: update filter and apply immediately
  const updateFilter = (updates: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...updates });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="border-2 border-gray-200 bg-white text-gray-700 transition-all hover:border-[#667eea] hover:bg-[#667eea] hover:text-white"
          size="sm"
          variant="outline"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge className="ml-2 bg-[#667eea] text-white" variant="secondary">
              Active
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-full max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden p-0 max-sm:rounded-none max-sm:border-0 sm:h-[80vh] sm:max-w-2xl sm:rounded-lg">
        <DialogHeader className="sticky top-0 z-10 shrink-0 border-b bg-background p-4 sm:p-6 sm:pb-4">
          <div className="flex items-start gap-2">
            {/* Close button */}
            <Button
              aria-label="Close filters"
              className="h-8 w-8 shrink-0 sm:order-last sm:h-9 sm:w-9"
              onClick={() => setOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filter Plans
              </DialogTitle>
              <DialogDescription>
                Select filters to narrow down your session plans
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Filters */}
        <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            {/* Age Groups */}
            {availableFilters.ageGroups.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium text-sm">Age Groups</Label>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {availableFilters.ageGroups.map(({ value, count }) => (
                      <div className="flex items-center space-x-2" key={value}>
                        <Checkbox
                          checked={filters.ageGroups.includes(value)}
                          id={`age-modal-${value}`}
                          onCheckedChange={() =>
                            toggleArrayFilter("ageGroups", value)
                          }
                        />
                        <label
                          className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          htmlFor={`age-modal-${value}`}
                        >
                          <span>{value}</span>
                          <Badge className="ml-auto" variant="secondary">
                            {count}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Sports */}
            {availableFilters.sports.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium text-sm">Sports</Label>
                  {availableFilters.sports.map(({ value, count }) => (
                    <div className="flex items-center space-x-2" key={value}>
                      <Checkbox
                        checked={filters.sports.includes(value)}
                        id={`sport-modal-${value}`}
                        onCheckedChange={() =>
                          toggleArrayFilter("sports", value)
                        }
                      />
                      <label
                        className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        htmlFor={`sport-modal-${value}`}
                      >
                        <span>{value}</span>
                        <Badge className="ml-2" variant="secondary">
                          {count}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Intensity */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Intensity</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "low",
                      label: "Low",
                      color:
                        "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
                    },
                    {
                      value: "medium",
                      label: "Medium",
                      color:
                        "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200",
                    },
                    {
                      value: "high",
                      label: "High",
                      color:
                        "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
                    },
                  ] as const
                ).map(({ value, label, color }) => {
                  const isSelected = filters.intensities.includes(value);
                  return (
                    <Button
                      className={isSelected ? color : ""}
                      key={value}
                      onClick={() => {
                        // Single-select: clear all other intensities
                        updateFilter({
                          intensities: isSelected ? [] : [value],
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Duration */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Duration (minutes)</Label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map((duration) => {
                  const isSelected =
                    filters.minDuration === duration &&
                    filters.maxDuration === duration;
                  return (
                    <Button
                      className={
                        isSelected ? "bg-primary text-primary-foreground" : ""
                      }
                      key={duration}
                      onClick={() => {
                        if (isSelected) {
                          // Deselect
                          updateFilter({
                            minDuration: undefined,
                            maxDuration: undefined,
                          });
                        } else {
                          // Select this duration
                          updateFilter({
                            minDuration: duration,
                            maxDuration: duration,
                          });
                        }
                      }}
                      size="sm"
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                    >
                      {duration} min
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Focus Areas (Skills) */}
            {availableFilters.skills.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium text-sm">Focus Areas</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableFilters.skills
                      .slice(0, 20)
                      .map(({ value, count }) => {
                        const isSelected = filters.skills.includes(value);
                        return (
                          <Button
                            className="h-8"
                            key={value}
                            onClick={() => toggleArrayFilter("skills", value)}
                            size="sm"
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                          >
                            {value}
                            <Badge
                              className="ml-1.5"
                              variant={isSelected ? "outline" : "secondary"}
                            >
                              {count}
                            </Badge>
                          </Button>
                        );
                      })}
                  </div>
                  {availableFilters.skills.length > 20 && (
                    <p className="text-muted-foreground text-xs">
                      +{availableFilters.skills.length - 20} more skills
                    </p>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Categories */}
            {availableFilters.categories.length > 0 && (
              <div className="space-y-3">
                <Label className="font-medium text-sm">Categories</Label>
                {availableFilters.categories.map(({ value, count }) => (
                  <div className="flex items-center space-x-2" key={value}>
                    <Checkbox
                      checked={filters.categories.includes(value)}
                      id={`category-modal-${value}`}
                      onCheckedChange={() =>
                        toggleArrayFilter("categories", value)
                      }
                    />
                    <label
                      className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor={`category-modal-${value}`}
                    >
                      <span>{value}</span>
                      <Badge className="ml-2" variant="secondary">
                        {count}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer: Clear All + Result Count (no Apply button - instant apply) */}
        <DialogFooter className="mt-auto shrink-0 flex-row items-center justify-between gap-3 border-t bg-background p-4 pb-safe sm:p-6 sm:pt-4 sm:pb-4">
          <Button
            disabled={!hasActiveFilters}
            onClick={clearAllFilters}
            variant="outline"
          >
            Clear All
          </Button>
          <span className="text-muted-foreground text-sm">
            {planCount} plan{planCount !== 1 ? "s" : ""}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
