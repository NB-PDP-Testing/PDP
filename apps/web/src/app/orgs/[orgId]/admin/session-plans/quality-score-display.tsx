"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";

type QualityScoreDisplayProps = {
  planId: Id<"sessionPlans">;
};

export function QualityScoreDisplay({ planId }: QualityScoreDisplayProps) {
  const qualityData = useQuery(api.models.sessionPlans.getQualityScore, {
    planId,
  });

  if (!qualityData) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Calculating quality score...
          </span>
        </div>
      </div>
    );
  }

  const { score } = qualityData;

  // Determine color based on score
  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 80) {
      return {
        text: "text-green-700",
        bg: "bg-green-100",
        bar: "bg-green-600",
      };
    }
    if (scoreValue >= 60) {
      return {
        text: "text-yellow-700",
        bg: "bg-yellow-100",
        bar: "bg-yellow-600",
      };
    }
    return {
      text: "text-red-700",
      bg: "bg-red-100",
      bar: "bg-red-600",
    };
  };

  const colors = getScoreColor(score);

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Quality Score</span>
        <span className={`font-medium text-sm ${colors.text}`}>
          {score}/100
        </span>
      </div>
      {/* Custom progress bar with color coding */}
      <div className={`h-2 w-full overflow-hidden rounded-full ${colors.bg}`}>
        <div
          className={`h-full transition-all ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
