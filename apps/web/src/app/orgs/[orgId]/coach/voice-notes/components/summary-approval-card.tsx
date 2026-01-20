"use client";

import { CheckCircle, ChevronDown, ChevronUp, XCircle } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SummaryApprovalCardProps = {
  summary: {
    _id: string;
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
  isApproving: boolean;
  isSuppressing: boolean;
};

export function SummaryApprovalCard({
  summary,
  player,
  sport,
  onApprove,
  onSuppress,
  isApproving,
  isSuppressing,
}: SummaryApprovalCardProps) {
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  const playerName = `${player.firstName} ${player.lastName}`;
  const confidenceScore = summary.publicSummary.confidenceScore;

  // Confidence indicator color
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) {
      return "bg-green-500";
    }
    if (score >= 0.6) {
      return "bg-yellow-500";
    }
    return "bg-orange-500";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) {
      return "High";
    }
    if (score >= 0.6) {
      return "Medium";
    }
    return "Review";
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="font-semibold text-lg">
              {playerName}
            </CardTitle>
            {sport && (
              <CardDescription className="text-muted-foreground text-sm">
                {sport.name}
              </CardDescription>
            )}
          </div>
          <Badge
            className={`ml-2 ${getConfidenceColor(confidenceScore)} text-white`}
            variant="outline"
          >
            {getConfidenceLabel(confidenceScore)} (
            {Math.round(confidenceScore * 100)}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Parent-Friendly Summary */}
        <div className="rounded-lg bg-muted p-4">
          <p className="mb-2 font-medium text-muted-foreground text-sm">
            Summary for Parent:
          </p>
          <p className="text-sm leading-relaxed">
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
              className="flex w-full items-center justify-between text-sm"
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
            <div className="space-y-2 rounded-lg border bg-background p-4">
              <p className="font-semibold text-sm">
                {summary.privateInsight.title}
              </p>
              <p className="text-muted-foreground text-sm">
                {summary.privateInsight.description}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={isApproving || isSuppressing}
            onClick={onApprove}
            variant="default"
          >
            {isApproving ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve &amp; Share
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            disabled={isApproving || isSuppressing}
            onClick={onSuppress}
            variant="outline"
          >
            {isSuppressing ? (
              <>
                <XCircle className="mr-2 h-4 w-4 animate-spin" />
                Suppressing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Don't Share
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
