"use client";

import { FileText, Mic, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TypeFilter = "all" | "voice-note" | "ai-generated" | "manual";
type TopicFilter =
  | "all"
  | "technical"
  | "tactical"
  | "fitness"
  | "behavioral"
  | "other";
type SortOption = "newest" | "oldest" | "priority";

type Insight = {
  playerIds: string[];
  playerNames: string[];
};

type InsightFiltersProps = {
  typeFilter: TypeFilter;
  topicFilter: TopicFilter;
  sortBy: SortOption;
  selectedPlayerId: string;
  onTypeFilterChange: (value: TypeFilter) => void;
  onTopicFilterChange: (value: TopicFilter) => void;
  onSortByChange: (value: SortOption) => void;
  onPlayerFilterChange: (value: string) => void;
  playerIds: string[];
  insights: Insight[];
};

export function InsightFilters({
  typeFilter,
  topicFilter,
  sortBy,
  selectedPlayerId,
  onTypeFilterChange,
  onTopicFilterChange,
  onSortByChange,
  onPlayerFilterChange,
  playerIds,
  insights,
}: InsightFiltersProps) {
  // Get player names from insights
  const playerNamesMap = new Map<string, string>();
  for (const insight of insights) {
    for (let index = 0; index < insight.playerIds.length; index++) {
      const playerId = insight.playerIds[index];
      if (insight.playerNames[index]) {
        playerNamesMap.set(playerId, insight.playerNames[index]);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Primary filter: Type tabs */}
      <Tabs
        onValueChange={(value) => onTypeFilterChange(value as TypeFilter)}
        value={typeFilter}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="voice-note">
            <Mic className="mr-1 h-3 w-3" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="ai-generated">
            <Sparkles className="mr-1 h-3 w-3" />
            AI
          </TabsTrigger>
          <TabsTrigger value="manual">
            <FileText className="mr-1 h-3 w-3" />
            Manual
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Secondary filters */}
      <div className="flex gap-2">
        {/* Topic dropdown */}
        <Select onValueChange={onTopicFilterChange} value={topicFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="tactical">Tactical</SelectItem>
            <SelectItem value="fitness">Fitness</SelectItem>
            <SelectItem value="behavioral">Behavioral</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Player dropdown */}
        {playerIds.length > 0 && (
          <Select onValueChange={onPlayerFilterChange} value={selectedPlayerId}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {playerIds.map((playerId) => (
                <SelectItem key={playerId} value={playerId}>
                  {playerNamesMap.get(playerId) || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort dropdown */}
        <Select onValueChange={onSortByChange} value={sortBy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
