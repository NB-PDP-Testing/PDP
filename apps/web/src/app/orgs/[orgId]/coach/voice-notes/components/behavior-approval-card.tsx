"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type BehaviorApprovalCardProps = {
  summary: {
    _id: Id<"coachParentSummaries">;
    publicSummary: {
      content: string;
      confidenceScore: number;
    };
    privateInsight: {
      title: string;
      description: string;
    };
  };
  player: {
    firstName: string;
    lastName: string;
  };
  sport?: {
    name: string;
  };
  onApprove: () => void;
  onSuppress: () => void;
};

export function BehaviorApprovalCard({
  summary,
  player,
  sport,
  onApprove,
  onSuppress,
}: BehaviorApprovalCardProps) {
  // Collapsible state - collapsed by default on mobile
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  useEffect(() => {
    // Expand by default on desktop (>= 768px)
    const isDesktop = window.innerWidth >= 768;
    setIsInsightExpanded(isDesktop);
  }, []);

  // Use standard approve/suppress mutations
  const approveSummary = useMutation(
    api.models.coachParentSummaries.approveSummary
  );
  const suppressSummary = useMutation(
    api.models.coachParentSummaries.suppressSummary
  );

  const [isApproving, setIsApproving] = useState(false);
  const [isSuppressing, setIsSuppressing] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await approveSummary({
        summaryId: summary._id,
      });
      toast.success("Behavior summary approved");
      onApprove();
    } catch (error) {
      console.error("Failed to approve behavior summary:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve summary"
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleSuppress = async () => {
    try {
      setIsSuppressing(true);
      await suppressSummary({
        summaryId: summary._id,
      });
      toast.success("Summary suppressed");
      onSuppress();
    } catch (error) {
      console.error("Failed to suppress summary:", error);
      toast.error("Failed to suppress summary");
    } finally {
      setIsSuppressing(false);
    }
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const confidenceScore = summary.publicSummary.confidenceScore;

  return (
    <Card className="border-l-4 border-l-blue-500">
      {/* Info Banner */}
      <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 sm:px-6">
        <Lock className="h-5 w-5 shrink-0 text-blue-600" />
        <p className="font-medium text-blue-900 text-sm sm:text-base">
          Behavioral observations require manual review
        </p>
      </div>

      {/* Compact header with player name and sport */}
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-base sm:text-lg">
              {playerName}
            </h3>
            {sport && (
              <p className="text-muted-foreground text-xs sm:text-sm">
                {sport.name}
              </p>
            )}
          </div>
          <Badge
            className="shrink-0 border-blue-200 bg-blue-100 text-blue-700 text-xs"
            variant="outline"
          >
            Behavior ({Math.round(confidenceScore * 100)}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 sm:space-y-4">
        {/* Parent-Friendly Summary - Constructively framed */}
        <div className="rounded-lg bg-muted p-3 sm:p-4">
          <p className="mb-1 font-medium text-muted-foreground text-xs sm:mb-2 sm:text-sm">
            Summary for Parent:
          </p>
          <p className="text-xs leading-relaxed sm:text-sm">
            {summary.publicSummary.content}
          </p>
        </div>

        {/* Collapsible Original Insight */}
        <Collapsible
          onOpenChange={setIsInsightExpanded}
          open={isInsightExpanded}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="flex h-8 w-full items-center justify-between px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
              size="sm"
              variant="ghost"
            >
              <span className="font-medium">Original Coach Insight</span>
              {isInsightExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1 rounded-lg border bg-background p-3 sm:space-y-2 sm:p-4">
              <p className="font-semibold text-xs sm:text-sm">
                {summary.privateInsight.title}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {summary.privateInsight.description}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons - no checklist required, just manual review */}
        <div className="flex xs:flex-row flex-col gap-2 pt-1 sm:pt-2">
          <Button
            className="h-9 flex-1 text-xs sm:h-10 sm:text-sm"
            disabled={isApproving || isSuppressing}
            onClick={handleApprove}
            variant="default"
          >
            {isApproving ? (
              <>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Approve &amp; Share
              </>
            )}
          </Button>
          <Button
            className="h-9 flex-1 text-xs sm:h-10 sm:text-sm"
            disabled={isApproving || isSuppressing}
            onClick={handleSuppress}
            variant="outline"
          >
            {isSuppressing ? (
              <>
                <XCircle className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                Suppressing...
              </>
            ) : (
              <>
                <XCircle className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Don't Share
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
