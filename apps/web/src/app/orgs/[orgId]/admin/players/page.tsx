"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConvex } from "convex/react";
import {
  AlertTriangle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  Square,
  Trash2,
  Upload,
  UserCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SmartDataView,
  type DataColumn,
  type DataAction,
  type BulkAction,
} from "@/components/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Age group options
const AGE_GROUPS = [
  "U6",
  "U7",
  "U8",
  "U9",
  "U10",
  "U11",
  "U12",
  "U13",
  "U14",
  "U15",
  "U16",
  "U17",
  "U18",
  "U19",
  "U21",
  "Senior",
  "Adult",
];

// Get current season (e.g., "2024/2025")
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // If after August, use current/next year, otherwise previous/current
  if (month >= 7) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
};

type SortColumn = "name" | "team" | "ageGroup" | "lastReview";
type SortDirection = "asc" | "desc";

interface AddPlayerFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  ageGroup: string;
}

const emptyFormData: AddPlayerFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "male",
  ageGroup: "",
};

export default function ManagePlayersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Add Player Dialog state
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [addPlayerForm, setAddPlayerForm] =
    useState<AddPlayerFormData>(emptyFormData);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof AddPlayerFormData, string>>
  >({});
  
  // Duplicate warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const convex = useConvex();

  // Delete player state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk delete state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Mutations
  const createPlayerIdentity = useMutation(
    api.models.playerIdentities.createPlayerIdentity
  );
  const enrollPlayer = useMutation(
    api.models.orgPlayerEnrollments.enrollPlayer
  );
  const unenrollPlayer = useMutation(
    api.models.orgPlayerEnrollments.unenrollPlayer
  );

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
  const players = enrolledPlayers?.map(
    ({ enrollment, player, sportCode }: any) => ({
      _id: player._id, // playerIdentityId
      name: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      ageGroup: enrollment.ageGroup,
      gender: player.gender,
      sport: sportCode || "Not assigned", // From sport passport
      lastReviewDate: enrollment.lastReviewDate,
      reviewStatus: enrollment.reviewStatus,
      dateOfBirth: player.dateOfBirth,
      enrollmentId: enrollment._id,
      enrollmentStatus: enrollment.status,
    })
  );

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

  // Validate add player form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AddPlayerFormData, string>> = {};

    if (!addPlayerForm.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!addPlayerForm.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (addPlayerForm.dateOfBirth) {
      // Check if date is valid
      const dob = new Date(addPlayerForm.dateOfBirth);
      const now = new Date();
      if (dob > now) {
        errors.dateOfBirth = "Date of birth cannot be in the future";
      } else if (now.getFullYear() - dob.getFullYear() > 100) {
        errors.dateOfBirth = "Please enter a valid date of birth";
      }
    } else {
      errors.dateOfBirth = "Date of birth is required";
    }
    if (!addPlayerForm.ageGroup) {
      errors.ageGroup = "Age group is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check for duplicates and show warning if found
  const checkForDuplicates = async (): Promise<boolean> => {
    if (!addPlayerForm.dateOfBirth) return true; // Can't check without DOB
    
    setIsCheckingDuplicate(true);
    try {
      const result = await convex.query(
        api.models.playerIdentities.checkForDuplicatePlayer,
        {
          firstName: addPlayerForm.firstName.trim(),
          lastName: addPlayerForm.lastName.trim(),
          dateOfBirth: addPlayerForm.dateOfBirth,
          gender: addPlayerForm.gender,
        }
      );
      
      if (result.isDuplicate && result.message) {
        // Exact match found - show warning
        setDuplicateMessage(result.message);
        setShowDuplicateWarning(true);
        return false; // Don't proceed - wait for user confirmation
      }
      
      // No exact duplicate - proceed
      return true;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      // On error, allow creation to proceed
      return true;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Create the player (called after validation and optional duplicate confirmation)
  const createPlayer = async () => {
    setIsAddingPlayer(true);
    try {
      const playerIdentityId = await createPlayerIdentity({
        firstName: addPlayerForm.firstName.trim(),
        lastName: addPlayerForm.lastName.trim(),
        dateOfBirth: addPlayerForm.dateOfBirth,
        gender: addPlayerForm.gender,
        createdFrom: "manual_admin",
      });

      // Step 2: Enroll in organization
      await enrollPlayer({
        playerIdentityId,
        organizationId: orgId,
        ageGroup: addPlayerForm.ageGroup,
        season: getCurrentSeason(),
      });

      toast.success("Player added successfully", {
        description: `${addPlayerForm.firstName} ${addPlayerForm.lastName} has been added to the organization.`,
      });

      // Reset form and close dialogs
      setAddPlayerForm(emptyFormData);
      setFormErrors({});
      setShowAddPlayerDialog(false);
      setShowDuplicateWarning(false);

      // Navigate to the new player
      router.push(`/orgs/${orgId}/players/${playerIdentityId}`);
    } catch (error) {
      console.error("Error adding player:", error);
      toast.error("Failed to add player", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Handle add player submit - first check for duplicates
  const handleAddPlayer = async () => {
    if (!validateForm()) {
      return;
    }

    // Check for duplicates first
    const canProceed = await checkForDuplicates();
    if (canProceed) {
      await createPlayer();
    }
    // If not, the duplicate warning dialog will be shown
  };

  // Handle duplicate warning confirmation - proceed anyway
  const handleDuplicateConfirm = async () => {
    setShowDuplicateWarning(false);
    await createPlayer();
  };

  // Handle delete player
  const handleDeleteClick = (player: any) => {
    setPlayerToDelete({ id: player.enrollmentId, name: player.name });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!playerToDelete) return;
    
    setIsDeleting(true);
    try {
      await unenrollPlayer({
        enrollmentId: playerToDelete.id as any,
      });
      
      toast.success("Player removed", {
        description: `${playerToDelete.name} has been removed from the organization.`,
      });
      
      setShowDeleteDialog(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.error("Error removing player:", error);
      toast.error("Failed to remove player", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedPlayers.size === 0) return;
    setShowBulkDeleteDialog(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedPlayers.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      // Get enrollment IDs for selected players
      const selectedPlayersList = sortedPlayers.filter((p: any) => 
        selectedPlayers.has(p._id)
      );
      
      let successCount = 0;
      let failCount = 0;
      
      for (const player of selectedPlayersList) {
        try {
          await unenrollPlayer({
            enrollmentId: player.enrollmentId as any,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to remove ${player.name}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Removed ${successCount} player${successCount !== 1 ? 's' : ''}`, {
          description: failCount > 0 
            ? `${failCount} player${failCount !== 1 ? 's' : ''} failed to remove`
            : undefined,
        });
      }
      
      setSelectedPlayers(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error("Error during bulk delete:", error);
      toast.error("Failed to remove players");
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        <div className="flex gap-2">
          {selectedPlayers.size > 0 && (
            <Button
              onClick={handleBulkDeleteClick}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedPlayers.size})
            </Button>
          )}
          <Button
            onClick={() => setShowAddPlayerDialog(true)}
            variant="default"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
          <Button
            onClick={() => router.push(`/orgs/${orgId}/admin/player-import`)}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Players
          </Button>
        </div>
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

      {/* Player Table - Using ResponsiveDataView for mobile-friendly display */}
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
            <SmartDataView
              data={sortedPlayers}
              exportable
              exportFilename={`players-${orgId}`}
              getKey={(player: any) => player._id}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  sortable: true,
                  accessor: (player: any) => (
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
                        <p className="font-medium">{player.name || "Unnamed"}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "team",
                  header: "Team(s)",
                  sortable: true,
                  accessor: (player: any) => getPlayerTeams(player).join(", "),
                },
                {
                  key: "ageGroup",
                  header: "Age Group",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) => player.ageGroup || "—",
                },
                {
                  key: "lastReviewDate",
                  header: "Last Review",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) =>
                    player.lastReviewDate ? (
                      <Badge
                        className={(() => {
                          const days = Math.floor(
                            (Date.now() - new Date(player.lastReviewDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          if (days <= 60) return "bg-green-500/10 text-green-600";
                          if (days <= 90) return "bg-orange-500/10 text-orange-600";
                          return "bg-red-500/10 text-red-600";
                        })()}
                        variant="outline"
                      >
                        {new Date(player.lastReviewDate).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not reviewed</span>
                    ),
                },
              ]}
              actions={[
                {
                  label: "View",
                  icon: <Eye className="h-4 w-4" />,
                  onClick: (player: any) => router.push(`/orgs/${orgId}/players/${player._id}`),
                },
                {
                  label: "Edit",
                  icon: <Edit className="h-4 w-4" />,
                  onClick: (player: any) =>
                    router.push(`/orgs/${orgId}/admin/players/${player._id}/edit` as any),
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  destructive: true,
                  onClick: (player: any) => handleDeleteClick(player),
                },
              ]}
              onRowClick={(player: any) =>
                router.push(`/orgs/${orgId}/admin/players/${player._id}/edit`)
              }
              selectable
              selectedKeys={selectedPlayers}
              onSelectionChange={setSelectedPlayers}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={handleSort as any}
              emptyState={
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
              }
            />
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

      {/* Add Player Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setAddPlayerForm(emptyFormData);
            setFormErrors({});
          }
          setShowAddPlayerDialog(open);
        }}
        open={showAddPlayerDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
            <DialogDescription>
              Create a new player and enroll them in your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className={formErrors.firstName ? "border-red-500" : ""}
                id="firstName"
                onChange={(e) => {
                  setAddPlayerForm({
                    ...addPlayerForm,
                    firstName: e.target.value,
                  });
                  if (formErrors.firstName) {
                    setFormErrors({ ...formErrors, firstName: undefined });
                  }
                }}
                placeholder="Enter first name"
                value={addPlayerForm.firstName}
              />
              {formErrors.firstName && (
                <p className="text-red-500 text-sm">{formErrors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className={formErrors.lastName ? "border-red-500" : ""}
                id="lastName"
                onChange={(e) => {
                  setAddPlayerForm({
                    ...addPlayerForm,
                    lastName: e.target.value,
                  });
                  if (formErrors.lastName) {
                    setFormErrors({ ...formErrors, lastName: undefined });
                  }
                }}
                placeholder="Enter last name"
                value={addPlayerForm.lastName}
              />
              {formErrors.lastName && (
                <p className="text-red-500 text-sm">{formErrors.lastName}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                className={formErrors.dateOfBirth ? "border-red-500" : ""}
                id="dateOfBirth"
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setAddPlayerForm({
                    ...addPlayerForm,
                    dateOfBirth: e.target.value,
                  });
                  if (formErrors.dateOfBirth) {
                    setFormErrors({ ...formErrors, dateOfBirth: undefined });
                  }
                }}
                type="date"
                value={addPlayerForm.dateOfBirth}
              />
              {formErrors.dateOfBirth && (
                <p className="text-red-500 text-sm">{formErrors.dateOfBirth}</p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value: "male" | "female" | "other") =>
                  setAddPlayerForm({ ...addPlayerForm, gender: value })
                }
                value={addPlayerForm.gender}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age Group */}
            <div className="space-y-2">
              <Label htmlFor="ageGroup">
                Age Group <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setAddPlayerForm({ ...addPlayerForm, ageGroup: value });
                  if (formErrors.ageGroup) {
                    setFormErrors({ ...formErrors, ageGroup: undefined });
                  }
                }}
                value={addPlayerForm.ageGroup}
              >
                <SelectTrigger
                  className={formErrors.ageGroup ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((ag) => (
                    <SelectItem key={ag} value={ag}>
                      {ag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.ageGroup && (
                <p className="text-red-500 text-sm">{formErrors.ageGroup}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isAddingPlayer}
              onClick={() => {
                setShowAddPlayerDialog(false);
                setAddPlayerForm(emptyFormData);
                setFormErrors({});
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isAddingPlayer} onClick={handleAddPlayer}>
              {isAddingPlayer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Player
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove Player
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove{" "}
              <span className="font-semibold">{playerToDelete?.name}</span> from
              this organization?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              This will remove the player from your organization. Their player
              identity will remain in the system and can be re-enrolled later.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => {
                setShowDeleteDialog(false);
                setPlayerToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Player
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog
        onOpenChange={setShowDuplicateWarning}
        open={showDuplicateWarning}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              ⚠️ Potential Duplicate
            </DialogTitle>
            <DialogDescription className="pt-2">
              {duplicateMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              The system allows players with the same name if they have different dates of birth or gender.
              An exact match (same name, date of birth, AND gender) has been detected.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => setShowDuplicateWarning(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isAddingPlayer}
              onClick={handleDuplicateConfirm}
              variant="default"
            >
              {isAddingPlayer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Anyway"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog onOpenChange={setShowBulkDeleteDialog} open={showBulkDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove {selectedPlayers.size} Player{selectedPlayers.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove {selectedPlayers.size} selected player{selectedPlayers.size !== 1 ? 's' : ''} from
              this organization?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              This will remove the selected players from your organization. Their player
              identities will remain in the system and can be re-enrolled later.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => setShowBulkDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteConfirm}
              variant="destructive"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove {selectedPlayers.size} Player{selectedPlayers.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
