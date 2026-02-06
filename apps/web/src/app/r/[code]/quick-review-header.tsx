"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type QuickReviewHeaderProps = {
  voiceNoteCount: number;
  totalCount: number;
  reviewedCount: number;
  expiresAt: number;
};

export function QuickReviewHeader({
  voiceNoteCount,
  totalCount,
  reviewedCount,
  expiresAt,
}: QuickReviewHeaderProps) {
  const progressPercent =
    totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && reviewedCount >= totalCount;
  const pendingCount = totalCount - reviewedCount;

  // Calculate time remaining
  const now = Date.now();
  const msRemaining = Math.max(0, expiresAt - now);
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor(
    (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Stats row */}
      <div className="flex items-center justify-between text-muted-foreground text-sm">
        <span>
          {voiceNoteCount} voice note{voiceNoteCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {hoursRemaining > 0
            ? `${hoursRemaining}h ${minutesRemaining}m left`
            : `${minutesRemaining}m left`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress className="h-2" value={progressPercent} />
        <div className="flex items-center justify-between text-sm">
          {allDone ? (
            <span className="flex items-center gap-1.5 font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              All caught up!
            </span>
          ) : (
            <span className="text-muted-foreground">
              {reviewedCount} of {totalCount} reviewed
            </span>
          )}
          {pendingCount > 0 && (
            <span className="font-medium text-foreground">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
