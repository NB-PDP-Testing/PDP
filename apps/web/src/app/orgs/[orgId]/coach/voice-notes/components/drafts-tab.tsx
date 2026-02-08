"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ChevronDown, FileCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DraftItem = {
  _id: Id<"insightDrafts">;
  draftId: string;
  artifactId: Id<"voiceNoteArtifacts">;
  title: string;
  description: string;
  insightType: string;
  resolvedPlayerName?: string;
  playerIdentityId?: Id<"playerIdentities">;
  overallConfidence: number;
  aiConfidence: number;
  resolutionConfidence: number;
  evidence: { transcriptSnippet: string; timestampStart?: number };
  requiresConfirmation: boolean;
  status: string;
  createdAt: number;
};

type DraftsTabProps = {
  orgId: string;
  pendingDrafts: DraftItem[];
};

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  injury: "bg-red-100 text-red-700",
  wellbeing: "bg-amber-100 text-amber-700",
  skill_rating: "bg-blue-100 text-blue-700",
  skill_progress: "bg-blue-100 text-blue-700",
  attendance: "bg-purple-100 text-purple-700",
  behavior: "bg-orange-100 text-orange-700",
  performance: "bg-green-100 text-green-700",
  development_milestone: "bg-teal-100 text-teal-700",
  recovery: "bg-amber-100 text-amber-700",
  physical_development: "bg-teal-100 text-teal-700",
  parent_communication: "bg-indigo-100 text-indigo-700",
  tactical: "bg-cyan-100 text-cyan-700",
  team_culture: "bg-violet-100 text-violet-700",
  todo: "bg-emerald-100 text-emerald-700",
  session_plan: "bg-sky-100 text-sky-700",
};

function getConfidenceColor(confidence: number): string {
  if (confidence < 0.6) {
    return "text-red-600";
  }
  if (confidence < 0.8) {
    return "text-amber-600";
  }
  return "text-green-600";
}

function formatInsightType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function groupDraftsByArtifact(drafts: DraftItem[]): Map<string, DraftItem[]> {
  const grouped = new Map<string, DraftItem[]>();
  for (const draft of drafts) {
    const key = draft.artifactId as string;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(draft);
    } else {
      grouped.set(key, [draft]);
    }
  }
  return grouped;
}

