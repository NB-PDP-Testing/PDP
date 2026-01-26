"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Check, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Insight = {
  id: string;
  playerIdentityId?: Id<"playerIdentities">;
  playerName?: string;
  title: string;
  description: string;
  category?: string;
  recommendedUpdate?: string;
  status: "pending" | "applied" | "dismissed" | "auto_applied";
  appliedDate?: string;
};

type Props = {
  insight: Insight;
  noteId: Id<"voiceNotes">;
  noteDate: string;
  coachName: string;
  orgId: string;
  showTranscription?: boolean;
  transcription?: string;
  hasParentSummary?: boolean;
  parentSummaryApproved?: boolean;
  onViewInVoiceNotes?: () => void;
};

export function InsightCard({
  insight,
  noteDate,
  coachName,
  orgId: _orgId,
  showTranscription = false,
  transcription,
  hasParentSummary = false,
  parentSummaryApproved = false,
  onViewInVoiceNotes,
}: Props) {
  // Format date
  const formattedDate = new Date(noteDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Get category badge color
  const getCategoryColor = (category?: string) => {
    if (!category) {
      return "bg-gray-100 text-gray-800";
    }

    const categoryMap: Record<string, string> = {
      skill_rating: "bg-blue-100 text-blue-800",
      skill_progress: "bg-green-100 text-green-800",
      injury: "bg-red-100 text-red-800",
      behavior: "bg-red-100 text-red-800", // Red for behavioral insights (require manual interaction)
      performance: "bg-purple-100 text-purple-800",
      attendance: "bg-orange-100 text-orange-800",
    };

    return categoryMap[category] || "bg-gray-100 text-gray-800";
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return {
          icon: <Check className="h-3 w-3" />,
          text: "Applied",
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "auto_applied":
        return {
          icon: <Check className="h-3 w-3" />,
          text: "Auto-Applied",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "dismissed":
        return {
          icon: <X className="h-3 w-3" />,
          text: "Dismissed",
          className: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return {
          icon: null,
          text: "Pending Review",
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const statusBadge = getStatusBadge(insight.status);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        {/* Header: Category badge, Date, Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {insight.category && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs",
                  getCategoryColor(insight.category)
                )}
              >
                {insight.category.replace(/_/g, " ").toUpperCase()}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {formattedDate} • {coachName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs",
                statusBadge.className
              )}
            >
              {statusBadge.icon}
              {statusBadge.text}
            </span>

            {/* Parent Summary Badge */}
            {hasParentSummary && parentSummaryApproved && (
              <Badge
                className="border-blue-200 bg-blue-100 text-blue-800"
                variant="outline"
              >
                Shared with Parents
              </Badge>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm leading-tight">
            {insight.title}
          </h4>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {insight.description}
          </p>

          {insight.recommendedUpdate && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-900">Recommended Action:</p>
              <p className="text-blue-800">{insight.recommendedUpdate}</p>
            </div>
          )}
        </div>

        {/* Transcription (coaches only) */}
        {showTranscription && transcription && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="mb-1 font-medium text-gray-900 text-xs">
              Original Note (Coach Only):
            </p>
            <p className="text-gray-700 text-xs leading-relaxed">
              {transcription.length > 200
                ? `${transcription.substring(0, 200)}...`
                : transcription}
            </p>
          </div>
        )}

        {/* Actions */}
        {onViewInVoiceNotes && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              className="text-xs"
              onClick={onViewInVoiceNotes}
              size="sm"
              variant="outline"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              View in Voice Notes
            </Button>
          </div>
        )}

        {/* Applied Date */}
        {insight.status === "applied" && insight.appliedDate && (
          <div className="border-t pt-2">
            <p className="text-muted-foreground text-xs">
              Applied on{" "}
              {new Date(insight.appliedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
