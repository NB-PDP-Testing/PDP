"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Plus,
  Search,
  Square,
  UserCircle,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SortColumn = "name" | "team" | "ageGroup" | "lastReview";
type SortDirection = "asc" | "desc";

export default function ManagePlayersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Get data from new identity system
  const enrolledPlayers = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
    }
  );
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Transform to flat player structure for compatibility
  const players = enrolledPlayers?.map(({ enrollment, player }) => ({
    _id: player._id, // playerIdentityId
    name: `${player.firstName} ${player.lastName}`,
    firstName: player.firstName,
    lastName: player.lastName,
    ageGroup: enrollment.ageGroup,
    gender: player.gender,
    sport: "Soccer", // TODO: Get from passport or enrollment
    lastReviewDate: enrollment.lastReviewDate,
    reviewStatus: enrollment.reviewStatus,
    dateOfBirth: player.dateOfBirth,
    enrollmentId: enrollment._id,
    enrollmentStatus: enrollment.status,
  }));

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isLoading = enrolledPlayers === undefined || teams === undefined;

  // Get unique values for filters
  const uniqueAgeGroups = [
    ...new Set(players?.map((p: any) => p.ageGroup).filter(Boolean)),
  ] as string[];
  const uniqueSports = [
    ...new Set(players?.map((p: any) => p.sport).filter(Boolean)),
  ] as string[];
  const uniqueGenders = [
    ...new Set(players?.map((p: any) => p.gender).filter(Boolean)),
  ] as string[];
  const uniqueTeams = [
    ...new Set(teams?.map((t: any) => t.name).filter(Boolean)),
  ] as string[];

  // Filter players
  const filteredPlayers = players?.filter((player: any) => {
    const matchesSearch = player.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesAge =
      ageGroupFilter === "all" || player.ageGroup === ageGroupFilter;
    const matchesSport = sportFilter === "all" || player.sport === sportFilter;
    const matchesGender =
      genderFilter === "all" || player.gender === genderFilter;
    const matchesReviewStatus =
      reviewStatusFilter === "all" ||
      player.reviewStatus === reviewStatusFilter;

    // Team filter - check both players table and teamPlayers junction
    let matchesTeam = teamFilter === "all";
    // We'll need to implement getPlayerCountByTeam properly later
    // For now, just match on sport/ageGroup/gender
    if (!matchesTeam && teamFilter !== "all") {
      const selectedTeam = teams?.find((t: any) => t.name === teamFilter);
      if (selectedTeam) {
        matchesTeam =
          player.sport === selectedTeam.sport &&
          player.ageGroup === selectedTeam.ageGroup &&
          player.gender === selectedTeam.gender;
      }
    }

    return (
      matchesSearch &&
      matchesAge &&
      matchesSport &&
      matchesGender &&
      matchesTeam &&
      matchesReviewStatus
    );
  });

  // Sort players
  const sortedPlayers = [...(filteredPlayers || [])].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case "name": {
        comparison = a.name.localeCompare(b.name);
        break;
      }
      case "team": {
        // For now, sort by ageGroup since team membership is in junction table
        comparison = (a.ageGroup || "").localeCompare(b.ageGroup || "");
        break;
      }
      case "ageGroup": {
        comparison = (a.ageGroup || "").localeCompare(b.ageGroup || "");
        break;
      }
      case "lastReview": {
        const dateA = a.lastReviewDate
          ? new Date(a.lastReviewDate).getTime()
          : 0;
        const dateB = b.lastReviewDate
          ? new Date(b.lastReviewDate).getTime()
          : 0;
        comparison = dateA - dateB;
        break;
      }
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.size === sortedPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(sortedPlayers.map((p: any) => p._id)));
    }
  };

  const getPlayerTeams = (player: any) => {
    // For now, return the player's age group since we need to properly implement
    // the team membership lookup via teamPlayers table
    return player.ageGroup ? [player.ageGroup] : ["Unassigned"];
  };

  const stats = {
    total: players?.length || 0,
    needsReview: players?.filter((p: any) => !p.lastReviewDate).length || 0,
    recentReviews:
      players?.filter((p: any) => {
        if (!p.lastReviewDate) return false;
        const days =
          (Date.now() - new Date(p.lastReviewDate).getTime()) /
          (1000 * 60 * 60 * 24);
        return days <= 60;
      }).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Manage Players</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage all player passports
          </p>
        </div>
        <Button
          onClick={() => router.push(`/orgs/${orgId}/admin/player-import`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Import Players
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Players</p>
                <p className="font-bold text-2xl">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Recent Reviews (60 days)
                </p>
                <p className="font-bold text-2xl text-green-600">
                  {stats.recentReviews}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Needs Review</p>
                <p className="font-bold text-2xl text-yellow-600">
                  {stats.needsReview}
                </p>
              </div>
              <UserCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players by name..."
            value={searchTerm}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={setSportFilter} value={sportFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {uniqueSports.map((sport) => (
                <SelectItem key={sport} value={sport}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setAgeGroupFilter} value={ageGroupFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {uniqueAgeGroups.map((age) => (
                <SelectItem key={age} value={age}>
                  {age}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setGenderFilter} value={genderFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              {uniqueGenders.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setTeamFilter} value={teamFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {uniqueTeams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={setReviewStatusFilter}
            value={reviewStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Review Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Player Table */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({sortedPlayers.length})</CardTitle>
          <CardDescription>
            {selectedPlayers.size > 0 &&
              `${selectedPlayers.size} player${selectedPlayers.size !== 1 ? "s" : ""} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="p-4" key={i}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        className="rounded p-1 hover:bg-accent"
                        onClick={toggleSelectAll}
                      >
                        {selectedPlayers.size === sortedPlayers.length ? (
                          <CheckSquare className="h-[18px] w-[18px] text-primary" />
                        ) : (
                          <Square className="h-[18px] w-[18px] text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider hover:bg-muted/80"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === "name" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider hover:bg-muted/80"
                      onClick={() => handleSort("team")}
                    >
                      <div className="flex items-center gap-1">
                        Team(s)
                        {sortColumn === "team" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider hover:bg-muted/80 md:table-cell"
                      onClick={() => handleSort("ageGroup")}
                    >
                      <div className="flex items-center gap-1">
                        Age Group
                        {sortColumn === "ageGroup" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider hover:bg-muted/80 lg:table-cell"
                      onClick={() => handleSort("lastReview")}
                    >
                      <div className="flex items-center gap-1">
                        Last Review
                        {sortColumn === "lastReview" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedPlayers.map((player: any) => (
                    <tr
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                      key={player._id}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="rounded p-1 hover:bg-accent"
                          onClick={() => togglePlayerSelection(player._id)}
                        >
                          {selectedPlayers.has(player._id) ? (
                            <CheckSquare className="h-[18px] w-[18px] text-primary" />
                          ) : (
                            <Square className="h-[18px] w-[18px] text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <span className="font-medium text-primary text-xs">
                              {(player.name || "U")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {player.name || "Unnamed"}
                            </p>
                            <p className="text-muted-foreground text-xs md:hidden">
                              {player.ageGroup}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getPlayerTeams(player).join(", ")}
                      </td>
                      <td className="hidden px-4 py-3 text-sm md:table-cell">
                        {player.ageGroup}
                      </td>
                      <td className="hidden px-4 py-3 text-sm lg:table-cell">
                        {player.lastReviewDate ? (
                          <Badge
                            className={(() => {
                              const days = Math.floor(
                                (Date.now() -
                                  new Date(player.lastReviewDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              );
                              if (days <= 60)
                                return "bg-green-500/10 text-green-600";
                              if (days <= 90)
                                return "bg-orange-500/10 text-orange-600";
                              return "bg-red-500/10 text-red-600";
                            })()}
                            variant="outline"
                          >
                            {new Date(
                              player.lastReviewDate
                            ).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Not reviewed
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() =>
                              router.push(
                                `/orgs/${orgId}/players/${player._id}`
                              )
                            }
                            size="icon"
                            title="View Passport"
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              router.push(
                                `/orgs/${orgId}/admin/players/${player._id}/edit` as any
                              )
                            }
                            size="icon"
                            title="Edit Player"
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
                {sortedPlayers.length} player
                {sortedPlayers.length !== 1 ? "s" : ""}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Players Found</h3>
              <p className="mt-1 text-muted-foreground">
                {searchTerm ||
                sportFilter !== "all" ||
                ageGroupFilter !== "all" ||
                genderFilter !== "all" ||
                teamFilter !== "all" ||
                reviewStatusFilter !== "all"
                  ? "No players match your search criteria"
                  : "Import your first players to get started"}
              </p>
              {!searchTerm &&
                sportFilter === "all" &&
                ageGroupFilter === "all" &&
                genderFilter === "all" &&
                teamFilter === "all" &&
                reviewStatusFilter === "all" && (
                  <Button
                    className="mt-4"
                    onClick={() =>
                      router.push(`/orgs/${orgId}/admin/player-import`)
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Import Players
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
