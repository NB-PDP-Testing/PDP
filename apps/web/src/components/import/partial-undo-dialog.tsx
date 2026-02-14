"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { CheckSquare, Loader2, Square, Users } from "lucide-react";
import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Fetch imported players from this session
  // TODO: Add backend query in US-P3.1-008
  const importedPlayers = useQuery(
    api.models.playerImport.getImportedPlayers,
    sessionId ? { sessionId } : "skip"
  );

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
    if (!importedPlayers) {
      return;
    }
    if (selectedPlayerIds.size === importedPlayers.length) {
      // Deselect all
      setSelectedPlayerIds(new Set());
    } else {
      // Select all
      setSelectedPlayerIds(
        new Set(importedPlayers.map((p: ImportedPlayer) => p._id))
      );
    }
  };

  const handleRemove = () => {
    if (!sessionId || selectedPlayerIds.size === 0) {
      return;
    }

    // TODO: Wire up mutation in US-P3.1-008
    console.log("Remove players:", Array.from(selectedPlayerIds));
  };

  if (!sessionId) {
    return null;
  }

  const isLoading = importedPlayers === undefined;
  const players = importedPlayers || [];
  const selectedCount = selectedPlayerIds.size;
  const allSelected = players.length > 0 && selectedCount === players.length;

  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open={!!sessionId}>
      <AlertDialogContent className="max-w-2xl">
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

        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Player List */}
          {!isLoading && players.length > 0 && (
            <div className="space-y-3">
              {/* Select All + Count */}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    id="select-all"
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    className="cursor-pointer font-medium text-sm"
                    htmlFor="select-all"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </label>
                </div>
                <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                  {selectedCount} player{selectedCount !== 1 ? "s" : ""}{" "}
                  selected
                </Badge>
              </div>

              {/* Player Rows */}
              <ScrollArea className="h-[300px] rounded-md border">
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
                          onCheckedChange={() => handleTogglePlayer(player._id)}
                        />
                        <label
                          className="flex-1 cursor-pointer"
                          htmlFor={`player-${player._id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {player.firstName} {player.lastName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                DOB: {player.dateOfBirth}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
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
          {!isLoading && players.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No players found in this import.
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={selectedCount === 0 || isLoading}
            onClick={handleRemove}
            variant="destructive"
          >
            Remove {selectedCount} Player{selectedCount !== 1 ? "s" : ""}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
