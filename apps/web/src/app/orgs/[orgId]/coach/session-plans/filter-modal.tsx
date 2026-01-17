"use client";

import { SlidersHorizontal, Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local filters with parent filters when modal opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const hasActiveFilters =
    localFilters.search ||
    localFilters.ageGroups.length > 0 ||
    localFilters.sports.length > 0 ||
    localFilters.intensities.length > 0 ||
    localFilters.skills.length > 0 ||
    localFilters.categories.length > 0 ||
    localFilters.favoriteOnly ||
    localFilters.featuredOnly ||
    localFilters.templateOnly;

  const clearAllFilters = () => {
    setLocalFilters({
      search: "",
      ageGroups: [],
      sports: [],
      intensities: [],
      skills: [],
      categories: [],
      favoriteOnly: false,
      featuredOnly: false,
      templateOnly: false,
    });
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setOpen(false);
  };

  const toggleArrayFilter = (
    key: keyof Pick<
      FilterState,
      "ageGroups" | "sports" | "intensities" | "skills" | "categories"
    >,
    value: string
  ) => {
    const currentValues = localFilters[key] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setLocalFilters({ ...localFilters, [key]: newValues });
  };

  // Handle ESC key and backdrop click (Dialog component handles this automatically)
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl gap-0 p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filter Plans
          </DialogTitle>
          <DialogDescription>
            Narrow down your session plans by applying filters
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Filters */}
        <ScrollArea className="max-h-[calc(80vh-200px)] flex-1">
          <div className="space-y-6 p-6">
            {/* Quick Filters */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Quick Filters</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localFilters.favoriteOnly}
                  id="favorites-modal"
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      favoriteOnly: checked === true,
                    })
                  }
                />
                <label
                  className="flex cursor-pointer items-center gap-1.5 font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="favorites-modal"
                >
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  Favorites
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localFilters.featuredOnly}
                  id="featured-modal"
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      featuredOnly: checked === true,
                    })
                  }
                />
                <label
                  className="flex cursor-pointer items-center gap-1.5 font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="featured-modal"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Featured
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localFilters.templateOnly}
                  id="templates-modal"
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      templateOnly: checked === true,
                    })
                  }
                />
                <label
                  className="cursor-pointer font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="templates-modal"
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
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {availableFilters.ageGroups.map(({ value, count }) => (
                      <div className="flex items-center space-x-2" key={value}>
                        <Checkbox
                          checked={localFilters.ageGroups.includes(value)}
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
                        checked={localFilters.sports.includes(value)}
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
              {(["low", "medium", "high"] as const).map((intensity) => (
                <div className="flex items-center space-x-2" key={intensity}>
                  <Checkbox
                    checked={localFilters.intensities.includes(intensity)}
                    id={`intensity-modal-${intensity}`}
                    onCheckedChange={() =>
                      toggleArrayFilter("intensities", intensity)
                    }
                  />
                  <label
                    className="cursor-pointer font-normal text-sm capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor={`intensity-modal-${intensity}`}
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
                        checked={localFilters.categories.includes(value)}
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
                <Separator />
              </>
            )}

            {/* Skills */}
            {availableFilters.skills.length > 0 && (
              <div className="space-y-3">
                <Label className="font-medium text-sm">Skills</Label>
                {availableFilters.skills
                  .slice(0, 20)
                  .map(({ value, count }) => (
                    <div className="flex items-center space-x-2" key={value}>
                      <Checkbox
                        checked={localFilters.skills.includes(value)}
                        id={`skill-modal-${value}`}
                        onCheckedChange={() =>
                          toggleArrayFilter("skills", value)
                        }
                      />
                      <label
                        className="flex flex-1 cursor-pointer items-center justify-between font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        htmlFor={`skill-modal-${value}`}
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

        <DialogFooter className="sticky bottom-0 flex-row justify-between gap-3 border-t bg-background p-6 pt-4">
          <Button
            disabled={!hasActiveFilters}
            onClick={clearAllFilters}
            variant="outline"
          >
            Clear All
          </Button>
          <Button onClick={applyFilters}>
            Apply ({planCount} plan{planCount !== 1 ? "s" : ""})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
