"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle, Inbox, Loader2, Send, XCircle } from "lucide-react";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { authClient } from "@/lib/auth-client";
import { SummaryApprovalCard } from "./summary-approval-card";

const { useSession } = authClient;

type ReviewTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function ReviewTab({ orgId, onSuccess, onError }: ReviewTabProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Get coach ID from session (use id as fallback if userId is null)
  const coachId = session?.user?.userId || session?.user?.id;

  // Parent summary queries and mutations
  const pendingSummaries = useQuery(
    api.models.coachParentSummaries.getCoachPendingSummaries,
    { organizationId: orgId }
  );
  const approveSummary = useMutation(
    api.models.coachParentSummaries.approveSummary
  );
  const suppressSummary = useMutation(
    api.models.coachParentSummaries.suppressSummary
  );

  // Voice notes for pending insights - scoped to this coach's notes only
  const voiceNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    coachId ? { orgId, coachId } : "skip"
  );
  const updateInsightStatus = useMutation(
    api.models.voiceNotes.updateInsightStatus
  );

  // State for summary approval
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [suppressingIds, setSuppressingIds] = useState<Set<string>>(new Set());

  // Parent summary handlers
  const handleApproveSummary = async (summaryId: string) => {
    setApprovingIds((prev) => new Set(prev).add(summaryId));
    try {
      await approveSummary({
        summaryId: summaryId as Id<"coachParentSummaries">,
      });
      onSuccess("Summary approved and shared with parent");
    } catch (error) {
      console.error("Failed to approve summary:", error);
      onError("Failed to approve summary. Please try again.");
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  const handleSuppressSummary = async (summaryId: string) => {
    setSuppressingIds((prev) => new Set(prev).add(summaryId));
    try {
      await suppressSummary({
        summaryId: summaryId as Id<"coachParentSummaries">,
      });
      onSuccess("Summary suppressed - will not be shared");
    } catch (error) {
      console.error("Failed to suppress summary:", error);
      onError("Failed to suppress summary. Please try again.");
    } finally {
      setSuppressingIds((prev) => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  // Insight handlers
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

  // Get pending insights from all notes
  const pendingInsights =
    voiceNotes?.flatMap((note) =>
      note.insights
        .filter((i) => i.status === "pending")
        .map((i) => ({ ...i, noteId: note._id, noteDate: note.date }))
    ) ?? [];

  const isLoading = pendingSummaries === undefined || voiceNotes === undefined;
  const hasNoItems =
    !isLoading &&
    (pendingSummaries?.length ?? 0) === 0 &&
    pendingInsights.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (hasNoItems) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Inbox className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>All caught up!</EmptyTitle>
              <EmptyDescription>
                No pending summaries or insights to review. Create a new voice
                note to generate AI insights.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Pending Parent Summaries */}
      {pendingSummaries && pendingSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              Parent Summaries
              <Badge variant="secondary">{pendingSummaries.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Review AI-generated summaries before sharing with parents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {pendingSummaries.map((item) => (
              <SummaryApprovalCard
                isApproving={approvingIds.has(item._id)}
                isSuppressing={suppressingIds.has(item._id)}
                key={item._id}
                onApprove={() => handleApproveSummary(item._id)}
                onSuppress={() => handleSuppressSummary(item._id)}
                player={
                  item.player
                    ? {
                        firstName: item.player.firstName,
                        lastName: item.player.lastName,
                      }
                    : { firstName: "Unknown", lastName: "Player" }
                }
                sport={item.sport ? { name: item.sport.name } : undefined}
                summary={{
                  _id: item._id,
                  publicSummary: item.publicSummary,
                  privateInsight: item.privateInsight,
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending AI Insights */}
      {pendingInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              AI Detected Insights
              <Badge variant="secondary">{pendingInsights.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Review and apply insights to player profiles
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
                    onClick={() =>
                      handleApplyInsight(insight.noteId, insight.id)
                    }
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
      )}
    </div>
  );
}
