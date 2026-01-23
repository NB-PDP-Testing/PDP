"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightCard } from "./insight-card";

type VoiceNote = {
  _id: Id<"voiceNotes">;
  _creationTime: number;
  orgId: string;
  coachId?: string;
  coachName: string;
  date: string;
  type: "training" | "match" | "general";
  transcription?: string;
  transcriptionStatus?: "pending" | "processing" | "completed" | "failed";
  insights: Array<{
    id: string;
    playerIdentityId?: Id<"playerIdentities">;
    playerName?: string;
    title: string;
    description: string;
    category?: string;
    recommendedUpdate?: string;
    status: "pending" | "applied" | "dismissed";
    appliedDate?: string;
  }>;
  insightsStatus?: "pending" | "processing" | "completed" | "failed";
};

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
  isCoach?: boolean;
  isParent?: boolean;
  isAdmin?: boolean;
};

export function VoiceInsightsSection({
  playerIdentityId,
  orgId,
  isCoach = false,
  isParent = false,
  isAdmin = false,
}: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  // Query voice notes for this player
  const voiceNotes = useQuery(api.models.voiceNotes.getVoiceNotesForPlayer, {
    orgId,
    playerIdentityId,
  });

  // Query parent summaries to check which insights have been shared
  const parentSummaries = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Determine permissions
  const canSeeTranscriptions = isCoach || isAdmin;
  const canSeeAllInsights = isCoach || isAdmin;

  // Filter insights based on permissions
  const filteredNotes = useMemo(() => {
    if (!voiceNotes) {
      return [];
    }

    const filtered: VoiceNote[] = [];

    for (const note of voiceNotes) {
      // Filter insights based on role
      const filteredInsights = note.insights.filter((insight) => {
        // Check if this insight is for this player
        if (insight.playerIdentityId !== playerIdentityId) {
          return false;
        }

        // Parents can only see applied insights
        if (isParent && insight.status !== "applied") {
          return false;
        }

        // Coaches and admins see everything
        return true;
      });

      // Only include notes that have insights after filtering
      if (filteredInsights.length > 0) {
        filtered.push({
          ...note,
          insights: filteredInsights,
        });
      }
    }

    return filtered;
  }, [voiceNotes, playerIdentityId, isParent]);

  // Group insights by coach
  const insightsByCoach = useMemo(() => {
    const grouped = new Map<
      string,
      {
        coachId: string;
        coachName: string;
        notes: VoiceNote[];
      }
    >();

    for (const note of filteredNotes) {
      const coachId = note.coachId || "unknown";
      const coachName = note.coachName || "Unknown Coach";

      if (!grouped.has(coachId)) {
        grouped.set(coachId, {
          coachId,
          coachName,
          notes: [],
        });
      }

      const coachGroup = grouped.get(coachId);
      if (coachGroup) {
        coachGroup.notes.push(note);
      }
    }

    // Sort coaches by most recent note
    return Array.from(grouped.values()).sort((a, b) => {
      const aLatest = Math.max(...a.notes.map((n) => n._creationTime));
      const bLatest = Math.max(...b.notes.map((n) => n._creationTime));
      return bLatest - aLatest;
    });
  }, [filteredNotes]);

  // Count total insights
  const totalInsights = useMemo(
    () => filteredNotes.reduce((sum, note) => sum + note.insights.length, 0),
    [filteredNotes]
  );

  // Check if insight has parent summary
  const getParentSummaryStatus = (
    insightId: string
  ): { hasParentSummary: boolean; parentSummaryApproved: boolean } => {
    if (!parentSummaries) {
      return { hasParentSummary: false, parentSummaryApproved: false };
    }

    // Find the summary for this insight
    for (const child of parentSummaries) {
      for (const sportGroup of child.sportGroups) {
        for (const summary of sportGroup.summaries) {
          if (summary.insightId === insightId) {
            return {
              hasParentSummary: true,
              parentSummaryApproved:
                summary.status === "approved" || summary.status === "delivered",
            };
          }
        }
      }
    }

    return { hasParentSummary: false, parentSummaryApproved: false };
  };

  // Navigate to voice notes tab
  const handleViewInVoiceNotes = (noteId: string) => {
    router.push(
      `/orgs/${orgId}/coach/voice-notes?noteId=${noteId}&highlight=true`
    );
  };

  // Loading state
  if (voiceNotes === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voice Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (filteredNotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voice Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              {isParent
                ? "No insights have been shared yet."
                : "No insights recorded for this player yet."}
            </p>
            {isCoach && (
              <Button
                className="mt-4"
                onClick={() => router.push(`/orgs/${orgId}/coach/voice-notes`)}
                size="sm"
                variant="outline"
              >
                Create Voice Note
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-coach tabs view
  const renderMultiCoachView = () => {
    if (insightsByCoach.length <= 1) {
      return renderSingleCoachView();
    }

    return (
      <Tabs className="w-full" defaultValue={insightsByCoach[0].coachId}>
        <TabsList>
          {insightsByCoach.map((coach) => {
            const coachInsightCount = coach.notes.reduce(
              (sum, note) => sum + note.insights.length,
              0
            );
            return (
              <TabsTrigger key={coach.coachId} value={coach.coachId}>
                {coach.coachName} ({coachInsightCount})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {insightsByCoach.map((coach) => (
          <TabsContent
            className="mt-4 space-y-3"
            key={coach.coachId}
            value={coach.coachId}
          >
            {coach.notes.map((note) =>
              note.insights.map((insight) => {
                const summaryStatus = getParentSummaryStatus(insight.id);
                return (
                  <InsightCard
                    coachName={coach.coachName}
                    hasParentSummary={summaryStatus.hasParentSummary}
                    insight={insight}
                    key={insight.id}
                    noteDate={note.date}
                    noteId={note._id}
                    onViewInVoiceNotes={
                      canSeeAllInsights
                        ? () => handleViewInVoiceNotes(note._id)
                        : undefined
                    }
                    orgId={orgId}
                    parentSummaryApproved={summaryStatus.parentSummaryApproved}
                    showTranscription={canSeeTranscriptions}
                    transcription={note.transcription}
                  />
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  // Single coach view (flat list)
  const renderSingleCoachView = () => (
    <div className="space-y-3">
      {filteredNotes.map((note) =>
        note.insights.map((insight) => {
          const summaryStatus = getParentSummaryStatus(insight.id);
          return (
            <InsightCard
              coachName={note.coachName}
              hasParentSummary={summaryStatus.hasParentSummary}
              insight={insight}
              key={insight.id}
              noteDate={note.date}
              noteId={note._id}
              onViewInVoiceNotes={
                canSeeAllInsights
                  ? () => handleViewInVoiceNotes(note._id)
                  : undefined
              }
              orgId={orgId}
              parentSummaryApproved={summaryStatus.parentSummaryApproved}
              showTranscription={canSeeTranscriptions}
              transcription={note.transcription}
            />
          );
        })
      )}
    </div>
  );

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Voice Insights
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  {totalInsights}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Privacy Notice */}
            {!isParent && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Privacy:</strong> Original voice transcriptions are
                  visible to coaches only. Parents can see approved insights
                  that have been shared with them.
                </AlertDescription>
              </Alert>
            )}

            {/* Insights Display */}
            {renderMultiCoachView()}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
