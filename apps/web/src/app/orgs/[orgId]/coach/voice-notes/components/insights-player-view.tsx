"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { ChevronDown, ChevronUp, Search, Users, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { BoardInsightCard } from "./board-insight-card";

type Insight = {
  id: string;
  noteId: Id<"voiceNotes">;
  title: string;
  description?: string;
  category?: string;
  playerName?: string;
  playerIdentityId?: Id<"playerIdentities">;
  status: "pending" | "applied" | "dismissed" | "auto_applied";
  noteDate: string;
  teamName?: string;
  assigneeName?: string;
};

type InsightsPlayerViewProps = {
  insights: Insight[];
  onInsightUpdate?: () => void;
};

type PlayerGroup = {
  name: string;
  insights: Insight[];
  isSpecial?: boolean;
};

export function InsightsPlayerView({
  insights,
  onInsightUpdate,
}: InsightsPlayerViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Debounced search (300ms)
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Debounce search query
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Group insights by player
  const playerGroups = useMemo(() => {
    const groups: PlayerGroup[] = [];

    // Special group: Team Insights
    const teamInsights = insights.filter(
      (i) => i.category === "team_culture" || !i.playerIdentityId
    );
    if (teamInsights.length > 0) {
      groups.push({
        name: "Team Insights",
        insights: teamInsights.filter((i) => i.category === "team_culture"),
        isSpecial: true,
      });
    }

    // Special group: Unmatched
    const unmatchedInsights = insights.filter(
      (i) => !i.playerIdentityId && i.category !== "team_culture"
    );
    if (unmatchedInsights.length > 0) {
      groups.push({
        name: "Unmatched",
        insights: unmatchedInsights,
        isSpecial: true,
      });
    }

    // Group by player
    const playerMap = new Map<string, Insight[]>();
    for (const insight of insights) {
      if (insight.playerIdentityId && insight.playerName) {
        const playerName = insight.playerName;
        if (!playerMap.has(playerName)) {
          playerMap.set(playerName, []);
        }
        playerMap.get(playerName)?.push(insight);
      }
    }

    // Sort players alphabetically and add to groups
    const sortedPlayers = Array.from(playerMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [playerName, playerInsights] of sortedPlayers) {
      groups.push({
        name: playerName,
        insights: playerInsights,
        isSpecial: false,
      });
    }

    return groups;
  }, [insights]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return playerGroups;
    }

    const query = debouncedQuery.toLowerCase();
    return playerGroups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }, [playerGroups, debouncedQuery]);

  // Toggle group open/closed
  const toggleGroup = useCallback((groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  // Empty state - no insights
  if (insights.length === 0) {
    return (
      <Empty>
        <EmptyContent className="py-12">
          <EmptyMedia variant="icon">
            <Users className="h-12 w-12" />
          </EmptyMedia>
          <EmptyTitle>No player insights yet</EmptyTitle>
          <EmptyDescription>
            Insights from voice notes will be organized by player here
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  // Search no results
  if (filteredGroups.length === 0) {
    return (
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9 pl-9"
            onChange={(e) => {
              handleSearchChange(e.target.value);
            }}
            placeholder="Search players..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <Button
              className="absolute top-1.5 right-1.5"
              onClick={clearSearch}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* No Results */}
        <Empty>
          <EmptyContent className="py-12">
            <EmptyMedia variant="icon">
              <Search className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>No players found</EmptyTitle>
            <EmptyDescription>
              No players found matching &quot;{debouncedQuery}&quot;
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pr-9 pl-9"
          onChange={(e) => {
            handleSearchChange(e.target.value);
          }}
          placeholder="Search players..."
          type="text"
          value={searchQuery}
        />
        {searchQuery && (
          <Button
            className="absolute top-1.5 right-1.5"
            onClick={clearSearch}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Player Groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const isOpen = openGroups.has(group.name);

          return (
            <Collapsible key={group.name} open={isOpen}>
              <div className="rounded-lg border bg-card">
                {/* Collapsible Header */}
                <CollapsibleTrigger asChild>
                  <Button
                    className="w-full justify-between px-4 py-3 text-left hover:bg-muted/50"
                    onClick={() => {
                      toggleGroup(group.name);
                    }}
                    variant="ghost"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {group.name}
                      </span>
                      <Badge variant="secondary">{group.insights.length}</Badge>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                {/* Collapsible Content */}
                <CollapsibleContent>
                  <div className="space-y-3 border-border border-t p-4">
                    {group.insights.map((insight) => (
                      <BoardInsightCard
                        insight={insight}
                        key={insight.id}
                        onUpdate={onInsightUpdate}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
