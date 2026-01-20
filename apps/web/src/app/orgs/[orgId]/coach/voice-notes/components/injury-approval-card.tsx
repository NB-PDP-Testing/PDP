"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type InjuryApprovalCardProps = {
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

export function InjuryApprovalCard({
  summary,
  player,
  sport,
  onApprove,
  onSuppress,
}: InjuryApprovalCardProps) {
  // Checklist state
  const [personallyObserved, setPersonallyObserved] = useState(false);
  const [severityAccurate, setSeverityAccurate] = useState(false);
  const [noMedicalAdvice, setNoMedicalAdvice] = useState(false);

  // Collapsible state - collapsed by default on mobile
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  useEffect(() => {
    // Expand by default on desktop (>= 768px)
    const isDesktop = window.innerWidth >= 768;
    setIsInsightExpanded(isDesktop);
  }, []);

  // Mutation for injury-specific approval
  const approveInjurySummary = useMutation(
    api.models.coachParentSummaries.approveInjurySummary
  );

  const [isApproving, setIsApproving] = useState(false);
  const [isSuppressing, setIsSuppressing] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await approveInjurySummary({
        summaryId: summary._id,
        checklist: {
          personallyObserved,
          severityAccurate,
          noMedicalAdvice,
        },
      });
      toast.success("Injury summary approved");
      onApprove();
    } catch (error) {
      console.error("Failed to approve injury summary:", error);
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
      // Use standard suppress mutation
      await onSuppress();
      toast.success("Summary suppressed");
    } catch (error) {
      console.error("Failed to suppress summary:", error);
      toast.error("Failed to suppress summary");
    } finally {
      setIsSuppressing(false);
    }
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const confidenceScore = summary.publicSummary.confidenceScore;

  // All checklist items must be checked to enable approve
  const canApprove = personallyObserved && severityAccurate && noMedicalAdvice;

  return (
    <Card className="border-l-4 border-l-amber-500">
      {/* Warning Banner */}
      <div className="flex items-center gap-2 bg-amber-50 px-4 py-3 sm:px-6">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="font-semibold text-amber-900 text-sm sm:text-base">
          ⚠️ INJURY-RELATED INSIGHT
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
            className="shrink-0 border-amber-200 bg-amber-100 text-amber-700 text-xs"
            variant="outline"
          >
            Injury ({Math.round(confidenceScore * 100)}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 sm:space-y-4">
        {/* Parent-Friendly Summary */}
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

        {/* Injury Due Diligence Checklist */}
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="mb-3 font-semibold text-amber-900 text-xs sm:text-sm">
            Before approving, confirm the following:
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={personallyObserved}
                className="mt-0.5"
                id="personallyObserved"
                onCheckedChange={(checked) =>
                  setPersonallyObserved(checked === true)
                }
              />
              <label
                className="text-xs leading-relaxed sm:text-sm"
                htmlFor="personallyObserved"
              >
                I personally observed this injury
              </label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                checked={severityAccurate}
                className="mt-0.5"
                id="severityAccurate"
                onCheckedChange={(checked) =>
                  setSeverityAccurate(checked === true)
                }
              />
              <label
                className="text-xs leading-relaxed sm:text-sm"
                htmlFor="severityAccurate"
              >
                The severity description is accurate
              </label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                checked={noMedicalAdvice}
                className="mt-0.5"
                id="noMedicalAdvice"
                onCheckedChange={(checked) =>
                  setNoMedicalAdvice(checked === true)
                }
              />
              <label
                className="text-xs leading-relaxed sm:text-sm"
                htmlFor="noMedicalAdvice"
              >
                This contains no medical advice
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex xs:flex-row flex-col gap-2 pt-1 sm:pt-2">
          <Button
            className="h-9 flex-1 text-xs sm:h-10 sm:text-sm"
            disabled={!canApprove || isApproving || isSuppressing}
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
