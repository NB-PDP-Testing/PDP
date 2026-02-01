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
  Sparkles,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SmartActionBar } from "@/components/coach/smart-action-bar";
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
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { InsightReactions } from "./insight-reactions";
import { InsightsViewContainer } from "./insights-view-container";
import { SwipeableInsightCard } from "./swipeable-insight-card";

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

type AssigningTeamInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
} | null;

type AssigningCoachInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  recordingCoachId?: string; // The coach who recorded this voice note
} | null;

type ClassifyingInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  description?: string;
} | null;

type UndoingInsight = {
  autoAppliedInsightId: Id<"autoAppliedInsights">;
  fieldChanged?: string;
  previousValue?: string;
  newValue: string;
  playerName?: string;
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

// Format relative time for auto-applied insights
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const elapsed = now - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  return formatInsightDate(timestamp);
}

export function InsightsTab({ orgId, onSuccess, onError }: InsightsTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editingInsight, setEditingInsight] = useState<EditingInsight>(null);
  const [assigningInsight, setAssigningInsight] =
    useState<AssigningInsight>(null);
  const [assigningTeamInsight, setAssigningTeamInsight] =
    useState<AssigningTeamInsight>(null);
  const [assigningCoachInsight, setAssigningCoachInsight] =
    useState<AssigningCoachInsight>(null);
  const [classifyingInsight, setClassifyingInsight] =
    useState<ClassifyingInsight>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "pending" | "auto-applied" | "settings"
  >("pending");
  const [undoingInsight, setUndoingInsight] = useState<UndoingInsight>(null);
  const [undoReason, setUndoReason] = useState<string>("wrong_rating");
  const [undoReasonOther, setUndoReasonOther] = useState<string>("");

  // Get coach ID from session (use id as fallback if userId is null)
  const coachUserId = session?.user?.id;
  const coachId = session?.user?.userId || coachUserId;
  const coachName = session?.user?.name ?? "Me";

  // Voice notes for pending insights - scoped to this coach's notes only
  const voiceNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    coachId ? { orgId, coachId } : "skip"
  );

  // Fetch voiceNoteInsights records to map string IDs to Convex IDs (for reactions)
  // This avoids the issue of passing string IDs where Convex IDs are expected
  const voiceNoteIds = voiceNotes?.map((note) => note._id) ?? [];
  const allInsightRecords = useQuery(
    api.models.voiceNoteInsights.getInsightsByVoiceNotes,
    voiceNoteIds.length > 0 ? { voiceNoteIds } : "skip"
  );

  // Create a mapping from noteId_insightId → Convex _id for quick lookup
  const insightIdMap = new Map<string, Id<"voiceNoteInsights">>();
  if (allInsightRecords) {
    for (const record of allInsightRecords) {
      const key = `${record.voiceNoteId}_${record.insightId}`;
      insightIdMap.set(key, record._id);
    }
  }

  // Get players for assignment dropdown - scoped to coach's assigned teams

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

  // Get fellow coaches on same teams for TODO assignment
  const fellowCoaches = useQuery(
    api.models.coaches.getFellowCoachesForTeams,
    coachUserId ? { userId: coachUserId, organizationId: orgId } : "skip"
  );

  // Get coach trust level for wouldAutoApply calculation (Phase 7.1)
  const coachTrustLevel = useQuery(
    api.models.coachTrustLevels.getCoachTrustLevelWithInsightFields
  );

  // Get auto-applied insights (Phase 7.2)
  const autoAppliedInsights = useQuery(
    api.models.voiceNoteInsights.getAutoAppliedInsights,
    coachUserId ? { organizationId: orgId, coachId: coachUserId } : "skip"
  );

  // Get coach org preferences for AI feature toggles (P8 Week 1.5)
  const _coachPref = useQuery(
    api.models.trustGatePermissions.getCoachOrgPreferences,
    coachId && orgId ? { coachId, organizationId: orgId } : "skip"
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
  const undoAutoAppliedInsight = useMutation(
    api.models.voiceNoteInsights.undoAutoAppliedInsight
  );
  const toggleAIFeature = useMutation(
    api.models.trustGatePermissions.toggleAIFeatureSetting
  );
  const setPreferredLevel = useMutation(
    api.models.coachTrustLevels.setPreferredTrustLevel
  );

  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [_isTogglingFeature, setIsTogglingFeature] = useState(false);
  const [_isChangingTrustLevel, setIsChangingTrustLevel] = useState(false);

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

  const handleAssignTeam = async (teamId: string, teamName: string) => {
    if (!assigningTeamInsight) {
      return;
    }

    setIsSaving(true);
    try {
      await classifyInsight({
        noteId: assigningTeamInsight.noteId,
        insightId: assigningTeamInsight.insightId,
        category: "team_culture",
        teamId,
        teamName,
      });
      onSuccess(`Assigned to ${teamName}.`);
      setAssigningTeamInsight(null);
    } catch (error) {
      console.error("Failed to assign team:", error);
      onError("Failed to assign team to insight.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignCoach = async (
    assigneeUserId: string,
    assigneeName: string
  ) => {
    if (!assigningCoachInsight) {
      return;
    }

    setIsSaving(true);
    try {
      await classifyInsight({
        noteId: assigningCoachInsight.noteId,
        insightId: assigningCoachInsight.insightId,
        category: "todo",
        assigneeUserId,
        assigneeName,
        createdByUserId: session?.user?.id,
        createdByName: session?.user?.name,
      });
      onSuccess(`Assigned to ${assigneeName}.`);
      setAssigningCoachInsight(null);
    } catch (error) {
      console.error("Failed to assign coach:", error);
      onError("Failed to assign coach to insight.");
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

  const handleUndoAutoApplied = async () => {
    if (!undoingInsight) {
      return;
    }
    setIsSaving(true);
    try {
      const finalReason = undoReason === "other" ? undoReasonOther : undoReason;
      const result = await undoAutoAppliedInsight({
        autoAppliedInsightId: undoingInsight.autoAppliedInsightId,
        undoReason: finalReason as
          | "wrong_player"
          | "wrong_rating"
          | "insight_incorrect"
          | "changed_mind"
          | "duplicate"
          | "other",
      });
      if (result.success) {
        onSuccess(
          `Auto-apply undone. ${undoingInsight.fieldChanged ? `${undoingInsight.fieldChanged} reverted to ${undoingInsight.previousValue || "none"}` : "Skill rating reverted"}.`
        );
        setUndoingInsight(null);
        setUndoReason("wrong_rating");
        setUndoReasonOther("");
      } else {
        onError(result.message);
      }
    } catch (error) {
      console.error("Failed to undo auto-applied insight:", error);
      onError("Failed to undo insight.");
    } finally {
      setIsSaving(false);
    }
  };

  const _handleToggleAIFeature = async (
    feature:
      | "aiInsightMatchingEnabled"
      | "autoApplyInsightsEnabled"
      | "parentSummariesEnabled",
    enabled: boolean
  ) => {
    if (!orgId) {
      return;
    }
    setIsTogglingFeature(true);
    try {
      await toggleAIFeature({
        organizationId: orgId,
        feature,
        enabled,
      });
      onSuccess(
        `${feature === "aiInsightMatchingEnabled" ? "AI Insight Matching" : feature === "autoApplyInsightsEnabled" ? "Auto-Apply Insights" : "Parent Summaries"} ${enabled ? "enabled" : "disabled"}`
      );
    } catch (error: any) {
      onError(error.message || "Failed to update setting");
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const _handleChangePreferredLevel = async (level: number) => {
    if (!orgId) {
      return;
    }
    setIsChangingTrustLevel(true);
    try {
      await setPreferredLevel({
        preferredLevel: level,
        organizationId: orgId,
      });
      onSuccess(`Trust level set to Level ${level}`);
    } catch (error: any) {
      onError(error.message || "Failed to update trust level");
    } finally {
      setIsChangingTrustLevel(false);
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to apply insight.";
      onError(errorMessage);
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

  // Get ALL insights from all notes (for board view) and sort by most recent first
  const allInsights =
    voiceNotes
      ?.flatMap((note) =>
        note.insights.map((i) => ({
          ...i,
          noteId: note._id,
          noteDate: note.date,
          noteCoachId: note.coachId, // Pass through recording coach ID
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      ) ?? [];

  // Get pending insights from all notes and sort by most recent first
  const pendingInsights =
    voiceNotes
      ?.flatMap((note) =>
        note.insights
          .filter((i) => i.status === "pending")
          .map((i) => ({
            ...i,
            noteId: note._id,
            noteDate: note.date,
            noteCoachId: note.coachId, // Pass through recording coach ID
          }))
      )
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      ) ?? [];

  // Calculate wouldAutoApply for each insight (Phase 7.1)
  const effectiveLevel = coachTrustLevel
    ? Math.min(
        coachTrustLevel.currentLevel,
        coachTrustLevel.preferredLevel ?? coachTrustLevel.currentLevel
      )
    : 0;
  const threshold = coachTrustLevel?.insightConfidenceThreshold ?? 0.7;

  const insightsWithPrediction = pendingInsights.map((insight) => {
    // Calculate if this insight would auto-apply at current trust level
    // Level 0/1: Never auto-apply (always false)
    // Level 2+: Auto-apply if NOT injury/medical AND confidence >= threshold
    // Injury/medical categories: NEVER auto-apply (safety guardrail)
    const confidence = (insight as any).confidence ?? 0.7; // Default for legacy insights
    const wouldAutoApply =
      insight.category !== "injury" &&
      insight.category !== "medical" &&
      effectiveLevel >= 2 &&
      confidence >= threshold;

    return {
      ...insight,
      wouldAutoApply,
    };
  });

  // Separate insights by type:
  // 1. Matched: Has playerIdentityId (can be applied directly)
  // 2. Unmatched: Has playerName but no match (needs player assignment)
  // 3. Team insights WITH teamId: Ready to apply
  // 4. Team insights WITHOUT teamId: Needs team assignment
  // 5. TODO insights WITH assignee: Ready to apply
  // 6. TODO insights WITHOUT assignee: Needs assignee (future)
  // 7. Uncategorized: No player and no team-level category (needs classification)
  const matchedInsights = insightsWithPrediction.filter(
    (i) => i.playerIdentityId
  );
  const unmatchedInsights = insightsWithPrediction.filter(
    (i) => !i.playerIdentityId && i.playerName
  );

  // Team insights WITH teamId - ready to apply
  const classifiedTeamInsights = insightsWithPrediction.filter(
    (i) =>
      !(i.playerIdentityId || i.playerName) &&
      i.category === "team_culture" &&
      (i as any).teamId
  );

  // Team insights WITHOUT teamId - needs team assignment
  const teamInsightsNeedingAssignment = insightsWithPrediction.filter(
    (i) =>
      !(i.playerIdentityId || i.playerName) &&
      i.category === "team_culture" &&
      !(i as any).teamId
  );

  // TODO insights WITH assignee - ready to apply
  const assignedTodoInsights = insightsWithPrediction.filter(
    (i) =>
      !(i.playerIdentityId || i.playerName) &&
      i.category === "todo" &&
      (i as any).assigneeUserId
  );

  // TODO insights WITHOUT assignee - needs coach assignment
  const unassignedTodoInsights = insightsWithPrediction.filter(
    (i) =>
      !(i.playerIdentityId || i.playerName) &&
      i.category === "todo" &&
      !(i as any).assigneeUserId
  );

  // Insights without player AND without team-level category need classification
  const uncategorizedInsights = insightsWithPrediction.filter(
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

  if (
    insightsWithPrediction.length === 0 &&
    (!autoAppliedInsights || autoAppliedInsights.length === 0)
  ) {
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
    const isTeamWithoutTeamId =
      insight.category === "team_culture" && !(insight as any).teamId;
    const isTodoWithoutAssignee =
      insight.category === "todo" && !(insight as any).assigneeUserId;
    const needsAction =
      isUnmatched ||
      isUncategorized ||
      isTeamWithoutTeamId ||
      isTodoWithoutAssignee;

    // Determine card styling based on type
    const cardStyles = {
      matched: "border-blue-200 bg-blue-50",
      unmatched: "border-amber-300 bg-amber-50",
      classified: "border-blue-200 bg-blue-50",
      uncategorized: "border-orange-300 bg-orange-50",
    };

    return (
      <SwipeableInsightCard
        key={insight.id}
        onApply={() => handleApplyInsight(insight.noteId, insight.id)}
        onDismiss={() => handleDismissInsight(insight.noteId, insight.id)}
      >
        <div
          className={`flex flex-col gap-3 rounded-lg border-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4 ${cardStyles[type]}`}
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
                  {(insight as any).teamName
                    ? `Team: ${(insight as any).teamName}`
                    : "Team"}
                </Badge>
              ) : insight.category === "todo" ? (
                <>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    TODO
                  </Badge>
                  {(insight as any).assigneeName && (
                    <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                      → {(insight as any).assigneeName}
                    </Badge>
                  )}
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

            {/* Insight Reactions (Phase 9 Week 1) */}
            {(() => {
              const key = `${insight.noteId}_${insight.id}`;
              const convexId = insightIdMap.get(key);
              return convexId ? (
                <div className="mt-3">
                  <InsightReactions
                    insightId={convexId}
                    organizationId={orgId}
                  />
                </div>
              ) : null;
            })()}

            {/* Smart Action Bar (Phase 9 Week 2 - AI Copilot) */}
            {session?.user?.id &&
              (() => {
                const key = `${insight.noteId}_${insight.id}`;
                const convexId = insightIdMap.get(key);
                return convexId ? (
                  <div className="mt-3">
                    <SmartActionBar
                      context="viewing_insight"
                      contextId={convexId}
                      onActionClick={async (action: string) => {
                        // Handle smart action clicks
                        if (action.startsWith("apply:")) {
                          // Apply insight action - mark as applied
                          try {
                            await updateInsightStatus({
                              noteId: insight.noteId,
                              insightId: insight.id,
                              status: "applied",
                            });
                            onSuccess("Insight marked as applied");
                          } catch (error) {
                            console.error("Failed to apply insight:", error);
                            onError("Failed to apply insight");
                          }
                        } else if (action.startsWith("mention:")) {
                          // Mention coach action - future: open comment form with @mention
                          toast.info(
                            "💬 Comment with @mention feature coming soon! Use the comment section below to tag coaches."
                          );
                        } else if (action.startsWith("add_to_session:")) {
                          // Add to session action - future: integrate with session planner
                          toast.info(
                            "📅 Session planning integration coming soon! Bookmark this insight for now."
                          );
                        } else if (action.startsWith("create_task:")) {
                          // Create task action - future: task management system
                          toast.info(
                            "✅ Task creation coming soon! Add a reminder to track this."
                          );
                        } else {
                          // Generic action - log for debugging
                          console.log("Smart action:", action);
                          toast.info(
                            "Action recorded - full implementation coming soon"
                          );
                        }
                      }}
                      organizationId={orgId}
                      userId={session.user.id}
                    />
                  </div>
                ) : null;
              })()}

            {/* AI Confidence Visualization (Phase 7.1) */}
            {(insight as any).confidence !== undefined && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      (insight as any).confidence < 0.6
                        ? "text-red-600"
                        : (insight as any).confidence < 0.8
                          ? "text-amber-600"
                          : "text-green-600"
                    )}
                  >
                    AI Confidence:{" "}
                    {Math.round((insight as any).confidence * 100)}%
                  </span>
                </div>
                <Progress
                  className="h-2"
                  value={(insight as any).confidence * 100}
                />

                {/* Preview Mode Badge (Phase 7.1) */}
                {(insight as any).wouldAutoApply ? (
                  <Badge
                    className="bg-blue-100 text-blue-700"
                    variant="secondary"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI would auto-apply this at Level 2+
                  </Badge>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Requires manual review
                  </p>
                )}
              </div>
            )}
            {/* Hints for insights needing action */}
            {isUnmatched && (
              <p className="mt-2 text-amber-700 text-xs">
                💡 Player &quot;{insight.playerName}&quot; wasn&apos;t found in
                your team. Assign a player below to generate a parent summary.
              </p>
            )}
            {isTeamWithoutTeamId && (
              <p className="mt-2 text-purple-700 text-xs">
                💡 This is a team insight but no specific team was mentioned.
                {coachTeams?.teams && coachTeams.teams.length === 1 ? (
                  <>
                    {" "}
                    Assign it to <strong>{coachTeams.teams[0].teamName}</strong>
                    ?
                  </>
                ) : (
                  " Assign it to a team below to apply."
                )}
              </p>
            )}
            {insight.category === "todo" &&
              !(insight as any).assigneeUserId && (
                <p className="mt-2 text-green-700 text-xs">
                  💡 This TODO couldn&apos;t be matched to a specific coach.
                  Assign it to yourself or another coach to create a task.
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
            {/* Assign Team button for team insights without teamId */}
            {isTeamWithoutTeamId && (
              <Button
                className="h-8 bg-purple-600 px-2 hover:bg-purple-700 sm:h-9 sm:px-3"
                onClick={() =>
                  setAssigningTeamInsight({
                    noteId: insight.noteId,
                    insightId: insight.id,
                    title: insight.title,
                  })
                }
                size="sm"
                title="Assign to a team"
              >
                <Users className="mr-1 h-4 w-4" />
                Assign Team
              </Button>
            )}
            {/* Assign Coach button for TODO insights without assignee */}
            {insight.category === "todo" &&
              !(insight as any).assigneeUserId && (
                <Button
                  className="h-8 bg-green-600 px-2 hover:bg-green-700 sm:h-9 sm:px-3"
                  onClick={() =>
                    setAssigningCoachInsight({
                      noteId: insight.noteId,
                      insightId: insight.id,
                      title: insight.title,
                      recordingCoachId: (insight as any).noteCoachId,
                    })
                  }
                  size="sm"
                  title="Assign to a coach"
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Assign Coach
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
                    : isTeamWithoutTeamId
                      ? "Assign to a team first to apply this insight"
                      : isTodoWithoutAssignee
                        ? "Assign to a coach first to apply this insight"
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
      </SwipeableInsightCard>
    );
  };

  // Calculate totals for display
  // Combine and sort ready-to-apply insights by most recent first
  const readyToApplyInsights = [
    ...matchedInsights,
    ...classifiedTeamInsights,
    ...assignedTodoInsights,
  ].sort(
    (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );

  // Combine and sort needs-attention insights by most recent first
  const needsAttentionInsights = [
    ...unmatchedInsights,
    ...teamInsightsNeedingAssignment,
    ...unassignedTodoInsights,
    ...uncategorizedInsights,
  ].sort(
    (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );

  const readyToApplyCount = readyToApplyInsights.length;
  const needsAttentionCount = needsAttentionInsights.length;

  return (
    <>
      <Tabs
        onValueChange={(value) =>
          setActiveTab(value as "pending" | "auto-applied")
        }
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="auto-applied">Auto-Applied</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="pending">
          <InsightsViewContainer insights={allInsights} orgId={orgId}>
            {/* Needs Attention Section - Unmatched players and uncategorized insights */}
            {needsAttentionCount > 0 && (
              <Card className="border-amber-300 bg-amber-50">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-amber-800 text-lg sm:text-xl">
                    <AlertTriangle className="h-5 w-5" />
                    Needs Your Help ({needsAttentionCount})
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-xs sm:text-sm">
                    {unmatchedInsights.length > 0 &&
                      `${unmatchedInsights.length} insight${unmatchedInsights.length !== 1 ? "s" : ""} mention players we couldn't match. `}
                    {teamInsightsNeedingAssignment.length > 0 &&
                      `${teamInsightsNeedingAssignment.length} team insight${teamInsightsNeedingAssignment.length !== 1 ? "s" : ""} need team assignment. `}
                    {unassignedTodoInsights.length > 0 &&
                      `${unassignedTodoInsights.length} TODO${unassignedTodoInsights.length !== 1 ? "s" : ""} need coach assignment. `}
                    {uncategorizedInsights.length > 0 &&
                      `${uncategorizedInsights.length} insight${uncategorizedInsights.length !== 1 ? "s" : ""} need classification.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* All needs-attention insights sorted by most recent */}
                  {needsAttentionInsights.map((insight) => {
                    // Determine type based on what's missing
                    let type:
                      | "matched"
                      | "unmatched"
                      | "classified"
                      | "uncategorized" = "uncategorized";
                    if (insight.playerName) {
                      type = "unmatched"; // Has player name but not matched
                    } else if (
                      insight.category === "team_culture" &&
                      !(insight as any).teamId
                    ) {
                      type = "uncategorized"; // Team insight needing team assignment
                    }
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
          </InsightsViewContainer>
        </TabsContent>

        <TabsContent className="mt-4" value="auto-applied">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                Auto-Applied Insights
              </CardTitle>
              <CardDescription>
                Insights that were automatically applied by AI. You can undo
                within 1 hour.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {autoAppliedInsights === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : autoAppliedInsights.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyMedia variant="icon">
                      <Sparkles className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle>No auto-applied insights yet</EmptyTitle>
                    <EmptyDescription>
                      When you reach Level 2, high-confidence skill insights
                      will auto-apply here
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                autoAppliedInsights.map((insight) => {
                  const appliedAt = insight.appliedAt || 0;
                  const elapsed = Date.now() - appliedAt;
                  const canUndo = elapsed < 3_600_000 && !insight.undoneAt;
                  const isUndone = !!insight.undoneAt;

                  return (
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4",
                        isUndone
                          ? "border-gray-300 bg-gray-50"
                          : "border-green-200 bg-green-50"
                      )}
                      key={insight._id}
                    >
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-semibold text-gray-800 text-sm sm:text-base">
                            {insight.title || "Skill Update"}
                          </span>
                          {isUndone ? (
                            <Badge
                              className="bg-gray-100 text-gray-700"
                              variant="secondary"
                            >
                              Undone
                            </Badge>
                          ) : (
                            <Badge
                              className="bg-green-100 text-green-700"
                              variant="secondary"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Auto-Applied
                            </Badge>
                          )}
                          {insight.playerName && (
                            <Badge className="text-xs" variant="secondary">
                              {insight.playerName}
                            </Badge>
                          )}
                        </div>

                        <p className="mb-2 text-gray-500 text-xs">
                          Applied {formatRelativeTime(appliedAt)}
                        </p>

                        {insight.description && (
                          <p className="mb-2 text-gray-700 text-xs sm:text-sm">
                            {insight.description}
                          </p>
                        )}

                        {insight.fieldChanged && (
                          <div className="mb-2 rounded bg-white p-2 text-sm">
                            <span className="font-medium">
                              {insight.fieldChanged}:
                            </span>{" "}
                            <span className="text-gray-600">
                              {insight.previousValue || "none"}
                            </span>
                            {" → "}
                            <span className="font-medium text-green-600">
                              {insight.newValue}
                            </span>
                          </div>
                        )}

                        {insight.confidenceScore !== undefined && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-green-600">
                                AI Confidence:{" "}
                                {Math.round(insight.confidenceScore * 100)}%
                              </span>
                            </div>
                            <Progress
                              className="h-2"
                              value={insight.confidenceScore * 100}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          className="h-8 px-2 sm:h-9 sm:px-3"
                          disabled={!canUndo || isSaving}
                          onClick={() => {
                            if (canUndo) {
                              setUndoingInsight({
                                autoAppliedInsightId: insight.auditRecordId,
                                fieldChanged: insight.fieldChanged,
                                previousValue: insight.previousValue,
                                newValue: insight.newValue || "",
                                playerName: insight.playerName,
                              });
                            }
                          }}
                          size="sm"
                          title={
                            isUndone
                              ? "Already undone"
                              : canUndo
                                ? "Undo this auto-applied insight"
                                : "Undo window expired (1 hour limit)"
                          }
                          variant={isUndone ? "outline" : "destructive"}
                        >
                          {isUndone ? "Undone" : canUndo ? "Undo" : "Expired"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Undo Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setUndoingInsight(null)}
        open={!!undoingInsight}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Undo Auto-Applied Insight</DialogTitle>
            <DialogDescription>
              This will revert the player&apos;s rating back to{" "}
              {undoingInsight?.previousValue || "none"}. Why are you undoing
              this?
            </DialogDescription>
          </DialogHeader>
          {undoingInsight && (
            <div className="space-y-4 py-4">
              <RadioGroup onValueChange={setUndoReason} value={undoReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="wrong_player" value="wrong_player" />
                  <Label className="font-normal" htmlFor="wrong_player">
                    Wrong player - AI applied to incorrect player
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="wrong_rating" value="wrong_rating" />
                  <Label className="font-normal" htmlFor="wrong_rating">
                    Wrong rating - The suggested rating was incorrect
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    id="insight_incorrect"
                    value="insight_incorrect"
                  />
                  <Label className="font-normal" htmlFor="insight_incorrect">
                    Insight incorrect - The insight itself was wrong
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="changed_mind" value="changed_mind" />
                  <Label className="font-normal" htmlFor="changed_mind">
                    Changed my mind - I want to review this manually
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="duplicate" value="duplicate" />
                  <Label className="font-normal" htmlFor="duplicate">
                    Duplicate - This was already applied
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="other" value="other" />
                  <Label className="font-normal" htmlFor="other">
                    Other (please explain)
                  </Label>
                </div>
              </RadioGroup>

              {undoReason === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="other-reason">Explanation</Label>
                  <Textarea
                    id="other-reason"
                    onChange={(e) => setUndoReasonOther(e.target.value)}
                    placeholder="Please explain why you're undoing this..."
                    rows={3}
                    value={undoReasonOther}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => {
                setUndoingInsight(null);
                setUndoReason("wrong_rating");
                setUndoReasonOther("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                isSaving || (undoReason === "other" && !undoReasonOther.trim())
              }
              onClick={handleUndoAutoApplied}
              variant="destructive"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Undoing...
                </>
              ) : (
                "Undo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Assign Team Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setAssigningTeamInsight(null)}
        open={!!assigningTeamInsight}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign to Team</DialogTitle>
            <DialogDescription>
              This insight is about team culture or dynamics. Select which team
              it refers to.
            </DialogDescription>
          </DialogHeader>
          {assigningTeamInsight && (
            <div className="py-4">
              {/* Show insight title */}
              <div className="mb-4 rounded-lg border bg-gray-50 p-3">
                <p className="font-medium text-gray-800 text-sm">
                  {assigningTeamInsight.title}
                </p>
              </div>

              {/* Team list */}
              <div className="space-y-2">
                {coachTeams?.teams && coachTeams.teams.length > 0 ? (
                  coachTeams.teams.map(
                    (team: {
                      teamId: string;
                      teamName: string;
                      ageGroup?: string;
                    }) => {
                      const isOnlyTeam = coachTeams.teams.length === 1;
                      return (
                        <button
                          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                            isOnlyTeam
                              ? "border-purple-300 bg-purple-50"
                              : "border-gray-200"
                          }`}
                          disabled={isSaving}
                          key={team.teamId}
                          onClick={() =>
                            handleAssignTeam(team.teamId, team.teamName)
                          }
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {team.teamName}
                              </div>
                              {team.ageGroup && (
                                <div className="text-gray-500 text-xs">
                                  {team.ageGroup}
                                </div>
                              )}
                            </div>
                          </div>
                          {isOnlyTeam && (
                            <span className="text-purple-600 text-xs">
                              Suggested
                            </span>
                          )}
                        </button>
                      );
                    }
                  )
                ) : (
                  <p className="px-3 py-4 text-center text-gray-500 text-sm">
                    No teams assigned. Please contact your administrator.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => setAssigningTeamInsight(null)}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Coach Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setAssigningCoachInsight(null)}
        open={!!assigningCoachInsight}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign to Coach</DialogTitle>
            <DialogDescription>
              This TODO couldn&apos;t be matched to a specific coach. Select who
              should handle it.
            </DialogDescription>
          </DialogHeader>
          {assigningCoachInsight && (
            <div className="py-4">
              {/* Show insight title */}
              <div className="mb-4 rounded-lg border bg-gray-50 p-3">
                <p className="font-medium text-gray-800 text-sm">
                  {assigningCoachInsight.title}
                </p>
              </div>

              {/* Coach list */}
              <div className="space-y-2">
                {/* Recording coach - the person who created this voice note */}
                {assigningCoachInsight.recordingCoachId &&
                  (() => {
                    // Find recording coach in fellow coaches list or use current coach
                    const isCurrentUser =
                      assigningCoachInsight.recordingCoachId === coachUserId;
                    const recordingCoach = fellowCoaches?.find(
                      (c) => c.userId === assigningCoachInsight.recordingCoachId
                    );

                    const displayName = isCurrentUser
                      ? coachName
                      : recordingCoach?.userName || "Recording Coach";
                    const _displayEmail = isCurrentUser
                      ? session?.user?.email
                      : recordingCoach?.email;
                    const displayId =
                      assigningCoachInsight.recordingCoachId || coachUserId;

                    return (
                      <button
                        className="flex w-full items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
                        disabled={isSaving || !displayId}
                        onClick={() =>
                          displayId && handleAssignCoach(displayId, displayName)
                        }
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium text-sm">
                              {isCurrentUser
                                ? `You (${displayName})`
                                : displayName}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {isCurrentUser
                                ? "You recorded this voice note"
                                : "Recorded this voice note"}
                            </div>
                          </div>
                        </div>
                        <span className="text-green-600 text-xs">
                          Suggested
                        </span>
                      </button>
                    );
                  })()}

                {/* Fallback: Current coach if no recording coach ID */}
                {!assigningCoachInsight.recordingCoachId && (
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
                    disabled={isSaving}
                    onClick={() =>
                      coachUserId && handleAssignCoach(coachUserId, coachName)
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">
                          You ({coachName})
                        </div>
                        <div className="text-gray-500 text-xs">
                          Assign this task to yourself
                        </div>
                      </div>
                    </div>
                    <span className="text-green-600 text-xs">Suggested</span>
                  </button>
                )}

                {/* Other coaches on same teams */}
                {fellowCoaches && fellowCoaches.length > 0 && (
                  <>
                    <div className="py-2 text-center text-gray-500 text-xs">
                      Or assign to another coach:
                    </div>
                    {fellowCoaches
                      .filter(
                        (coach) =>
                          coach.userId !==
                          assigningCoachInsight.recordingCoachId
                      )
                      .map((coach) => (
                        <button
                          className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                          disabled={isSaving}
                          key={coach.userId}
                          onClick={() =>
                            handleAssignCoach(coach.userId, coach.userName)
                          }
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-gray-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {coach.userName}
                              </div>
                              {coach.email && (
                                <div className="text-gray-500 text-xs">
                                  {coach.email}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-gray-500 text-xs">
                            {coach.sharedTeamCount}{" "}
                            {coach.sharedTeamCount === 1 ? "team" : "teams"}
                          </span>
                        </button>
                      ))}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => setAssigningCoachInsight(null)}
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
                        }) => {
                          const isOnlyTeam = coachTeams.teams.length === 1;
                          return (
                            <Button
                              className={`h-auto px-3 py-1.5 ${isOnlyTeam ? "ring-2 ring-purple-400 ring-offset-2" : ""}`}
                              disabled={isSaving}
                              key={team.teamId}
                              onClick={() =>
                                handleClassifyAsTeamInsight(
                                  team.teamId,
                                  team.teamName
                                )
                              }
                              size="sm"
                              variant={isOnlyTeam ? "default" : "secondary"}
                            >
                              {team.teamName}
                              {team.ageGroup && (
                                <span className="ml-1 text-gray-500 text-xs">
                                  ({team.ageGroup})
                                </span>
                              )}
                            </Button>
                          );
                        }
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
