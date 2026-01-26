"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Check,
  Heart,
  MessageSquare,
  Share2,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MessagePassportLink } from "@/components/parent/message-passport-link";
import { ShareModal } from "@/components/parent/share-modal";
import CoachAvatar from "@/components/shared/coach-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

// US-016: Category icon mapping
const categoryIcons = {
  skill_rating: Target,
  skill_progress: TrendingUp,
  injury: Heart,
  behavior: AlertCircle,
  performance: Trophy,
  attendance: Calendar,
};

type ParentSummaryCardProps = {
  summary: {
    _id: Id<"coachParentSummaries">;
    publicSummary: {
      content: string;
      confidenceScore: number;
      generatedAt: number;
    };
    privateInsight?: {
      category: string;
      sentiment: "positive" | "neutral" | "concern";
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

  // US-016: Get category icon with fallback
  const getCategoryIcon = () => {
    if (!summary.privateInsight) {
      return MessageSquare;
    }
    const category = summary.privateInsight.category;
    return (
      categoryIcons[category as keyof typeof categoryIcons] || MessageSquare
    );
  };

  // US-016: Get icon color based on sentiment
  const getIconColor = () => {
    if (!summary.privateInsight) {
      return "text-blue-600";
    }
    const sentiment = summary.privateInsight.sentiment;
    if (sentiment === "positive") {
      return "text-green-600";
    }
    if (sentiment === "concern") {
      return "text-yellow-600";
    }
    return "text-blue-600";
  };

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

  const CategoryIcon = getCategoryIcon();
  const iconColor = getIconColor();

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleView}
    >
      <CardContent className="px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Coach Avatar (US-014) */}
          {summary.coachName && (
            <CoachAvatar coachName={summary.coachName} size="sm" />
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Status and Coach badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {isUnread && !summary.acknowledgedAt && (
                <Badge className="bg-red-500 text-white" variant="default">
                  NEW
                </Badge>
              )}
              {summary.acknowledgedAt && (
                <Badge
                  className="bg-green-100 text-green-700"
                  variant="outline"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Acknowledged
                </Badge>
              )}
              {summary.coachName && (
                <Badge className="bg-blue-100 text-blue-700" variant="outline">
                  <User className="mr-1 h-3 w-3" />
                  Coach {summary.coachName}
                </Badge>
              )}
            </div>

            {/* AI-generated summary content with category icon (US-016) */}
            <div className="flex items-start gap-2">
              <CategoryIcon
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`}
              />
              <p className="break-words text-sm leading-snug">
                {summary.publicSummary.content}
              </p>
            </div>

            {/* Timestamp and actions - stacked on mobile, row on desktop */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  return format(new Date(timestamp), "MMM d, yyyy");
                })()}
              </p>

              {/* Card footer actions */}
              <div className="flex flex-wrap items-center gap-1.5">
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
                    <span className="hidden sm:inline">
                      {isAcknowledging ? "Marking..." : "Mark as Read"}
                    </span>
                    <span className="sm:hidden">
                      {isAcknowledging ? "Marking..." : "Mark Read"}
                    </span>
                  </Button>
                )}

                {useParentSummaryShareImage && (
                  <Button onClick={handleShare} size="sm" variant="outline">
                    <Share2 className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Share Update</span>
                    <span className="sm:hidden">Share</span>
                  </Button>
                )}
              </div>
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
