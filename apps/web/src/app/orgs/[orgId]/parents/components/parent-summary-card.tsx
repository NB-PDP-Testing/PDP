"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Check, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MessagePassportLink } from "@/components/parent/message-passport-link";
import { ShareModal } from "@/components/parent/share-modal";
import CoachAvatar from "@/components/shared/coach-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

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
    acknowledgedAt?: number;
    coachName?: string;
  };
  isUnread: boolean;
  onView: (summaryId: Id<"coachParentSummaries">) => void;
  onAcknowledge?: (summaryId: Id<"coachParentSummaries">) => Promise<void>;
};

export function ParentSummaryCard({
  summary,
  isUnread,
  onView,
  onAcknowledge,
}: ParentSummaryCardProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const { useParentSummaryShareImage } = useUXFeatureFlags();

  const handleView = () => {
    if (isUnread) {
      onView(summary._id);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsShareModalOpen(true);
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!onAcknowledge) {
      return;
    }

    setIsAcknowledging(true);
    try {
      await onAcknowledge(summary._id);
      toast.success("Marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
      console.error(error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleView}
    >
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {/* Coach Avatar (US-014) */}
          {summary.coachName && (
            <CoachAvatar coachName={summary.coachName} size="md" />
          )}

          <div className="flex-1">
            {/* Status badges */}
            {isUnread && !summary.acknowledgedAt && (
              <Badge className="mb-2 bg-red-500 text-white" variant="default">
                NEW
              </Badge>
            )}
            {summary.acknowledgedAt && (
              <Badge
                className="mb-2 bg-green-100 text-green-700"
                variant="outline"
              >
                <Check className="mr-1 h-3 w-3" />
                Acknowledged
              </Badge>
            )}

            {/* AI-generated summary content */}
            <div className="mb-3 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <p className="text-sm leading-relaxed">
                {summary.publicSummary.content}
              </p>
            </div>

            {/* Timestamp - US-015: Relative for recent, absolute for old */}
            <p className="text-muted-foreground text-xs">
              {(() => {
                const timestamp = summary.publicSummary.generatedAt;
                const isRecent =
                  Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000;
                if (isRecent) {
                  return formatDistanceToNow(new Date(timestamp), {
                    addSuffix: true,
                  });
                }
                // Import format at the top: import { format, formatDistanceToNow } from "date-fns";
                const formatDate = (ts: number) => {
                  const date = new Date(ts);
                  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                };
                return formatDate(timestamp);
              })()}
            </p>

            {/* Card footer actions */}
            <div className="mt-3 flex items-center gap-2">
              <MessagePassportLink summaryId={summary._id} />

              {/* Acknowledge button - only show if not yet acknowledged */}
              {!summary.acknowledgedAt && onAcknowledge && (
                <Button
                  disabled={isAcknowledging}
                  onClick={handleAcknowledge}
                  size="sm"
                  variant="outline"
                >
                  <Check className="mr-1 h-4 w-4" />
                  {isAcknowledging ? "Marking..." : "Mark as Read"}
                </Button>
              )}

              {useParentSummaryShareImage && (
                <Button onClick={handleShare} size="sm" variant="ghost">
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Share modal */}
      {useParentSummaryShareImage && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          summaryId={summary._id}
        />
      )}
    </Card>
  );
}