export function DraftsTab({ orgId, pendingDrafts }: DraftsTabProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [batchLoadingArtifacts, setBatchLoadingArtifacts] = useState<
    Set<string>
  >(new Set());

  const confirmDraft = useMutation(api.models.insightDrafts.confirmDraft);
  const rejectDraft = useMutation(api.models.insightDrafts.rejectDraft);
  const confirmAllDrafts = useMutation(
    api.models.insightDrafts.confirmAllDrafts
  );
  const rejectAllDrafts = useMutation(api.models.insightDrafts.rejectAllDrafts);

  const handleConfirm = async (draftId: string) => {
    setLoadingIds((prev) => new Set(prev).add(draftId));
    try {
      await confirmDraft({ draftId });
      toast.success("Insight confirmed");
    } catch {
      toast.error("Failed to confirm insight");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
    }
  };

  const handleReject = async (draftId: string) => {
    setLoadingIds((prev) => new Set(prev).add(draftId));
    try {
      await rejectDraft({ draftId });
      toast.success("Draft rejected");
    } catch {
      toast.error("Failed to reject draft");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
    }
  };

  const handleConfirmAll = async (
    artifactId: Id<"voiceNoteArtifacts">,
    count: number
  ) => {
    const key = artifactId as string;
    setBatchLoadingArtifacts((prev) => new Set(prev).add(key));
    try {
      await confirmAllDrafts({ artifactId, organizationId: orgId });
      toast.success(`Confirmed ${count} insight${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to confirm insights");
    } finally {
      setBatchLoadingArtifacts((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRejectAll = async (
    artifactId: Id<"voiceNoteArtifacts">,
    count: number
  ) => {
    const key = artifactId as string;
    setBatchLoadingArtifacts((prev) => new Set(prev).add(key));
    try {
      await rejectAllDrafts({ artifactId, organizationId: orgId });
      toast.success(`Rejected ${count} insight${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to reject insights");
    } finally {
      setBatchLoadingArtifacts((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Loading state
  if (pendingDrafts === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Empty state
  if (pendingDrafts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileCheck className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold text-lg">No pending drafts</h3>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              New insights will appear here after processing voice notes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupDraftsByArtifact(pendingDrafts);

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([artifactId, drafts]) => {
        const isBatchLoading = batchLoadingArtifacts.has(artifactId);
        const typedArtifactId = drafts[0]
          .artifactId as Id<"voiceNoteArtifacts">;

        return (
          <Card key={artifactId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  <span>
                    {drafts.length} pending insight
                    {drafts.length !== 1 ? "s" : ""}
                  </span>
                  <span className="font-normal text-muted-foreground text-sm">
                    {new Date(drafts[0].createdAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    className="h-8 bg-green-600 hover:bg-green-700"
                    disabled={isBatchLoading}
                    onClick={() =>
                      handleConfirmAll(typedArtifactId, drafts.length)
                    }
                    size="sm"
                  >
                    {isBatchLoading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Confirm All ({drafts.length})
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="h-8"
                        disabled={isBatchLoading}
                        size="sm"
                        variant="outline"
                      >
                        Reject All ({drafts.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject all drafts?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject all {drafts.length}{" "}
                          draft{drafts.length !== 1 ? "s" : ""} from this note?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() =>
                            handleRejectAll(typedArtifactId, drafts.length)
                          }
                        >
                          Reject All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.map((draft) => (
                <DraftCard
                  draft={draft}
                  isLoading={loadingIds.has(draft.draftId) || isBatchLoading}
                  key={draft._id}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DraftCard({
  draft,
  isLoading,
  onConfirm,
  onReject,
}: {
  draft: DraftItem;
  isLoading: boolean;
  onConfirm: (draftId: string) => void;
  onReject: (draftId: string) => void;
}) {
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const confidencePercent = Math.round(draft.overallConfidence * 100);
  const typeColor =
    INSIGHT_TYPE_COLORS[draft.insightType] || "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Header: title + badges */}
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-gray-800 text-sm sm:text-base">
              {draft.title}
            </span>
            {draft.resolvedPlayerName && (
              <Badge className="text-xs" variant="secondary">
                {draft.resolvedPlayerName}
              </Badge>
            )}
            <Badge className={cn("text-xs", typeColor)}>
              {formatInsightType(draft.insightType)}
            </Badge>
          </div>

          {/* Description */}
          <p className="mb-2 line-clamp-2 text-gray-700 text-xs sm:text-sm">
            {draft.description}
          </p>

          {/* Confidence bar */}
          <div className="mb-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  "font-medium",
                  getConfidenceColor(draft.overallConfidence)
                )}
              >
                {confidencePercent}% confidence
              </span>
            </div>
            <Progress className="h-2" value={confidencePercent} />
          </div>

          {/* Evidence snippet (collapsible) */}
          <Collapsible onOpenChange={setIsEvidenceOpen} open={isEvidenceOpen}>
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                type="button"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isEvidenceOpen && "rotate-180"
                  )}
                />
                Evidence
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded border-muted-foreground/30 border-l-2 bg-muted/50 px-3 py-2">
                <p className="text-muted-foreground text-xs italic">
                  {draft.evidence.transcriptSnippet}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            className="h-10 sm:h-9"
            disabled={isLoading}
            onClick={() => onReject(draft.draftId)}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Reject"
            )}
          </Button>
          <Button
            className="h-10 bg-green-600 hover:bg-green-700 sm:h-9"
            disabled={isLoading}
            onClick={() => onConfirm(draft.draftId)}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
