"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  Inbox,
  Lightbulb,
  Loader2,
  Pencil,
  Send,
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

export function InsightsTab({ orgId, onSuccess, onError }: InsightsTabProps) {
  const router = useRouter();
  const [editingInsight, setEditingInsight] = useState<EditingInsight>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Voice notes for pending insights
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });
  const updateInsightStatus = useMutation(
    api.models.voiceNotes.updateInsightStatus
  );
  const updateInsightContent = useMutation(
    api.models.voiceNotes.updateInsightContent
  );

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

  // Get pending insights from all notes
  const pendingInsights =
    voiceNotes?.flatMap((note) =>
      note.insights
        .filter((i) => i.status === "pending")
        .map((i) => ({ ...i, noteId: note._id, noteDate: note.date }))
    ) ?? [];

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

  return (
    <>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            AI Insights
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Review and apply insights to player profiles.{" "}
            {pendingInsights.length} pending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInsights.map((insight) => (
            <div
              className="flex flex-col gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4"
              key={insight.id}
            >
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-semibold text-gray-800 text-sm sm:text-base">
                    {insight.title}
                  </span>
                  {insight.playerName ? (
                    <Badge className="text-xs" variant="secondary">
                      {insight.playerName}
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      Team
                    </Badge>
                  )}
                  {insight.category && (
                    <Badge className="text-xs" variant="outline">
                      {insight.category}
                    </Badge>
                  )}
                </div>
                <p className="mb-2 text-gray-700 text-xs sm:text-sm">
                  {insight.description}
                </p>
                {insight.recommendedUpdate && (
                  <p className="text-gray-500 text-xs italic">
                    {insight.recommendedUpdate}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
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
                  onClick={() => handleApplyInsight(insight.noteId, insight.id)}
                  size="sm"
                  title="Apply insight"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  className="h-8 px-2 sm:h-9 sm:px-3"
                  onClick={() =>
                    handleDismissInsight(insight.noteId, insight.id)
                  }
                  size="sm"
                  title="Dismiss insight"
                  variant="outline"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
    </>
  );
}
