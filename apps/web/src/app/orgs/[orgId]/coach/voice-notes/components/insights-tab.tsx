"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Inbox,
  Lightbulb,
  Loader2,
  Pencil,
  Send,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";

type InsightsTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type EditingInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  description: string;
  recommendedUpdate: string;
} | null;

type AssigningInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  playerName?: string;
} | null;

type ClassifyingInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  description?: string;
} | null;

// Categories that can be applied without player (team-level)
const TEAM_LEVEL_CATEGORIES = ["team_culture", "todo"];

// Format date as "Mon Jan 22, 10:30 PM"
function formatInsightDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InsightsTab({ orgId, onSuccess, onError }: InsightsTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editingInsight, setEditingInsight] = useState<EditingInsight>(null);
  const [assigningInsight, setAssigningInsight] =
    useState<AssigningInsight>(null);
  const [classifyingInsight, setClassifyingInsight] =
    useState<ClassifyingInsight>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  // Voice notes for pending insights
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });

  // Get players for assignment dropdown - scoped to coach's assigned teams
  const coachUserId = session?.user?.id;
  const coachName = session?.user?.name ?? "Me";

  // Use skip when session is still loading to avoid unnecessary queries
  const players = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    coachUserId ? { organizationId: orgId, coachUserId } : "skip"
  );

  // Track loading states explicitly
  const isSessionLoading = session === undefined;
  const isPlayersLoading = players === undefined && !isSessionLoading;

  // Get coach's assigned teams for team insight classification
  const coachTeams = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    coachUserId ? { userId: coachUserId, organizationId: orgId } : "skip"
  );

  const updateInsightStatus = useMutation(
    api.models.voiceNotes.updateInsightStatus
  );
  const updateInsightContent = useMutation(
    api.models.voiceNotes.updateInsightContent
  );
  const assignPlayerToInsight = useMutation(
    api.models.voiceNotes.assignPlayerToInsight
  );
  const classifyInsight = useMutation(api.models.voiceNotes.classifyInsight);
  const bulkApplyInsights = useMutation(
    api.models.voiceNotes.bulkApplyInsights
  );

  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const handleAssignPlayer = async (
    playerIdentityId: Id<"playerIdentities">
  ) => {
    if (!assigningInsight) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await assignPlayerToInsight({
        noteId: assigningInsight.noteId,
        insightId: assigningInsight.insightId,
        playerIdentityId,
      });
      const message = result.nameWasCorrected
        ? `Assigned to ${result.playerName} (name corrected). Parent summary will be generated.`
        : `Assigned to ${result.playerName}. Parent summary will be generated.`;
      onSuccess(message);
      setAssigningInsight(null);
      setPlayerSearch("");
    } catch (error) {
      console.error("Failed to assign player:", error);
      onError("Failed to assign player to insight.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClassifyAsTeamInsight = async (
    teamId: string,
    teamName: string
  ) => {
    if (!classifyingInsight) {
      return;
    }

    setIsSaving(true);
    try {
      await classifyInsight({
        noteId: classifyingInsight.noteId,
        insightId: classifyingInsight.insightId,
        category: "team_culture",
        teamId,
        teamName,
      });
      onSuccess(`Classified as Team Insight for ${teamName}.`);
      setClassifyingInsight(null);
    } catch (error) {
      console.error("Failed to classify insight:", error);
      onError("Failed to classify insight.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClassifyAsTodo = async (
    assigneeUserId?: string,
    assigneeName?: string
  ) => {
    if (!(classifyingInsight && coachUserId)) {
      return;
    }

    setIsSaving(true);
    try {
      // Default to current coach if no assignee specified
      const userId = assigneeUserId ?? coachUserId;
      const name = assigneeName ?? coachName;

      const result = await classifyInsight({
        noteId: classifyingInsight.noteId,
        insightId: classifyingInsight.insightId,
        category: "todo",
        assigneeUserId: userId,
        assigneeName: name,
        // Required for auto-creating task
        createdByUserId: coachUserId,
        createdByName: coachName,
      });

      if (result.taskId) {
        onSuccess(`Task created and assigned to ${name}.`);
      } else {
        onSuccess(`Added as TODO for ${name}.`);
      }
      setClassifyingInsight(null);
    } catch (error) {
      console.error("Failed to classify insight:", error);
      onError("Failed to classify insight.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter players based on search
  const filteredPlayers = players?.filter((p) => {
    if (!playerSearch) {
      return true;
    }
    const searchLower = playerSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(searchLower) ||
      p.lastName.toLowerCase().includes(searchLower) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  const handleApplyInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    try {
      const result = await updateInsightStatus({
        noteId,
        insightId,
        status: "applied",
      });

      let message = "Insight applied!";
      if (result.appliedTo && result.message) {
        const destinationMap: Record<string, string> = {
          playerInjuries: "Injury Record Created",
          passportGoals: "Development Goal Created",
          "orgPlayerEnrollments.coachNotes": "Added to Player Notes",
          "sportPassports.coachNotes": "Added to Passport Notes",
          "team.coachNotes": "Added to Team Notes",
          skillAssessments: "Skill Rating Updated",
        };
        const destination = destinationMap[result.appliedTo] ?? "Applied";
        message = `${destination}: ${result.message}`;
      }

      onSuccess(message);
    } catch (error) {
      console.error("Failed to apply insight:", error);
      onError("Failed to apply insight.");
    }
  };

  const handleDismissInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    try {
      await updateInsightStatus({
        noteId,
        insightId,
        status: "dismissed",
      });
      onSuccess("Insight dismissed");
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      onError("Failed to dismiss insight.");
    }
  };

  const handleBulkApply = async (
    insights: Array<{ noteId: Id<"voiceNotes">; id: string }>
  ) => {
    if (insights.length === 0) {
      return;
    }

    setIsBulkApplying(true);
    try {
      const result = await bulkApplyInsights({
        insights: insights.map((i) => ({
          noteId: i.noteId,
          insightId: i.id,
        })),
      });

      if (result.successCount > 0) {
        onSuccess(
          `Applied ${result.successCount} insight${result.successCount !== 1 ? "s" : ""}${result.failCount > 0 ? ` (${result.failCount} failed)` : ""}`
        );
      } else if (result.failCount > 0) {
        onError(`Failed to apply ${result.failCount} insights`);
      }
    } catch (error) {
      console.error("Failed to bulk apply insights:", error);
      onError("Failed to apply insights.");
    } finally {
      setIsBulkApplying(false);
    }
  };

  const handleEditInsight = (insight: {
    noteId: Id<"voiceNotes">;
    id: string;
    title: string;
    description?: string;
    recommendedUpdate?: string;
  }) => {
    setEditingInsight({
      noteId: insight.noteId,
      insightId: insight.id,
      title: insight.title,
      description: insight.description ?? "",
      recommendedUpdate: insight.recommendedUpdate ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingInsight) {
      return;
    }

    setIsSaving(true);
    try {
      await updateInsightContent({
        noteId: editingInsight.noteId,
        insightId: editingInsight.insightId,
        title: editingInsight.title,
        description: editingInsight.description || undefined,
        recommendedUpdate: editingInsight.recommendedUpdate || undefined,
      });
      onSuccess("Insight updated");
      setEditingInsight(null);
    } catch (error) {
      console.error("Failed to update insight:", error);
      onError("Failed to update insight.");
    } finally {
      setIsSaving(false);
    }
  };

  // Get pending insights from all notes and sort by most recent first
  const pendingInsights =
    voiceNotes
      ?.flatMap((note) =>
        note.insights
          .filter((i) => i.status === "pending")
          .map((i) => ({ ...i, noteId: note._id, noteDate: note.date }))
      )
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      ) ?? [];

  // Separate insights by type:
  // 1. Matched: Has playerIdentityId (can be applied directly)
  // 2. Unmatched: Has playerName but no match (needs player assignment)
  // 3. Team insights with valid category: team_culture or todo (can be applied)
  // 4. Uncategorized: No player and no team-level category (needs classification)
  const matchedInsights = pendingInsights.filter((i) => i.playerIdentityId);
  const unmatchedInsights = pendingInsights.filter(
    (i) => !i.playerIdentityId && i.playerName
  );

  // Team insights that ARE classified as team-level
  const classifiedTeamInsights = pendingInsights.filter(
    (i) =>
      !(i.playerIdentityId || i.playerName) &&
      i.category &&
      TEAM_LEVEL_CATEGORIES.includes(i.category)
  );

  // Insights without player AND without team-level category need classification
  const uncategorizedInsights = pendingInsights.filter(
    (i) =>
      !(
        i.playerIdentityId ||
        i.playerName ||
        (i.category && TEAM_LEVEL_CATEGORIES.includes(i.category))
      )
  );

  const isLoading = voiceNotes === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pendingInsights.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Inbox className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No insights pending</EmptyTitle>
              <EmptyDescription>
                AI-detected insights from your voice notes will appear here.
                Apply them to update player profiles.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  // Helper to render insight card
  // type: "matched" | "unmatched" | "classified" | "uncategorized"
  const renderInsightCard = (
    insight: (typeof pendingInsights)[0],
    type: "matched" | "unmatched" | "classified" | "uncategorized"
  ) => {
    const isUnmatched = type === "unmatched";
    const isUncategorized = type === "uncategorized";
    const needsAction = isUnmatched || isUncategorized;

    // Determine card styling based on type
    const cardStyles = {
      matched: "border-blue-200 bg-blue-50",
      unmatched: "border-amber-300 bg-amber-50",
      classified: "border-blue-200 bg-blue-50",
      uncategorized: "border-orange-300 bg-orange-50",
    };

    return (
      <div
        className={`flex flex-col gap-3 rounded-lg border-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4 ${cardStyles[type]}`}
        key={insight.id}
      >
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-semibold text-gray-800 text-sm sm:text-base">
              {insight.title}
            </span>
            {insight.playerIdentityId ? (
              <Badge className="text-xs" variant="secondary">
                {insight.playerName}
              </Badge>
            ) : insight.playerName ? (
              <Badge className="border-amber-400 bg-amber-100 text-amber-800 text-xs">
                ⚠️ {insight.playerName} (not matched)
              </Badge>
            ) : insight.category === "team_culture" ? (
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                Team
              </Badge>
            ) : insight.category === "todo" ? (
              <>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  TODO
                </Badge>
                {(insight as any).linkedTaskId && (
                  <Badge className="gap-1 bg-blue-100 text-blue-700 text-xs">
                    ✓ Task created
                  </Badge>
                )}
              </>
            ) : (
              <Badge className="border-orange-400 bg-orange-100 text-orange-800 text-xs">
                ⚠️ Needs classification
              </Badge>
            )}
            {insight.category &&
              insight.category !== "team_culture" &&
              insight.category !== "todo" && (
                <Badge className="text-xs" variant="outline">
                  {insight.category}
                </Badge>
              )}
          </div>
          {/* Date/Time */}
          <p className="mb-2 text-gray-500 text-xs">
            {formatInsightDate(insight.noteDate)}
          </p>
          <p className="mb-2 text-gray-700 text-xs sm:text-sm">
            {insight.description}
          </p>
          {insight.recommendedUpdate && (
            <p className="text-gray-500 text-xs italic">
              {insight.recommendedUpdate}
            </p>
          )}
          {/* Hints for insights needing action */}
          {isUnmatched && (
            <p className="mt-2 text-amber-700 text-xs">
              💡 Player &quot;{insight.playerName}&quot; wasn&apos;t found in
              your team. Assign a player below to generate a parent summary.
            </p>
          )}
          {isUncategorized && (
            <p className="mt-2 text-orange-700 text-xs">
              💡 Is this about a specific player, the team, or a task you need
              to do? Classify it to apply.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {/* Assign Player button for unmatched insights */}
          {isUnmatched && (
            <Button
              className="h-8 bg-amber-600 px-2 hover:bg-amber-700 sm:h-9 sm:px-3"
              onClick={() =>
                setAssigningInsight({
                  noteId: insight.noteId,
                  insightId: insight.id,
                  playerName: insight.playerName,
                })
              }
              size="sm"
              title="Assign to a player"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              Assign
            </Button>
          )}
          {/* Classify button for uncategorized insights */}
          {isUncategorized && (
            <Button
              className="h-8 bg-orange-600 px-2 hover:bg-orange-700 sm:h-9 sm:px-3"
              onClick={() =>
                setClassifyingInsight({
                  noteId: insight.noteId,
                  insightId: insight.id,
                  title: insight.title,
                  description: insight.description,
                })
              }
              size="sm"
              title="Classify this insight"
            >
              Classify
            </Button>
          )}
          {insight.playerIdentityId && (
            <Button
              className="h-8 px-2 sm:h-9 sm:px-3"
              onClick={() => {
                router.push(
                  `/orgs/${orgId}/coach/messages/compose?type=insight&voiceNoteId=${insight.noteId}&insightId=${insight.id}&playerIdentityId=${insight.playerIdentityId}` as Route
                );
              }}
              size="sm"
              title="Share with Parent"
              variant="secondary"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-8 px-2 sm:h-9 sm:px-3"
            onClick={() => handleEditInsight(insight)}
            size="sm"
            title="Edit insight"
            variant="ghost"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 px-2 sm:h-9 sm:px-3"
            disabled={needsAction}
            onClick={() => handleApplyInsight(insight.noteId, insight.id)}
            size="sm"
            title={
              needsAction
                ? isUnmatched
                  ? "Assign a player first to apply this insight"
                  : "Classify this insight first to apply"
                : "Apply insight"
            }
            variant="default"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 px-2 sm:h-9 sm:px-3"
            onClick={() => handleDismissInsight(insight.noteId, insight.id)}
            size="sm"
            title="Dismiss insight"
            variant="outline"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Calculate totals for display
  // Combine and sort ready-to-apply insights by most recent first
  const readyToApplyInsights = [
    ...matchedInsights,
    ...classifiedTeamInsights,
  ].sort(
    (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );

  // Combine and sort needs-attention insights by most recent first
  const needsAttentionInsights = [
    ...unmatchedInsights,
    ...uncategorizedInsights,
  ].sort(
    (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );

  const readyToApplyCount = readyToApplyInsights.length;
  const needsAttentionCount = needsAttentionInsights.length;

  return (
    <>
      {/* Needs Attention Section - Unmatched players and uncategorized insights */}
      {needsAttentionCount > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-amber-800 text-lg sm:text-xl">
              <AlertTriangle className="h-5 w-5" />
              Needs Your Help ({needsAttentionCount})
            </CardTitle>
            <CardDescription className="text-amber-700 text-xs sm:text-sm">
              {unmatchedInsights.length > 0 &&
                `${unmatchedInsights.length} insight${unmatchedInsights.length !== 1 ? "s" : ""} mention players we couldn't match. `}
              {uncategorizedInsights.length > 0 &&
                `${uncategorizedInsights.length} insight${uncategorizedInsights.length !== 1 ? "s" : ""} need classification.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* All needs-attention insights sorted by most recent */}
            {needsAttentionInsights.map((insight) => {
              const type = insight.playerName ? "unmatched" : "uncategorized";
              return renderInsightCard(insight, type);
            })}
          </CardContent>
        </Card>
      )}

      {/* Ready to Apply - Matched players and classified team insights */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                AI Insights
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {readyToApplyCount > 0
                  ? `${readyToApplyCount} insight${readyToApplyCount !== 1 ? "s" : ""} ready to apply`
                  : "No insights ready to apply"}
                {needsAttentionCount > 0 &&
                  ` • ${needsAttentionCount} need${needsAttentionCount !== 1 ? "" : "s"} your attention above`}
              </CardDescription>
            </div>
            {readyToApplyCount > 1 && (
              <Button
                className="h-8 shrink-0 gap-1.5 bg-green-600 px-3 hover:bg-green-700 sm:h-9"
                disabled={isBulkApplying}
                onClick={() => handleBulkApply(readyToApplyInsights)}
                size="sm"
              >
                {isBulkApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Apply All ({readyToApplyCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {readyToApplyCount === 0 ? (
            <p className="py-4 text-center text-gray-500 text-sm">
              {needsAttentionCount > 0
                ? "Resolve the insights above to see them here."
                : "No pending insights."}
            </p>
          ) : (
            <>
              {/* All ready-to-apply insights sorted by most recent */}
              {readyToApplyInsights.map((insight) => {
                const type = insight.playerIdentityId
                  ? "matched"
                  : "classified";
                return renderInsightCard(insight, type);
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Insight Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setEditingInsight(null)}
        open={!!editingInsight}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Insight</DialogTitle>
            <DialogDescription>
              Make changes to the insight before applying it.
            </DialogDescription>
          </DialogHeader>
          {editingInsight && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  onChange={(e) =>
                    setEditingInsight({
                      ...editingInsight,
                      title: e.target.value,
                    })
                  }
                  value={editingInsight.title}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  onChange={(e) =>
                    setEditingInsight({
                      ...editingInsight,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  value={editingInsight.description}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recommendedUpdate">Recommended Update</Label>
                <Textarea
                  id="recommendedUpdate"
                  onChange={(e) =>
                    setEditingInsight({
                      ...editingInsight,
                      recommendedUpdate: e.target.value,
                    })
                  }
                  placeholder="What action should be taken?"
                  rows={2}
                  value={editingInsight.recommendedUpdate}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => setEditingInsight(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSaving || !editingInsight?.title.trim()}
              onClick={handleSaveEdit}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Player Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setAssigningInsight(null);
            setPlayerSearch("");
          }
        }}
        open={!!assigningInsight}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Player</DialogTitle>
            <DialogDescription>
              {assigningInsight?.playerName ? (
                <>
                  We couldn&apos;t match &quot;{assigningInsight.playerName}
                  &quot; to your team. Select the correct player below.
                </>
              ) : (
                <>Select a player to assign this insight to.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="sr-only" htmlFor="player-search">
              Search players
            </Label>
            <Input
              id="player-search"
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search players..."
              value={playerSearch}
            />
            <div className="mt-3 max-h-60 overflow-y-auto rounded-md border">
              {isSessionLoading || isPlayersLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-gray-500 text-sm">
                    Loading players...
                  </span>
                </div>
              ) : filteredPlayers && filteredPlayers.length > 0 ? (
                filteredPlayers.slice(0, 20).map((player) => (
                  <button
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100"
                    disabled={isSaving}
                    key={player._id}
                    onClick={() => handleAssignPlayer(player._id)}
                    type="button"
                  >
                    <span className="font-medium">
                      {player.firstName} {player.lastName}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {player.ageGroup}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-gray-500 text-sm">
                  {playerSearch
                    ? "No players found matching your search"
                    : "No players found in your teams"}
                </p>
              )}
              {filteredPlayers && filteredPlayers.length > 20 && (
                <p className="border-t px-3 py-2 text-center text-gray-500 text-xs">
                  Showing first 20 results. Type to search more specifically.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => {
                setAssigningInsight(null);
                setPlayerSearch("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Classify Insight Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setClassifyingInsight(null)}
        open={!!classifyingInsight}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Classify This Insight</DialogTitle>
            <DialogDescription>
              How would you like to categorize this insight?
            </DialogDescription>
          </DialogHeader>
          {classifyingInsight && (
            <div className="py-4">
              {/* Show insight preview */}
              <div className="mb-4 rounded-lg border bg-gray-50 p-3">
                <p className="font-medium text-gray-800 text-sm">
                  {classifyingInsight.title}
                </p>
                {classifyingInsight.description && (
                  <p className="mt-1 text-gray-600 text-xs">
                    {classifyingInsight.description}
                  </p>
                )}
              </div>

              {/* Classification options */}
              <div className="space-y-3">
                {/* Player Assignment Option */}
                <Button
                  className="w-full justify-start"
                  disabled={isSaving}
                  onClick={() => {
                    setAssigningInsight({
                      noteId: classifyingInsight.noteId,
                      insightId: classifyingInsight.insightId,
                    });
                    setClassifyingInsight(null);
                  }}
                  variant="outline"
                >
                  <UserPlus className="mr-2 h-4 w-4 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">About a specific player</div>
                    <div className="text-gray-500 text-xs">
                      Assign to a player from your team
                    </div>
                  </div>
                </Button>

                {/* Team Insight Option - Show team picker */}
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">Team insight</span>
                  </div>
                  <p className="mb-2 text-gray-500 text-xs">
                    Select which team this insight is about:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coachTeams?.teams && coachTeams.teams.length > 0 ? (
                      coachTeams.teams.map(
                        (team: {
                          teamId: string;
                          teamName: string;
                          ageGroup?: string;
                        }) => (
                          <Button
                            className="h-auto px-3 py-1.5"
                            disabled={isSaving}
                            key={team.teamId}
                            onClick={() =>
                              handleClassifyAsTeamInsight(
                                team.teamId,
                                team.teamName
                              )
                            }
                            size="sm"
                            variant="secondary"
                          >
                            {team.teamName}
                            {team.ageGroup && (
                              <span className="ml-1 text-gray-500 text-xs">
                                ({team.ageGroup})
                              </span>
                            )}
                          </Button>
                        )
                      )
                    ) : (
                      <p className="text-gray-400 text-xs italic">
                        No teams assigned
                      </p>
                    )}
                  </div>
                </div>

                {/* TODO Option - Assign to self or show other coaches */}
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">
                      Action item / TODO
                    </span>
                  </div>
                  <p className="mb-2 text-gray-500 text-xs">
                    Who should handle this task?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-auto bg-green-600 px-3 py-1.5 hover:bg-green-700"
                      disabled={isSaving}
                      onClick={() => handleClassifyAsTodo()}
                      size="sm"
                    >
                      Assign to me
                    </Button>
                    {/* Future: Could add other coaches here if needed */}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => setClassifyingInsight(null)}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
