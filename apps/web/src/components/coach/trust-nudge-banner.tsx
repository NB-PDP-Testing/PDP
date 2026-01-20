"use client";

import { TrendingUp, X } from "lucide-react";
import { Card } from "@/components/ui/card";

const LEVEL_NAMES = ["New", "Learning", "Trusted", "Expert"];

type TrustNudgeBannerProps = {
  currentLevel: number;
  totalApprovals: number;
  threshold: number;
  onDismiss: () => void;
};

export function TrustNudgeBanner({
  currentLevel,
  totalApprovals,
  threshold,
  onDismiss,
}: TrustNudgeBannerProps) {
  // Only show when close to next level (within 2 approvals)
  const shouldShow =
    (currentLevel === 0 && totalApprovals >= 8) ||
    (currentLevel === 1 && totalApprovals >= 45);

  if (!shouldShow) {
    return null;
  }

  const remaining = threshold - totalApprovals;
  const nextLevel = currentLevel + 1;
  const nextLevelName = LEVEL_NAMES[nextLevel];

  return (
    <Card className="relative border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm">
      <button
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded-full p-1 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="rounded-full bg-green-100 p-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-900 text-sm">
            You're almost there!
          </h3>
          <p className="mt-1 text-green-800 text-sm">
            Just <strong>{remaining}</strong> more approval
            {remaining !== 1 ? "s" : ""} to reach{" "}
            <strong>{nextLevelName}</strong> level!
          </p>
          <p className="mt-1 text-green-700 text-xs">
            Keep reviewing and approving summaries to unlock higher automation
            levels.
          </p>
        </div>
      </div>
    </Card>
  );
}
