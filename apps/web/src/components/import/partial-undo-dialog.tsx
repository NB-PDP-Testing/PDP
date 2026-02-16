"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckSquare,
  Loader2,
  Search,
  Square,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

// ============================================================
// Types
// ============================================================

type PartialUndoDialogProps = {
  sessionId: Id<"importSessions"> | null;
  onClose: () => void;
  onSuccess?: () => void;
};

type ImportedPlayer = {
  _id: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  enrollmentStatus: string;
  relatedRecords: {
    enrollments: number;
    passports: number;
    teamAssignments: number;
    assessments: number;
  };
};

// ============================================================
// PartialUndoDialog Component
// ============================================================

export function PartialUndoDialog({
  sessionId,
  onClose,
}: PartialUndoDialogProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set()
  );
  const [isRemoving, setIsRemoving] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [errorFilter, setErrorFilter] = useState<"all" | "errors" | "warnings">(
    "all"
  );

  // Debounce search query (300ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch imported players from this session
  const importedPlayers = useQuery(
    api.models.playerImport.getImportedPlayers,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch removal impact for selected players
  const selectedPlayerIdsArray = Array.from(
    selectedPlayerIds
  ) as Id<"playerIdentities">[];
  const impactPreview = useQuery(
    api.models.playerImport.getRemovalImpact,
    selectedPlayerIdsArray.length > 0
      ? { playerIdentityIds: selectedPlayerIdsArray }
      : "skip"
  );

  // Mutation for removing players
  const removePlayersMutation = useMutation(
    api.models.playerImport.removePlayersFromImport
  );

  // Filter and search players
  const filteredPlayers = useMemo(() => {
    if (!importedPlayers) {
      return [];
    }

    let filtered = [...importedPlayers];

    // Search by name (case-insensitive)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((player: ImportedPlayer) => {
        const firstName = player.firstName.toLowerCase();
        const lastName = player.lastName.toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query)
        );
      });
    }

    // Filter by enrollment status
    if (statusFilter !== "all") {
      filtered = filtered.filter((player: ImportedPlayer) => {
        const status = player.enrollmentStatus.toLowerCase();
        if (statusFilter === "active") {
          return status === "active";
        }
        if (statusFilter === "inactive") {
          return status === "inactive";
        }
        return true;
      });
    }

    // Filter by error/warning status
    if (errorFilter !== "all") {
      // Note: Players don't currently have error/warning flags in the schema
      // This is a placeholder for future enhancement when error tracking is added
      // For now, we'll keep all players when filtering by errors/warnings
      // TODO: Add errorStatus or warnings field to ImportedPlayer type
    }

    return filtered;
  }, [importedPlayers, debouncedSearchQuery, statusFilter, errorFilter]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (filteredPlayers.length === 0) {
      return;
    }

    // Check if all FILTERED players are selected
    const allFilteredSelected = filteredPlayers.every((p: ImportedPlayer) =>
      selectedPlayerIds.has(p._id)
    );

    if (allFilteredSelected) {
      // Deselect all filtered players
      const newSelection = new Set(selectedPlayerIds);
      for (const player of filteredPlayers) {
        newSelection.delete(player._id);
      }
      setSelectedPlayerIds(newSelection);
    } else {
      // Select all filtered players
      const newSelection = new Set(selectedPlayerIds);
      for (const player of filteredPlayers) {
        newSelection.add(player._id);
      }
      setSelectedPlayerIds(newSelection);
    }
  };

  const handleRemove = async () => {
    if (!sessionId || selectedPlayerIds.size === 0) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await removePlayersMutation({
        sessionId,
        playerIdentityIds: selectedPlayerIdsArray,
      });

      if (result.errors.length > 0) {
        toast.error("Some players could not be removed", {
          description: `${result.playersRemoved} of ${selectedPlayerIds.size} players removed. ${result.errors.length} errors occurred.`,
        });
      } else {
        toast.success("Players removed successfully", {
          description: `Removed ${result.playersRemoved} players and ${result.enrollmentsRemoved} enrollments.`,
        });
      }

      // Reset selection and close dialog
      setSelectedPlayerIds(new Set());
      onClose();
    } catch (error) {
      toast.error("Failed to remove players", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  const isLoading = importedPlayers === undefined;
  const totalPlayers = importedPlayers?.length || 0;
  const players = filteredPlayers;
  const selectedCount = selectedPlayerIds.size;
  const allFilteredSelected =
    players.length > 0 &&
    players.every((p: ImportedPlayer) => selectedPlayerIds.has(p._id));

  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open={!!sessionId}>
      <AlertDialogContent className="flex max-h-[85vh] w-[95vw] max-w-2xl flex-col sm:max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Remove Players from Import
          </AlertDialogTitle>
          <AlertDialogDescription>
            Select specific players to remove from this import. All related data
            will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-2 sm:pr-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Search and Filters */}
            {!isLoading && totalPlayers > 0 && (
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    value={searchQuery}
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Status Filter */}
                  <Select
                    onValueChange={(value) =>
                      setStatusFilter(value as "all" | "active" | "inactive")
                    }
                    value={statusFilter}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Error/Warning Filter */}
                  <Select
                    onValueChange={(value) =>
                      setErrorFilter(value as "all" | "errors" | "warnings")
                    }
                    value={errorFilter}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Filter by issues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Players</SelectItem>
                      <SelectItem value="errors">
                        Players with Errors
                      </SelectItem>
                      <SelectItem value="warnings">
                        Players with Warnings
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Result Count */}
                <p className="text-muted-foreground text-sm">
                  Showing {players.length} of {totalPlayers} players
                </p>
              </div>
            )}

            {/* Player List */}
            {!isLoading && players.length > 0 && (
              <div className="space-y-3">
                {/* Select All + Count */}
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allFilteredSelected}
                      id="select-all"
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      className="cursor-pointer font-medium text-sm"
                      htmlFor="select-all"
                    >
                      {allFilteredSelected ? "Deselect All" : "Select All"}
                    </label>
                  </div>
                  <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                    {selectedCount} player{selectedCount !== 1 ? "s" : ""}{" "}
                    selected
                  </Badge>
                </div>

                {/* Player Rows */}
                <ScrollArea className="h-[350px] rounded-md border sm:h-[400px]">
                  <div className="space-y-2 p-3">
                    {players.map((player: ImportedPlayer) => {
                      const isSelected = selectedPlayerIds.has(player._id);
                      return (
                        <div
                          className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
                          key={player._id}
                        >
                          <Checkbox
                            checked={isSelected}
                            id={`player-${player._id}`}
                            onCheckedChange={() =>
                              handleTogglePlayer(player._id)
                            }
                          />
                          <label
                            className="flex-1 cursor-pointer"
                            htmlFor={`player-${player._id}`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {player.firstName} {player.lastName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  DOB: {player.dateOfBirth}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline">
                                  {player.enrollmentStatus}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {player.relatedRecords.enrollments} enrollment
                                  {player.relatedRecords.enrollments !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </label>
                          <button
                            className="p-2"
                            onClick={() => handleTogglePlayer(player._id)}
                            type="button"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && players.length === 0 && totalPlayers > 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No players match your search or filter criteria.
              </div>
            )}

            {/* Empty State - No Players */}
            {!isLoading && totalPlayers === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No players found in this import.
              </div>
            )}

            {/* Impact Preview */}
            {!isLoading && selectedCount > 0 && impactPreview && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Impact Preview</h3>
                <div className="rounded-md border p-4">
                  <p className="mb-3 font-medium text-sm">
                    This will permanently delete:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Players:</span>
                      <span className="ml-2 font-medium">
                        {impactPreview.playerCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Enrollments:
                      </span>
                      <span className="ml-2 font-medium">
                        {impactPreview.enrollmentCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Passports:</span>
                      <span className="ml-2 font-medium">
                        {impactPreview.passportCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Team Assignments:
                      </span>
                      <span className="ml-2 font-medium">
                        {impactPreview.teamAssignmentCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Assessments:
                      </span>
                      <span className="ml-2 font-medium">
                        {impactPreview.assessmentCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Guardian Links:
                      </span>
                      <span className="ml-2 font-medium">
                        {impactPreview.guardianLinkCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Orphaned Guardian Warning */}
                {impactPreview.orphanedGuardianCount > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning: Orphaned Guardians</AlertTitle>
                    <AlertDescription>
                      {impactPreview.orphanedGuardianCount} guardian
                      {impactPreview.orphanedGuardianCount !== 1 ? "s" : ""}{" "}
                      will have no linked players after this removal. These
                      guardian records will also be deleted.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <Button
            disabled={selectedCount === 0 || isLoading || isRemoving}
            onClick={handleRemove}
            variant="destructive"
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                Remove {selectedCount} Player{selectedCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
