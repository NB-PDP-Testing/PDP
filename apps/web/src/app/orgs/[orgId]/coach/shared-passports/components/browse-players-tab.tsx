"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { PlayerSearchCard } from "./player-search-card";

type BrowsePlayersTabProps = {
  organizationId: string;
};

export function BrowsePlayersTab({ organizationId }: BrowsePlayersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // TODO: Backend query needs to be implemented for cross-org search
  // For now, showing placeholder
  const searchResults: any[] | undefined =
    debouncedSearch.length >= 2 ? [] : undefined;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for players at other organizations..."
          value={searchTerm}
        />
      </div>

      {/* Search States */}
      {debouncedSearch.length < 2 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Enter at least 2 characters to search for players
          </p>
        </div>
      ) : searchResults === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <div
              className="h-48 animate-pulse rounded-lg bg-muted"
              key={`skeleton-${num}`}
            />
          ))}
        </div>
      ) : searchResults.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">
            No players found matching "{debouncedSearch}"
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((player) => (
            <PlayerSearchCard
              key={player._id}
              organizationId={organizationId}
              player={player}
            />
          ))}
        </div>
      )}
    </div>
  );
}
