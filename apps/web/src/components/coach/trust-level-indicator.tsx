"use client";

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const LEVEL_NAMES = ["New", "Learning", "Trusted", "Expert"];

type TrustLevelIndicatorProps = {
  trustLevel: number;
  totalApprovals: number;
  totalSuppressed: number;
  progressToNextLevel: {
    percentage: number;
    threshold: number;
  };
  onSettingsClick?: () => void;
  className?: string;
};

/**
 * Get the semantic color classes for a trust level badge.
 */
function getLevelColor(level: number): string {
  switch (level) {
    case 0:
      return "bg-gray-100 text-gray-700 border-gray-200";
    case 1:
      return "bg-blue-100 text-blue-700 border-blue-200";
    case 2:
      return "bg-green-100 text-green-700 border-green-200";
    case 3:
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function TrustLevelIndicator({
  trustLevel,
  totalApprovals,
  totalSuppressed,
  progressToNextLevel,
  onSettingsClick,
  className,
}: TrustLevelIndicatorProps) {
  const levelName = LEVEL_NAMES[trustLevel] || "Unknown";
  const suppressionRate =
    totalApprovals + totalSuppressed > 0
      ? Math.round((totalSuppressed / (totalApprovals + totalSuppressed)) * 100)
      : 0;

  const isMaxLevel = trustLevel === 3;

  return (
    <div className={cn("rounded-lg border bg-white p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "flex items-center gap-1.5 border px-2.5 py-1 font-medium text-xs",
              getLevelColor(trustLevel)
            )}
            variant="outline"
          >
            <span>{levelName}</span>
          </Badge>
          <span className="text-muted-foreground text-sm">
            Trust Level {trustLevel}
          </span>
        </div>
        {onSettingsClick && (
          <button
            aria-label="Trust settings"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            onClick={onSettingsClick}
            type="button"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Section */}
      {!isMaxLevel && (
        <div className="space-y-2">
          <Progress className="h-2" value={progressToNextLevel.percentage} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalApprovals} / {progressToNextLevel.threshold} approvals
            </span>
            {totalSuppressed > 0 && (
              <span className="text-muted-foreground">
                {suppressionRate}% suppressed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Max Level Reached */}
      {isMaxLevel && (
        <div className="text-sm">
          <p className="text-muted-foreground">Maximum level reached</p>
          <p className="text-muted-foreground text-xs">
            {totalApprovals} total approvals
          </p>
        </div>
      )}
    </div>
  );
}
