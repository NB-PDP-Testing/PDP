"use client";

import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type FilterState = {
  search: string;
  ageGroups: string[];
  sports: string[];
  intensities: Array<"low" | "medium" | "high">;
  skills: string[];
  categories: string[];
  minDuration?: number;
  maxDuration?: number;
  minSuccessRate?: number;
  favoriteOnly: boolean;
  templateOnly: boolean;
};

export type AvailableFilters = {
  ageGroups: Array<{ value: string; count: number }>;
  sports: Array<{ value: string; count: number }>;
  categories: Array<{ value: string; count: number }>;
  skills: Array<{ value: string; count: number }>;
};

type FilterSidebarProps = {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableFilters: AvailableFilters;
};

export function FilterSidebar({
  filters,
  onFilterChange,
  availableFilters,
}: FilterSidebarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.ageGroups.length > 0 ||
    filters.sports.length > 0 ||
    filters.intensities.length > 0 ||
    filters.skills.length > 0 ||
    filters.categories.length > 0 ||
    filters.favoriteOnly ||
    filters.templateOnly;

  const clearAllFilters = () => {
    onFilterChange({
      search: "",
      ageGroups: [],
      sports: [],
      intensities: [],
      skills: [],
      categories: [],
      favoriteOnly: false,
      templateOnly: false,
    });
  };

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

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            <h2 className="font-semibold text-lg">Filters</h2>
          </div>
          {hasActiveFilters && (
            <Button
              className="h-7 text-xs"
              onClick={clearAllFilters}
              size="sm"
              variant="ghost"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-8 pl-9"
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            placeholder="Search plans..."
            value={filters.search}
          />
          {filters.search && (
            <button
              className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
              onClick={() => onFilterChange({ ...filters, search: "" })}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filters */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Quick Filters */}
          <div className="space-y-3">
            <Label className="font-medium text-sm">Quick Filters</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={filters.favoriteOnly}
                id="favorites"
                onCheckedChange={(checked) =>
                  onFilterChange({
                    ...filters,
                    favoriteOnly: checked === true,
                  })
                }
              />
              <label
                className="flex cursor-pointer items-center gap-1.5 font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="favorites"
              >
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                Favorites
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={filters.templateOnly}
                id="templates"
                onCheckedChange={(checked) =>
                  onFilterChange({
                    ...filters,
                    templateOnly: checked === true,
                  })
                }
              />
              <label
                className="cursor-pointer font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="templates"
              >
                Templates Only
              </label>
            </div>
          </div>

          <Separator />

          {/* Age Groups */}
          {availableFilters.ageGroups.length > 0 && (
            <>
              <div className="space-y-3">
                <Label className="font-medium text-sm">Age Groups</Label>
                {availableFilters.ageGroups.map(({ value, count }) => (
                  <div className="flex items-center space-x-2" key={value}>
                    <Checkbox
                      checked={filters.ageGroups.includes(value)}
                      id={`age-${value}`}
                      onCheckedChange={() =>
                        toggleArrayFilter("ageGroups", value)
                      }
                    />
                    <label
                      className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor={`age-${value}`}
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

          {/* Sports */}
          {availableFilters.sports.length > 0 && (
            <>
              <div className="space-y-3">
                <Label className="font-medium text-sm">Sports</Label>
                {availableFilters.sports.map(({ value, count }) => (
                  <div className="flex items-center space-x-2" key={value}>
                    <Checkbox
                      checked={filters.sports.includes(value)}
                      id={`sport-${value}`}
                      onCheckedChange={() => toggleArrayFilter("sports", value)}
                    />
                    <label
                      className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor={`sport-${value}`}
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
            {(["low", "medium", "high"] as const).map((intensity) => (
              <div className="flex items-center space-x-2" key={intensity}>
                <Checkbox
                  checked={filters.intensities.includes(intensity)}
                  id={`intensity-${intensity}`}
                  onCheckedChange={() =>
                    toggleArrayFilter("intensities", intensity)
                  }
                />
                <label
                  className="cursor-pointer font-normal text-sm capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor={`intensity-${intensity}`}
                >
                  {intensity}
                </label>
              </div>
            ))}
          </div>

          <Separator />

          {/* Categories */}
          {availableFilters.categories.length > 0 && (
            <>
              <div className="space-y-3">
                <Label className="font-medium text-sm">Categories</Label>
                {availableFilters.categories.map(({ value, count }) => (
                  <div className="flex items-center space-x-2" key={value}>
                    <Checkbox
                      checked={filters.categories.includes(value)}
                      id={`category-${value}`}
                      onCheckedChange={() =>
                        toggleArrayFilter("categories", value)
                      }
                    />
                    <label
                      className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor={`category-${value}`}
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

          {/* Skills */}
          {availableFilters.skills.length > 0 && (
            <div className="space-y-3">
              <Label className="font-medium text-sm">Skills</Label>
              {availableFilters.skills.slice(0, 20).map(({ value, count }) => (
                <div className="flex items-center space-x-2" key={value}>
                  <Checkbox
                    checked={filters.skills.includes(value)}
                    id={`skill-${value}`}
                    onCheckedChange={() => toggleArrayFilter("skills", value)}
                  />
                  <label
                    className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor={`skill-${value}`}
                  >
                    <span>{value}</span>
                    <Badge className="ml-2" variant="secondary">
                      {count}
                    </Badge>
                  </label>
                </div>
              ))}
              {availableFilters.skills.length > 20 && (
                <p className="text-muted-foreground text-xs">
                  +{availableFilters.skills.length - 20} more skills
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
