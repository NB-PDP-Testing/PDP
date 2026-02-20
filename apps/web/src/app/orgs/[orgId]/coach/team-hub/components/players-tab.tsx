"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCard } from "./player-card";
import { PlayerFilters } from "./player-filters";

type StatusFilter = "all" | "active" | "injured" | "on-break";
type SortOption = "name-asc" | "jersey-asc" | "position";

type PlayersTabProps = {
  teamId: string;
  organizationId: string;
};

export function PlayersTab({ teamId, organizationId }: PlayersTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const players = useQuery(api.models.teams.getTeamPlayersWithHealth, {
    teamId,
    organizationId,
  });

  // Extract available positions from players
  const availablePositions = useMemo(() => {
    if (!players) {
      return [];
    }
    const positions = new Set<string>();
    for (const player of players) {
      if (player.position) {
        positions.add(player.position);
      }
    }
    return Array.from(positions).sort();
  }, [players]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    if (!players) {
      return [];
    }

    const statusFilterMap = {
      active: "healthy",
      injured: "injured",
      "on-break": "recovering",
    } as const;

    const matchesStatus =
      statusFilter === "all"
        ? () => true
        : (p: (typeof players)[number]) =>
            p.healthStatus === statusFilterMap[statusFilter];

    const matchesPosition =
      positionFilter === "all"
        ? () => true
        : (p: (typeof players)[number]) => p.position === positionFilter;

    const matchesSearch = searchQuery.trim()
      ? (p: (typeof players)[number]) =>
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      : () => true;

    const result = players.filter(
      (p) => matchesStatus(p) && matchesPosition(p) && matchesSearch(p)
    );

    // Sort
    const sortFunctions = {
      "name-asc": (a: (typeof players)[number], b: (typeof players)[number]) =>
        a.fullName.localeCompare(b.fullName),
      "jersey-asc": (
        a: (typeof players)[number],
        b: (typeof players)[number]
      ) => {
        const numA = a.jerseyNumber
          ? Number.parseInt(a.jerseyNumber, 10)
          : Number.POSITIVE_INFINITY;
        const numB = b.jerseyNumber
          ? Number.parseInt(b.jerseyNumber, 10)
          : Number.POSITIVE_INFINITY;
        return numA - numB;
      },
      position: (a: (typeof players)[number], b: (typeof players)[number]) =>
        (a.position || "").localeCompare(b.position || ""),
    };

    result.sort(sortFunctions[sortBy]);
    return result;
  }, [players, statusFilter, positionFilter, searchQuery, sortBy]);

  // Loading state
  if (!players) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 max-w-sm flex-1" />
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[140px]" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
            <Skeleton className="h-32 w-full" key={key} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state (no players on team)
  if (players.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <Users className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No Players on This Team</EmptyTitle>
          <EmptyDescription>
            This team doesn't have any players assigned yet. Add players to get
            started.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PlayerFilters
        availablePositions={availablePositions}
        onPositionFilterChange={setPositionFilter}
        onSearchQueryChange={setSearchQuery}
        onSortByChange={setSortBy}
        onStatusFilterChange={setStatusFilter}
        positionFilter={positionFilter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        statusFilter={statusFilter}
      />

      {/* Player Grid */}
      {filteredPlayers.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Users className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No Players Match Filters</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or search query to find players.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlayers.map((player) => (
            <PlayerCard
              firstName={player.firstName}
              fullName={player.fullName}
              healthStatus={player.healthStatus}
              isPlayingUp={player.isPlayingUp}
              jerseyNumber={player.jerseyNumber}
              key={player.playerId}
              lastName={player.lastName}
              organizationId={organizationId}
              photoUrl={player.photoUrl}
              playerId={player.playerId}
              position={player.position}
            />
          ))}
        </div>
      )}
    </div>
  );
}
