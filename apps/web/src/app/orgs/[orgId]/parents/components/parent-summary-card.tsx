"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import { MessagePassportLink } from "@/components/parent/message-passport-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ParentSummaryCardProps = {
  summary: {
    _id: Id<"coachParentSummaries">;
    publicSummary: {
      content: string;
      confidenceScore: number;
      generatedAt: number;
    };
    status: string;
    viewedAt?: number;
  };
  isUnread: boolean;
  onView: (summaryId: Id<"coachParentSummaries">) => void;
};

export function ParentSummaryCard({
  summary,
  isUnread,
  onView,
}: ParentSummaryCardProps) {
  const handleView = () => {
    if (isUnread) {
      onView(summary._id);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleView}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* NEW badge for unread summaries */}
            {isUnread && (
              <Badge className="mb-2 bg-red-500 text-white" variant="default">
                NEW
              </Badge>
            )}

            {/* AI-generated summary content */}
            <div className="mb-3 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <p className="text-sm leading-relaxed">
                {summary.publicSummary.content}
              </p>
            </div>

            {/* Timestamp */}
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(
                new Date(summary.publicSummary.generatedAt),
                {
                  addSuffix: true,
                }
              )}
            </p>

            {/* Card footer actions */}
            <div className="mt-3 flex items-center gap-2">
              <MessagePassportLink summaryId={summary._id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
