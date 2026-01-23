"use client";

import { CheckCircle, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
      category: string;
      sentiment: "positive" | "neutral" | "concern";
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
  dateTime?: string;
};

export function SummaryApprovalCard({
  summary,
  player,
  sport,
  onApprove,
  onSuppress,
  isApproving,
  isSuppressing,
  dateTime,
}: SummaryApprovalCardProps) {
  // Check if mobile on mount - collapsed by default on mobile for space
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  useEffect(() => {
    // Expand by default on desktop (>= 768px)
    const isDesktop = window.innerWidth >= 768;
    setIsInsightExpanded(isDesktop);
  }, []);

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

  // Get border color based on category (case-insensitive)
  const getBorderColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === "behavior") {
      return "border-l-red-500";
    }
    if (lowerCategory === "injury") {
      return "border-l-orange-500";
    }
    return "border-l-blue-500";
  };

  // Get content box styling based on category (case-insensitive)
  const getContentBoxStyle = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === "behavior") {
      return "bg-red-50 border-l-4 border-red-400";
    }
    if (lowerCategory === "injury") {
      return "bg-orange-50 border-l-4 border-orange-400";
    }
    return "bg-muted";
  };

  return (
    <Card
      className={`border-l-4 ${getBorderColor(summary.privateInsight.category)}`}
    >
      {/* Compact header with player name, sport, and confidence badge */}
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
            {dateTime && (
              <p className="text-muted-foreground text-xs">{dateTime}</p>
            )}
          </div>
          <Badge
            className={`shrink-0 ${getConfidenceColor(confidenceScore)} text-white text-xs`}
            variant="outline"
          >
            {getConfidenceLabel(confidenceScore)} (
            {Math.round(confidenceScore * 100)}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 sm:space-y-4">
        {/* Parent-Friendly Summary - more compact on mobile */}
        <div
          className={`rounded-lg p-3 sm:p-4 ${getContentBoxStyle(summary.privateInsight.category)}`}
        >
          <p className="mb-1 font-medium text-muted-foreground text-xs sm:mb-2 sm:text-sm">
            Summary for Parent:
          </p>
          <p className="text-xs leading-relaxed sm:text-sm">
            {summary.publicSummary.content}
          </p>
        </div>

        {/* Collapsible Original Insight - collapsed by default on mobile */}
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

        {/* Action Buttons - stack on very small screens */}
        <div className="flex xs:flex-row flex-col gap-2 pt-1 sm:pt-2">
          <Button
            className="h-9 flex-1 text-xs sm:h-10 sm:text-sm"
            disabled={isApproving || isSuppressing}
            onClick={onApprove}
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
            onClick={onSuppress}
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
