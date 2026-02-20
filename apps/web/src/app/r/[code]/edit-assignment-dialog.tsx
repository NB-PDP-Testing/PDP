"use client";

/**
 * EditAssignmentDialog - Reassign insight entity (player/team/todo/uncategorized)
 *
 * US-RMS-002: Edit Entity Assignment
 *
 * Allows coaches to fix AI miscategorizations by changing the entity type
 * and selecting a different entity. Supports player, team, todo, and uncategorized.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  HelpCircle,
  ListTodo,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EntityType = "player" | "team" | "todo" | "uncategorized";

type EditAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
  currentEntityType: EntityType | null;
  onSuccess: () => void;
};

export function EditAssignmentDialog({
  open,
  onOpenChange,
  code,
  voiceNoteId,
  insightId,
  currentEntityType,
  onSuccess,
}: EditAssignmentDialogProps) {
  const [entityType, setEntityType] = useState<EntityType>(
    currentEntityType ?? "uncategorized"
  );
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"playerIdentities"> | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const reassignMutation = useMutation(
    api.models.whatsappReviewLinks.reassignInsightEntity
  );

  // Fetch coach's teams for team selector
  const coachTeams = useQuery(
    api.models.whatsappReviewLinks.getCoachTeamsForReview,
    { code }
  );

  // Fetch coaches for todo assignment
  const coaches = useQuery(api.models.whatsappReviewLinks.getCoachesForReview, {
    code,
  });

  // Fetch player suggestions when searching
  const suggestionsResult = useQuery(
    api.models.whatsappReviewLinks.findSimilarPlayersForReview,
    searchQuery.trim().length >= 2 && entityType === "player"
      ? { code, searchName: searchQuery.trim() }
      : "skip"
  );

  const suggestions = suggestionsResult?.suggestions ?? [];

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const args: any = {
        code,
        voiceNoteId,
        insightId,
        entityType,
      };

      if (entityType === "player" && selectedPlayerId) {
        args.playerIdentityId = selectedPlayerId;
      } else if (entityType === "team" && selectedTeamId) {
        args.teamId = selectedTeamId;
      } else if (entityType === "todo" && assigneeUserId.trim()) {
        args.assigneeUserId = assigneeUserId.trim();
      }

      await reassignMutation(args);
      onSuccess();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [
    code,
    voiceNoteId,
    insightId,
    entityType,
    selectedPlayerId,
    selectedTeamId,
    assigneeUserId,
    reassignMutation,
    onSuccess,
    onOpenChange,
  ]);

  const canSave =
    entityType === "uncategorized" ||
    (entityType === "player" && selectedPlayerId) ||
    (entityType === "team" && selectedTeamId) ||
    (entityType === "todo" && assigneeUserId.trim());

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Change how this insight is categorized
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entity Type Selector */}
          <div className="space-y-3">
            <Label>Assign to</Label>
            <RadioGroup
              onValueChange={(value) => {
                setEntityType(value as EntityType);
                // Reset selections when changing type
                setSelectedPlayerId(null);
                setSelectedTeamId(null);
                setSearchQuery("");
                setAssigneeUserId("");
              }}
              value={entityType}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="player" value="player" />
                <Label
                  className="flex cursor-pointer items-center gap-2 font-normal"
                  htmlFor="player"
                >
                  <User className="h-4 w-4" />
                  Player
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="team" value="team" />
                <Label
                  className="flex cursor-pointer items-center gap-2 font-normal"
                  htmlFor="team"
                >
                  <Users className="h-4 w-4" />
                  Team
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="todo" value="todo" />
                <Label
                  className="flex cursor-pointer items-center gap-2 font-normal"
                  htmlFor="todo"
                >
                  <ListTodo className="h-4 w-4" />
                  To-Do / Action Item
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="uncategorized" value="uncategorized" />
                <Label
                  className="flex cursor-pointer items-center gap-2 font-normal"
                  htmlFor="uncategorized"
                >
                  <HelpCircle className="h-4 w-4" />
                  Uncategorized
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Player Search */}
          {entityType === "player" && (
            <div className="space-y-2">
              <Label htmlFor="player-search">Search for player</Label>
              <Input
                autoFocus
                id="player-search"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedPlayerId(null);
                }}
                placeholder="Start typing player name..."
                value={searchQuery}
              />

              {suggestionsResult === undefined &&
                searchQuery.trim().length >= 2 && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                )}

              {suggestions.length > 0 && (
                <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-md border p-2">
                  {suggestions.map((suggestion) => (
                    <button
                      className={`w-full rounded p-2 text-left hover:bg-muted ${
                        selectedPlayerId === suggestion.playerId
                          ? "border border-primary bg-primary/10"
                          : ""
                      }`}
                      key={suggestion.playerId}
                      onClick={() => setSelectedPlayerId(suggestion.playerId)}
                      type="button"
                    >
                      <div className="font-medium text-sm">
                        {suggestion.fullName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {suggestion.ageGroup}
                        {suggestion.sport ? ` · ${suggestion.sport}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim().length >= 2 &&
                suggestions.length === 0 &&
                suggestionsResult !== undefined && (
                  <p className="text-amber-600 text-sm">
                    No players found matching "{searchQuery}"
                  </p>
                )}
            </div>
          )}

          {/* Team Selector */}
          {entityType === "team" && (
            <div className="space-y-2">
              <Label htmlFor="team-select">Select team</Label>
              {coachTeams === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading teams...
                </div>
              ) : coachTeams === null || coachTeams.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No teams assigned to this coach
                </p>
              ) : (
                <Select
                  onValueChange={setSelectedTeamId}
                  value={selectedTeamId ?? undefined}
                >
                  <SelectTrigger id="team-select">
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {coachTeams.map((team) => (
                      <SelectItem key={team.teamId} value={team.teamId}>
                        {team.teamName}
                        {team.sport || team.ageGroup
                          ? ` (${[team.sport, team.ageGroup]
                              .filter(Boolean)
                              .join(", ")})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* To-Do Assignee */}
          {entityType === "todo" && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign to coach (optional)</Label>
              {coaches === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading coaches...
                </div>
              ) : coaches === null || coaches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No coaches found in this organization
                </p>
              ) : (
                <>
                  <Select
                    onValueChange={setAssigneeUserId}
                    value={assigneeUserId || undefined}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Choose a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.userId} value={coach.userId}>
                          {coach.name}
                          {coach.email ? ` (${coach.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Leave unassigned to create a general action item
                  </p>
                </>
              )}
            </div>
          )}

          {/* Uncategorized Message */}
          {entityType === "uncategorized" && (
            <p className="text-muted-foreground text-sm">
              This insight will be marked as uncategorized and removed from
              player/team/todo assignments.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
