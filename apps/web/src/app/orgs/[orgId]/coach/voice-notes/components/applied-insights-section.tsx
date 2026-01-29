"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ChevronDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SkillChange = {
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  description: string;
  appliedAt: number;
  voiceNoteId: Id<"voiceNotes">;
  voiceNoteTitle: string;
  targetRecordId: string;
};

type Injury = {
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  category: string;
  description: string;
  recordedAt: number;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
};

type AppliedInsightsSectionProps = {
  skillChanges: SkillChange[];
  injuries: Injury[];
  orgId: string;
};

export function AppliedInsightsSection({
  skillChanges,
  injuries,
  orgId,
}: AppliedInsightsSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "skills"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter skills by category and search
  const filteredSkills = useMemo(() => {
    // First filter by category
    let filtered =
      selectedCategories.includes("all") ||
      selectedCategories.includes("skills")
        ? skillChanges
        : [];

    // Then filter by search
    if (debouncedQuery) {
      const lower = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.playerName.toLowerCase().includes(lower) ||
          skill.description.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [skillChanges, selectedCategories, debouncedQuery]);

  // Filter injuries by category and search
  const filteredInjuries = useMemo(() => {
    // First filter by category
    let filtered =
      selectedCategories.includes("all") ||
      selectedCategories.includes("injuries")
        ? injuries
        : [];

    // Then filter by search
    if (debouncedQuery) {
      const lower = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (injury) =>
          injury.playerName.toLowerCase().includes(lower) ||
          injury.description.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [injuries, selectedCategories, debouncedQuery]);

  const totalCount = skillChanges.length + injuries.length;
  const filteredCount = filteredSkills.length + filteredInjuries.length;

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategories(["all"]);
    } else {
      const newCategories = selectedCategories.filter((c) => c !== "all");
      if (newCategories.includes(categoryId)) {
        const filtered = newCategories.filter((c) => c !== categoryId);
        setSelectedCategories(filtered.length === 0 ? ["all"] : filtered);
      } else {
        setSelectedCategories([...newCategories, categoryId]);
      }
    }
  };

  const categories = [
    { id: "all", label: "All", count: totalCount },
    { id: "skills", label: "Skills", count: skillChanges.length },
    { id: "injuries", label: "Injuries", count: injuries.length },
  ];

  return (
    <div>
      <h3 className="mb-4 font-semibold text-lg">
        Applied to Player Profiles
        <Badge className="ml-2" variant="secondary">
          {totalCount} insights
        </Badge>
      </h3>

      {/* Category Filter Chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => handleCategoryToggle(category.id)}
            size="sm"
            variant={
              selectedCategories.includes(category.id) ? "default" : "outline"
            }
          >
            {category.label}
            <Badge className="ml-2" variant="secondary">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search Input */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          className="flex-1"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by player name or insight..."
          value={searchQuery}
        />
        {searchQuery && (
          <Button
            onClick={() => setSearchQuery("")}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Result Count */}
      {debouncedQuery && (
        <p className="mb-2 text-muted-foreground text-sm">
          Showing {filteredCount} of {totalCount} insights
        </p>
      )}

      {/* Empty State - No Results */}
      {debouncedQuery &&
        filteredSkills.length === 0 &&
        filteredInjuries.length === 0 && (
          <Empty>
            <EmptyContent>
              <EmptyTitle>No insights matching "{debouncedQuery}"</EmptyTitle>
              <EmptyDescription>Try a different search term</EmptyDescription>
            </EmptyContent>
          </Empty>
        )}

      <div className="space-y-3">
        {/* Skills Category */}
        {(selectedCategories.includes("all") ||
          selectedCategories.includes("skills")) && (
          <Collapsible
            onOpenChange={() =>
              setExpandedCategory(
                expandedCategory === "skills" ? null : "skills"
              )
            }
            open={expandedCategory === "skills"}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Skills</p>
                  <p className="text-muted-foreground text-sm">
                    {filteredSkills.length}{" "}
                    {debouncedQuery ? "matching" : "changes"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedCategory === "skills" && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 px-4">
              {filteredSkills.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No skill changes yet
                </p>
              ) : (
                <>
                  {filteredSkills.slice(0, 5).map((skill) => (
                    <Card key={skill.targetRecordId}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{skill.playerName}</p>
                            <p className="text-muted-foreground text-sm">
                              {skill.description}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(skill.appliedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <Link
                            href={`/orgs/${orgId}/players/${skill.playerIdentityId}`}
                          >
                            <Button size="sm" variant="ghost">
                              View in {skill.playerName}'s Passport →
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredSkills.length > 5 && (
                    <Button className="w-full" size="sm" variant="outline">
                      View All {filteredSkills.length} Skills
                    </Button>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Injuries Category */}
        {(selectedCategories.includes("all") ||
          selectedCategories.includes("injuries")) && (
          <Collapsible
            onOpenChange={() =>
              setExpandedCategory(
                expandedCategory === "injuries" ? null : "injuries"
              )
            }
            open={expandedCategory === "injuries"}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Injuries</p>
                  <p className="text-muted-foreground text-sm">
                    {filteredInjuries.length}{" "}
                    {debouncedQuery ? "matching" : "recorded"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedCategory === "injuries" && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 px-4">
              {filteredInjuries.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No injuries recorded yet
                </p>
              ) : (
                <>
                  {filteredInjuries.slice(0, 5).map((injury) => (
                    <Card key={injury.insightId}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{injury.playerName}</p>
                            <p className="text-muted-foreground text-sm">
                              {injury.description}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {formatDistanceToNow(
                                new Date(injury.recordedAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/orgs/${orgId}/players/${injury.playerIdentityId}`}
                          >
                            <Button size="sm" variant="ghost">
                              View in {injury.playerName}'s Passport →
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredInjuries.length > 5 && (
                    <Button className="w-full" size="sm" variant="outline">
                      View All {filteredInjuries.length} Injuries
                    </Button>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
